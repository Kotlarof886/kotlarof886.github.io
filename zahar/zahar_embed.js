/* ============================================================
   zahar_embed.js — семантический роутеръ Захара
   правка №30: память — лента (6 реплик) + тетрадка (localStorage)
   Накоплено: №23 будильникъ · №26 ять въ нормализаціи ·
              №27 семантика на каждый вопросъ · №28 зазоръ 0.015
   ============================================================ */
(function () {
  'use strict';

  const VERSION = 'правка №30';

  /* ---------------- настройки ---------------- */
  const CFG = {
    modelDir: 'zahar/models/USER2-small',
    threshold: 0.72,   // ниже него тема не считается узнанной
    margin: 0.015,     // победитель обязан оторваться от второго
    wakeDelay: 20000,  // будильникъ, мс
    tapeMax: 6         // сколько реплик держит лента
  };

  /* ---------------- нормализация (№26: ять до очистки) ---------------- */
  function norm(s) {
    s = String(s).toLowerCase();
    s = s.replace(/[ёѣ]/g, 'е')
         .replace(/[ії]/g, 'и')
         .replace(/ѳ/g, 'ф')
         .replace(/ѵ/g, 'в')
         .replace(/[ъь]/g, '');
    s = s.replace(/[^a-zа-я0-9\s]/g, ' ');
    return s.replace(/\s+/g, ' ').trim();
  }

  /* отказныя фразы слоя — в нормализованном виде (№27) */
  const MISS = /такого слова|лексикон|не понимаю|не разумею|не встреча|вне моей компетенции|адютант/;

  /* ---------------- 18 интентов ---------------- */
  const INTENTS = [
    { name: 'greeting', examples: ['здравствуй', 'добрый день', 'приветствую вас', 'здорово живешь'] },
    { name: 'farewell', examples: ['до свидания', 'прощайте', 'пора идти', 'доброй ночи'] },
    { name: 'name',     examples: ['меня зовут максим', 'мое имя алексей', 'позволь представиться'] },
    { name: 'sad',      examples: ['душа не на месте', 'мне грустно', 'тоскливо мне', 'соскучился по дому', 'на душе муторно', 'тоска одолела'] },
    { name: 'fish',     examples: ['как ловится нельма', 'рыбалка на оби', 'что клевало сегодня', 'таймень водится'] },
    { name: 'hunt',     examples: ['белку видел в тайге', 'ходил на охоту', 'соболь промышляю', 'капканы ставил'] },
    { name: 'birds',    examples: ['каких птиц встречал', 'глухарь токует', 'снегирь прилетел', 'куропатка в поле'] },
    { name: 'tea',      examples: ['какой чай пьешь', 'самовар кипит', 'чаю захотелось', 'пошел бы за чаем'] },
    { name: 'weather',  examples: ['какая погода', 'мороз крепчает', 'метель заметает', 'дождь идет'] },
    { name: 'wire',     examples: ['как идут депеши', 'телеграфная линия цела', 'морзянка стучит', 'аппарат барахлит'] },
    { name: 'money',    examples: ['сколько это стоит', 'почем теперь мука', 'заплатить рубль', 'расплатиться с тобой'] },
    { name: 'merchant', examples: ['купцы приехали', 'барышник торгуется', 'ярмарка открылась'] },
    { name: 'road',     examples: ['как дорога', 'по тракту ехал', 'до барнаула добраться'] },
    { name: 'night',    examples: ['не спится', 'ночь долгая', 'дежурство ночью'] },
    { name: 'health',   examples: ['как здоровье', 'голова болит', 'недомогаю сегодня'] },
    { name: 'thanks',   examples: ['спасибо', 'благодарю вас', 'премного благодарен'] },
    { name: 'river',    examples: ['обь разлилась', 'лед на оби встал', 'пароход на оби'] },
    { name: 'history',  examples: ['какой ныне год', 'что в газетах пишут', 'про государя слышал'] }
  ];

  const RESPONSES = {
    greeting: [
      'Здравия желаю, {N}! На связи Захар, телеграфист Обской станции. Слушаю вас.',
      'Здорово живете, {N}! Аппарат в порядке, самовар тоже. Что передать?'
    ],
    farewell: [
      'Прощайте, {N}. Линия работает круглосуточно — заходите, как телеграф зашумит.'
    ],
    name: [
      'Приятно познакомиться, {N}! Записал в тетрадку — память депешная, цепкая.'
    ],
    sad: [
      'Тоска, говорите? Три лекарства здешние знаю: горячий чай, дело, да Обь на закате. Помогает — проверено на себе.',
      'Понимаю, {N}. Здесь от тоски лечатся просто: до станции дойти, да по воде взглядом пройтись. Обь вылечивает не сразу, но верно.'
    ],
    fish: [
      'Нельма — лучшая рыба в Оби, серебром отливающая. На блесну берет осторожно, под самой поверхностью.',
      'Рыбный промысел нынче сытный: нельма, стерлядь, щока. Купцы берут бочками, не торгуются.'
    ],
    hunt: [
      'Белка нынче промыслом идет, шкурка чистая. Купцы берут охотно — сезон в разгаре.',
      'В тайге нынче промысел добрый, {N}. Соболь ходит по верховьям, ружье и капканы — верные товарищи.'
    ],
    birds: [
      'Птиц здесь вдоволь: глухарь токует на моховых болотах, рябчик под осинами держится. Курушка таежная, а песня своя.',
      'Из птиц примечаю глухаря да рябчика; зимой снегирь к станции прилетает — краса на снегу.'
    ],
    tea: [
      'Самовар у меня не гаснет. Чай пью вприкуску, как вся Сибирь: сахар в зубах, а жидкость горячая.',
      'Чаю, {N}? Ставлю тотчас. Вприкуску или с сахаром — как изволите?'
    ],
    weather: [
      'Погода нынче переменчива. Утром иней был, к полудню оттепель — барометр суетится.',
      'Мороз крепчает, {N}. По приметам — к устойчивой зиме. Лед на Оби встанет скоро.'
    ],
    wire: [
      'Депеши идут исправно. Морзянка стучит в наушниках, как сердце линии — сбоев не было.',
      'Линия тянута верно, столбы сухие. Депеши по Оби обходятся быстрее, чем по тракту.'
    ],
    money: [
      'Расценки здешние крутятся, как Обь в половодье. За пуд муки — гривенник с полушкой, а за подробности — спрашивайте прямо.'
    ],
    merchant: [
      'Купцы приезжают с осени, торгуются до слез. Барышник здешний — что медведь: ревет, а сам боится.'
    ],
    road: [
      'Тракт до Барнаула держится, хотя колеи разбиты. По осенней грязи — только телеграфные столбы сухие.'
    ],
    night: [
      'Ночь — мое время, {N}. Станция пустая, аппарат тихий, и Обь шумит под окном. Хорошая пора для писем.'
    ],
    health: [
      'Здоровье депешное: руки в мозолях от ключа, глаза в полосках от ленты. А в остальном — не жалуюсь.'
    ],
    thanks: [
      'Служу трудом, {N}. Не за что — пишите еще: бумага дорога, а собеседник дороже.'
    ],
    river: [
      'Обь — госпожа. Разливается широко, льдом встает в ноябре, а пароходы ходят по ней до самых заморозков.'
    ],
    history: [
      'Ныне 1896 год, {N}. В газетах пишут о коронации, а у нас в Сибири — больше о рыбном промысле.'
    ]
  };

  /* ---------------- память: лента + тетрадка (№30) ---------------- */
  const MEM_KEY = 'zahar_memory_v1';
  const mem = { tape: [], notebook: {} };
  try { Object.assign(mem, JSON.parse(localStorage.getItem(MEM_KEY) || '{}')); } catch (e) { /* пустая тетрадка */ }
  mem.tape = Array.isArray(mem.tape) ? mem.tape.slice(-CFG.tapeMax) : [];
  mem.notebook = mem.notebook || {};

  function memSave() {
    try { localStorage.setItem(MEM_KEY, JSON.stringify(mem)); } catch (e) {}
  }

  window.zaharMemory = function () { return mem; };

  const NAME_STOP = /(белк|чай|обь|нельм|купец|сударь|депеш|медвед|телеграф|сир|барин)/i;

  window.zaharSetName = function (name) {
    if (!name) return;
    name = String(name).trim().replace(/[^А-ЯЁа-яё-]/g, '');
    if (!name || NAME_STOP.test(name)) return;
    mem.notebook.name = name;
    memSave();
    console.log('[zahar_embed] тетрадка: имя записано — ' + name);
  };

  function grabNameFromUser(text) {
    if (mem.notebook.name) return;
    const m = String(text || '').match(/(?:меня зовут|мо[ёе] имя)\s+([А-ЯЁ][а-яё]{1,20})/i);
    if (m) zaharSetName(m[1]);
  }

  function grabNameFromLayer(text) {
    if (mem.notebook.name) return;
    const m = String(text || '').match(/[Пп]риятно познакомиться[,.!]?\s*([А-ЯЁ][а-яё]{1,20})/);
    if (m && !NAME_STOP.test(m[1])) zaharSetName(m[1]);
  }

  window.zaharNoteUser = function (text) {
    grabNameFromUser(text);
    mem.tape.push({ who: 'собеседник', text: String(text || '').slice(0, 120) });
    mem.tape = mem.tape.slice(-CFG.tapeMax);
    memSave();
  };

  window.zaharNoteZahar = function (text) {
    grabNameFromLayer(text);
    mem.tape.push({ who: 'захар', text: String(text || '').slice(0, 120) });
    mem.tape = mem.tape.slice(-CFG.tapeMax);
    memSave();
  };

  /* опора для коротких вопросов: последняя уверенная тема */
  let lastTopicText = null;
  window.zaharNoteTopic = function (topicText) { if (topicText) lastTopicText = topicText; };

  window.zaharEnrichQuery = function (text) {
    if (!lastTopicText) return text;
    const words = String(text).trim().split(/\s+/).filter(Boolean);
    return words.length <= 4 ? lastTopicText + ' ' + text : text;
  };

  console.log('[zahar_embed] память готова: лента ' + mem.tape.length +
    ', в тетрадке: ' + (mem.notebook.name || 'имя еще не записано'));

  /* ---------------- статус (для консоли) ---------------- */
  const status = { version: VERSION, awake: false, last: null };
  window.zaharEmbedStatus = function () { return status; };

  /* ---------------- модель и индекс ---------------- */
  let embedder = null, waking = false;
  const centroids = {};
  const rot = {};

  function dot(a, b) {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += a[i] * b[i];
    return s;
  }

  async function vec(text) {
    const out = await embedder(text, { pooling: 'mean', normalize: true });
    return Array.from(out.data);
  }

  async function buildIndex() {
    const t0 = performance.now();
    for (const it of INTENTS) {
      const vs = [];
      for (const ex of it.examples) vs.push(await vec(norm(ex)));
      const c = new Array(vs[0].length).fill(0);
      for (const v of vs) for (let i = 0; i < c.length; i++) c[i] += v[i];
      for (let i = 0; i < c.length; i++) c[i] /= vs.length;
      const m = Math.sqrt(c.reduce((s, x) => s + x * x, 0)) || 1;
      centroids[it.name] = c.map(x => x / m);
    }
    console.log('[zahar_embed] индекс готов: ' + INTENTS.length + ' интентов за ' +
      Math.round(performance.now() - t0) + ' мс');
  }

  async function wake() {
    if (embedder || waking) return;
    waking = true;
    console.log('[zahar_embed] Захар просыпается… (модель грузится)');
    try {
      if (!window.transformers) {
        await new Promise(function (res, rej) {
          const s = document.createElement('script');
          s.src = 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js';
          s.onload = res; s.onerror = rej;
          document.head.appendChild(s);
        });
      }
      embedder = await window.transformers.pipeline('feature-extraction', CFG.modelDir);
      await buildIndex();
      status.awake = true;
      console.log('[zahar_embed] Захар проснулся: семантический роутер на месте');
    } catch (e) {
      waking = false;
      console.log('[zahar_embed] пробуждение не удалось: ' + (e && e.message));
    }
  }
  window.zaharWake = wake;

  /* ---------------- семантический разбор ---------------- */
  async function route(text) {
    const v = await vec(norm(text));
    const scores = INTENTS.map(it => ({ name: it.name, score: dot(v, centroids[it.name]) }));
    scores.sort((a, b) => b.score - a.score);
    const top3 = scores.slice(0, 3);
    status.last = top3;
    return top3;
  }

  function respond(name) {
    const list = RESPONSES[name] || ['Сие вне моей компетенции, обратитесь к адъютанту.'];
    const i = rot[name] || 0;
    rot[name] = (i + 1) % list.length;
    return list[i].replace(/\{N\}/g, mem.notebook.name || 'сударь');
  }

  /* ---------------- хук: перехват реплик ---------------- */
  let origAsk = null;
  ['zaharAsk', 'zaharRespond', 'zaharSay', 'zaharChatAsk'].some(function (n) {
    if (typeof window[n] === 'function') { origAsk = window[n]; window[n] = handle; return true; }
    return false;
  });

  function layerAsk(text) {
    if (origAsk) return origAsk(text);
    console.log('[zahar_embed] слой чата не найден: добавьте zahar_chat.js до этого файла');
    return 'Аппарат молчит, сударь. Слой чата не подключен.';
  }

  async function handle(text) {
    text = String(text || '').trim();
    if (!text) return;

    zaharNoteUser(text);

    let top3 = null;
    if (status.awake) {
      const q = zaharEnrichQuery(text);
      top3 = await route(q);
      console.log('[zahar_embed] top-3: ' +
        top3.map(t => t.name + ' ' + t.score.toFixed(3)).join(' · '));
    }

    const win = top3 && top3[0].score >= CFG.threshold &&
                top3[1] && (top3[0].score - top3[1].score) >= CFG.margin;

    let answer;
    if (win) {
      zaharNoteTopic(text);
      answer = respond(top3[0].name);
    } else {
      answer = layerAsk(text);
      console.log('[zahar_embed] слой ответил сам: ' + answer);
      if (top3 && top3[0].score >= CFG.threshold && top3[1]) {
        console.log('[zahar_embed] мимо зазора: ' + top3[0].name + ' ' +
          top3[0].score.toFixed(3) + ' против ' + top3[1].name + ' ' +
          top3[1].score.toFixed(3));
      }
    }

    if (answer) {
      if (MISS.test(norm(answer))) grabNameFromLayer(answer);
      zaharNoteZahar(answer);
    }
    return answer;
  }

  /* ---------------- будильник (№23) ---------------- */
  setTimeout(function () {
    console.log('[zahar_embed] будильник №30: время просыпаться');
    wake();
  }, CFG.wakeDelay);

  console.log('[zahar_embed] ' + VERSION + ' загружена: память — лента + тетрадка');
})();
