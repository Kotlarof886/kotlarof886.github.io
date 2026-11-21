/* scripts/zahar_ob.js — уровень Оби в Барнауле, каскад источников.
   Версия 2 (22.11.2026): полные браузерные заголовки; запасной путь через
   текстовый прокси r.jina.ai; диагностика фрагмента в логе; дата «21 ноября 2026»;
   молчание источников не роняет запуск — старый ob-level.json сохраняется. */
const fs = require('fs');
const path = require('path');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.5',
};

const SOURCES = [
  { name: 'fishingsib.ru',  url: 'https://www.fishingsib.ru/waterinfo/gauging-station/barnaul/H9fBSqncw8U2T4Hc/' },
  { name: 'allrivers.info', url: 'https://allrivers.info/gauge/ob-barnaul/waterlevel/' },
  { name: 'velobarnaul.ru', url: 'https://velobarnaul.ru/info/water/ob/' },
];

const MONTHS = {
  'января': '01', 'февраля': '02', 'марта': '03', 'апреля': '04',
  'мая': '05', 'июня': '06', 'июля': '07', 'августа': '08',
  'сентября': '09', 'октября': '10', 'ноября': '11', 'декабря': '12',
};

function parse(text, name) {
  const m = text.match(/составля[её]т\s+(-?\d+)\s*[cс]м/i);
  if (!m) return null;
  const level = parseInt(m[1], 10);
  let delta = 0, trend = 'без изменений';
  const t = text.match(/(повысился|понизился|прибыло|убыло)\D{0,30}?(\d+)\s*[cс]м/i);
  if (t) {
    const down = (t[1] === 'понизился' || t[1] === 'убыло');
    delta = parseInt(t[2], 10) * (down ? -1 : 1);
    trend = delta > 0 ? 'подъём' : 'спад';
  }
  /* дата измерения: «На 21.11.2026» либо «на 21 ноября 2026» */
  let date = '';
  const dm = text.match(/[Нн]а\s+(\d{1,2})[.\s]+((?:\d{1,2}[.\s]+)?\d{4})/);
  if (dm) date = (dm[2].includes('.') ? dm[1] + '.' + dm[2] : dm[1] + ' ' + dm[2]).trim();
  if (!date) {
    const dn = text.match(/[Нн]а\s+(\d{1,2})\s+([а-яё]+)\s+(\d{4})/i);
    if (dn && MONTHS[dn[2].toLowerCase()]) date = dn[1] + '.' + MONTHS[dn[2].toLowerCase()] + '.' + dn[3];
  }
  const phrase = trend === 'подъём'
    ? `Уровень Оби въ Барнаулѣ нынче ${level} смъ, идётъ на подъёмъ (+${delta} смъ за сутки).`
    : trend === 'спад'
      ? `Уровень Оби въ Барнаулѣ нынче ${level} смъ, идётъ на спадъ (${delta} смъ за сутки).`
      : `Уровень Оби въ Барнаулѣ нынче ${level} смъ, за сутки безъ перемѣнъ.`;
  return { level, delta, trend, date, phrase, source: name, ts: Date.now() };
}

async function fetchText(url) {
  const r = await fetch(url, { headers: HEADERS, redirect: 'follow' });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return await r.text();
}

async function fetchViaProxy(url) {
  const r = await fetch('https://r.jina.ai/' + url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!r.ok) throw new Error('прокси HTTP ' + r.status);
  return await r.text();
}

function save(d, dir, name, via) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'ob-level.json'), JSON.stringify(d, null, 2), 'utf8');
  console.log('OK:', d.level, 'см,', d.trend, '(' + (d.delta > 0 ? '+' : '') + d.delta + ' см) | источник:', name, '(' + via + ') | на', d.date);
}

(async () => {
  const dataDir = path.join(__dirname, '..', 'data');
  for (const s of SOURCES) {
    let text = '';
    try {
      text = await fetchText(s.url);
      const d = parse(text, s.name);
      if (d) { save(d, dataDir, s.name, 'прямой запрос'); process.exit(0); }
    } catch (e) {
      console.warn(s.name, '— прямой запрос не прошёл:', e.message);
    }
    /* запасной путь: страница через текстовый прокси */
    try {
      text = await fetchViaProxy(s.url);
      const d = parse(text, s.name);
      if (d) { save(d, dataDir, s.name, 'текстовый прокси'); process.exit(0); }
      console.warn(s.name, '— страница не распознана. Фрагмент:', text.replace(/\s+/g, ' ').slice(0, 240));
    } catch (e) {
      console.warn(s.name, '— запасной путь не прошёл:', e.message);
    }
  }
  console.error('Ни один источник не ответил — старый ob-level.json не трогаем');
  process.exit(0);
})();
