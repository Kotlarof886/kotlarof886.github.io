/* ============================================================
   zahar_boot.js — Захаръ грузится последним. Сборка 14.11.2026 (правка №3 загрузчика)
   Подключать ОДНИМ тегом в конце body вместо старых тегов Захара:
     <script src="zahar/zahar_boot.js"></script>
   Порядок: страница готова → браузер простаивает →
     словарь → words.js → фразы → мозг → слой болтовни → тетрадь →
     (фон, опционально) модель эмбеддингов.
   Требование шапки мозга (v2.18): подключать ПОСЛЕДНИМ, после
     zahar_memory.js, zahar_dict.js, words.js, zahar_phrases.js — соблюдено.
   №3 загрузчика:
     1) кэш-глушение: каждый файл грузится с ?v=3 — браузер больше не
        подсовывает старые копии (в том числе запомненные 404);
     2) words.js ищется по трём путям подряд: zahar/words.js → words.js →
        zahar/zahar_words.js — где бы файл ни лежал, цепочка его найдёт;
     3) поверка после цепочки: если массив ENTRIES не определился,
        загрузчик скажет об этом в консоли прямо и по именам.
   Недостающий файл цепочку не валит — Захар встанет на остальном.
   Событие готовности: document.dispatchEvent('zahar-ready').
   ============================================================ */
(function () {
  var BOOTV = '4';

  var FIRST = [
    'zahar/zahar_dict.js'
  ];

  /* слова ищутся по очереди, пока один не встанет */
  var WORDS_PATHS = [
    'zahar/words.js',
    'words.js',
    'zahar/zahar_words.js'
  ];

  var REST = [
    'zahar/zahar_phrases.js',
    'zahar/zahar_brain.js',
    'zahar/zahar_chat.js',
    'zahar/zahar_custom.js',
    'zahar/zahar_embed.js'
  ];

  var AUTO_WAKE_MS = 20000; // 0 = модель просыпается только по кнопке;
                            // 20000 = фоновый прогрев через 20 секунд тишины

  var loaded = [], failed = [];

  function loadOne(src) {
    return new Promise(function (res) {
      var s = document.createElement('script');
      s.src = src + '?v=' + BOOTV; /* кэш-глушение: всегда свежий файл */
      s.onload = function () { loaded.push(src); res(true); };
      s.onerror = function () {
        failed.push(src);
        console.warn('[zahar_boot] файлъ не загрузился: ' + src);
        res(false); /* цепочка не падает — идём дальше */
      };
      document.head.appendChild(s);
    });
  }

  /* words.js: перебор путей; встал — но массива нет? пробуем след. путь */
  function loadWords() {
    var i = 0;
    function next() {
      if (i >= WORDS_PATHS.length) {
        console.warn('[zahar_boot] words.js не нашёлся ни по одному пути: ' + WORDS_PATHS.join(' → '));
        return Promise.resolve(false);
      }
      var path = WORDS_PATHS[i++];
      return loadOne(path).then(function (ok) {
        var has = false;
        try { has = (typeof ENTRIES !== 'undefined' && Array.isArray(ENTRIES)); } catch (e) { has = false; }
        if (ok && has) return true;
        return next();
      });
    }
    return next();
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
    FIRST.forEach(function (src) {
      p = p.then(function () { return loadOne(src); });
    });
    p = p.then(loadWords);
    REST.forEach(function (src) {
      p = p.then(function () { return loadOne(src); });
    });
    return p;
  }).then(function () {
    try { document.dispatchEvent(new Event('zahar-ready')); } catch (e) {
      try { document.dispatchEvent(new CustomEvent('zahar-ready')); } catch (e2) {}
    }
    var words = -1;
    try { if (typeof ENTRIES !== 'undefined' && Array.isArray(ENTRIES)) words = ENTRIES.length; } catch (e) {}
    if (words >= 0) {
      console.info('[zahar_boot] Захаръ на мѣстѣ: всѣ ступени встали, казённыхъ статей: ' + words +
        (failed.length ? '; не дошли: ' + failed.join(', ') : ''));
    } else {
      console.warn('[zahar_boot] Захаръ всталъ на ' + loaded.length + ' файл(ах), НО казённыхъ статей нѣтъ:' +
        ' массив ENTRIES не опредѣлился. Смотрите строку «words.js» выше.');
    }
    if (failed.length) {
      console.warn('[zahar_boot] НЕ ДОШЛИ: ' + failed.join(', '));
    }
    if (AUTO_WAKE_MS > 0 && typeof window.ZAHAR_EMBED_WAKE === 'function') {
      console.info('[zahar_boot] прогрѣвъ модели черезъ ' + (AUTO_WAKE_MS / 1000) + ' сек.');
      setTimeout(function () { window.ZAHAR_EMBED_WAKE(); }, AUTO_WAKE_MS);
    }
  }).catch(function (e) {
    console.warn('[zahar_boot] ' + (e && e.message || e));
  });
})();
