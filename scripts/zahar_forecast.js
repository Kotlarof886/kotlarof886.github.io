/* scripts/zahar_forecast.js — прогноз погоды Барнаула на 7 дней, дневной.
   Версия 4 (22.11.2026): добавлены повторы — каждый путь пробуется до
   трёх раз с паузой 5 секунд (Open-Meteo и прокси иногда молчат
   несколько минут); остальное как в версии 3: направление ветра,
   среднесуточная температура и её сдвиг, давление почасово с past_days=1. */
const fs = require('fs');
const path = require('path');

const URL_API =
  'https://api.open-meteo.com/v1/forecast?latitude=53.348&longitude=83.777' +
  '&daily=temperature_2m_max,temperature_2m_mean,temperature_2m_min,precipitation_sum,wind_speed_10m_max,wind_direction_10m_dominant,weather_code' +
  '&hourly=temperature_2m,pressure_msl' +
  '&timezone=Asia%2FBarnaul&forecast_days=7&past_days=1';

const DOW = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
const DIRS = ['северный', 'северо-восточный', 'восточный', 'юго-восточный', 'южный', 'юго-западный', 'западный', 'северо-западный'];

function wtext(code) {
  if (code === 0) return 'ясно';
  if (code <= 2) return 'переменная облачность';
  if (code === 3) return 'пасмурно';
  if (code <= 48) return 'туман';
  if (code <= 57) return 'морось';
  if (code <= 67) return 'дождь';
  if (code <= 77) return 'снег';
  if (code <= 82) return 'ливни';
  if (code <= 86) return 'снег ливнями';
  return 'гроза';
}

function dirName(deg) {
  if (deg == null) return 'н/д';
  return DIRS[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
}

function ptrend(delta) {
  if (delta === null) return 'н/д';
  if (delta <= -3) return 'падает';
  if (delta >= 3) return 'растёт';
  return 'ровно';
}

function num(v, digits) {
  if (v === null || v === undefined) return null;
  return Number(Number(v).toFixed(digits === undefined ? 0 : digits));
}

/* среднесуточные значения из почасовых */
function dailyFromHourly(o, key) {
  const h = o.hourly;
  if (!h || !Array.isArray(h.time) || !Array.isArray(h[key])) return {};
  const sums = {}, counts = {};
  for (let i = 0; i < h.time.length; i++) {
    const v = h[key][i];
    if (v === null || v === undefined) continue;
    const day = String(h.time[i]).slice(0, 10);
    sums[day] = (sums[day] || 0) + v;
    counts[day] = (counts[day] || 0) + 1;
  }
  const out = {};
  for (const day in sums) out[day] = Math.round(sums[day] / counts[day] * 10) / 10;
  return out;
}

async function rawFetch(url) {
  const r = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'application/json',
    },
    redirect: 'follow',
  });
  if (r.status !== 200) throw new Error('HTTP ' + r.status);
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

function parse(jsonText, via) {
  const o = JSON.parse(jsonText);
  const d = o && o.daily;
  if (!d || !Array.isArray(d.time) || !Array.isArray(d.temperature_2m_max)) {
    throw new Error('неожиданный ответ API');
  }
  const pres = dailyFromHourly(o, 'pressure_msl');
  const tmean = dailyFromHourly(o, 'temperature_2m');
  const all = [];
  for (let i = 0; i < d.time.length; i++) {
    const date = d.time[i];
    const dow = DOW[new Date(date + 'T12:00:00').getUTCDay()];
    const prev = i > 0 ? (pres[d.time[i - 1]] ?? null) : null;
    const cur = pres[date] ?? null;
    const pdelta = (prev === null || cur === null) ? null : Math.round((cur - prev) * 10) / 10;
    const tm = tmean[date] ?? null;
    const tmPrev = i > 0 ? (tmean[d.time[i - 1]] ?? null) : null;
    const tshift = (tmPrev === null || tm === null) ? null : Math.round((tm - tmPrev) * 10) / 10;
    all.push({
      date, dow,
      tmax: num(d.temperature_2m_max[i]),
      tmin: num(d.temperature_2m_min[i]),
      tmean: tm,
      tshift,
      precip: num(d.precipitation_sum[i], 1),
      wind: num(d.wind_speed_10m_max[i]),
      wdir: d.wind_direction_10m_dominant ? num(d.wind_direction_10m_dominant[i]) : null,
      wdirName: dirName(d.wind_direction_10m_dominant ? d.wind_direction_10m_dominant[i] : null),
      pressure: cur,
      pdelta,
      ptrend: ptrend(pdelta),
      wcode: d.weather_code ? d.weather_code[i] : null,
      wtext: d.weather_code ? wtext(d.weather_code[i]) : 'н/д',
    });
  }
  /* отрезаем вчерашний день: в выводе — только прогнозные */
  const now = new Date(Date.now() + 7 * 3600000);
  const todayStr = now.getUTCFullYear() + '-' + String(now.getUTCMonth() + 1).padStart(2, '0') + '-' + String(now.getUTCDate()).padStart(2, '0');
  const days = all.filter(x => x.date >= todayStr);
  if (!days.length) throw new Error('прогнозные дни не найдены');
  return { ts: Date.now(), source: 'open-meteo.com', via, days };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const dataDir = path.join(__dirname, '..', 'data');
  const paths = [
    ['прямой запрос', () => rawFetch(URL_API)],
    ['allorigins', () => fetchAllorigins(URL_API)],
    ['codetabs', () => fetchCodetabs(URL_API)],
  ];
  for (const [via, fn] of paths) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const f = parse(await fn(), via);
        fs.mkdirSync(dataDir, { recursive: true });
        fs.writeFileSync(path.join(dataDir, 'forecast.json'), JSON.stringify(f, null, 2), 'utf8');
        const t0 = f.days[0], t1 = f.days[1];
        console.log('OK: прогноз на', f.days.length, 'дней | сегодня', t0.tmin + '…' + t0.tmax + '°,',
          t0.wtext + ', ветер до', t0.wind, 'км/ч (' + t0.wdirName + '),',
          'давление', t0.pressure, 'гПа (' + t0.ptrend + '),',
          'тепло', t0.tshift === null ? 'н/д' : (t0.tshift > 0 ? '+' : '') + t0.tshift + '° ко вчера',
          '| завтра', t1.pressure, 'гПа (' + t1.ptrend + ')',
          '| источник: open-meteo.com (' + via + ')');
        process.exit(0);
      } catch (e) {
        console.warn('путь «' + via + '», попытка', attempt, '— не прошёл:', e.message);
        if (attempt < 3) await sleep(5000);
      }
    }
  }
  console.error('Ни один путь не ответил — старый forecast.json не трогаем');
  process.exit(0);
})();
