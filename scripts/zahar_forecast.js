/* scripts/zahar_forecast.js — прогноз погоды Барнаула на 7 дней, дневной.
   Версия 1 (22.11.2026): Open-Meteo (бесплатный API, без ключа) отдаёт
   одним блоком температуру, осадки, ветер и давление на каждый день;
   считаем тенденцию давления по сравнению с предыдущим днём — для скрипта
   клёва это главный признак. Пишет data/forecast.json; молчание API не
   роняет запуск — старый файл не трогаем. */
const fs = require('fs');
const path = require('path');

const URL_API =
  'https://api.open-meteo.com/v1/forecast?latitude=53.348&longitude=83.777' +
  '&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,pressure_msl,weathercode' +
  '&timezone=Asia%2FBarnaul&forecast_days=7';

const DOW = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];

/* описание погоды по коду Open-Meteo */
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

/* тенденция давления за сутки, гПа */
function ptrend(delta) {
  if (delta === null) return 'н/д';
  if (delta <= -3) return 'падает';
  if (delta >= 3) return 'растёт';
  return 'ровно';
}

function num(v, digits) {
  if (v === null || v === undefined) return null;
  return Number(v.toFixed(digits === undefined ? 0 : digits));
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
  if (!d || !Array.isArray(d.time) || !Array.isArray(d.pressure_msl)) {
    throw new Error('неожиданный ответ API');
  }
  const days = [];
  for (let i = 0; i < d.time.length; i++) {
    const date = d.time[i];
    const dow = DOW[new Date(date + 'T12:00:00').getUTCDay()];
    const prev = i > 0 ? num(d.pressure_msl[i - 1]) : null;
    const cur = num(d.pressure_msl[i]);
    const pdelta = prev === null ? null : cur - prev;
    days.push({
      date,
      dow,
      tmax: num(d.temperature_2m_max[i]),
      tmin: num(d.temperature_2m_min[i]),
      precip: num(d.precipitation_sum[i], 1),
      wind: num(d.windspeed_10m_max[i]),
      pressure: cur,
      pdelta: pdelta === null ? null : Math.round(pdelta * 10) / 10,
      ptrend: ptrend(pdelta),
      wcode: d.weathercode ? d.weathercode[i] : null,
      wtext: d.weathercode ? wtext(d.weathercode[i]) : 'н/д',
    });
  }
  return {
    ts: Date.now(),
    source: 'open-meteo.com',
    via,
    days,
  };
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
