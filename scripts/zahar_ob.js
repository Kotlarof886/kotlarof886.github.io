/* scripts/zahar_ob.js — уровень Оби в Барнауле, каскад источников.
   Версия 3 (22.11.2026): шесть классов суточного сдвига (штиль, обычный,
   заметный, сильный, экстраординарный), случайный выбор фразы внутри класса;
   дата в мире Захара — всегда 1896 год; подпись «водомѣрный постъ „Барнаулъ“».
   Полные браузерные заголовки; запасной путь через r.jina.ai; диагностика
   фрагмента в логе; молчание источников не роняет запуск — старый JSON цел. */
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
/* обратная карта: «11» -> «ноября» — для даты в мире Захара */
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
  ];
  if (delta > 0) {
    if (a < 15) return [
      `Уровень Оби въ Барнаулѣ нынче ${level} смъ, идётъ на подъёмъ (+${a} смъ за сутки). ${S}`,
      `Уровень Оби въ Барнаулѣ — ${level} смъ, за сутки прибыло ${a} смъ. ${S}`,
      `Обь въ Барнаулѣ держится на ${level} смъ и понемногу прибываетъ: плюсъ ${a} смъ за сутки. ${S}`,
    ];
    if (a < 30) return [
      `Уровень Оби въ Барнаулѣ нынче ${level} смъ, вода заметно прибываетъ: плюсъ ${a} смъ за сутки. ${S}`,
      `Обь въ Барнаулѣ заметно пошла вверхъ: нынче ${level} смъ, за сутки прибыло ${a} смъ. ${S}`,
      `Уровень Оби въ Барнаулѣ подросъ — ${level} смъ, за сутки плюсъ ${a} смъ. ${S}`,
    ];
    if (a < 50) return [
      `Уровень Оби въ Барнаулѣ нынче ${level} смъ — вода быстро прибываетъ: плюсъ ${a} смъ за сутки. ${S}`,
      `Обь въ Барнаулѣ пошла въ ростъ: нынче ${level} смъ, за сутки прибыло целыхъ ${a} смъ. ${S}`,
      `Уровень Оби въ Барнаулѣ рванулъ вверхъ — ${level} смъ, прибавка за сутки ${a} смъ. ${S}`,
    ];
    return [
      `Уровень Оби въ Барнаулѣ нынче ${level} смъ — такой прибыли старожилы и не помнятъ: плюсъ ${a} смъ за сутки. ${S}`,
      `Обь въ Барнаулѣ пошла большою водойъ: нынче ${level} смъ, за сутки прибыло разомъ ${a} смъ. ${S}`,
      `Уровень Оби въ Барнаулѣ рванулъ вверхъ — ${level} смъ, за сутки плюсъ ${a} смъ. Постъ такого давно не записывалъ. ${S}`,
    ];
  }
  if (a < 15) return [
    `Уровень Оби въ Барнаулѣ нынче ${level} смъ, идётъ на спадъ (−${a} смъ за сутки). ${S}`,
    `Уровень Оби въ Барнаулѣ — ${level} смъ, за сутки рѣка опала на ${a} смъ. ${S}`,
    `Обь въ Барнаулѣ держится на ${level} смъ и понемногу убываетъ: минусъ ${a} смъ за сутки. ${S}`,
  ];
  if (a < 30) return [
    `Уровень Оби въ Барнаулѣ нынче ${level} смъ, вода заметно убываетъ: минусъ ${a} смъ за сутки. ${S}`,
    `Обь въ Барнаулѣ заметно идётъ на убыль: нынче ${level} смъ, за сутки опала на ${a} смъ. ${S}`,
    `Уровень Оби въ Барнаулѣ приселъ — ${level} смъ, за сутки минусъ ${a} смъ. ${S}`,
  ];
  if (a < 50) return [
    `Уровень Оби въ Барнаулѣ нынче ${level} смъ — вода быстро убываетъ: минусъ ${a} смъ за сутки. ${S}`,
    `Обь въ Барнаулѣ быстро идётъ на убыль: нынче ${level} смъ, за сутки опала на ${a} смъ. ${S}`,
    `Уровень Оби въ Барнаулѣ резко упалъ — ${level} смъ, за сутки минусъ ${a} смъ. ${S}`,
  ];
  return [
    `Уровень Оби въ Барнаулѣ нынче ${level} смъ — вода валится стремительно: минусъ ${a} смъ за сутки. ${S}`,
    `Обь въ Барнаулѣ провалилась: нынче ${level} смъ, за сутки убило разомъ ${a} смъ. ${S}`,
    `Уровень Оби въ Барнаулѣ рухнулъ — ${level} смъ, за сутки минусъ ${a} смъ. Старожилы такихъ спадовъ и не припомнятъ. ${S}`,
  ];
}

function parse(text, name) {
  const m = text.match(/составля[её]т\s+(-?\d+)\s*[cс]м/i);
  if (!m) return null;
  const level = parseInt(m[1], 10);
  let delta = 0;
  const t = text.match(/(повысился|понизился|прибыло|убыло)\D{0,30}?(\d+)\s*[cс]м/i);
  if (t) delta = parseInt(t[2], 10) * ((t[1] === 'понизился' || t[1] === 'убыло') ? -1 : 1);

  /* день и месяц измерения: «На 20.11.2026» либо «на 20 ноября 2026» */
  let day = '', month = '', year = '';
  const dn = text.match(/[Нн]а\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (dn) { day = dn[1]; month = dn[2]; year = dn[3]; }
  else {
    const dw = text.match(/[Нн]а\s+(\d{1,2})\s+([а-яё]+)\s+(\d{4})/i);
    if (dw && MONTHS[dw[2].toLowerCase()]) { day = dw[1]; month = MONTHS[dw[2].toLowerCase()]; year = dw[3]; }
  }
  /* если дату в тексте не нашли — барнаульское «сегодня» */
  if (!day || !month) {
    const now = new Date(Date.now() + 7 * 3600 * 1000);
    day = String(now.getUTCDate()).padStart(2, '0');
    month = String(now.getUTCMonth() + 1).padStart(2, '0');
    year = String(now.getUTCFullYear());
  }
  const date = `${day}.${month}.${year}`;
  const monthName = MONTH_NAMES[month] || month;
  const phrase = pick(level, delta, day, monthName)[Math.floor(Math.random() * 3) % (level && 1 ? pick(level, delta, day, monthName).length : 1)];
  const trend = delta > 0 ? 'подъём' : delta < 0 ? 'спад' : 'без изменений';
  return { level, delta, trend, class: klass(delta), date, phrase, source: name, ts: Date.now() };
}
