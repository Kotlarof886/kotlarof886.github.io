/* ============================================================
   zahar_log.js — журнальная лента бесѣдъ съ Захаромъ (сборка 13.11.2026)
   Каналъ: почта (FormSubmit) → kotlarof@yandex.ru
   Что собираетъ: всѣ депеши гостя и всѣ отвѣты Захара — обёртка
   стоитъ надъ window.ZAHAR_ASK (дверъ слоя живой болтовни).
   Когда отправляетъ: закрытіе/обновленіе вкладки, переходъ въ другой
   разрѣдъ сайта, 5 минутъ тишины; вкладка скрыта болѣе минуты — тожѣ
   отправка (вернулись раньше — отмѣна).
   Храненіе: буферъ въ localStorage — недоставленное доедетъ слѣдующимъ разомъ.
   Подключать ПОСЛЕ zahar_chat.js:
     <script src="zahar/zahar_log.js"></script>
   Диагностика: zaharLogStatus() — стоитъ ли и сколько репликъ въ буферѣ;
                zaharLogFlush() — отправить немедленно (для пробы).
   Важно: первая отправка вызоветъ письмо «Please activate» отъ FormSubmit —
   кликнуть один разъ, каналъ откроется навсегда.
   ============================================================ */
(function () {
  'use strict';
  if (window.__zaharLogLoaded) return;
  window.__zaharLogLoaded = true;

  var EMAIL = 'kotlarof@yandex.ru';
  var IDLE_MS = 5 * 60 * 1000;      /* 5 минутъ тишины */
  var HIDDEN_MS = 60 * 1000;        /* вкладка скрыта болѣе минуты */
  var MAX_BUF = 400;                /* потолокъ буфера */

  var buf = [];
  var idleT = null;
  var hiddenT = null;

  function loadBuf() {
    try { buf = JSON.parse(localStorage.getItem('zahar_log_v1') || '[]') || []; }
    catch (e) { buf = []; }
    if (!Array.isArray(buf)) buf = [];
  }
  function saveBuf() {
    try { localStorage.setItem('zahar_log_v1', JSON.stringify(buf.slice(-MAX_BUF))); } catch (e) {}
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function stamp() {
    var d = new Date();
    return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear() +
      ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }

  function push(role, text) {
    var s = String(text == null ? '' : text);
    if (!s) return;
    buf.push({ t: stamp(), r: role, x: s.slice(0, 2000) });
    saveBuf();
    idleReset();
  }

  function compose(reason) {
    var lines = [], i;
    for (i = 0; i < buf.length; i++) {
      lines.push('[' + buf[i].t + '] ' + buf[i].r + ': ' + buf[i].x);
    }
    return 'ЖУРНАЛЪ БЕСѢДЪ СЪ ЗАХАРОМЪ\n' +
      'Дата отправки: ' + stamp() + '\n' +
      'Страница: ' + location.href + '\n' +
      'Причина отправки: ' + reason + '\n' +
      'Репликъ въ журнале: ' + buf.length + '\n\n' +
      lines.join('\n');
  }

  function send(reason) {
    if (!buf.length) return 'Журналъ пустъ — отправлять нечего.';
    var body = compose(reason);
    var payload = { _subject: 'Журналъ бесѣдъ съ Захаромъ', _template: 'box', message: body };
    var url = 'https://formsubmit.co/ajax/' + EMAIL;
    var ok = false;
    try {
      if (navigator.sendBeacon) {
        ok = navigator.sendBeacon(url, new Blob([JSON.stringify(payload)], { type: 'application/json' }));
      }
    } catch (e) {}
    if (!ok) {
      try {
        fetch(url, {
          method: 'POST',
          keepalive: true,
          headers: { 'Content-Type': 'application/json;charset=UTF-8' },
          body: JSON.stringify(payload)
        }).catch(function () {});
      } catch (e) {}
    }
    buf = [];
    saveBuf();
    return 'Отправлено: ' + reason;
  }

  function idleReset() {
    if (idleT) clearTimeout(idleT);
    idleT = setTimeout(function () {
      idleT = null;
      send('5 минутъ тишины — линія умолкла');
    }, IDLE_MS);
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      if (!hiddenT) {
        hiddenT = setTimeout(function () {
          hiddenT = null;
          send('вкладка скрыта болѣе минуты');
        }, HIDDEN_MS);
      }
    } else if (hiddenT) {
      clearTimeout(hiddenT);
      hiddenT = null;
    }
  });

  window.addEventListener('pagehide', function () {
    if (hiddenT) { clearTimeout(hiddenT); hiddenT = null; }
    if (idleT) { clearTimeout(idleT); idleT = null; }
    send('линія разомкнута: закрытіе/обновленіе вкладки или переходъ по сайту');
  });

  function wrap() {
    var ask = window.ZAHAR_ASK;
    if (typeof ask !== 'function') { setTimeout(wrap, 400); return; }
    if (ask.__zaharLog) return;
    function w(q) {
      push('Гость', q);
      var r;
      try { r = ask(q); }
      catch (e) { push('Захаръ', '(сбой аппарата: ' + e + ')'); throw e; }
      if (r && typeof r.then === 'function') {
        r.then(function (a) { push('Захаръ', a); }, function () {});
      } else if (r !== undefined) {
        push('Захаръ', r);
      }
      return r;
    }
    w.__zaharLog = true;
    window.ZAHAR_ASK = w;
  }
  wrap();

  window.zaharLogStatus = function () {
    return { стоитъ: true, каналъ: 'почта → ' + EMAIL, репликъВъБуферѣ: buf.length };
  };
  window.zaharLogFlush = function () { return send('пробная отправка по командѣ'); };

  loadBuf();
  idleReset();
})();
