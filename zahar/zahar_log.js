/* ============================================================
   zahar_log.js v6 — журнальная лента (почта → kotlarof@yandex.ru)
   v6: буферъ очищается только послѣ подтвержденія въ тѣлѣ отвѣта —
   FormSubmit при отказѣ часто отдаетъ HTTP 200 съ success:false,
   старый кодъ считалъ это успѣхомъ и молча терялъ реплики.
   Точный вердиктъ въ консоли (активация / локальный файлъ / отказъ);
   повторъ при сбое сети черезъ 2 минуты; заглушка sendBeacon убрана —
   она не работала и маскировала отказы какъ успѣхъ.
   v3: дверной крючокъ переживаетъ подмену (defineProperty + сторожъ,
   разъ въ 800 мс перехватывает дверь заново, кто бы ни пересоздалъ).
   v4: дедупликация с выравниванием переносов и окном 10 секунд —
   двойные реплики Захара (съ переносами и безъ) исчезли изъ журнала.
   v5: дедупликация Захара по ядру реплики (первые 40 знаков, окно 60 сек) —
   ответы съ хвостомъ «Впрочемъ…» и безъ него склеиваются въ одинъ входъ.
   Пишутся и депеша гостя, и отвѣт (включая обещанія).
   API: zaharLogStatus(), zaharLogFlush()
   Подключать ПОСЛЕ zahar_chat.js (лучше — последнимъ, после zahar_ether.js).
   ============================================================ */
(function () {
  if (window.__zaharLogLoaded) return;
  window.__zaharLogLoaded = true;

  var CFG = {
    email: 'kotlarof@yandex.ru',
    idleMs: 5 * 60 * 1000,
    hideMs: 60 * 1000,
    maxBuf: 400
  };

  var BUF = [];
  var idleTimer = null, hideTimer = null;
  var recaps = 0;
  var guardFrozen = false;
  var lastKey = '', lastAt = 0;

  /* v6: память о попытках отправки — для zaharLogStatus() */
  var LOG = { lastTry: null, lastOk: null, lastErr: null, retryTimer: null };

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function stamp(t) {
    var d = new Date(t || Date.now());
    return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear() +
      ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }
  function persist() {
    try { localStorage.setItem('zahar_log_v4', JSON.stringify(BUF)); } catch (e) {}
  }
  function restore() {
    try {
      var s = localStorage.getItem('zahar_log_v4') || localStorage.getItem('zahar_log_v3') ||
              localStorage.getItem('zahar_log_v2') || localStorage.getItem('zahar_log_v1');
      if (s) { var a = JSON.parse(s); if (Array.isArray(a)) BUF = a; }
    } catch (e) {}
  }

  function add(who, text) {
    if (text == null) return;
    text = String(text).trim();
    if (!text) return;
    /* v5: дедупликация — по ядру реплики (первые 40 знаков, окно 60 сек):
       ответы с хвостом «Впрочемъ…» и без него склеиваются в один вход.
       Гость — по полному тексту, окно 10 секунд, как в v4. */
    var flat = text.replace(/\s+/g, ' ').trim();
    var now = Date.now();
    var core = (who === 'zakhar') ? flat.slice(0, 40) : flat;
    var win = (who === 'zakhar') ? 60000 : 10000;
    var key = who + '|' + core;
    if (key === lastKey && now - lastAt < win) { lastAt = now; return; }
    lastKey = key; lastAt = now;
    BUF.push({ t: stamp(), who: who, text: text });
    if (BUF.length > CFG.maxBuf) BUF.splice(0, BUF.length - CFG.maxBuf);
    persist();
    armIdle();
  }

  function extract(r) {
    if (r == null) return '';
    if (typeof r === 'string') return r;
    if (typeof r === 'object') {
      if (typeof r.text === 'string' && r.text) return r.text;
      if (typeof r.reply === 'string' && r.reply) return r.reply;
      if (typeof r.msg === 'string' && r.msg) return r.msg;
      try { return JSON.stringify(r); } catch (e) { return String(r); }
    }
    return String(r);
  }

  function wrappedCall(orig, self, args) {
    var q = String(args && args.length ? args[0] : '');
    add('guest', q);
    var r;
    try { r = orig.apply(self, args); }
    catch (e) { add('zakhar', '(аппаратъ молчитъ: сбой на линіи)'); throw e; }
    try {
      if (r && typeof r.then === 'function') {
        r.then(function (v) { add('zakhar', extract(v)); },
               function () { add('zakhar', '(аппаратъ молчитъ)'); });
      } else {
        add('zakhar', extract(r));
      }
    } catch (e) {}
    return r;
  }

  function wrap(fn) {
    if (typeof fn !== 'function') return fn;
    if (fn.__zaharLogHook) return fn;
    var f = function () {
      return wrappedCall(fn, this, Array.prototype.slice.call(arguments));
    };
    try { Object.defineProperty(f, '__zaharLogHook', { value: true }); }
    catch (e) { f.__zaharLogHook = true; }
    return f;
  }

  function doorMarked() {
    try { return typeof window.ZAHAR_ASK === 'function' && window.ZAHAR_ASK.__zaharLogHook === true; }
    catch (e) { return false; }
  }

  function capture() {
    try {
      var inner = wrap(window.ZAHAR_ASK || function () { return '…'; });
      Object.defineProperty(window, 'ZAHAR_ASK', {
        configurable: true,
        get: function () { return inner; },
        set: function (v) { inner = wrap(v); }
      });
      return true;
    } catch (e) {
      try {
        delete window.ZAHAR_ASK;
        var inner2 = wrap(window.ZAHAR_ASK || function () { return '…'; });
        Object.defineProperty(window, 'ZAHAR_ASK', {
          configurable: true,
          get: function () { return inner2; },
          set: function (v) { inner2 = wrap(v); }
        });
        return true;
      } catch (e2) {
        try {
          if (typeof window.ZAHAR_ASK === 'function') {
            window.ZAHAR_ASK = wrap(window.ZAHAR_ASK);
            return true;
          }
        } catch (e3) {}
        return false;
      }
    }
  }

  /* --- сторож v3: дверь проверяется каждые 800 мс --- */
  function installDoor() {
    if (doorMarked()) return;
    if (!capture()) { guardFrozen = true; return; }
    recaps++;
    try { console.log('[zahar_log] дверьъ ZAHAR_ASK перехвачена (разъ ' + recaps + ')'); } catch (e) {}
  }
  if (capture()) recaps = 1;
  try { console.log('[zahar_log] v4: журнальная лента на линіи, крючокъ на двери'); } catch (e) {}
  setInterval(function () {
    if (!guardFrozen) installDoor();
  }, 800);

  /* --- отправка v6 (FormSubmit, почта): очистка буфера только после подтверждения --- */
  function payloadFor(reason, body) {
    return JSON.stringify({
      _subject: 'Журналъ бесѣдъ съ Захаромъ — ' + reason,
      _captcha: 'false',
      message: body
    });
  }
  function buildText(reason) {
    if (!BUF.length) return null;
    var rows = ['Журналъ бесѣдъ съ Захаромъ',
      'Страница: ' + (location && location.href ? location.href : '—'),
      'Отправлено: ' + stamp(),
      'Причина: ' + reason, ''];
    for (var i = 0; i < BUF.length; i++) {
      rows.push((BUF[i].who === 'guest' ? 'Гость: ' : 'Захаръ: ') + BUF[i].text);
    }
    return rows.join('\n');
  }

  /* v6: вердикт разбирается по телу ответа, а не по HTTP-статусу */
  function verdict(data) {
    var ok = false;
    if (data && typeof data === 'object') {
      if (data.success === true) ok = true;
      else if (data.success === 'true') ok = true;
      else if (data.ok === true || data.ok === 'true') ok = true;
    }
    if (ok) return null;
    var msg = (data && typeof data === 'object' && (data.message || data.error))
      ? String(data.message || data.error) : 'ответъ безъ подтвержденія';
    if (/open this page through a web server|file:\/\//i.test(msg)) {
      return 'страница открыта локально (file://) — FormSubmit отказываетъ. Откройте сайт по адресу GitHub Pages и повторите zaharLogFlush()';
    }
    if (/activat/i.test(msg)) {
      return 'форма не активирована: найдите письмо от FormSubmit на ' + CFG.email + ' (включая «Спамъ») и нажмите «Activate Form». Накопленное доставится после активации';
    }
    return 'отказъ FormSubmit: ' + msg;
  }

  function send(reason) {
    var body = buildText(reason);
    if (!body) return false;
    var url = 'https://formsubmit.co/ajax/' + CFG.email;
    LOG.lastTry = stamp();
    try {
      fetch(url, {
        method: 'POST',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: payloadFor(reason, body)
      }).then(function (r) {
        return r.text().then(function (t) {
          var data = null;
          try { data = JSON.parse(t); } catch (e) { data = { error: t.slice(0, 200) }; }
          var v = verdict(data);
          if (v) {
            LOG.lastErr = stamp() + ' — ' + v;
            try { console.warn('[zahar_log] отправка НЕ ушла: ' + v); } catch (e) {}
            /* буферъ остаетсяъ на мѣстѣ — реплики не теряются */
          } else {
            LOG.lastOk = stamp(); LOG.lastErr = null;
            BUF = []; persist();
            try { console.log('[zahar_log] журналъ отправленъ на ' + CFG.email); } catch (e) {}
          }
        });
      }).catch(function () {
        /* сбой сети: буферъ остаетсяъ, повторъ черезъ 2 минуты */
        LOG.lastErr = stamp() + ' — сбой сети, повторъ черезъ 2 минуты';
        try { console.warn('[zahar_log] сеть не пропустила — повторъ черезъ 2 минуты'); } catch (e) {}
        if (LOG.retryTimer) clearTimeout(LOG.retryTimer);
        LOG.retryTimer = setTimeout(function () { send('повторъ после сбоя сети'); }, 120000);
      });
    } catch (e) {
      LOG.lastErr = stamp() + ' — попытка не состоялась: ' + (e && e.message ? e.message : String(e));
      try { console.warn('[zahar_log] ' + LOG.lastErr); } catch (e2) {}
    }
    return true;
  }

  function armIdle() {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(function () { send('пять минутъ тишины'); }, CFG.idleMs);
  }

  window.addEventListener('pagehide', function () { send('вкладка закрыта или обновлена'); });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(function () {
        if (document.visibilityState === 'hidden') send('вкладка скрыта дольше минуты');
      }, CFG.hideMs);
    } else {
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = null;
    }
  });

  window.zaharLogStatus = function () {
    var doorState;
    if (guardFrozen) doorState = 'дверь заморожена — перехват невозможен';
    else if (doorMarked()) doorState = 'дверь обернута журналом';
    else doorState = 'дверь не обернута (сторож подхватит за 0,8 сек)';
    return { 'стоитъ': true, 'каналъ': 'почта → ' + CFG.email,
      'репликъВъБуферѣ': BUF.length,
      'дверьОбернута': doorMarked(),
      'состояниеДвери': doorState,
      'перехватовДвери': recaps,
      'последняяПопытка': LOG.lastTry,
      'последнийУспех': LOG.lastOk,
      'последняяОшибка': LOG.lastErr };
  };
  window.zaharLogFlush = function () {
    if (!BUF.length) return 'Журналъ пустъ — отправлять нечего.';
    send('пробная отправка');
    return 'Пробная отправка запущена. Черезъ несколько секундъ откройте консоль (F12) — тамъ будетъ либо «журналъ отправленъ», либо точная причина отказа.';
  };

  restore();
})();
