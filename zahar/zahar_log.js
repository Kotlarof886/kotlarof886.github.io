/* ============================================================
   zahar_log.js v7 — журнальная лента (почта → kotlarof@yandex.ru)
   v7 (леченіе «письма не доходят»):
     1) ГЛАВНАЯ РАНА: v6 слала весь буфер одним keepalive-запросом.
        Предѣл браузера на keepalive ≈ 64 КБ, буфер же растет до 400 реплик
        (~84 КБ) — каждый fetch падал съ «сбоем сети», повторялся черезъ 2
        минуты въ тупую и никогда не доходилъ: буфер не чистился, письма
        не шли. Теперь журналъ шлется ЧАСТЯМИ по ~45 КБ, послѣдовательно;
        на мѣстѣ остаются только недоставленныя части. keepalive — лишь
        при закрытіи вкладки и только если часть влѣзаетъ въ предѣл.
     2) ШАПКА ПИСЬМА: тема и первыя строки несутъ живыя версии всѣхъ слоевъ
        обвязки (бутъ, чатъ, мозгъ, память, словарь, фразы, эмбедъ, кастомъ,
        эфиръ, лента) — журналъ самъ снимаетъ ихъ съ техъ файловъ, которые
        браузеръ реально получилъ (fetch по адресамъ подключенныхъ скриптовъ,
        разъ въ сессію). Команда zaharLogVersions() показываетъ на мѣстѣ.
     3) ОТКАЗЪ ВИДЕНЪ: вердиктъ FormSubmit (активация / file:// / отказъ)
        всплываетъ запиской на страницѣ (скрыть — щелчкомъ), не только въ
        консоли. Счетъ неудачъ въ zaharLogStatus().
     4) ЗАПАСНАЯ ДОРОЖКА: zaharLogMailto() — открываетъ почтовую программу
        гостя съ готовымъ письмомъ (тема съ версіями, хвостъ журнала), если
        FormSubmit упрямится. Полусуточный flush: накопленія старше 30 минутъ
        уходятъ даже при бодрой бѣсѣдѣ.
   v6: буферъ очищается только послѣ подтвержденія въ тѣлѣ отвѣта —
   FormSubmit при отказѣ часто отдаетъ HTTP 200 съ success:false,
   старый кодъ считалъ это успѣхомъ и молча терялъ реплики.
   v3: дверной крючокъ переживаетъ подмену (defineProperty + сторожъ).
   v4: дедупликация съ выравниваниемъ переносовъ и окномъ 10 секундъ.
   v5: дедупликація Захара по ядру реплики (первые 40 знаковъ, окно 60 секъ).
   Пишутся и депеша гостя, и отвѣтъ (включая обещанія).
   API: zaharLogStatus(), zaharLogFlush(), zaharLogVersions(), zaharLogMailto()
   Подключать ПОСЛЕ zahar_chat.js (лучше — последнимъ, послѣ zahar_ether.js).
   ============================================================ */
(function () {
  if (window.__zaharLogLoaded) return;
  window.__zaharLogLoaded = true;

  var LOGV = 'v7';

  var CFG = {
    email: 'kotlarof@yandex.ru',
    idleMs: 5 * 60 * 1000,
    hideMs: 60 * 1000,
    maxBuf: 400,
    chunkBytes: 45000,        /* v7: предѣлъ части — съ запасомъ ниже 64 КБ keepalive */
    staleMs: 30 * 60 * 1000   /* v7: накопленіямъ старше получаса — дорога независима отъ тишины */
  };

  var BUF = [];
  var SEQ = 0;
  var idleTimer = null, hideTimer = null, staleTimer = null;
  var recaps = 0;
  var guardFrozen = false;
  var lastKey = '', lastAt = 0;

  /* v6: память о попытках отправки — для zaharLogStatus(); v7: счетъ неудачъ */
  var LOG = { lastTry: null, lastOk: null, lastErr: null, retryTimer: null, fails: 0 };

  /* --- v7: версии обвязки — снимаются съ файловъ, отданных браузеромъ --- */
  var VERS = null;
  var FILES = [
    ['бутъ',    'zahar_boot',    /правка №\d+ загрузчика/],
    ['чатъ',    'zahar_chat',    /№59\.\d+[а-яё]*/],
    ['мозгъ',   'zahar_brain',   /мозгъ v\d+\.\d+/],
    ['память',  'zahar_memory',  /правка №\d+/],
    ['словарь', 'zahar_dict',    /правка №\d+/],
    ['фразы',   'zahar_phrases', /v\d+\.\d+/],
    ['эмбедъ',  'zahar_embed',   /№59\.\d+[а-яё]*/],
    ['кастомъ', 'zahar_custom',  /v\d+\.\d+/],
    ['эфиръ',   'zahar_ether',   /правка №\d+/]
  ];

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
      if (s) { var a = JSON.parse(s); if (Array.isArray(a)) { BUF = a; SEQ = BUF.length; } }
    } catch (e) {}
  }

  function add(who, text) {
    if (text == null) return;
    text = String(text).trim();
    if (!text) return;
    /* v5: дедупликация — по ядру реплики (первые 40 знаковъ, окно 60 сек):
       ответы с хвостом «Впрочемъ…» и без него склеиваются в один вход.
       Гость — по полному тексту, окно 10 секундъ, как въ v4. */
    var flat = text.replace(/\s+/g, ' ').trim();
    var now = Date.now();
    var core = (who === 'zakhar') ? flat.slice(0, 40) : flat;
    var win = (who === 'zakhar') ? 60000 : 10000;
    var key = who + '|' + core;
    if (key === lastKey && now - lastAt < win) { lastAt = now; return; }
    lastKey = key; lastAt = now;
    SEQ++;
    BUF.push({ id: SEQ, t: stamp(), ts: now, who: who, text: text });
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
  try { console.log('[zahar_log] ' + LOGV + ': журнальная лента на линіи, крючокъ на двери'); } catch (e) {}
  setInterval(function () {
    if (!guardFrozen) installDoor();
  }, 800);

  /* --- v7: сбор версий обвязки --- */
  function scriptSrcs(base) {
    var out = [];
    try {
      var list = document.querySelectorAll('script[src]');
      for (var i = 0; i < list.length; i++) {
        var s = list[i].getAttribute('src') || '';
        if (s.indexOf(base + '.js') >= 0) out.push(s);
      }
    } catch (e) {}
    return out;
  }
  function fetchText(url, timeout) {
    return new Promise(function (res) {
      var done = false, ctl = null;
      try { if (typeof AbortController !== 'undefined') ctl = new AbortController(); } catch (e) {}
      var t = setTimeout(function () { if (!done) { done = true; res(null); } }, timeout || 4000);
      try {
        fetch(url, ctl ? { signal: ctl.signal } : {})
          .then(function (r) { return r.text(); })
          .then(function (tx) { if (!done) { done = true; clearTimeout(t); res(tx); } })
          .catch(function () { if (!done) { done = true; clearTimeout(t); res(null); } });
      } catch (e) { if (!done) { done = true; clearTimeout(t); res(null); } }
    });
  }
  function collectVersions(cb) {
    if (VERS) return cb(VERS);
    var res = { 'лента': LOGV };
    var left = FILES.length;
    function tick() { if (--left === 0) { VERS = res; cb(VERS); } }
    FILES.forEach(function (f) {
      var srcs = scriptSrcs(f[1]);
      if (!srcs.length) { res[f[0]] = 'файлъ не найденъ на страницѣ'; setTimeout(tick, 0); return; }
      fetchText(srcs[0], 4000).then(function (tx) {
        if (tx) { var m = tx.match(f[2]); res[f[0]] = m ? m[0] : 'версія не опознана'; }
        else res[f[0]] = 'не дочитанъ';
        tick();
      });
    });
  }
  function versionsLine(v) {
    var parts = [];
    FILES.forEach(function (f) { parts.push(f[0] + ' ' + (v[f[0]] || '?')); });
    parts.push('лента ' + LOGV);
    return parts.join(' | ');
  }
  window.zaharLogVersions = function () {
    if (VERS) return versionsLine(VERS);
    collectVersions(function (v) { try { console.log('[zahar_log] версии обвязки: ' + versionsLine(v)); } catch (e) {} });
    return 'версии собираются… черезъ несколько секундъ повторите zaharLogVersions()';
  };

  /* --- v7: записка на страницѣ при отказѣ --- */
  function toast(msg) {
    try {
      var el = document.getElementById('zahar-log-toast');
      if (!el) {
        el = document.createElement('div');
        el.id = 'zahar-log-toast';
        el.style.cssText = 'position:fixed;right:12px;bottom:12px;max-width:340px;' +
          'background:#1b1b17;color:#e8dcc0;border:1px solid #7a6a45;padding:10px 14px;' +
          'font:13px/1.45 Georgia,serif;border-radius:4px;z-index:99999;' +
          'box-shadow:0 2px 10px rgba(0,0,0,.4);cursor:pointer;white-space:pre-wrap';
        el.title = 'Нажмите, чтобы скрыть';
        el.onclick = function () { el.style.display = 'none'; };
        (document.body || document.documentElement).appendChild(el);
      }
      el.textContent = msg;
      el.style.display = 'block';
      clearTimeout(toast._t);
      toast._t = setTimeout(function () { el.style.display = 'none'; }, 15000);
    } catch (e) {}
  }

  /* --- отправка v7 (FormSubmit, почта), частями --- */
  function byteLen(s) {
    try { return new Blob([s]).size; } catch (e) { return s.length; }
  }
  function payloadFor(subject, body) {
    return JSON.stringify({ _subject: subject, _captcha: 'false', message: body });
  }
  function headerRows(reason, vline) {
    return ['Журналъ бесѣдъ съ Захаромъ',
      'Версии обвязки: ' + vline,
      'Страница: ' + (location && location.href ? location.href : '—'),
      'Отправлено: ' + stamp(),
      'Причина: ' + reason,
      ''];
  }

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
      return 'форма не активирована: найдите письмо отъ FormSubmit на ' + CFG.email + ' (включая «Спамъ») и нажмите «Activate Form». Накопленное доставится послѣ активации';
    }
    return 'отказъ FormSubmit: ' + msg;
  }

  function markFail(msg) {
    LOG.lastErr = stamp() + ' — ' + msg;
    LOG.fails = (LOG.fails || 0) + 1;
    try { console.warn('[zahar_log] часть НЕ ушла: ' + msg); } catch (e) {}
    try { toast('[zahar_log] Отправка не ушла: ' + msg + '\n\nЗапасная дорожка: наберите въ консоли zaharLogMailto()'); } catch (e) {}
  }
  function markOk() {
    LOG.lastOk = stamp(); LOG.lastErr = null; LOG.fails = 0;
    try { console.log('[zahar_log] часть журнала отправлена на ' + CFG.email); } catch (e) {}
  }

  function removeIds(ids) {
    BUF = BUF.filter(function (en) { return ids.indexOf(en.id) < 0; });
    persist();
  }

  function sendChunks(reason, vline, chunks, idx, opts) {
    if (idx >= chunks.length) return;
    opts = opts || {};
    var part = chunks[idx];
    var isLast = (idx === chunks.length - 1);
    var rows = headerRows(reason, vline).concat(part.map(function (p) { return p.row; }));
    if (!isLast) rows.push('— продолженіе въ следующемъ письмѣ (' + (chunks.length - idx - 1) + ' шт.) —');
    var body = rows.join('\n');
    var keepalive = !!opts.urgent && byteLen(body) < 60000;
    LOG.lastTry = stamp();
    var url = 'https://formsubmit.co/ajax/' + CFG.email;
    fetch(url, {
      method: 'POST',
      keepalive: keepalive,
      headers: { 'Content-Type': 'application/json' },
      body: payloadFor('Журналъ бесѣдъ съ Захаромъ — ' + reason + ' [' + vline + ']', body)
    }).then(function (r) {
      return r.text().then(function (t) {
        var data = null;
        try { data = JSON.parse(t); } catch (e) { data = { error: String(t).slice(0, 200) }; }
        var v = verdict(data);
        if (v) {
          markFail(v);
          /* буферъ остаетсяъ на мѣстѣ — реплики не теряются */
        } else {
          markOk();
          removeIds(part.map(function (p) { return p.en.id; }));
          sendChunks(reason, vline, chunks, idx + 1, opts);
        }
      });
    }).catch(function () {
      /* сбой сети: часть остаетсяъ, повторъ черезъ 2 минуты */
      LOG.lastErr = stamp() + ' — сбой сети, повторъ черезъ 2 минуты';
      LOG.fails++;
      try { console.warn('[zahar_log] сеть не пропустила — повторъ черезъ 2 минуты'); } catch (e) {}
      if (LOG.retryTimer) clearTimeout(LOG.retryTimer);
      LOG.retryTimer = setTimeout(function () {
        var rest = chunks.slice(idx);
        if (rest.length) sendChunks('повторъ после сбоя сети', vline, rest, 0, opts);
      }, 120000);
    });
  }

  function send(reason, opts) {
    if (!BUF.length) return false;
    opts = opts || {};
    collectVersions(function (v) {
      var vline = versionsLine(v);
      var head = byteLen(headerRows(reason, vline).join('\n')) + 1;
      var chunks = [], cur = [], size = 0;
      for (var i = 0; i < BUF.length; i++) {
        var en = BUF[i];
        var row = (en.who === 'guest' ? 'Гость: ' : 'Захаръ: ') + en.text;
        var rs = byteLen(row) + 1;
        if (cur.length && size + rs + head > CFG.chunkBytes) { chunks.push(cur); cur = []; size = 0; }
        cur.push({ en: en, row: row }); size += rs;
      }
      if (cur.length) chunks.push(cur);
      /* при закрытіи вкладки посылаемъ лишь то, что влѣзаетъ въ keepalive: хвостъ */
      if (opts.urgent && chunks.length > 1) {
        var tail = [];
        for (var j = chunks.length - 1; j >= 0; j--) {
          if (byteLen(chunks[j].map(function (p) { return p.row; }).join('\n')) + head < 60000) {
            tail = chunks[j].concat(tail);
          } else break;
        }
        chunks = [tail];
      }
      if (chunks.length > 1) {
        try { console.log('[zahar_log] журналъ великъ — шлются части: ' + chunks.length + ' (v6 не доносилъ бы ничего)'); } catch (e) {}
      }
      sendChunks(reason, vline, chunks, 0, opts);
    });
    return true;
  }

  function armIdle() {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(function () { send('пять минутъ тишины'); }, CFG.idleMs);
  }

  /* v7: старыя накопленія уходятъ и безъ тишины */
  staleTimer = setInterval(function () {
    if (!BUF.length) return;
    var oldest = BUF[0].ts || 0;
    if (Date.now() - oldest > CFG.staleMs) send('полчаса накопленій');
  }, CFG.periodicMs);

  window.addEventListener('pagehide', function () { send('вкладка закрыта или обновлена', { urgent: true }); });
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
    if (guardFrozen) doorState = 'дверь заморожена — перехват невозможенъ';
    else if (doorMarked()) doorState = 'дверь обернута журналомъ';
    else doorState = 'дверь не обернута (сторожъ подхватитъ за 0,8 сек)';
    return { 'версія': LOGV, 'каналъ': 'почта → ' + CFG.email,
      'репликъВъБуферѣ': BUF.length,
      'дверьОбернута': doorMarked(),
      'состояниеДвери': doorState,
      'перехватовДвери': recaps,
      'неудачъПодряд': LOG.fails,
      'последняяПопытка': LOG.lastTry,
      'последнийУспех': LOG.lastOk,
      'последняяОшибка': LOG.lastErr };
  };
  window.zaharLogFlush = function () {
    if (!BUF.length) return 'Журналъ пустъ — отправлять нечего.';
    send('пробная отправка');
    return 'Пробная отправка запущена. Черезъ несколько секундъ откройте консоль (F12) — тамъ будетъ либо «часть журнала отправлена», либо точная причина отказа (она же всплыветъ запиской на страницѣ).';
  };

  /* v7: запасная дорожка — черезъ почтовую программу гостя */
  window.zaharLogMailto = function () {
    collectVersions(function (v) {
      var vline = versionsLine(v);
      var subject = 'Журналъ бесѣдъ съ Захаромъ — вручную [' + vline + ']';
      var rows = headerRows('запасная дорожка (mailto)', vline);
      for (var i = 0; i < BUF.length; i++) {
        rows.push((BUF[i].who === 'guest' ? 'Гость: ' : 'Захаръ: ') + BUF[i].text);
      }
      var body = rows.join('\n');
      /* предѣлъ адресной строки: держимъ хвостъ */
      while (body.length > 1500) body = body.slice(500);
      var href = 'mailto:' + CFG.email + '?subject=' + encodeURIComponent(subject) +
                 '&body=' + encodeURIComponent(body);
      try {
        var a = document.createElement('a');
        a.href = href; document.body.appendChild(a); a.click(); a.remove();
      } catch (e) { window.location.href = href; }
    });
    return 'Почтовая программа откроется съ готовымъ письмомъ (тема съ версіями, хвостъ журнала). Останется нажать «Отправить».';
  };

  restore();

  /* v7: прогревъ кэша версий при загрузкѣ — чтобы прощальная отправка
     (pagehide) не ждала fetch и ушла мгновенно */
  try { collectVersions(function () {}); } catch (e) {}
})();
