/* scripts/zahar_ob.js — уровень Оби в Барнауле, каскад источников.
   Положить строго в папку scripts/ — путь к data/ считается от неё.
   Правки против первой выкладки:
   - фразы Захара сразу в дореформенной орфографии (браузерный модуль не трогаем);
   - если динамику распознать не удалось — trend = null и честная ветка в фразе,
     а не молчаливое «без изменений»;
   - даты «на 21.11.2026» и «на 21 ноября 2026» приводятся к одному виду. */
const fs = require('fs');
const path = require('path');

const SOURCES = [
  { name: 'fishingsib.ru',  url: 'https://www.fishingsib.ru/waterinfo/gauging-station/barnaul/H9fBSqncw8U2T4Hc/' },
  { name: 'allrivers.info', url: 'https://allrivers.info/gauge/ob-barnaul/waterlevel/' },
  { name: 'velobarnaul.ru', url: 'https://velobarnaul.ru/info/water/ob/' },
];

function phrase(level, delta, trend) {
  const cm = ' смъ';
  if (trend === 'подъём')
    return `Уровень Оби въ Барнаулѣ нынче ${level}${cm}, рѣка идётъ на подъёмъ (+${delta}${cm} за сутки).`;
  if (trend === 'спад')
    return `Уровень Оби въ Барнаулѣ нынче ${level}${cm}, рѣка идётъ на спадъ (${delta}${cm} за сутки).`;
  if (trend === null)
    return `Уровень Оби въ Барнаулѣ нынче ${level}${cm}; динамику за сутки уточнить не удалось.`;
  return `Уровень Оби въ Барнаулѣ нынче ${level}${cm}, за сутки безъ перемѣнъ.`;
}

function parse(text, name) {
  const m = text.match(/составляет\s+(-?\d+)\s*[cс]м/i);
  if (!m) return null;
  const level = parseInt(m[1], 10);
  let delta = 0, trend = 'без изменений';
  const t = text.match(/(повысился|понизился|прибыло|убыло)\D{0,30}?(\d+)\s*[cс]м/i);
  if (t) {
    const down = (t[1] === 'понизился' || t[1] === 'убыло');
    delta = parseInt(t[2], 10) * (down ? -1 : 1);
    trend = delta > 0 ? 'подъём' : 'спад';
  } else {
    trend = null;   /* динамику не распознали — честно говорим об этом */
  }
  /* дата измерения: «На 21.11.2026», «на 21 ноября 2026» и т.п. */
  let date = '';
  const dm = text.match(/[Нн]а\s+(\d{1,2})[.\s]+((?:\d{1,2}[.\s]+)?\d{4})/);
  if (dm) date = (dm[2].includes('.') ? dm[1] + '.' + dm[2] : dm[1] + ' ' + dm[2]).trim();

  return { level, delta, trend, date, phrase: phrase(level, delta, trend), source: name, ts: Date.now() };
}

(async () => {
  for (const s of SOURCES) {
    try {
      const r = await fetch(s.url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const d = parse(await r.text(), s.name);
      if (!d) throw new Error('страница не распознана');
      const dataDir = path.join(__dirname, '..', 'data');
      fs.mkdirSync(dataDir, { recursive: true });
      fs.writeFileSync(path.join(dataDir, 'ob-level.json'), JSON.stringify(d, null, 2), 'utf8');
      console.log('OK:', d.level, 'см,', d.trend, d.delta, '| источник:', s.name, '| на', d.date);
      process.exit(0);
    } catch (e) {
      console.warn('Пропускаю', s.name, '—', e.message);
    }
  }
  console.error('Ни один источник не ответил — старый ob-level.json не трогаем');
  process.exit(1);
})();
