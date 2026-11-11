/* ============================================================
   zahar_embed.js — правка №25: семантический роутер на эмбеддингах.
   Библиотека: @huggingface/transformers v3 (ModernBERT поддержка).
   Подключать ПОСЛЕ zahar_chat.js (обычным тегом, не type="module"):
     <script src="zahar/zahar_embed.js"></script>
   Модель просыпается сама через 20 секундъ (будильникъ №25),
     - либо вручную: ZAHAR_EMBED_WAKE()
     - либо по кнопке: элемент с атрибутом data-zahar-embed (или .zahar-embed-wake)
   ИЗМЕНЕНО (№21): хук теперь вешается на window.ZAHAR_ASK —
   настоящую точку входа слоя чата (раньше вешали на window.chat,
   которой у Захара нет, поэтому роутер молчал).
   Диагностика: console.info печатает top-3 интента на каждый запрос,
   статус — window.zaharEmbedStatus()
   ============================================================ */ 
(function () {
  if (window.__zaharEmbedLoaded) return;
  window.__zaharEmbedLoaded = true;

  var VERSION = 'правка №25 · эмбеддинги USER2-small (v3)';

  var CFG = {
    model: 'USER2-small-ONNX',        // папка в models/
    dim: 128,                         // MRL-урезание; 0 = полные 384
    threshold: 0.72,                  // порог top-1 (подобрать на тестах)
    margin: 0.03,                     // отрыв от top-2
    tfUrl: 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.0'
  };

  var state = { status: 'idle', extractor: null, index: null, last: null, error: null, loading: null };

  /* --- нормализация: та же, что в слое (ять/ъ/ь/і под модель не идут) --- */
  function norm(s) {
    return String(s || '').toLowerCase()
      .replace(/ё/g, 'е').replace(/[ъь]/g, '')
      .replace(/[іi]/g, 'и').replace(/ѳ/g, 'ф')
      .replace(/[^a-zа-я0-9\s]/g, ' ')
      .replace(/\s+/g, ' ').trim();
  }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function addr() {
    var g = window.ZAHAR_USER_GENDER, a = window.ZAHAR_USER_AGE;
    if (g === 'f') return (a && a < 14) ? 'юная барышня' : (a && a >= 55) ? 'матушка' : 'сударыня';
    return (a && a < 14) ? 'юный барин' : (a && a >= 55) ? 'почтеннейший сударь' : 'сударь';
  }
  function nmOr() { return window.ZAHAR_USER_NAME || addr(); }
  function fill(s) { return String(s).replace(/\{N\}/g, nmOr()).replace(/\{A\}/g, addr()); }

  /* ---------- стартовый набор интентов ---------- */
  var INTENTS = [
    { id: 'fish',    examples: ['какая нынче рыбалка', 'ходили ли вы на рыбалку', 'чебак клюет', 'на удочку ловите', 'клева сегодня нет'] },
    { id: 'hunt',    examples: ['собираетесь на охоту', 'охотитесь ли вы', 'какой зверь в тайге водится', 'ружье у вас есть'] },
    { id: 'city',    examples: ['как вам наш город', 'любите ли барнаул', 'что за город у нас', 'где лучше всего в городе'] },
    { id: 'railway', examples: ['слыхали про железную дорогу', 'поезд скоро пойдет', 'можно ли доехать до станции обской', 'рельсы дотянулись ли'] },
    { id: 'merchants', examples: ['купцы нынче богатеют', 'что про сухова скажете', 'какие магазины в городе', 'торговля как идет'] },
    { id: 'family',  examples: ['есть ли у вас семья', 'женаты ли вы', 'дети у вас есть', 'родня где живет'] },
    { id: 'sad',     examples: ['что-то тоскливо сегодня', 'на сердце тоска', 'соскучился по дому', 'грустно мне', 'душа не на месте', 'грустно как-то'] },
    { id: 'health',  examples: ['как ваше здоровье', 'не болеете ли вы', 'что-то нездоровится', 'самочувствие как', 'здоровье расстроилось'] },
    { id: 'tea',     examples: ['отведать бы чаю', 'чайку бы горячего', 'самовар у вас кипит', 'стаканчик чая не помешает', 'самовар бы сейчас'] },
    { id: 'thanks',  examples: ['благодарю вас', 'спасибо вам', 'очень признателен'] },
    { id: 'joke',    examples: ['анекдот расскажете', 'шутки у вас есть', 'рассмешите меня', 'расскажи что-нибудь смешное'] },
    { id: 'boring',  examples: ['что-то скучно у вас', 'чем развлекаетесь', 'делать тут нечего'] },
    { id: 'taiga',   examples: ['страшно ли в тайге', 'медведя встречали', 'далеко ли до тайги', 'кедрач это где', 'страшно одному в лесу'] },
    { id: 'wire',    examples: ['много депеш нынче', 'морзе еще помните', 'аппарат чинен ли', 'линия не барахлит'] },
    { id: 'money',   examples: ['заработков хватает', 'цены нынче кусаются', 'сколько получают телеграфисты', 'жалование какое', 'вам мало платят'] },
    { id: 'season',  examples: ['какая нынче пора', 'скоро ли зима', 'какое время года на дворе'] },
    { id: 'age',     examples: ['годков-то много вам', 'давно вы на свете', 'молодой еще вы'] },
    { id: 'farewell',examples: ['свидания до поры', 'не поминайте лихом', 'позвольте откланяться'] }
  ];

  var RESPONSES = {
    fish:    ['Рыбалка — моя слабость, {N}. Чебак на удочку берет исправно, при случае и нельма попадается — рассказать, где клевает?', 'Ежели спросите про рыбалку — тут я разговорчив: Обь кормит, чебак идет, иную пору и ершей на уху наберешь.'],
    hunt:    ['Охота — дело серьезное. Соболь дороже всего, но и белка промыслом идет пачками; ружье казенное, тайжных мест знаю немало.'],
    city:    ['Барнаул нынче на подъеме, {N}: завод погас, зато купцы и железная дорога дело живят. Музей наш — старейший в Сибири.'],
    railway: ['Железная дорога — разговор всех 1896 года! В октябре пустили сообщение до Обской станции; с пристанями нашими это дело изменится.'],
    merchants: ['Купечество в городе сильное: Сухов городским головой с 1894-го, товар через пристанье Оби большими партиями идет.'],
    family:  ['Семья у меня скромная, {A}: дело служебное да провода — товарищи верные. А родня в тягу — по здешним меркам дело обычное.'],
    sad:     ['Тоска, говорите? Три лекарства здешние знаю: горячий чай, дело, да Обь на закате. Помогает — проверено на себе.'],
    health:  ['Здоровьем не жалуюсь, {N}: дело сидячее, зато чай горячий и воздух местный — средство в меру.'],
    tea:     ['Самовар не остыл, {N}! Стакан — миновать не желаю; чай — главное блюдо телеграфиста.'],
    thanks:  ['На здоровье, {N}. Дело пустое — за что благодарить-то.'],
    joke:    ['Шутка в прозе: телеграфист всю ночь депеши принимал, а наутро растерялся — сосед его расхвалил, что аппарат у него работал без перерыва.'],
    boring:  ['Скучно? Это дело поправимое: спросите про нельму или про соболя — расскажу так, что заскучать некогда будет.'],
    taiga:   ['Тайга — дело не для слабонервных: медведь хозяин, да и волк не дремлет. Но той же осенью — красота несказанная.'],
    wire:    ['Депеши идут исправно, {N}: линия живая, аппарат чинен, морзянка косточки пальцам держит в тонусе.'],
    money:   ['Жалованье телеграфиста — дело казенное: невелико, но весьма прочно. Цены у нас купеческие, но рынок живой.'],
    season:  ['Пора нынче поздняя, {A}: Обь скоро в лед оденется, снегирь в город прилетит — примета верная.'],
    age:     ['Годов у меня столько, сколько проводов — не сосчитать, а на виду — в самом расцвете.'],
    farewell:['Прощайте, {N}. Дело оставляю на потом; заглядывайте — самовар в искре, депеши с аппарата не сходят.']
  };

  function runIntent(id, q) {
    var arr = RESPONSES[id];
    if (arr && arr.length) return fill(pick(arr));
    return null; // нет заготовки — отдать исходный ответ слоя
  }

  /* ---------- ленивое просыпание ---------- */
  function wake() {
    if (state.status === 'ready') return Promise.resolve(true);
    if (state.loading) return state.loading;
    state.status = 'loading';
    notify('Захаръ просыпается… (модель грузится)');
    state.loading = (async function () {
      try {
        var mod = await import(CFG.tfUrl);
        var env = mod.env;
        env.allowLocalModels = true;
        /* путь от текущей страницы: работает и в корне github.io,
           и в подпапке имя-репозитория */
        env.localModelPath = window.location.href.replace(/[^/]*$/, '') + 'models/';
        env.allowRemoteModels = true;   // не найдено локально → Hugging Face
        state.extractor = await mod.pipeline('feature-extraction', CFG.model, { dtype: 'q8' });
        await buildIndex();
        state.status = 'ready';
        notify('Захаръ проснулсяъ: семантическій роутеръ на мѣстѣ');
        return true;
      } catch (e) {
        state.status = 'failed';
        state.error = (e && e.message) || String(e);
        console.warn('[zahar_embed] просыпание не удалось:', e);
        notify('Захаръ не проснулсяъ — работаетъ безъ эмбеддинговъ');
        return false;
      }
    })();
    return state.loading;
  }
  function notify(msg) {
    try { if (typeof window.ZAHAR_EMBED_ON_STATUS === 'function') window.ZAHAR_EMBED_ON_STATUS(msg); } catch (e) {}
    try { console.info('[zahar_embed] ' + msg); } catch (e) {}
  }

  /* ---------- эмбеддинги и индекс ---------- */
  function vecNorm(a) {
    var s = 0, i;
    for (i = 0; i < a.length; i++) s += a[i] * a[i];
    s = Math.sqrt(s) || 1;
    for (i = 0; i < a.length; i++) a[i] /= s;
    return a;
  }
  function mrlTrim(data) {
    var arr = Array.from(data);
    if (CFG.dim && arr.length > CFG.dim) return vecNorm(arr.slice(0, CFG.dim));
    return arr;
  }
  async function embedOne(text) {
    var out = await state.extractor(text, { pooling: 'mean', normalize: true });
    return mrlTrim(out.data);
  }
  async function buildIndex() {
    var t0 = Date.now();
    var index = [];
    for (var k = 0; k < INTENTS.length; k++) {
      var it = INTENTS[k], vecs = [];
      for (var e = 0; e < it.examples.length; e++) vecs.push(await embedOne(norm(it.examples[e])));
      var sum = new Array(vecs[0].length);
      sum.fill(0);
      vecs.forEach(function (v) { for (var i = 0; i < v.length; i++) sum[i] += v[i]; });
      index.push({ id: it.id, vec: vecNorm(sum) });
    }
    state.index = index;
    console.info('[zahar_embed] индексъ готовъ: ' + index.length + ' интентовъ за ' + (Date.now() - t0) + ' мс');
  }

  function dot(a, b) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }

  /* ---------- семантический разбор: порог + зазор от top-2 ---------- */
  async function semanticMatch(qRaw) {
    if (state.status !== 'ready' || !state.index) return null;
    var q = norm(qRaw);
    if (q.length < 3) return null;
    var v = await embedOne(q);
    var scored = state.index.map(function (it) { return { id: it.id, s: dot(v, it.vec) }; });
    scored.sort(function (a, b) { return b.s - a.s; });
    state.last = { q: qRaw, top3: scored.slice(0, 3).map(function (x) { return x.id + ' ' + x.s.toFixed(3); }) };
    console.info('[zahar_embed] top-3: ' + state.last.top3.join(' · '));
    var top = scored[0], second = scored[1];
    if (top && top.s >= CFG.threshold && (!second || top.s - second.s >= CFG.margin)) return top;
    return null;
  }

  /* ---------- вшивание в слой: эмбеддинги срабатывают только на «мимо» ---------- */
  var NOTFOUND_RE = /такого слова|лексикон|не понимаю|не понял|не разумею|не ведаю о чем|не встречалось|вне моей компетенции|адъютант/;

  function isMiss(res, q) {
    if (res === undefined || res === null || res === '') return true;
    if (typeof res === 'string') {
      if (NOTFOUND_RE.test(norm(res))) return true;
      return false; // слой сам вернул ответ — эмбеддинги не нужны
    }
    return false;
  }

  /* правка №21: хук вешается на ZAHAR_ASK — настоящую точку входа слоя */
  function hookChat() {
    if (typeof window.ZAHAR_ASK !== 'function' || window.ZAHAR_ASK.__zaharEmbed) return false;
    var original = window.ZAHAR_ASK;
    var wrapped = function (q) {
      var args = arguments;
      var r = original.apply(this, args);
      var handle = function (res) {
        try { if (typeof res === 'string' && res) console.info('[zahar_embed] слой ответил самъ: ' + res); } catch (e) {}
        if (!isMiss(res, q)) return res;
        return semanticMatch(q).then(function (m) {
          if (m) {
            var out = runIntent(m.id, q);
            return (out !== null && out !== undefined) ? out : res;
          }
          return res; // слой отвечает как раньше
        });
      };
      if (r && typeof r.then === 'function') return r.then(handle);
      return handle(r);
    };
    wrapped.__zaharEmbed = true;
    wrapped.original = original;
    window.ZAHAR_ASK = wrapped;
    return true;
  }
  function tryHook(attempt) {
    if (hookChat()) {
      console.info('[zahar_embed] хукъ всталъ на ZAHAR_ASK (попытка ' + attempt + ')');
      return;
    }
    if (attempt < 40) setTimeout(function () { tryHook(attempt + 1); }, 250);
  }
  tryHook(0);

  /* ---------- правка №25: будильникъ — модель просыпается сама ---------- */
  setTimeout(function () {
    try { console.info('[zahar_embed] будильникъ №25: время просыпаться'); } catch (e) {}
    wake();
  }, 20000);

  /* ---------- кнопка «Изысканіе въ эфиры» ---------- */
  try {
    document.addEventListener('click', function (ev) {
      var el = ev.target && ev.target.closest && ev.target.closest('[data-zahar-embed], .zahar-embed-wake, #zahar-embed-wake');
      if (el) { ev.preventDefault(); wake(); }
    });
  } catch (e) {}
  window.ZAHAR_EMBED_WAKE = wake;

  /* ---------- диагностика ---------- */
  window.zaharEmbedStatus = function () {
    return {
      version: VERSION,
      status: state.status,
      error: state.error,
      intents: state.index ? state.index.length : INTENTS.length,
      last: state.last,
      cfg: { threshold: CFG.threshold, margin: CFG.margin, dim: CFG.dim }
    };
  };
})();
