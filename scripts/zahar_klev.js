/* scripts/zahar_klev.js — сводка клёва Оби у Барнаула на 7 дней.
   Версия 2 (22.11.2026): учтено направление ветра (запад/юго-запад —
   в руку, север/восток/юго-восток — глушит), сдвиг температуры воздуха
   ко вчерашнему дню (похолодание — хищнику на руку), осадки в
   миллиметрах, признак ледостава. Луна по чину чата: новолуние
   6.1.2000 18:14 UTC, месяц 29.530588853, полная луна — налиму на руку.
   Нерест, преднерестовый жор, зимняя спячка карася и сазана — вшиты.
   Пишет data/klev.json; молчание источников не роняет запуск. */
const fs = require('fs');
const path = require('path');

const SYN = 29.530588853;
const REF = Date.UTC(2000, 0, 6, 18, 14); /* новолуние — как въ zahar_chat */

const MOON_NAMES = {
  new: 'новолуніе — не видна',
  waxC: 'молодой серпъ, растётъ',
  firstQ: 'первая четверть',
  wax: 'наливная луна (прибывающая)',
  full: 'полная луна',
  wane: 'ущербная луна',
  lastQ: 'послѣдняя четверть',
  oldC: 'старый серпъ',
};

function moonOf(dateStr) {
  const noon = Date.UTC(+dateStr.slice(0, 4), +dateStr.slice(5, 7) - 1, +dateStr.slice(8, 10), 12);
  let frac = ((noon - REF) / 86400000 / SYN) % 1;
  if (frac < 0) frac += 1;
  if (frac < 0.03 || frac > 0.97) return { key: 'new', name: MOON_NAMES.new };
  if (frac < 0.21) return { key: 'waxC', name: MOON_NAMES.waxC };
  if (frac < 0.29) return { key: 'firstQ', name: MOON_NAMES.firstQ };
  if (frac < 0.46) return { key: 'wax', name: MOON_NAMES.wax };
  if (frac < 0.54) return { key: 'full', name: MOON_NAMES.full };
  if (frac < 0.71) return { key: 'wane', name: MOON_NAMES.wane };
  if (frac < 0.79) return { key: 'lastQ', name: MOON_NAMES.lastQ };
  return { key: 'oldC', name: MOON_NAMES.oldC };
}

/* направление: 210–330° (юго-запад…северо-запад) — добрый;
   330–120° (север…юго-восток через восток) — худой; прочее — серединка */
function dirClass(deg) {
  if (deg == null) return null;
  const a = ((deg % 360) + 360) % 360;
  if (a >= 210 && a <= 330) return 'good';
  if (a > 330 || a <= 120) return 'bad';
  return 'mid';
}

/* рыбы Оби у Барнаула: нерест (месяцы 1..12), преднерестовый жор,
   зимняя спячка, реакция на давление/ветер/погоду/воду/луну.
   wT — таблица [порог температуры воды, прибавка]. */
const FISHES = [
  { name: 'налимъ', pred: 1, spawnM: [12, 1, 2], spawnSoft: 1, preM: [11],
    wT: [[2, 15], [6, 10], [8, 0], [99, -15]], pdF: 6, pdR: -4,
    windS: 2, windM: 2, windB: -4, wW: 3, wE: -3, highP: -4, clear: 4, snow: 2, thaw: 0,
    fullMoon: 8, newMoon: 3,
    gear: 'ночами на живца — ершика али пескаря; закидка у ямъ да корягъ, до утра оставляйте' },
  { name: 'щука', pred: 1, spawnM: [4, 5], preM: [3],
    wT: [[4, 6], [8, 2], [12, 0], [99, -2]], pdF: 12, pdR: -6,
    windS: 0, windM: 5, windB: -6, wW: 4, wE: -4, highP: -2, clear: -2, thaw: 4,
    fullMoon: 0, newMoon: 4,
    gear: 'жерлицы у края травы да у омутовъ, на живца; по перволедью — самая пора' },
  { name: 'судакъ', pred: 1, spawnM: [5, 6], preM: [4],
    wT: [[4, 6], [8, 2], [12, 0], [99, -2]], pdF: 8, pdR: -4,
    windS: 2, windM: 2, windB: -8, wW: 2, wE: -4, highP: -4, clear: 0, thaw: 2,
    fullMoon: 0, newMoon: 3,
    gear: 'живецъ — ершикъ али пескарь; жерлица да дорожка съ бѣлесой блесной, у омутовъ' },
  { name: 'окунь', pred: 1, spawnM: [5, 6], preM: [4],
    wT: [[4, 4], [8, 2], [12, 0], [99, -2]], pdF: 8, pdR: -2,
    windS: -2, windM: 6, windB: -6, wW: 3, wE: -3, highP: -2, clear: 2, thaw: 2,
    fullMoon: 0, newMoon: 2,
    gear: 'червякъ да малекъ мелкою удочкой у затоновъ; со льда — зимняя удочка' },
  { name: 'ершъ', pred: 1, spawnM: [4, 5], preM: [3],
    wT: [[4, 5], [8, 2], [12, 0], [99, -2]], pdF: 2, pdR: 0,
    windS: 2, windM: 0, windB: -4, wW: 1, wE: -2, highP: -2, clear: 2, thaw: 0,
    fullMoon: 0, newMoon: 0,
    gear: 'червякъ гдѣ глубже да тишѣ; уха изъ него навариста' },
  { name: 'лещъ', pred: 0, spawnM: [5, 6], preM: [4],
    wT: [[4, -10], [8, -6], [12, -2], [99, 0]], pdF: -8, pdR: 0,
    windS: 4, windM: 0, windB: -8, wW: 2, wE: -4, highP: -6, clear: -2, thaw: 4,
    fullMoon: -3, newMoon: 0,
    gear: 'закидка съ грузиломъ на червя, на мѣстѣ прикормленномъ; къ ямамъ отходитъ' },
  { name: 'сорога', pred: 0, spawnM: [4, 5], preM: [3],
    wT: [[4, -4], [8, -4], [12, -2], [99, 0]], pdF: -6, pdR: 0,
    windS: 4, windM: 2, windB: -8, wW: 2, wE: -3, highP: -4, clear: -2, thaw: 6, snow: 6,
    fullMoon: -2, newMoon: 0,
    gear: 'опарышъ да мякишъ мелкою удочкой у тростника; со льда — на мормышку' },
  { name: 'елецъ', pred: 0, spawnM: [3, 4], preM: [2],
    wT: [[4, -4], [8, -4], [12, -2], [99, 0]], pdF: -4, pdR: 0,
    windS: 2, windM: 0, windB: -6, wW: 0, wE: -4, highP: -4, clear: -4, thaw: 8, snow: 8,
    fullMoon: -2, newMoon: 0,
    gear: 'мушка да червякъ поплавочной на перекатахъ; въ оттепели съ метелью — самый часъ' },
  { name: 'язь', pred: 0, spawnM: [5, 6], preM: [4],
    wT: [[4, -8], [8, -6], [12, -2], [99, 0]], pdF: -6, pdR: 0,
    windS: 2, windM: 0, windB: -8, wW: 2, wE: -4, highP: -4, clear: -2, thaw: 2,
    fullMoon: -2, newMoon: 0,
    gear: 'червякъ да хлѣбъ у ямъ; подъходитъ тихонько — рыба пугливая' },
  { name: 'пескарь', pred: 0, spawnM: [5, 6, 7, 8], preM: [4],
    wT: [[4, -8], [8, -4], [12, -2], [99, 0]], pdF: -4, pdR: 0,
    windS: 3, windM: 0, windB: -6, wW: 2, wE: -3, highP: -2, clear: -2, thaw: 2,
    fullMoon: 0, newMoon: 0,
    gear: 'червякъ у песчаной мели; а самъ — славный живецъ для налима да судака' },
  { name: 'пелядь', pred: 0, spawnM: [9, 10], preM: [],
    wT: [[4, -4], [8, -2], [12, 0], [99, 0]], pdF: -4, pdR: 0,
    windS: 2, windM: 0, windB: -6, wW: 2, wE: -3, highP: -2, clear: 0, thaw: 2,
    fullMoon: 0, newMoon: 0,
    gear: 'опарышъ поплавочной у заводей; по перволедью со льда на мормышку' },
  { name: 'карась', pred: 0, sleepM: [11, 12, 1, 2, 3], spawnM: [5, 6], preM: [4],
    wT: [[4, -12], [8, -8], [12, -4], [99, 0]], pdF: -4, pdR: 0,
    windS: 2, windM: 0, windB: -6, wW: 1, wE: -3, highP: -4, clear: -4, thaw: 2,
    fullMoon: 0, newMoon: 0,
    gear: 'червь да мякишъ у берега, гдѣ трава да илъ — но то весеннее дѣло' },
  { name: 'сазанъ', pred: 0, sleepM: [11, 12, 1, 2, 3, 4], spawnM: [5, 6], preM: [4],
    wT: [[8, -12], [12, -6], [16, 0], [99, 0]], pdF: -4, pdR: 0,
    windS: 0, windM: 0, windB: -6, wW: 1, wE: -2, highP: -4, clear: -2, thaw: 0,
    fullMoon: 0, newMoon: 0,
    gear: 'пареный горохъ да жмыхи, снасть крепкая — но то лѣтнее дѣло' },
];

const SLEEP_WORD = { 'карась': 'въ иле зимовать легъ', 'сазанъ': 'въ ямахъ залегъ до весны' };

const VERDICTS = {
  great: [
    'Клѣвъ нынчѣ добръ, {N}: день въ руки просится — снасть наводите да идите.',
    'Рыба бодра, {N}: клѣвъ изрядный — по всей вѣроятности, уловъ будетъ.',
    'Разъ такой выпалъ, {N}, что грехъ дома сидѣть: клѣвъ добрый.',
  ],
  good: [
    'Клѣвъ серединный, {N}: брать будетъ, да безъ азарта — на зарѣ пробуйте.',
    'Не раздолье, да и не глухарь, {N}: клѣвъ вѣрный, терпѣніе надобно.',
    'Клѣвъ таковъ, {N}: половить можно, только снасть тонкая да тишь.',
  ],
  weak: [
    'Клѣвъ вялый, {N}: рыба лѣнива — беретъ неохотно, на зорѣ и то.',
    'День серенькій, {N}: клѣвъ слабъ — лучше на прикормленномъ мѣстѣ сидѣть.',
    'Не нынчѣ день, {N}: клѣвъ вялый; ежели пойдете — терпѣнія запасите.',
  ],
  bad: [
    'Клѣвъ дуренъ, {N}: рыба залегла — не мучай ее, лучше по дѣламъ сходить.',
    'Нынчѣ не часъ, {N}: клѣвъ слабъ — отложите до перемѣны погоды.',
    'Обь нынчѣ молчитъ, {N}: клѣвъ дуренъ — посидѣте у самовара лучше.',
  ],
};

function verdictFor(s) {
  return s >= 70 ? VERDICTS.great : s >= 55 ? VERDICTS.good : s >= 40 ? VERDICTS.weak : VERDICTS.bad;
}

function fishScore(f, d, ctx, mo, ice) {
  if (f.sleepM && f.sleepM.indexOf(mo) >= 0) return { s: 5, sleep: true };
  let s = 50;
  if (f.spawnM.indexOf(mo) >= 0) s += f.spawnSoft ? -5 : -25;
  else if (f.preM && f.preM.indexOf(mo) >= 0) s += 8;

  const pd = d.pdelta;
  if (pd != null) {
    if (pd <= -3) s += f.pdF;
    else if (pd >= 3) s += f.pdR;
    else s += f.pred ? 2 : 5;
  }
  if (d.pressure != null && d.pressure > 1020) s += f.highP;

  const w = d.wind;
  if (w != null) {
    if (w < 3) s += f.windS;
    else if (w <= 12) s += f.windM;
    else if (w > 20) s += f.windB;
  }
  const dc = dirClass(d.wdir);
  if (dc === 'good') s += (f.wW || 0);
  else if (dc === 'bad') s += (f.wE || 0);

  /* сдвиг тепла: похолодание — хищнику на руку, потепление — наоборот */
  if (d.tshift != null) {
    if (d.tshift <= -3) s += f.pred ? 3 : -2;
    else if (d.tshift >= 3) s += f.pred ? -2 : 1;
  }

  /* осадки количеством: лёгкий снег подкармливает, ливень глушит */
  if (d.precip != null) {
    if (d.precip > 0 && d.precip <= 2) s += f.pred ? 3 : 0;
    else if (d.precip > 10) s -= 6;
  }

  if (d.wcode != null) {
    if (d.wcode >= 51 && d.wcode <= 67) s += f.pred ? 4 : -2;
    if (d.wcode >= 71 && d.wcode <= 77) s += (f.snow || 0);
    if (d.wcode >= 80) s -= 6;
  }
  if (d.wcode === 0) s += (f.clear || 0);

  const wt = ctx.temp;
  if (wt != null && f.wT) {
    let dv = f.wT[f.wT.length - 1][1];
    for (let i = 0; i < f.wT.length; i++) { if (wt <= f.wT[i][0]) { dv = f.wT[i][1]; break; } }
    s += dv;
  }

  if (d.moonKey === 'full') s += (f.fullMoon || 0);
  else if (d.moonKey === 'new') s += (f.newMoon || 0);
  else if (d.moonKey === 'wane' || d.moonKey === 'lastQ' || d.moonKey === 'oldC') s -= 2;

  if (ctx.delta != null) {
    if (ctx.delta < 0) s += f.pred ? 4 : -4;
    else if (ctx.delta > 0) s += f.pred ? -2 : -6;
  }
  if (ice && f.pred) s -= 4; /* лёд на подходе — рыбалка меняется */
  if (!f.pred) s -= 2; /* осень — мирной рыбѣ труднее */

  if (s < 5) s = 5;
  if (s > 95) s = 95;
  return { s: Math.round(s) };
}

function dayWhy(d, ctx, ice) {
  const out = [];
  if (d.pdelta != null) {
    if (d.pdelta <= -3) out.push('давленіе падаетъ — хищникъ оживетъ, а мирная рыба приумолкнетъ');
    else if (d.pdelta >= 3) out.push('давленіе подымается — рыба ко дну прижалась');
    else if (d.pressure != null && d.pressure <= 1020) out.push('давленіе ровное — рыба привольна');
  }
  if (d.pressure != null && d.pressure > 1020) out.push('давленіе высоко — рыба въ ямахъ отсиживаетъ');
  if (ctx.temp != null) {
    if (ctx.temp <= 2) out.push('вода въ Оби ' + String(ctx.temp).replace('.', ',') + '° — налимовъ часъ');
    else if (ctx.temp > 8) out.push('вода тѣпла — налимовъ жоръ миновалъ');
  }
  if (d.tshift != null) {
    if (d.tshift <= -3) out.push('тепло ко дню миновало — передъ похолоданіемъ хищникъ бълуетъ');
    else if (d.tshift >= 3) out.push('потеплѣніе пришло — хищникъ приумолкнетъ');
  }
  const dc = dirClass(d.wdir);
  if (dc === 'good') out.push('вѣтръ ' + d.wdirName + ' — въ руку рыбаку');
  else if (dc === 'bad') out.push('вѣтръ ' + d.wdirName + ' — клѣвъ глушитъ');
  if (d.wind != null && d.wind > 20) out.push('вѣтръ крепкій — рыба забилась въ ямы');
  if (d.precip != null && d.precip > 10) out.push('ливень — клѣвъ сгинетъ');
  if (d.thaw) out.push('оттепель — сорога да елецъ оживаютъ');
  if (d.wcode != null && d.wcode >= 71 && d.wcode <= 77) out.push('снѣгъ нежный — сорога къ клѣву охоча');
  if (d.moonKey === 'full') out.push('луна полная — свѣтлыя ночи налиму на руку');
  else if (d.moonKey === 'new') out.push('луна млада — тѣмныя ночи, хищникъ смѣлѣе');
  else if (d.moonKey === 'wane' || d.moonKey === 'lastQ' || d.moonKey === 'oldC') out.push('луна на убыли — клѣвъ к вечеру приумолкнетъ');
  if (ice) out.push('Обь подъ берегомъ скоро схватитъ — рыбалка переменится');
  if (ctx.delta != null) {
    if (ctx.delta < 0) out.push('Обь на спадѣ — рыба на ямахъ, хищнику сподручно');
    else if (ctx.delta > 0) out.push('Обь на прибытіи — вода мутится, рыба растерялась');
  }
  return out.slice(0, 4);
}

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', p), 'utf8'));
  } catch (e) { return null; }
}

(async () => {
  const fc = readJson('forecast.json');
  if (!fc || !Array.isArray(fc.days) || !fc.days.length) {
    console.error('forecast.json не найден или пуст — клѣвъ не сведенъ');
    process.exit(0);
  }
  const ob = readJson('ob-level.json');
  const ctx = {
    temp: (ob && typeof ob.temp === 'number') ? ob.temp : null,
    delta: (ob && typeof ob.delta === 'number') ? ob.delta : null,
    level: (ob && typeof ob.level === 'number') ? ob.level : null,
  };
  const ice = ctx.temp != null && ctx.temp <= 1.5 &&
    fc.days[0].tmax != null && fc.days[0].tmax <= -4 &&
    fc.days[1] && fc.days[1].tmax != null && fc.days[1].tmax <= -4;

  const mo = new Date(Date.now() + 7 * 3600000).getUTCMonth() + 1; /* барнаульское время */

  const days = fc.days.map((d) => {
    const m = moonOf(d.date);
    const dd = Object.assign({}, d, { moonKey: m.key, moonName: m.name, thaw: (d.tmax != null && d.tmax >= 0) });
    const scored = FISHES.map((f) => ({ f, r: fishScore(f, dd, ctx, mo, ice) }));
    const alive = scored.filter((x) => !x.r.sleep).sort((a, b) => b.r.s - a.r.s);
    const sleepers = scored.filter((x) => x.r.sleep);
    const top = alive.slice(0, 3).map((x) => ({ n: x.f.name, s: x.r.s, g: x.f.gear }));
    const day = Math.round(top[0].s * 0.6 + (top[1] || top[0]).s * 0.25 + (top[2] || top[1] || top[0]).s * 0.15);
    const word = day >= 70 ? 'добрый' : day >= 55 ? 'серединный' : day >= 40 ? 'вялый' : 'дуренъ';
    return {
      date: d.date, dow: d.dow, moon: m.name,
      wtext: d.wtext || 'н/д', wdirName: d.wdirName || 'н/д',
      wind: d.wind, precip: d.precip, pressure: d.pressure, pdelta: d.pdelta, ptrend: d.ptrend,
      tmax: d.tmax, tmin: d.tmin, tshift: d.tshift,
      score: day, word,
      verdict: verdictFor(day)[Math.floor(Math.random() * 3)],
      top,
      avoid: sleepers.map((x) => ({ n: x.f.name, why: SLEEP_WORD[x.f.name] || 'не до насадокъ' }))
        .concat(alive.slice(3).filter((x) => x.r.s < 30).map((x) => ({ n: x.f.name, why: 'клѣвъ вялый' }))),
      why: dayWhy(dd, ctx, ice && d === fc.days[0]),
    };
  });

  fs.writeFileSync(path.join(__dirname, '..', 'data', 'klev.json'),
    JSON.stringify({ ts: Date.now(), date: days[0].date, ice, level: ctx, source: fc.source, days }, null, 2), 'utf8');
  const t0 = days[0];
  console.log('OK: клѣвъ на', days.length, 'дней | сегодня', t0.score + '/100 — ' + t0.word,
    '| топъ:', t0.top.map((x) => x.n).join(', '),
    '| луна:', t0.moon,
    '| погода:', t0.wtext + ', вѣтръ ' + (t0.wdirName || 'н/д') + ' до ' + (t0.wind != null ? t0.wind : '?') + ' км/ч',
    '| вода:', ctx.temp === null ? 'н/д' : ctx.temp + '°',
    ice ? '| Обь скоро встанетъ' : '');
  process.exit(0);
})();
