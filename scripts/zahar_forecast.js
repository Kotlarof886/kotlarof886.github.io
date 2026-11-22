/* scripts/zahar_forecast.js — прогноз погоды Барнаула на 7 дней, дневной.
   Версия 2 (22.11.2026): давление запрашивается почасовым (в дневных
   переменных Open-Meteo его нет — потому и был HTTP 400) и усредняется
   по суткам; тенденция — между среднесуточными значениями. Имена
   переменных по актуальной документации: weather_code, wind_speed_10m_max.
   Пишет data/forecast.json; молчание API не роняет запуск. */
const fs = require('fs');
const path = require('path');

const URL_API =
  'https://api.open-meteo.com/v1/forecast?latitude=53.348&longitude=83.777' +
  '&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,weather_code' +
  '&hourly=pressure_msl' +
  '&timezone=Asia%2FBarnaul&forecast_days=7';

const DOW = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];

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

/* среднесуточное давление из почасовых значений */
function dailyPressure(o) {
  const h = o.hourly;
  if (!h || !Array.isArray(h.time) || !Array.isArray(h.pressure_msl)) return {};
  const sums = {};
  const counts = {};
  for (let i = 0; i < h.time.length; i++) {
    if (h.pressure_msl[i] === null || h.pressure_msl[i] === undefined) continue;
    const day = String(h.time[i]).slice(0, 10);
    sums[day] = (sums[day] || 0) + h.pressure_msl[i];
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
  const pres = dailyPressure(o);
  const days = [];
  for (let i = 0; i < d.time.length; i++) {
    const date = d.time[i];
    const dow = DOW[new Date(date + 'T12:00:00').getUTCDay()];
    const prev = i > 0 ? (pres[d.time[i - 1]] ?? null) : null;
    const cur = pres[date] ?? null;
    const pdelta = (prev === null || cur === null) ? null : Math.round((cur - prev) * 10) / 10;
    days.push({
      date,
      dow,
      tmax: num(d.temperature_2m_max[i]),
      tmin: num(d.temperature_2m_min[i]),
      precip: num(d.precipitation_sum[i], 1),
      wind: num(d.wind_speed_10m_max[i]),
      pressure: cur,
      pdelta,
      ptrend: ptrend(pdelta),
      wcode: d.weather_code ? d.weather_code[i] : null,
      wtext: d.weather_code ? wtext(d.weather_code[i]) : 'н/д',
    });
  }
  return { ts: Date.now(), source: 'open-meteo.com', via, days };
}

(async () => {
  const dataDir = path.join(__dirname, '..', 'data');
  const paths = [
    ['прямой запрос', () => rawFetch(URL_API)],
    ['allorigins', () => fetchAllorigins(URL_API)],
    ['codetabs', () => fetchCodetabs(URL_API)],
  ];
  for (const [via, fn] of paths) {
    try {
      const f = parse(await fn(), via);
      fs.mkdirSync(dataDir, { recursive: true });
      fs.writeFileSync(path.join(dataDir, 'forecast.json'), JSON.stringify(f, null, 2), 'utf8');
      const today = f.days[0];
      const tomorrow = f.days[1];
      console.log('OK: прогноз на', f.days.length, 'дней | сегодня', today.tmin + '…' + today.tmax + '°,',
        today.wtext + ', ветер до', today.wind, 'км/ч,',
        'давление', today.pressure, 'гПа (' + today.ptrend + ')',
        '| завтра', tomorrow.pressure, 'гПа (' + tomorrow.ptrend + ')',
        '| источник: open-meteo.com (' + via + ')');
      process.exit(0);
    } catch (e) {
      console.warn('путь «' + via + '» не прошёл:', e.message);
    }
  }
  console.error('Ни один путь не ответил — старый forecast.json не трогаем');
  process.exit(0);
})();
