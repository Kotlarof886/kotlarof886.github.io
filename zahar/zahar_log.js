/* ============================================================
   zahar_log.js v8 — журнальная лента (почта → kotlarof@yandex.ru)
   v8: расписание отправки по чину хозяина —
     • бездѣйствіе 1 часъ (послѣ послѣдней реплики);
     • обновленіе или закрытіе страницы (pagehide);
     • выходъ изъ режима чата — по вызову zaharLogSendNow()
       изъ переключателя вкладокъ (телеграфъ, мои слова…);
     • переполненіе ленты (запасъ от потери старыхъ записей).
   Убрано: 5 минутъ тишины, 30-минутный сбросъ, отправка при скрытіи
   вкладки. Тостъ «журналъ отправленъ» убранъ совсѣмъ; записка въ углу
   теперь появляется ТОЛЬКО при отказѣ (сбой сети, file://, форма
   не активирована) — чтобы отказъ не проходилъ незаметно. Консоль:
   сторож перехватываетъ дверь молча, безъ строчки «перехвачена (разъ N)».
   Изъ v3–v7 сохранено: крючокъ двери со сторожемъ, дедуплікація,
   очи́стка только по подтвержденію, отправка частями по ~45 КБ,
   повторъ при сбое сети.
   API: zaharLogStatus(), zaharLogFlush(), zaharLogSendNow(причина),
        zaharLogVersions(), zaharLogMailto()
   Подключать ПОСЛЕ zahar_chat.js (лучше — последнимъ, после zahar_ether.js).
   ============================================================ */
(function () {
  if (window.__zaharLogLoaded) return;
  window.__zaharLogLoaded = true;

  var CFG = {
    email: 'kotlarof@yandex.ru',
    idleMs: 60 * 60 * 1000, /* v8: бездѣйствіе — часъ */
    hideMs: 60 * 1000,      /* v8: только для записки объ отказѣ */
    maxBuf: 400
  };

  var BUF = [];
  var idleTimer = null, hideTimer = null;
  var recaps = 0;
  var guardFrozen = false;
  var lastKey = '', lastAt = 0;

  /* память о попытках отправки — для zaharLogStatus() */
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
    /* дедупликация — по ядру реплики (первые 40 знаков, окно 60 сек):
       ответы с хвостом «Впрочемъ…» и без него склеиваются в один вход.
       Гость — по полному тексту, окно 10 секунд. */
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
    /* v8: лента подошла къ краю — отсылаемъ сразу, чтобы старые записи
       не срезались молча */
    if (BUF.length >= CFG.maxBuf) send('лента переполнена');
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

  /* --- сторож: дверь проверяется каждые 800 мс, перехватъ МОЛЧАЛІВЫЙ (v8) --- */
  function installDoor() {
    if (doorMarked()) return;
    if (!capture()) { guardFrozen = true; return; }
    recaps++;
    /* v8: строка «дверъ перехвачена (разъ N)» изъ консоли убрана —
       сторожъ работаетъ тихо */
  }
  if (capture()) recaps = 1;
  try { console.log('[zahar_log] v8: лента на линіи (часъ бездѣйствія, обновленіе, смена режима)'); } catch (e) {}
  setInterval(function () {
    if (!guardFrozen) installDoor();
  }, 800);

  /* --- сборъ версій обвязки (снимается съ файлов, отъ которыхъ отдал браузеръ) --- */
  var VER = { map: {}, done: false };
  var PRETTY = {
    'zahar_brain.js': 'мозгъ', 'zahar_chat.js': 'чатъ', 'words.js': 'words',
    'zahar_memory.js': 'память', 'zahar_dict.js': 'словарь', 'zahar_phrases.js': 'фразы',
    'zahar_custom.js': 'кастомъ', 'zahar_ether.js': 'эфиръ', 'zahar_embed.js': 'эмбедъ'
  };
  function labelFromText(txt) {
    var s = String(txt || '').slice(0, 4000), m;
    if ((m = s.match(/v\d+\.\d+[а-я]*/i))) return m[0];
    if ((m = s.match(/№\s*\d+(?:\.\d+)?[а-я]*(?=\s*\([^)]*\d{2}\.\d{2}\.\d{4})/))) return m[0];
    if ((m = s.match(/сборка\s*\d{4}-\d{2}-\d{2}/))) return m[0];
    return null;
  }
  function fileNameOf(src) {
    var p = String(src).split('?')[0].split('/');
    return p[p.length - 1];
  }
  function collectVersions(cb) {
    var scripts = [];
    try {
      var s = document.getElementsByTagName('script');
      for (var i = 0; i < s.length; i++) if (s[i].src) scripts.push(s[i].src);
    } catch (e) {}
    var seen = {}, uniq = [];
    scripts.forEach(function (src) {
      var nm = fileNameOf(src);
      if (PRETTY[nm] && !seen[nm]) { seen[nm] = 1; uniq.push(src); }
    });
    var pending = uniq.length;
    function finish() { if (cb) cb(VER.map); }
    if (!pending) { VER.done = true; finish(); return; }
    uniq.forEach(function (src) {
      fetch(src, { cache: 'no-store' }).then(function (r) { return r.ok ? r.text() : ''; })
        .then(function (t) {
          var nm = fileNameOf(src);
          var lab = labelFromText(t);
          if (lab) VER.map[nm] = lab;
          VER.done = true;
          if (--pending === 0) finish();
        })
        .catch(function () { VER.done = true; if (--pending === 0) finish(); });
    });
  }
  function versionHeader() {
    var rows = ['лента: v8'];
    Object.keys(PRETTY).forEach(function (f) {
      if (f === 'zahar_brain.js') return; /* ниже — по порядку важности */
      rows.push(PRETTY[f] + ': ' + (VER.map[f] || '—'));
    });
    rows.splice(1, 0, 'мозгъ: ' + (VER.map['zahar_brain.js'] || '—'));
    return 'Версіи обвязки: ' + rows.join(' | ');
  }
  try { collectVersions(); } catch (e) {}

  /* --- нарезка буфера по байтамъ (кириллица веситъ вдвое) --- */
  var MAXB = 45 * 1024;
  function byteLen(s) {
    var n = 0;
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c >= 0xD800 && c <= 0xDBFF && i + 1 < s.length && s.charCodeAt(i + 1) >= 0xDC00) { n += 4; i++; }
      else n += c < 128 ? 1 : (c < 2048 ? 2 : 3);
    }
    return n;
  }
  function buildChunks(reason, header) {
    var parts = [], cur = [], curB = 0;
    for (var i = 0; i < BUF.length; i++) {
      var line = '[' + BUF[i].t + '] ' + (BUF[i].who === 'guest' ? 'Гость' : 'Захаръ') + ': ' + BUF[i].text;
      var b = byteLen(line) + 1;
      if (curB + b > MAXB && cur.length) { parts.push(cur.join('\n')); cur = []; curB = 0; }
      cur.push(line); curB += b;
    }
    if (cur.length) parts.push(cur.join('\n'));
    var n = parts.length;
    for (var j = 0; j < n; j++) {
      parts[j] = header + '\n' +
        'Часть ' + (j + 1) + ' из ' + n + ' (' + reason + ')\n' +
        'Страница: ' + (location && location.href ? location.href : '—') + '\n\n' + parts[j];
    }
    return parts;
  }

  /* --- v8: записка на странице — ТОЛЬКО объ отказѣ (тост об удачѣ убранъ) --- */
  var noteEl = null;
  function noteShow(txtNote) {
    try {
      if (!noteEl) {
        noteEl = document.createElement('div');
        noteEl.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:99999;max-width:340px;background:#2b1d3a;color:#f5e9d0;font:13px/1.45 Georgia,serif;padding:10px 14px;border:1px solid #b3985a;border-radius:6px;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.4)';
        noteEl.title = 'щелчкомъ скрыть';
        noteEl.addEventListener('click', function () { noteEl.style.display = 'none'; });
        document.body.appendChild(noteEl);
      }
      noteEl.textContent = 'Журналъ: ' + txtNote;
      noteEl.style.display = 'block';
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(function () { if (noteEl) noteEl.style.display = 'none'; }, CFG.hideMs);
    } catch (e) {}
  }

  /* --- отправка — последовательно, частями; буферъ чистится только когда ушли всѣ части --- */
  function payloadFor(reason, body) {
    return JSON.stringify({
      _subject: 'Журналъ бесѣдъ съ Захаромъ — ' + reason,
      _captcha: 'false',
      message: body
    });
  }
  /* вердикт разбирается по телу ответа, а не по HTTP-статусу */
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
    if (msg.indexOf('open this page through a web server') >= 0 || msg.indexOf('file://') >= 0) {
      return 'страница открыта локально (file://) — FormSubmit отказываетъ. Откройте сайт по адресу GitHub Pages и повторите zaharLogFlush()';
    }
    if (/activat/i.test(msg)) {
      return 'форма не активирована: найдите письмо от FormSubmit на ' + CFG.email + ' (включая «Спамъ») и нажмите «Activate Form». Накопленное доставится после активации';
    }
    return 'отказъ FormSubmit: ' + msg;
  }

  function armRetry(reason) {
    if (LOG.retryTimer) clearTimeout(LOG.retryTimer);
    LOG.retryTimer = setTimeout(function () { LOG.retryTimer = null; send('повторъ'); }, 120000);
  }

  function send(reason) {
    if (!BUF.length) return false;
    LOG.lastTry = stamp();
    var header = versionHeader();
    var chunks = buildChunks(reason, header);
    var idx = 0, total = chunks.length;
    function step() {
      if (idx >= total) {
        LOG.lastOk = stamp(); LOG.lastErr = null;
        BUF = []; persist();
        /* v8: удачная отправка — полная тишина (ни консоли, ни тоста) */
        return;
      }
      var url = 'https://formsubmit.co/ajax/' + CFG.email;
      try {
        fetch(url, {
          method: 'POST',
          keepalive: true,
          headers: { 'Content-Type': 'application/json' },
          body: payloadFor(reason, chunks[idx])
        }).then(function (r) {
          return r.text().then(function (t) {
            var data = null;
            try { data = JSON.parse(t); } catch (e) { data = { error: t.slice(0, 200) }; }
            var v = verdict(data);
            if (v) {
              LOG.lastErr = stamp() + ' — ' + v;
              try { console.warn('[zahar_log] отправка НЕ ушла: ' + v); } catch (e) {}
              noteShow(v); /* записка только при отказѣ */
              armRetry(reason);
            } else {
              idx++;
              step();
            }
          });
        }).catch(function () {
          LOG.lastErr = stamp() + ' — сбой сети, повторъ черезъ 2 минуты';
          try { console.warn('[zahar_log] сеть не пропустила — повторъ черезъ 2 минуты'); } catch (e) {}
          noteShow('сбой сети — повторъ черезъ 2 минуты');
          armRetry(reason);
        });
      } catch (e) {
        LOG.lastErr = stamp() + ' — попытка не состоялась: ' + (e && e.message ? e.message : String(e));
        try { console.warn('[zahar_log] ' + LOG.lastErr); } catch (e2) {}
        noteShow('попытка не состоялась: ' + (e && e.message ? e.message : String(e)));
      }
    }
    step();
    return true;
  }

  /* запасная дорожка — почтовая программа с готовым письмом */
  function zaharLogMailto() {
    var body = versionHeader() + '\n\n' + (BUF.length
      ? BUF.slice(-30).map(function (e) { return '[' + e.t + '] ' + (e.who === 'guest' ? 'Гость' : 'Захаръ') + ': ' + e.text; }).join('\n')
      : '(журналъ пустъ)');
    var href = 'mailto:' + CFG.email + '?subject=' + encodeURIComponent('Журналъ бесѣдъ съ Захаромъ') +
      '&body=' + encodeURIComponent(body.slice(0, 1800));
    try { location.href = href; } catch (e) {}
  }
  window.zaharLogMailto = zaharLogMailto;

  function armIdle() {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(function () { send('часъ тишины'); }, CFG.idleMs);
  }

  /* v8: отправка при обновленіи/закрытіи страницы */
  window.addEventListener('pagehide', function () { send('страница обновлена или закрыта'); });

  /* v8: слушатель visibilitychange УБРАНЪ — переходъ на другую вкладку
     больше не отправляетъ журналъ.
     v8: 30-минутный сбросъ УБРАНЪ. */

  /* v8: крючокъ для смены режима — зовите изъ переключателя вкладокъ
     (чатъ → телеграфъ, чатъ → «мои слова»): window.zaharLogSendNow() */
  window.zaharLogSendNow = function (причина) {
    var r = send(причина || 'смена режима');
    return r ? 'Отправка журнала запущена.' : 'Журналъ пустъ — отправлять нечего.';
  };

  window.zaharLogStatus = function () {
    var doorState;
    if (guardFrozen) doorState = 'дверь заморожена — перехват невозможен';
    else if (doorMarked()) doorState = 'дверь обернута журналом';
    else doorState = 'дверь не обернута (сторож подхватит за 0,8 сек)';
    return { 'стоитъ': true, 'каналъ': 'почта → ' + CFG.email,
      'безъдѣйствіе': 'часъ',
      'репликъВъБуферѣ': BUF.length,
      'дверьОбернута': doorMarked(),
      'состояниеДвери': doorState,
      'перехватовДвери': recaps,
      'последняяПопытка': LOG.lastTry,
      'последнийУспех': LOG.lastOk,
      'последняяОшибка': LOG.lastErr };
  };
  window.zaharLogVersions = function () { return versionHeader(); };
  window.zaharLogFlush = function () {
    if (!BUF.length) return 'Журналъ пустъ — отправлять нечего.';
    send('пробная отправка');
    return 'Пробная отправка запущена. Черезъ несколько секундъ откройте консоль (F12) — при отказѣ будетъ строка «отправка НЕ ушла» съ точной причиной, она же всплыветъ запиской въ углу страницы. При удачѣ лента молчитъ.';
  };

  restore();
})();
