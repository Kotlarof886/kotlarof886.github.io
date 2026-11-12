/* ============================================================
   zahar_embed.js — правка №33: «путь к модели — туда, где она лежит»
   Дата сборки: 12.11.2026
   Внутри: №21 будильник/автопробуждение · №26 ять и і · №27 семантика
   на каждый вопрос · №28 зазор 0.015 · №30 память (лента + тетрадка) ·
   №31 загрузчик библиотеки через динамический import() ·
   №32 модель грузится с локальных файлов, без huggingface.co ·
   №33 путь к модели исправлен: ../models/USER2-small-ONNX/
   ============================================================ */
(function () {
'use strict';

const VERSION = 'правка №33';
const TAG = '[zahar_embed]';

const CFG = {
  wakeDelay: 20000,          // будильник: модель просыпается сама
  threshold: 0.72,           // порог уверенности
  margin: 0.015,             // зазор до второго интента
  libraryUrl: 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2',
  libraryUrlFallback: 'https://unpkg.com/@xenova/transformers@2.17.2/dist/transformers.min.js',
  modelDir: '../models/USER2-small-ONNX/',
  modelName: 'USER2-small-ONNX',
  topK: 3,
  quantized: true
};

const state = { lib: null, pipe: null, ready: false, waking: false, index: [] };

/* ---------- память (правка №30) ---------- */
const MEM_KEY = 'zahar_memory_v1';
const TAPE_MAX = 6;

const mem = { tape: [], notebook: {} };
try { Object.assign(mem, JSON.parse(localStorage.getItem(MEM_KEY) || '{}')); } catch (e) {}
mem.tape = Array.isArray(mem.tape) ? mem.tape.slice(-TAPE_MAX) : [];
mem.notebook = mem.notebook || {};

function saveMem() {
  try { localStorage.setItem(MEM_KEY, JSON.stringify(mem)); } catch (e) {}
}

window.zaharMemory = function () { return mem; };

window.zaharSetName = function (name) {
  if (!name) return;
  name = String(name).trim().replace(/[^А-ЯЁа-яё-]/g, '');
  if (!name) return;
  mem.notebook.name = name;
  saveMem();
  console.log(TAG, 'тетрадка: имя записано —', name);
};

const STOP = /(белк|чай|обь|нельм|купец|сударь|депеш|медвед|телеграф)/i;

function grabNameFromUser(text) {
  if (mem.notebook.name) return;
  const m = String(text || '').match(/(?:меня зовут|мо[ёe] имя)\s+([А-ЯЁ][а-яё]{1,20})/i);
  if (m && !STOP.test(m[1])) zaharSetName(m[1]);
}

window.zaharNoteUser = function (text) {
  grabNameFromUser(text);
  mem.tape.push({ who: 'собеседник', text: String(text || '').slice(0, 120) });
  mem.tape = mem.tape.slice(-TAPE_MAX);
  saveMem();
};

window.zaharNoteZahar = function (text) {
  mem.tape.push({ who: 'захар', text: String(text || '').slice(0, 120) });
  mem.tape = mem.tape.slice(-TAPE_MAX);
  saveMem();
};

let lastConfident = null;
window.zaharNoteTopic = function (topic) { if (topic) lastConfident = topic; };

window.zaharEnrichQuery = function (text) {
  if (!lastConfident) return text;
  const short = String(text).trim().split(/\s+/).length <= 4;
  return short ? lastConfident + ' ' + text : text;
};

/* ---------- нормализация (правка №26: ять и і ДО очистки) ---------- */
function normalize(text) {
  let s = String(text || '').toLowerCase();
  s = s.replace(/ѣ/g, 'е').replace(/і/g, 'и').replace(/ѳ/g, 'ф').replace(/ѵ/g, 'и');
  s = s.replace(/[^a-zа-яё0-9\s]/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

/* ---------- 18 интентов ---------- */
const INTENTS = [
  { name: 'fish', examples: ['как ловится нельма', 'нельма клюет', 'рыбалка на оби', 'поймал тайменя', 'где ловить рыбу'],
    responses: ['Нельма — лучшая рыба в Оби, серебром отливающая. Ловится на перемёт и на спиннинг, {N}. Самое то — утренние зори.'] },
  { name: 'hunt', examples: ['белку видел в тайге', 'охота на соболя', 'ружье купил', 'капканы ставить', 'белка промыслом идет'],
    responses: ['Белка нынче ходит промыслом — шкурка дороже меди. Соболиный след видели у Каргополовых угодьев.'] },
  { name: 'tea', examples: ['налей чаю', 'попить чаю', 'чай с сахаром', 'самовар кипит', 'чай вприкуску'],
    responses: ['Самовар в искре, чай вприкуску — вот и весь вечерний устав, {N}.',
                'Чаю? Извольте: кипяток свежий, с сахаром — но я бы вприкуску, честнее вкус.'] },
  { name: 'sad', examples: ['душа не на месте сегодня', 'тоскливо мне сегодня', 'соскучился по дому', 'на душе муторно', 'грусть накатила'],
    responses: ['Тоска, говорите? Три лекарства здешние знаю: горячий чай, дело, да Обь на закате. Помогает — проверено на себе.',
                'Понимаю, {N}. Тоска в телеграфной будке — гость частый. Лечится делом и дорожкой вдоль Оби.'] },
  { name: 'wire', examples: ['депеша пришла', 'телеграмма ушла', 'морзянка по ночам', 'аппарат стучит', 'точка тире'],
    responses: ['Депеши идут, точка-тире не подводят. Аппарат Юза — говорун, люблю его.'] },
  { name: 'money', examples: ['сколько жалованье', 'зарплата телеграфиста', 'рубль копейка', 'сколько стоит пуд муки'],
    responses: ['Жалованье 27 рублей в месяц, {A}. На рубль — чаю на неделю и керосин в придачу.'] },
  { name: 'weather', examples: ['какая погода', 'мороз крепчает', 'метель пошла', 'дождь зарядил'],
    responses: ['Погоду сказывает барометр: стрелка к «ясно» поднимается — к холоду.'] },
  { name: 'river', examples: ['обь река', 'ледоход когда', 'пароход идет', 'выйти на берег'],
    responses: ['Обь — матушка-река. Ледоход в конце апреля, пароходы — с мая.'] },
  { name: 'city', examples: ['барнаул какой', 'город ночью', 'ярмарка когда', 'где погулять'],
    responses: ['Барнаул стоит на Оби, сереброплавильный завод — сердце его.'] },
  { name: 'samovar', examples: ['самовар меди', 'чайник поставить', 'кипяток свежий'],
    responses: ['Самовар углей просит, а не керосину. Медный — от деда, звон держит.'] },
  { name: 'birds', examples: ['каких птиц встречал', 'глухарь поет', 'снегирь прилетел', 'тетерев токует'],
    responses: ['Глухарь на токовищах, тетерев по березам, снегирь к кормушке прилетает.'] },
  { name: 'train', examples: ['поезд когда', 'железная дорога', 'станция поезда', 'гудок слышал'],
    responses: ['Железная дорога приходит в Барнаул, станция — гудок на весь город.'] },
  { name: 'market', examples: ['рынок по средам', 'торговые ряды', 'купец скупает', 'лавка открыта'],
    responses: ['Торговые ряды по средам, купец Первухин пшеницу скупает.'] },
  { name: 'night', examples: ['ночь глубокая', 'не спится', 'поздно уже', 'бессонница'],
    responses: ['Ночь для телеграфиста — время рабочее. Депеши не спят, и я не спю.'] },
  { name: 'letters', examples: ['письмо отправить', 'почта когда', 'открытка стоит', 'конверт купить'],
    responses: ['Почта ходит через Томск дважды в неделю. Письмо — три копейки, открыточка — две.'] },
  { name: 'news', examples: ['что пишут в газетах', 'новости есть', 'слухи по городу', 'газета свежая'],
    responses: ['Газеты приходят недельной давности, зато слухи — свежее утреннего хлеба.'] },
  { name: 'greeting', examples: ['здравствуйте захар', 'привет тебе', 'добрый день', 'доброй ночи'],
    responses: ['Здравия желаю, {A}! Захар, телеграфист, к услугам.'] },
  { name: 'name', examples: ['как вас зовут', 'кто вы такой', 'как тебя зовут', 'представьтесь'],
    responses: ['Захар я, телеграфист второго разряда, при Обской станции с 1893 года.'] }
];

function fillRep(rep) {
  return rep.replace(/\{N\}/g, mem.notebook.name || 'сударь')
            .replace(/\{A\}/g, 'сударь');
}

const lastUsed = {};
function pick(intent) {
  const rs = intent.responses;
  const i = (lastUsed[intent.name] || 0) % rs.length;
  lastUsed[intent.name] = i + 1;
  return rs[i];
}

/* ---------- загрузчик библиотеки (правка №31) ---------- */
async function loadLibrary() {
  if (state.lib) return state.lib;
  const urls = [CFG.libraryUrl, CFG.libraryUrlFallback];
  let lastErr = null;
  for (const u of urls) {
    try {
      console.log(TAG, 'грузим библиотеку через import():', u);
      const mod = await import(u);
      state.lib = mod.default || mod;
      window.transformers = state.lib;
      return state.lib;
    } catch (e) {
      lastErr = e;
      console.warn(TAG, 'этот адрес не отработал:', u, e && e.message);
    }
  }
  throw lastErr || new Error('библиотека не загрузилась');
}

/* ---------- эмбеддинги ---------- */
async function embed(text) {
  const out = await state.pipe(text, { pooling: 'mean', normalize: true });
  return Array.from(out.data);
}

function cosine(a, b) {
  let s = 0, la = 0, lb = 0;
  for (let i = 0; i < a.length; i++) { s += a[i] * b[i]; la += a[i] * a[i]; lb += b[i] * b[i]; }
  return s / (Math.sqrt(la) * Math.sqrt(lb) || 1);
}

async function buildIndex() {
  state.index = [];
  for (const it of INTENTS) {
    const vecs = [];
    const seen = new Set();
    for (const ex of it.examples) {
      const n = normalize(ex);
      if (seen.has(n)) continue;
      seen.add(n);
      vecs.push(await embed(n));
    }
    state.index.push({ name: it.name, intent: it, vecs });
  }
  console.log(TAG, 'индексъ готовъ: ' + INTENTS.length + ' интентовъ');
}

function match(text) {
  const scored = [];
  for (const item of state.index) {
    let best = -1;
    for (const v of item.vecs) {
      const s = cosine(state.lastVec, v);
      if (s > best) best = s;
    }
    scored.push({ name: item.name, intent: item.intent, score: best });
  }
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, CFG.topK);
  console.log(TAG, 'top-3: ' + top.map(t => t.name + ' ' + t.score.toFixed(3)).join(' · '));
  const w = scored[0], r = scored[1];
  if (w.score >= CFG.threshold && w.score - r.score >= CFG.margin) return w;
  if (w.score >= CFG.threshold) console.log(TAG, 'мимо зазора: ' + w.name + ' ' + w.score.toFixed(3) + ' против ' + r.name + ' ' + r.score.toFixed(3));
  return null;
}

/* ---------- пробуждение ---------- */
const scriptBase = (document.currentScript && document.currentScript.src) || location.href;
const modelDirAbs = new URL(CFG.modelDir, scriptBase).href;

async function wake() {
  if (state.ready || state.waking) return;
  state.waking = true;
  console.log(TAG, 'Захаръ просыпается… (модель грузится)');
  try {
    const T = await loadLibrary();
    const env = T.env || (T.default && T.default.env) || null;
    if (env) {
      env.allowLocalModels = true;
      env.allowRemoteModels = false;   // на huggingface.co не ходим — модель у нас
      env.localModelPath = new URL('models/', scriptBase).href;
      console.log(TAG, 'локальные модели по адресу:', env.localModelPath);
    } else {
      console.warn(TAG, 'env недоступен — возможно, модель не найдётся локально');
    }
    state.pipe = await T.pipeline('feature-extraction', CFG.modelName, { quantized: CFG.quantized });
    await buildIndex();
    state.ready = true;
    console.log(TAG, 'Захаръ проснулсяъ: семантическій роутеръ на мѣстѣ');
  } catch (e) {
    console.error(TAG, 'пробуждение не удалось:', e && e.message ? e.message : e);
  } finally {
    state.waking = false;
  }
}
window.zaharWake = wake;

/* ---------- контроль ---------- */
window.zaharEmbedStatus = function () {
  return {
    version: VERSION,
    библиотека: state.lib ? 'загружена (import())' : 'не загружена',
    модель: state.ready ? 'на мѣстѣ' : 'не проснулась',
    интентовъ: INTENTS.length,
    лента: mem.tape.length,
    тетрадка: mem.notebook.name || 'имя ещё не записано'
  };
};

/* ---------- хук на ZAHAR_ASK (правка №21, сохранена) ---------- */
function tryHook() {
  if (typeof window.ZAHAR_ASK === 'function' && !window.ZAHAR_ASK.__zahar_patched) {
    const orig = window.ZAHAR_ASK;
    const wrapped = function (text, cb) {
      const t = String(text || '');
      zaharNoteUser(t);
      if (state.ready) {
        try {
          const q = normalize(zaharEnrichQuery(t));
          embed(q).then(vec => {
            state.lastVec = vec;
            const hit = match(q);
            if (hit) {
              zaharNoteTopic(hit.name);
              const rep = fillRep(pick(hit.intent));
              console.log(TAG, 'семантика отвечает:', rep);
              zaharNoteZahar(rep);
              if (typeof cb === 'function') { try { cb(rep); } catch (e) {} }
              return rep;
            }
            console.log(TAG, 'слой ответил самъ');
            return orig.call(this, text, cb);
          });
          return;
        } catch (e) {
          console.warn(TAG, 'семантика споткнулась, слой отвечает сам:', e && e.message);
        }
      }
      console.log(TAG, 'слой ответил самъ');
      return orig.call(this, text, cb);
    };
    wrapped.__zahar_patched = true;
    window.ZAHAR_ASK = wrapped;
    console.log(TAG, 'хук на ZAHAR_ASK всталъ');
    return true;
  }
  return false;
}

let hookTries = 0;
const hookTimer = setInterval(function () {
  if (tryHook() || ++hookTries > 40) clearInterval(hookTimer);
}, 500);

/* ---------- будильник (правка №21) ---------- */
setTimeout(function () {
  console.log(TAG, 'будильникъ ' + VERSION + ': время просыпаться');
  wake();
}, CFG.wakeDelay);

console.log(TAG, VERSION + ' загружена: память готова — лента ' + mem.tape.length +
  ', в тетрадке: ' + (mem.notebook.name || 'имя ещё не записано'));
})();
