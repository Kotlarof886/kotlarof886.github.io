/* ============================================================
   zahar_boot.js — Захаръ грузится последним.
   Подключать ОДНИМ тегом в конце body вместо старых тегов Захара:
     <script src="zahar/zahar_boot.js"></script>
   Порядок: страница готова → браузер простаивает → словарь →
   мозг → слой → (фон, опционально) модель эмбеддингов.
   Событие готовности: document.dispatchEvent('zahar-ready').
   ИЗМЕНЕНО: AUTO_WAKE_MS = 20000 — модель эмбеддингов просыпается
   сама через 20 секунд после загрузки страницы.
   ============================================================ */
(function () {
    /* №51: полный порядок, как требует шапка мозга:
       словарь → words.js → фразы → мозг → слой → эмбеддинги.
       Отказ одного файла не валит всю цепочку — пишется предупреждение. */
    var FILES = [
    'zahar/zahar_dict.js',
    'zahar/words.js',
    'zahar/zahar_phrases.js',
    'zahar/zahar_brain.js',
    'zahar/zahar_chat.js',
    'zahar/zahar_embed.js'
  ];

  var AUTO_WAKE_MS = 20000; // 0 = модель просыпается только по кнопке;
                            // 20000 = фоновый прогрев через 20 секунд тишины

  function loadOne(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = function () { res(); };
      s.onerror = function () {
        console.warn('[zahar_boot] файлъ не загрузился (цепочка продолжается): ' + src);
        res();
      };
      document.head.appendChild(s);
    });
  }
  function pageLoaded() {
    return new Promise(function (res) {
      if (document.readyState === 'complete') return res();
      window.addEventListener('load', function once() {
        window.removeEventListener('load', once); res();
      });
    });
  }
  function idle() {
    return new Promise(function (res) {
      if (window.requestIdleCallback)
        window.requestIdleCallback(function () { res(); }, { timeout: 2000 });
      else setTimeout(res, 300);
    });
  }
  pageLoaded().then(function () {
    return idle();
  }).then(function () {
    var p = Promise.resolve();
    FILES.forEach(function (src) {
      p = p.then(function () { return loadOne(src); });
    });
    return p;
  }).then(function () {
    try { document.dispatchEvent(new Event('zahar-ready')); } catch (e) {
      try { document.dispatchEvent(new CustomEvent('zahar-ready')); } catch (e2) {}
    }
    console.info('[zahar_boot] Захаръ на мѣстѣ: ' + FILES.length + ' файл(ов)');
    if (AUTO_WAKE_MS > 0 && typeof window.ZAHAR_EMBED_WAKE === 'function') {
      console.info('[zahar_boot] прогрѣвъ модели черезъ ' + (AUTO_WAKE_MS / 1000) + ' сек.');
      setTimeout(function () { window.ZAHAR_EMBED_WAKE(); }, AUTO_WAKE_MS);
    }
  }).catch(function (e) {
    console.warn('[zahar_boot] ' + (e && e.message || e));
  });
})();
