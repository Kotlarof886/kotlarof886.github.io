/* scripts/zahar_ob.js — уровень Оби в Барнауле, каскад источников.
   Версия 9 (22.11.2026): температура воды — отдельный каскад источников
   (temperaturavody.com, запас ru-meteo.com); rybalku убран — их цифры
   модельные усреднения, не замер; заглушку allrivers «0.00» не берём.
   Узоры температуры: «Текущая температура воды», «на сегодня …
   составляет», «составляет N°C», запас «температура воды … N°C».
   Остальное как в версии 8: порядок источников уровня — allrivers,
   fishingsib, velobarnaul; пути — прямой, jina, allorigins, codetabs;
   чистка тегов; шесть классов сдвига; год 1896. */
const fs = require('fs');
const path = require('path');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.5',
};

const SOURCES = [
  { name: 'allrivers.info', url: 'https://allrivers.info/gauge/ob-barnaul/waterlevel/' },
  { name: 'fishingsib.ru',  url: 'https://www.fishingsib.ru/waterinfo/gauging-station/barnaul/H9fBSqncw8U2T4Hc/' },
  { name: 'velobarnaul.ru', url: 'https://velobarnaul.ru/info/water/ob/' },
];

/* температура воды — отдельные источники (замер/модель по месту) */
const TEMP_SOURCES = [
  { name: 'temperaturavody.com', url: 'https://temperaturavody.com/v/russia/barnaul-in-ob-river' },
  { name: 'ru-meteo.com',        url: 'https://ru-meteo.com/barnaul-temperatura-vody' },
];

const MONTHS = {
  'января': '01', 'февраля': '02', 'марта': '03', 'апреля': '04',
  'мая': '05', 'июня': '06', 'июля': '07', 'августа': '08',
  'сентября': '09', 'октября': '10', 'ноября': '11', 'декабря': '12',
};
const MONTH_NAMES = Object.fromEntries(Object.entries(MONTHS).map(([n, m]) => [m, n]));

function klass(delta) {
  const a = Math.abs(delta);
  if (a === 0) return 'безъ перемѣнъ';
  if (a < 15) return 'обычный';
  if (a < 30) return 'заметный';
  if (a < 50) return 'сильный';
  return 'экстраординарный';
}

function pick(level, delta, day, monthName) {
  const a = Math.abs(delta);
  const S = `Измереніе отъ ${day} ${monthName} 1896 года, передаетъ водомѣрный постъ „Барнаулъ“ на Оби.`;
  if (a === 0) return [
    `Уровень Оби въ Барнаулѣ нынче ${level} смъ, за сутки безъ перемѣнъ. ${S}`,
    `Обь въ Барнаулѣ стоитъ на ${level} смъ: за сутки ни прибыли, ни убыли. ${S}`,
    `Обь въ Барнаулѣ нынче ${level} смъ — за сутки ни туда ни сюда. ${S}`,
  ];
  if (delta > 0) {
    if (a < 15) return [
      `Уровень Оби въ Барнаулѣ нынче ${level} смъ, идётъ на подъёмъ (+${a} смъ за сутки). ${S}`,
      `Уровень Оби въ Барнаулѣ — ${level} смъ, за сутки прибыло ${a} смъ. ${S}`,
      `Обь въ Барнаулѣ держится на ${level} смъ и понемногу прибываетъ: плюсъ ${a} смъ за сутки. ${S}`,
      `Уровень Оби въ Барнаулѣ нынче ${level} смъ — Обь помалу прибываетъ: за сутки всего ${a} смъ, обычныя дни. ${S}`,
      `Уровень Оби въ Барнаулѣ на вершки подползаетъ — ${level} смъ, ${a} смъ за сутки; рѣка дышитъ ровно. ${S}`,
      `Прибыль малая, ${a} смъ за сутки: для Оби это одинъ вздохъ. Уровень нынче ${level} смъ. ${S}`,
    ];
    if (a < 30) return [
      `Уровень Оби въ Барнаулѣ нынче ${level} смъ, вода заметно прибываетъ: плюсъ ${a} смъ за сутки. ${S}`,
      `Обь въ Барнаулѣ заметно пошла вверхъ: нынче ${level} смъ, за сутки прибыло ${a} смъ. ${S}`,
      `Уровень Оби въ Барнаулѣ подросъ — ${level} смъ, за сутки плюсъ ${a} смъ. ${S}`,
      `Уровень Оби въ Барнаулѣ нынче ${level} смъ, за сутки прибыло ${a} смъ — дѣло заметное, приметьте. ${S}`,
      `Обь на подъемъ пошла всерьёзъ: ${level} смъ, плюсъ ${a} смъ за сутки. ${S}`,
      `Подъёмъ раздумчивый, ${a} смъ за сутки: вода къ берегамъ подъходитъ. Уровень нынче ${level} смъ. ${S}`,
    ];
    if (a < 50) return [
      `Уровень Оби въ Барнаулѣ нынче ${level} смъ — вода быстро прибываетъ: плюсъ ${a} смъ за сутки. ${S}`,
      `Обь въ Барнаулѣ пошла въ ростъ: нынче ${level} смъ, за сутки прибыло целыхъ ${a} смъ. ${S}`,
      `Уровень Оби въ Барнаулѣ рванулъ вверхъ — ${level} смъ, прибавка за сутки ${a} смъ. ${S}`,
      `Обь вскинулась: за сутки прибыло ${a} смъ — скачокъ дождевой, редкое дѣло. Уровень нынче ${level} смъ. ${S}`,
      `Рѣка въ гору идётъ на пол-аршина: ${a} смъ за сутки — поди, въ верховьяхъ дожди прошли. Уровень нынче ${level} смъ. ${S}`,
      `Скачокъ видный, ${a} смъ за сутки: подъ берегами не стойте — подмочитъ. Уровень нынче ${level} смъ. ${S}`,
    ];
    return [
      `Уровень Оби въ Барнаулѣ нынче ${level} смъ — такой прибыли старожилы и не помнятъ: плюсъ ${a} смъ за сутки. ${S}`,
      `Обь въ Барнаулѣ пошла большою водойъ: нынче ${level} смъ, за сутки прибыло разомъ ${a} смъ. ${S}`,
      `Уровень Оби въ Барнаулѣ рванулъ вверхъ — ${level} смъ, за сутки плюсъ ${a} смъ. Постъ такого давно не записывалъ. ${S}`,
      `Чудеса въ решетѣ: за сутки Обь прибавила ${a} смъ — такого постъ давно не писалъ! Уровень нынче ${level} смъ. ${S}`,
      `Рѣка взбунтовалась: ${a} смъ за сутки — въ моихъ летописяхъ сего не бывало. Уровень нынче ${level} смъ. ${S}`,
      `${a} смъ за сутки! Обь къ городу идётъ — телеграфирую во все концы. Уровень нынче ${level} смъ. ${S}`,
    ];
  }
  if (a < 15) return [
    `Уровень Оби въ Барнаулѣ нынче ${level} смъ, идётъ на спадъ (−${a} смъ за сутки). ${S}`,
    `Уровень Оби въ Барнаулѣ — ${level} смъ, за сутки рѣка опала на ${a} смъ. ${S}`,
    `Обь въ Барнаулѣ держится на ${level} смъ и понемногу убываетъ: минусъ ${a} смъ за сутки. ${S}`,
    `Уровень Оби въ Барнаулѣ нынче ${level} смъ — Обь помалу убываетъ: за сутки всего ${a} смъ, обычныя дни. ${S}`,
    `Уровень Оби въ Барнаулѣ тихонько оседаетъ — ${level} смъ, ${a} смъ за сутки; рѣка дышитъ ровно. ${S}`,
    `Спадъ малый, ${a} смъ за сутки: Обь безъ суеты съходитъ. Уровень нынче ${level} смъ. ${S}`,
  ];
  if (a < 30) return [
    `Уровень Оби въ Барнаулѣ нынче ${level} смъ, вода заметно убываетъ: минусъ ${a} смъ за сутки. ${S}`,
    `Обь въ Барнаулѣ заметно идётъ на убыль: нынче ${level} смъ, за сутки опала на ${a} смъ. ${S}`,
    `Уровень Оби въ Барнаулѣ приселъ — ${level} смъ, за сутки минусъ ${a} смъ. ${S}`,
    `Уровень Оби въ Барнаулѣ нынче ${level} смъ, за сутки убыло ${a} смъ — дѣло заметное, приметьте. ${S}`,
    `Обь на спадъ пошла всерьёзъ: ${level} смъ, минусъ ${a} смъ за сутки. ${S}`,
    `Спадъ раздумчивый, ${a} смъ за сутки: берега приберегаютъ. Уровень нынче ${level} смъ. ${S}`,
  ];
  if (a < 50) return [
    `Уровень Оби въ Барнаулѣ нынче ${level} смъ — вода быстро убываетъ: минусъ ${a} смъ за сутки. ${S}`,
    `Обь въ Барнаулѣ быстро идётъ на убыль: нынче ${level} смъ, за сутки опала на ${a} смъ. ${S}`,
    `Уровень Оби въ Барнаулѣ резко упалъ — ${level} смъ, за сутки минусъ ${a} смъ. ${S}`,
    `Обь разом опала: за сутки убыло ${a} смъ — скачокъ, редкое дѣло. Уровень нынче ${level} смъ. ${S}`,
    `Рѣка съ горы скинула ${a} смъ за сутки — поди, въ верховьяхъ воды убавилось. Уровень нынче ${level} смъ. ${S}`,
    `Спадъ крутой, ${a} смъ за сутки: снасти съ отмелей снимайте. Уровень нынче ${level} смъ. ${S}`,
  ];
  return [
    `Уровень Оби въ Барнаулѣ нынче ${level} смъ — вода валится стремительно: минусъ ${a} смъ за сутки. ${S}`,
    `Обь въ Барнаулѣ провалилась: нынче ${level} смъ, за сутки убило разомъ ${a} смъ. ${S}`,
    `Уровень Оби въ Барнаулѣ рухнулъ — ${level} смъ, за сутки минусъ ${a} смъ. Старожилы такихъ спадовъ и не припомнятъ. ${S}`,
    `Чудеса въ решетѣ: за сутки Обь скинула ${a} смъ — такого постъ не запишетъ. Уровень нынче ${level} смъ. ${S}`,
    `Рѣка разом осела на пол-аршина съ лишкомъ: ${a} смъ за сутки — летопись въ тетрадку. Уровень нынче ${level} смъ. ${S}`,
    `${a} смъ за сутки убыло! Отмель где была — тамъ теперь сухое дѣло. Уровень нынче ${level} смъ. ${S}`,
  ];
}

/* чистка: HTML-теги и markdown-звёздочки долой */
function clean(text) {
  return String(text)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\*+/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ');
}

/* температура воды: узоры наших источников */
function parseTemp(text) {
  const patterns = [
    /* temperaturavody: «Текущая температура воды 1.4°C» */
    /Текущая\s+температура\s+воды\s+(-?\d+(?:[.,]\d+)?)/i,
    /* ru-meteo: «Температура воды на сегодня … составляет 1.00°C» */
    /на\s+сегодня[^.]{0,60}?составля[её]т\s+(-?\d+(?:[.,]\d+)?)/i,
    /* общий: «…составляет 1.4°C» (с градусом рядом) */
    /составля[её]т\s+(-?\d+(?:[.,]\d+)?)\s*°\s*[CcС]/i,
    /* общий запас: «температура воды … N°C» */
    /температура\s+воды[^+0-9-]{0,40}?(-?\d+(?:[.,]\d+)?)\s*°\s*[CcС]/i,
  ];
  for (const p of patterns) {
    const t = text.match(p);
    if (t) return parseFloat(t[1].replace(',', '.'));
  }
  return null;
}

function parse(rawText, name) {
  const text = clean(rawText);
  const m = text.match(/составля[её]т\s+(-?\d+)\s*[cс]м/i);
  if (!m) return null;
  const level = parseInt(m[1], 10);
  let delta = 0;
  const t = text.match(
    /(повысился|вырос|прибыл|поднялся|подскочил|понизился|снизился|убыл|опустился|упал)[а-яё]*\s[^.]{0,30}?(\d+)\s*[cс]м/i
  );
  if (t) {
    const down = /^(понизился|снизился|убыл|опустился|упал)/i.test(t[1]);
    delta = parseInt(t[2], 10) * (down ? -1 : 1);
  }

  /* температуру со страницы уровня не берём: у allrivers там заглушка */
  let day = '', month = '', year = '';
  const dn = text.match(/[Нн]а\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (dn) { day = dn[1]; month = dn[2]; year = dn[3]; }
  else {
    const dw = text.match(/[Нн]а\s+(\d{1,2})\s+([а-яё]+)\s+(\d{4})/i);
    if (dw && MONTHS[dw[2].toLowerCase()]) { day = dw[1]; month = MONTHS[dw[2].toLowerCase()]; year = dw[3]; }
    else {
      const dg = text.match(/(\d{1,2})\s+(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)\s+(\d{4})/i);
      if (dg) { day = dg[1]; month = MONTHS[dg[2].toLowerCase()]; year = dg[3]; }
    }
  }
  if (!day || !month) {
    const now = new Date(Date.now() + 7 * 3600 * 1000); /* барнаульское время */
    day = String(now.getUTCDate()).padStart(2, '0');
    month = String(now.getUTCMonth() + 1).padStart(2, '0');
    year = String(now.getUTCFullYear());
  }
  const variants = pick(level, delta, day, MONTH_NAMES[month] || month);
  const trend = delta > 0 ? 'подъём' : delta < 0 ? 'спад' : 'без изменений';
  return {
    level, delta, trend, klass: klass(delta), temp: null,
    date: `${day}.${month}.${year}`,
    phrases: variants,
    phrase: variants[Math.floor(Math.random() * variants.length)],
    source: name, ts: Date.now(),
  };
}

/* температура — своим каскадом: прямой, потом jina */
async function ensureTemp(d) {
  for (const s of TEMP_SOURCES) {
    for (const via of ['direct', 'jina']) {
      try {
        const text = via === 'direct'
          ? (await rawFetch(s.url)).text
          : await fetchJina(s.url);
        const t = parseTemp(clean(text));
        if (t !== null) {
          d.temp = t;
          d.tempSource = s.name;
          return;
        }
        console.warn(s.name, '(' + via + ') — температура не распознана. Фрагмент:', clean(text).slice(0, 200));
      } catch (e) {
        console.warn(s.name, '(' + via + ') — не прошёл:', e.message);
      }
    }
  }
}

/* температурный хвостъ для всѣхъ фразъ — °С, три варианта */
function tempTail(d) {
  if (d.temp === null || d.temp === undefined) return '';
  const t = (Math.abs(d.temp) % 1 === 0)
    ? String(Math.abs(d.temp))
    : String(Math.abs(d.temp)).replace('.', ',');
  const TAILS = [
    ` Вода въ Оби нынче ${t}°С.`,
    ` Термометръ въ рекѣ ведетъ ${t}°С.`,
    ` Вода въ Оби — ${t}°С.`,
  ];
  return TAILS[Math.floor(Math.random() * TAILS.length)];
}

async function rawFetch(url, extra) {
  const r = await fetch(url, { headers: { ...HEADERS, ...(extra || {}) }, redirect: 'follow' });
  const jar = (typeof r.headers.getSetCookie === 'function'
    ? r.headers.getSetCookie()
    : (r.headers.get('set-cookie') ? [r.headers.get('set-cookie')] : [])
  ).map(c => c.split(';')[0]).filter(Boolean).join('; ');
  return { status: r.status, text: r.ok ? await r.text() : '', jar };
}

async function fetchDirect(url) {
  const r1 = await rawFetch(url);
  if (r1.status !== 200) throw new Error('HTTP ' + r1.status);
  return r1;
}

async function fetchJina(url) {
  const r = await fetch('https://r.jina.ai/' + url, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'X-Timeout': '30', 'X-No-Cache': 'true' },
  });
  if (!r.ok) throw new Error('jina HTTP ' + r.status);
  return await r.text();
}

async function fetchAllorigins(url) {
  const r = await fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent(url), { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!r.ok) throw new Error('allorigins HTTP ' + r.status);
  return await r.text();
}

async function fetchCodetabs(url) {
  const r = await fetch('https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(url), { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!r.ok) throw new Error('codetabs HTTP ' + r.status);
  return await r.text();
}

function diag(name, via, rawText) {
  const text = clean(rawText);
  const i = text.search(/составля[её]/i);
  if (i >= 0) {
    console.warn(name, '(' + via + ') — цифра рядом есть, разбор мимо. Контекст:', text.slice(Math.max(0, i - 80), i + 220));
  } else if (/Выберите регион/i.test(rawText)) {
    console.warn(name, '(' + via + ') — геостена: сайт требует выбор региона с этого IP.');
  } else {
    console.warn(name, '(' + via + ') — страница не распознана. Фрагмент:', text.slice(0, 300));
  }
}

function staleness(dateStr) {
  const p = (dateStr || '').split('.');
  if (p.length !== 3) return 99;
  const d = new Date(Date.UTC(+p[2], +p[1] - 1, +p[0]));
  const now = new Date(Date.now() + 7 * 3600 * 1000);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((today - d.getTime()) / 86400000);
}

function save(d, dir, name, via) {
  const tail = tempTail(d);
  if (tail) {
    d.phrases = d.phrases.map(p => p + tail);
    d.phrase = d.phrase + tail;
  }
  const lag = staleness(d.date);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'ob-level.json'), JSON.stringify(d, null, 2), 'utf8');
  console.log('OK:', d.level, 'см,', d.trend, '(' + (d.delta > 0 ? '+' : '') + d.delta + ' см), класс:', d.klass,
    '| вода:', d.temp === null ? 'н/д' : d.temp + '° (темп: ' + (d.tempSource || 'н/д') + ')',
    '| источник:', name, '(' + via + ') | на', d.date);
  if (lag > 1) console.warn('Внимание: данные отстают от реального дня на', lag, 'сут. — источник не обновился.');
}

(async () => {
  const dataDir = path.join(__dirname, '..', 'data');
  for (const s of SOURCES) {
    try {
      const r1 = await fetchDirect(s.url);
      let d = parse(r1.text, s.name);
      if (d) { await ensureTemp(d); save(d, dataDir, s.name, 'прямой запрос'); process.exit(0); }
      diag(s.name, 'прямой запрос', r1.text);
      if (r1.jar) {
        const r2 = await rawFetch(s.url, { Cookie: r1.jar });
        if (r2.status === 200) {
          d = parse(r2.text, s.name);
          if (d) { await ensureTemp(d); save(d, dataDir, s.name, 'прямой запрос (2-й ход с куки)'); process.exit(0); }
          diag(s.name, 'прямой запрос + куки', r2.text);
        }
      }
    } catch (e) {
      console.warn(s.name, '— прямой запрос не прошёл:', e.message);
    }
    try {
      const text = await fetchJina(s.url);
      const d = parse(text, s.name);
      if (d) { await ensureTemp(d); save(d, dataDir, s.name, 'jina (с ожиданием)'); process.exit(0); }
      diag(s.name, 'jina', text);
    } catch (e) {
      console.warn(s.name, '— jina не прошёл:', e.message);
    }
    try {
      const text = await fetchAllorigins(s.url);
      const d = parse(text, s.name);
      if (d) { await ensureTemp(d); save(d, dataDir, s.name, 'allorigins'); process.exit(0); }
      diag(s.name, 'allorigins', text);
    } catch (e) {
      console.warn(s.name, '— allorigins не прошёл:', e.message);
    }
    try {
      const text = await fetchCodetabs(s.url);
      const d = parse(text, s.name);
      if (d) { await ensureTemp(d); save(d, dataDir, s.name, 'codetabs'); process.exit(0); }
      diag(s.name, 'codetabs', text);
    } catch (e) {
      console.warn(s.name, '— codetabs не прошёл:', e.message);
    }
  }
  console.error('Ни один источник не ответил — старый ob-level.json не трогаем');
  process.exit(0);
})();
