/* ============================================================
   zahar_boot.js — Захаръ грузится последним. Сборка 15.11.2026 (правка №5 загрузчика)
   Подключать ОДНИМ тегом в конце body вместо старых тегов Захара:
     <script src="zahar/zahar_boot.js"></script>
   (файл boot кладётся туда же, где лежит страница, или в папку zahar/)

   Правка №5:
     1) в цепь добавлен zahar_memory.js (раньше загрузчик его не грузил —
        мозгъ оставался безъ памяти репликъ молча);
     2) КАЖДЫЙ файл ищется по двум путям: сначала в папке zahar/,
        потом рядом со страницей — где файлы лежат, цепочка найдёт;
     3) громкій вердиктъ въ консоли по КАЖДОМУ слою: словарь, слова,
        память, мозгъ, слой болтовни, кастомные пары, семантика —
        молчаливый слой больше не маскируется;
     4) кэш-глушение: ?v=5 у каждого файла.

   Порядок: страница готова → браузер простаивает →
     память → словарь → words.js → фразы → мозг → слой болтовни →
     кастомные пары → (фон, опционально) модель эмбеддингов.
   Недостающий файл цепочку не валит — Захар встанет на остальном,
   а вердикт назовёт недошедшее по именам.
   ============================================================ */
(function () {
  var BOOTV = '5';

  /* память и словарь — данные, грузятся первыми */
  var FIRST = [
    ['zahar/zahar_memory.js', 'zahar_memory.js'],
    ['zahar/zahar_dict.js',   'zahar_dict.js']
  ];

  /* слова ищутся по очереди, пока один не встанет */
  var WORDS_PATHS = [
    ['zahar/words.js', 'words.js'],
    ['zahar/zahar_words.js', 'zahar_words.js']
  ];

  var REST = [
    ['zahar/zahar_phrases.js', 'zahar_phrases.js'],
    ['zahar/zahar_brain.js',   'zahar_brain.js'],
    ['zahar/zahar_chat.js',    'zahar_chat.js'],
    ['zahar/zahar_custom.js',  'zahar_custom.js'],
    ['zahar/zahar_embed.js',   'zahar_embed.js']
  ];

  var AUTO_WAKE_MS = 20000; // 0 = модель просыпается только по кнопке;
                            // 20000 = фоновый прогрев через 20 секунд тишины

  var loaded = [], failed = [];

  function loadOne(paths) {
    return new Promise(function (res) {
      var i = 0;
      function next() {
        if (i >= paths.length) { res(false); return; }
        var src = paths[i++];
        var s = document.createElement('script');
        s.src = src + '?v=' + BOOTV; /* кэш-глушение: всегда свежий файл */
        s.onload = function () { loaded.push(src); res(true); };
        s.onerror = function () {
          console.warn('[zahar_boot] не нашёлся: ' + src);
          next(); /* пробуем запасной путь */
        };
        document.head.appendChild(s);
      }
      next();
    });
  }

  /* слова: встал файл — но массива нет? пробуем след. дорожку */
  function loadWords() {
    var i = 0;
    function next() {
      if (i >= WORDS_PATHS.length) {
        console.warn('[zahar_boot] words.js не нашёлся ни по одному пути');
        return Promise.resolve(false);
      }
      return loadOne(WORDS_PATHS[i++]).then(function (ok) {
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

  /* громкій вердиктъ по слоямъ */
  function verdict() {
    var words = -1, mem = -1, pairs = -1;
    try { if (typeof ENTRIES !== 'undefined' && Array.isArray(ENTRIES)) words = ENTRIES.length; } catch (e) {}
    try { if (typeof ZAHAR_MEMORY_FILE !== 'undefined' && Array.isArray(ZAHAR_MEMORY_FILE)) mem = ZAHAR_MEMORY_FILE.length; } catch (e) {}
    try { if (window.ZAHAR_CUSTOM_DATA && Array.isArray(window.ZAHAR_CUSTOM_DATA.pairs)) pairs = window.ZAHAR_CUSTOM_DATA.pairs.length; } catch (e) {}
    var st = [];
    st.push('словарь: ' + (typeof window.ZAHAR_DICT !== 'undefined' ? 'есть' : 'не отмечен (не мешает)'));
    st.push('слова (ENTRIES): ' + (words >= 0 ? words + ' статей' : 'НЕТ'));
    st.push('память (ZAHAR_MEMORY_FILE): ' + (mem >= 0 ? mem + ' реплик' : 'НЕТ'));
    st.push('мозгъ: ' + (typeof window.ZAHAR_ASK === 'function' ? 'всталъ' : 'НЕТ'));
    st.push('слой болтовни: ' + (window.__zaharChatInstalled ? 'всталъ' : 'НЕ ВСТАЛ'));
    st.push('кастомныя пары: ' + (pairs >= 0 ? pairs + ' шт.' : 'НЕТ'));
    st.push('семантика (модель): ' + (typeof window.ZAHAR_EMBED_WAKE === 'function' ? 'встала' : 'НЕТ'));
    console.info('[zahar_boot] ВЕРДИКТЪ: ' + st.join(' | '));

    if (!window.__zaharChatInstalled) {
      console.warn('[zahar_boot] СЛОЙ БОЛТОВНИ НЕ ВСТАЛ. Файл zahar_chat.js не дошел: ' +
        'проверьте, что он лежит в папке zahar/ рядом со страницей (или рядом с ней), ' +
        'имя ровно zahar_chat.js, и что загрузился без ошибки (вкладка Console, строки выше). ' +
        'Проверка слоя: введите в консоли zaharChatStatus().');
    }
    if (words < 0) {
      console.warn('[zahar_boot] СЛОВА НЕ ВСТАЛИ: массив ENTRIES не опредѣлился — смотрите строки «не нашёлся» выше.');
    }
    if (failed.length) {
      console.warn('[zahar_boot] НЕ ДОШЛИ (в объезд найдены запасные пути или отсутствуют): ' + failed.join(', '));
    }
  }

  pageLoaded().then(function () {
    return idle();
  }).then(function () {
    var p = Promise.resolve();
    FIRST.forEach(function (paths) {
      p = p.then(function () { return loadOne(paths); });
    });
    p = p.then(loadWords);
    REST.forEach(function (paths) {
      p = p.then(function () { return loadOne(paths); });
    });
    return p;
  }).then(function () {
    try { document.dispatchEvent(new Event('zahar-ready')); } catch (e) {
      try { document.dispatchEvent(new CustomEvent('zahar-ready')); } catch (e2) {}
    }
    verdict();
    if (AUTO_WAKE_MS > 0 && typeof window.ZAHAR_EMBED_WAKE === 'function') {
      console.info('[zahar_boot] прогрѣвъ модели черезъ ' + (AUTO_WAKE_MS / 1000) + ' сек.');
      setTimeout(function () { window.ZAHAR_EMBED_WAKE(); }, AUTO_WAKE_MS);
    }
  }).catch(function (e) {
    console.warn('[zahar_boot] ' + (e && e.message || e));
  });
})();
