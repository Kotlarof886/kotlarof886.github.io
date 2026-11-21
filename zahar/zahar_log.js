 /* ============================================================
   zahar_log.js v9 — журнальная лента (почта → kotlarof@yandex.ru)
   ============================================================ */
(function () {
  if (window.__zaharLogLoaded) return;
  window.__zaharLogLoaded = true;

  var CFG = {
    email: 'kotlarof@yandex.ru',
    idleMs: 60 * 60 * 1000,
    minIntervalMs: 60 * 60 * 1000,
    rateLimitMs: 60 * 60 * 1000,
    retryNetMs: 2 * 60 * 1000,
    hideMs: 60 * 1000,
    maxBuf: 500
  };

  var BUF = [];
  var idleTimer = null, hideTimer = null;
  var recaps = 0;
  var guardFrozen = false;
  var lastKey = '', lastAt = 0;
  var sending = false;

  var LOG = { lastTry: null, lastOk: null, lastErr: null, retryTimer: null };

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function stamp(t) {
    var d = new Date(t || Date.now());
    return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear() +
      ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }

  function getNum(key) {
    try { return Number(localStorage.getItem(key)) || 0; } catch (e) { return 0; }
  }
  function setNum(key, val) {
    try { localStorage.setItem(key, String(val)); } catch (e) {}
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
    if (BUF.length >= CFG.maxBuf) send('лента переполнена', false);
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
    var firstArg = (args && args.length > 0) ? args.shift() : '';
    var q = String(firstArg == null ? '' : firstArg);
    var callArgs = [firstArg].concat(args);
    add('guest', q);
    var r;
    try { r = orig.apply(self, callArgs); }
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

  function installDoor() {
    if (doorMarked()) return;
    if (!capture()) { guardFrozen = true; return; }
    recaps++;
  }
  if (capture()) recaps = 1;
  try { console.log('[zahar_log] v9: лента на линіи (целикомъ, не чаще 1 раза въ часъ)'); } catch (e) {}
  setInterval(function () {
    if (!guardFrozen) installDoor();
  }, 800);

  var VER = { map: {}, done: false };
  var PRETTY = {
    'zahar_brain.js': 'мозгъ', 'zahar_chat.js': 'чатъ', 'words.js': 'words',
    'zahar_memory.js': 'память', 'zahar_dict.js': 'словарь', 'zahar_phrases.js': 'фразы',
    'zahar_custom.js': 'кастомъ', 'zahar_ether.js': 'эфиръ', 'zahar_embed.js': 'эмбедъ'
  };
  function labelFromText(txt) {
    var s = String(txt || '').slice(0, 4000), m;
    if ((m = s.match(/v\d+\.\d+[а-я]*/i))) return m.shift();
    if ((m = s.match(/№\s*\d+(?:\.\d+)?[а-я]*(?=\s*\([^)]*\d{2}\.\d{2}\.\d{4})/))) return m.shift();
    if ((m = s.match(/сборка\s*\d{4}-\d{2}-\d{2}/))) return m.shift();
    return null;
  }
  function fileNameOf(src) {
    var cleanUrl = String(src).split('?').shift();
    return cleanUrl.split('/').pop();
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
    var rows = ['лента: v9'];
    Object.keys(PRETTY).forEach(function (f) {
      if (f === 'zahar_brain.js') return;
      rows.push(PRETTY[f] + ': ' + (VER.map[f] || '—'));
    });
    rows.splice(1, 0, 'мозгъ: ' + (VER.map['zahar_brain.js'] || '—'));
    return 'Версіи обвязки: ' + rows.join(' | ');
  }
  try { collectVersions(); } catch (e) {}

  function buildFullText(reason, header) {
    var lines = [];
    for (var i = 0; i < BUF.length; i++) {
      lines.push('[' + BUF[i].t + '] ' + (BUF[i].who === 'guest' ? 'Гость' : 'Захаръ') + ': ' + BUF[i].text);
    }
    return header + '\n' +
      'Причина отправки: ' + reason + ' (репликъ: ' + BUF.length + ')\n' +
      'Страница: ' + (location && location.href ? location.href : '—') + '\n\n' +
      lines.join('\n');
  }

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

  function payloadFor(reason, body) {
    return JSON.stringify({
      _subject: 'Журналъ бесѣдъ съ Захаромъ — ' + reason,
      _captcha: 'false',
      message: body
    });
  }

  function verdict(data, status) {
    var ok = false;
    if (data && typeof data === 'object') {
      if (data.success === true || data.success === 'true') ok = true;
      else if (data.ok === true || data.ok === 'true') ok = true;
    }
    if (ok) return null;

    var msg = (data && typeof data === 'object' && (data.message || data.error))
      ? String(data.message || data.error) : 'ответъ безъ подтвержденія';

    if (status === 429 || /rate limit/i.test(msg)) {
      return { text: 'лимитъ частоты FormSubmit (429) — пауза на 1 часъ', isRateLimit: true };
    }
    if (msg.indexOf('open this page through a web server') >= 0 || msg.indexOf('file://') >= 0) {
      return { text: 'страница открыта локально (file://) — FormSubmit отказываетъ', isRateLimit: false };
    }
    if (/activat/i.test(msg)) {
      return { text: 'форма не активирована на ' + CFG.email, isRateLimit: false };
    }
    return { text: 'отказъ FormSubmit: ' + msg, isRateLimit: false };
  }

  function armRetry(delayMs) {
    if (LOG.retryTimer) clearTimeout(LOG.retryTimer);
    LOG.retryTimer = setTimeout(function () {
      LOG.retryTimer = null;
      send('повторъ послѣ паузы', false);
    }, delayMs);
  }
function send(reason, force) {
if (!BUF.length || sending) return false;
var now = Date.now();
if (!force) {
var blockedUntil = getNum('zahar_log_blocked_until');
if (blockedUntil > now) {
var waitMin = Math.ceil((blockedUntil - now) / 60000);
LOG.lastErr = stamp() + ' — ожидание снятія лимита FormSubmit (осталось ~' + waitMin + ' мин.)';
return false;
}
var lastSent = getNum('zahar_log_last_sent');
if (lastSent && (now - lastSent < CFG.minIntervalMs)) {
var nextMin = Math.ceil((CFG.minIntervalMs - (now - lastSent)) / 60000);
LOG.lastErr = stamp() + ' — отложено: отправка не чаще 1 раза въ часъ (черезъ ~' + nextMin + ' мин.)';
armRetry(CFG.minIntervalMs - (now - lastSent) + 2000);
return false;
}
}
sending = true;
LOG.lastTry = stamp();
var header = versionHeader();
var fullBody = buildFullText(reason, header);
var url = 'https://formsubmit.co/ajax/' + CFG.email;
try {
fetch(url, {
method: 'POST',
keepalive: true,
headers: { 'Content-Type': 'application/json' },
body: payloadFor(reason, fullBody)
}).then(function (r) {
var status = r.status;
return r.text().then(function (t) {
sending = false;
var data = null;
try { data = JSON.parse(t); } catch (e) { data = { error: t.slice(0, 200) }; }
var errObj = verdict(data, status);
if (errObj) {
LOG.lastErr = stamp() + ' — ' + errObj.text;
try { console.warn('[zahar_log] отправка НЕ ушла: ' + errObj.text); } catch (e) {}
noteShow(errObj.text);
if (errObj.isRateLimit) {
setNum('zahar_log_blocked_until', Date.now() + CFG.rateLimitMs);
armRetry(CFG.rateLimitMs);
} else {
armRetry(CFG.retryNetMs);
}
} else {
LOG.lastOk = stamp();
LOG.lastErr = null;
setNum('zahar_log_last_sent', Date.now());
setNum('zahar_log_blocked_until', 0);
BUF = [];
persist();
}
});
}).catch(function () {
sending = false;
LOG.lastErr = stamp() + ' — сбой сети, повторъ черезъ 2 минуты';
try { console.warn('[zahar_log] сеть не пропустила — повторъ черезъ 2 минуты'); } catch (e) {}
noteShow('сбой сети — повторъ черезъ 2 минуты');
armRetry(CFG.retryNetMs);
});
} catch (e) {
sending = false;
LOG.lastErr = stamp() + ' — попытка не состоялась: ' + (e && e.message ? e.message : String(e));
try { console.warn('[zahar_log] ' + LOG.lastErr); } catch (e2) {}
noteShow('попытка не состоялась: ' + (e && e.message ? e.message : String(e)));
}
return true;
}
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
idleTimer = setTimeout(function () { send('часъ тишины', false); }, CFG.idleMs);
}
window.addEventListener('pagehide', function () { send('страница обновлена или закрыта', false); });
window.zaharLogSendNow = function (причина) {
var r = send(причина || 'смена режима', false);
return r ? 'Отправка журнала запущена.' : (LOG.lastErr || 'Журналъ пустъ — отправлять нечего.');
};
window.zaharLogStatus = function () {
var doorState;
if (guardFrozen) doorState = 'дверь заморожена — перехват невозможен';
else if (doorMarked()) doorState = 'дверь обернута журналом';
else doorState = 'дверь не обернута (сторож подхватит за 0,8 сек)';
return {
'стоитъ': true,
'версія': 'v9',
'каналъ': 'почта → ' + CFG.email,
'лимитъЧастоты': 'не чаще 1 раза въ часъ',
'репликъВъБуферѣ': BUF.length,
'дверьОбернута': doorMarked(),
'состояниеДвери': doorState,
'перехватовДвери': recaps,
'последняяПопытка': LOG.lastTry,
'последнийУспех': LOG.lastOk,
'последняяОшибка': LOG.lastErr
};
};
window.zaharLogVersions = function () { return versionHeader(); };
window.zaharLogFlush = function () {
if (!BUF.length) return 'Журналъ пустъ — отправлять нечего.';
send('пробная отправка', true);
return 'Пробная отправка запущена (безъ учёта часового фильтра).';
};
restore();
})();
