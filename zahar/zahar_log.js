/* ============================================================
   zahar_log.js v2 — журнальная лента (почта → kotlarof@yandex.ru)
   v2: дверной крючокъ переживаетъ подмену. Раньше журналъ обертывалъ
   window.ZAHAR_ASK один разъ при загрузке — а модуль embed переустанавливалъ
   дверь поверхъ («контрактъ №37») и журнальная обертка срывалась.
   Теперь ZAHAR_ASK держится черезъ defineProperty: кто бы ни поставилъ
   новую дверь — журналъ оборачиваетъ и ея. Пишутся и депеша гостя, и отвѣт.
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

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function stamp(t) {
    var d = new Date(t || Date.now());
    return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear() +
      ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }
  function persist() {
    try { localStorage.setItem('zahar_log_v2', JSON.stringify(BUF)); } catch (e) {}
  }
  function restore() {
    try {
      var s = localStorage.getItem('zahar_log_v2') || localStorage.getItem('zahar_log_v1');
      if (s) { var a = JSON.parse(s); if (Array.isArray(a)) BUF = a; }
    } catch (e) {}
  }

  function add(who, text) {
    if (text == null) return;
    text = String(text).trim();
    if (!text) return;
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

  /* --- дверной крючок: переживает подмену двери --- */
  var hooked = false;
  try {
    var inner = wrap(window.ZAHAR_ASK || function () { return '…'; });
    Object.defineProperty(window, 'ZAHAR_ASK', {
      configurable: true,
      get: function () { return inner; },
      set: function (v) { inner = wrap(v); }
    });
    hooked = true;
  } catch (e) {
    if (typeof window.ZAHAR_ASK === 'function') {
      window.ZAHAR_ASK = wrap(window.ZAHAR_ASK);
      hooked = true;
    }
  }

  /* --- отправка (FormSubmit, почта) --- */
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
  function send(reason) {
    var body = buildText(reason);
    if (!body) return false;
    var url = 'https://formsubmit.co/ajax/' + CFG.email;
    var cleared = false;
    function finish(ok) { if (ok && !cleared) { cleared = true; BUF = []; persist(); } }
    try {
      fetch(url, {
        method: 'POST',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: payloadFor(reason, body)
      }).then(function (r) { finish(r && r.ok); })
        .catch(function () {
          try { navigator.sendBeacon(url, new Blob([payloadFor(reason, body)], { type: 'text/plain;charset=UTF-8' })); finish(true); } catch (e2) {}
        });
    } catch (e) {
      try { navigator.sendBeacon(url, new Blob([payloadFor(reason, body)], { type: 'text/plain;charset=UTF-8' })); finish(true); } catch (e2) {}
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
    return { 'стоитъ': hooked, 'каналъ': 'почта → ' + CFG.email,
      'репликъВъБуферѣ': BUF.length, 'крючокъПереживаетъПодмену': true };
  };
  window.zaharLogFlush = function () {
    if (!BUF.length) return 'Журналъ пустъ — отправлять нечего.';
    var n = BUF.length;
    send('пробная отправка');
    return 'Журналъ отправленъ: репликъ ' + n + '.';
  };

  restore();
})();
