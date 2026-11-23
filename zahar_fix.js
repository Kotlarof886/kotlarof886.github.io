/* zahar_fix.js — правки поверхъ zahar_chat.js
   Подключать СТРОГО послѣ zahar_chat.js — одной строкой въ index.html:
   <script src="zahar_fix.js?v=1"></script>
   Что делаетъ:
   1) погода «сейчас» берётся съ data/wxnow.json (пишетъ будильникъ GitHub) — зеркала запасные;
   2) стражъ 77 переписанъ: звёзды идутъ умному ярусу (знаетъ облачность), луна безъ задвоенія,
      «когда новолуніе/полнолуніе» отвечаются прямымъ счётомъ небесной механики;
   3) выходъ Захара причесывается: «Тепра»→«Тепръ», «завтро»→«завтра», ветеръ — метры первыми,
      вода — съ «°С», сводка погоды — «Метеорная станция доноситъ:», давленіе — современными мерами первыми. */

/* ---------- 1. Погода «сейчас» съ файловой сводки ---------- */

function zfixWxNow() {
  return fetch('data/wxnow.json?_cb=' + Date.now())
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (f) {
      if (!f || typeof f.t !== 'number') return null;
      return {
        t: Math.round(f.t * 10) / 10,
        ws: (typeof f.ws === 'number') ? Math.round(f.ws * 10) / 10 : null,
        wd: (typeof f.wd === 'number') ? f.wd : null,
        pr: (typeof f.pr === 'number') ? f.pr : 0,
        wc: (typeof f.wc === 'number') ? f.wc : null,
        cc: (typeof f.cc === 'number') ? f.cc : null,
        ts: f.ts || Date.now(),
        src: 'файлъ-сводка'
      };
    })
    .catch(function () { return null; });
}

var __zfixFetchFull = (typeof fetchFull === 'function') ? fetchFull : null;

function fetchFull() {
  return zfixWxNow().then(function (d) {
    if (d) {
      try { fullCacheSet(d); } catch (e) {}
      try { warn('погода маршрутъ ответилъ: файлъ-сводка'); }
      catch (e) { if (window.console) console.log('[zahar_fix] погода маршрутъ ответилъ: файлъ-сводка'); }
      return d;
    }
    return __zfixFetchFull ? __zfixFetchFull() : null;
  });
}

/* ---------- 2. Луна: прямой счётъ (Меёусъ, усѣчённый разъ) ---------- */

function zfixSyzygy(k) {
  var T = k / 1236.85;
  var E = 1 - 0.002516 * T - 0.0000074 * T * T;
  var M  = (2.5534 + 29.10535670 * k) * Math.PI / 180;
  var Mp = (2.5534 + 29.10535670 * k - 0.0000078 * T * T) * Math.PI / 180;
  var F  = (160.7108 + 390.67050284 * k) * Math.PI / 180;
  var Om = (124.7746 - 1.56375588 * k) * Math.PI / 180;
  var j = 2451550.09766 + 29.530588861 * k
        + 0.00015437 * T * T - 0.000000150 * T * T * T + 0.00000000073 * T * T * T * T;
  j += -0.40720 * Math.sin(Mp) + 0.17241 * E * Math.sin(M)
    + 0.01608 * Math.sin(2 * Mp) + 0.01039 * Math.sin(2 * F)
    + 0.00739 * E * Math.sin(M - Mp) - 0.00514 * E * Math.sin(M + Mp)
    + 0.00208 * E * E * Math.sin(2 * M) - 0.00111 * Math.sin(Mp - 2 * F)
    - 0.00057 * Math.sin(Mp + 2 * F) + 0.00056 * E * Math.sin(2 * Mp + M)
    + 0.00042 * Math.sin(3 * Mp) + 0.00042 * E * Math.sin(M + Mp)
    + 0.00038 * E * Math.sin(M - Mp) - 0.00024 * E * Math.sin(2 * M - Mp)
    - 0.00017 * Math.sin(Om) - 0.00007 * Math.sin(2 * Mp + 2 * F);
  return j;
}

function zfixNextMoon(kind) { /* kind: 'new' | 'full' */
  var nowJD = Date.now() / 86400000 + 2440587.5;
  var k0 = Math.floor((nowJD - 2451550.09766) / 29.530588861);
  for (var i = -1; i <= 3; i++) {
    var j = zfixSyzygy(k0 + i + (kind === 'full' ? 0.5 : 0));
    if (j > nowJD) return j;
  }
  return zfixSyzygy(k0 + 2 + (kind === 'full' ? 0.5 : 0));
}

function zfixMoonWhen(j) {
  var mon = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
  var dow = ['воскресенье','понедельник','вторникъ','среда','четвергъ','пятница','суббота'];
  var d = new Date((j - 2440587.5) * 86400000 + 7 * 3600000); /* Барнаулъ UTC+7 */
  if (d.getUTCHours() >= 18) {
    var d2 = new Date(d.getTime() + 86400000);
    return 'в ночь съ ' + d.getUTCDate() + '-го на ' + d2.getUTCDate() + '-е ' + mon[d2.getUTCMonth()];
  }
  return d.getUTCDate() + '-го ' + mon[d.getUTCMonth()];
}

function zfixSay(t) {
  try { return femizeOut(fill(t)); } catch (e) { return String(t).replace('{N}', 'сударь'); }
}

/* ---------- 3. Стражъ 77: переписанъ ---------- */

function zaharSkyGuard77(q) {
  var s = String(q || '').toLowerCase().replace(/ё/g, 'е').replace(/ѣ/g, 'е').replace(/[ъь]/g, '');
  if (!s) return null;
  if (/лун/.test(s)) {
    if (/новолун/.test(s)) {
      awaitingJob = false;
      return zfixSay('Новолуніе, {N}, выйдетъ ' + zfixMoonWhen(zfixNextMoon('new')) + '. По лунѣ примечають: въ тёмную ночь налимъ держится ямъ — тихая, добычливая пора.');
    }
    if (/полнолун/.test(s)) {
      awaitingJob = false;
      return zfixSay('Полнолуніе, {N}, выйдетъ ' + zfixMoonWhen(zfixNextMoon('full')) + '. По лунѣ примечають: налимъ на светлую ночь беретъ бойче.');
    }
    if (/когда|скоро/.test(s)) return null;
    awaitingJob = false;
    var ph = 'прибываетъ';
    try { ph = String(moonPhase77()).replace(/^\s*луна\s+/i, ''); } catch (e) {}
    return zfixSay('Луна нынчѣ, {N}, ' + ph + '.');
  }
  /* звёзды и прочее небо — умному ярусу №69: онъ знаетъ облачность */
  return null;
}

/* ---------- 4. Прическа выходовъ Захара ---------- */

function zfixTidy(s) {
  return String(s)
    .replace(/Тепра/g, 'Тепръ')
    .replace(/завтро/g, 'завтра')
    .replace(/до ([\d.,]+)\s*в[её]рст\S*\s*в\S*\s*час\S*\s*$([\d.,]+)\s*метра\s*в\S*\s*секунду$/gi,
             'до $2 метра въ секунду ($1 вёрстъ въ часъ)')
    .replace(/(\d+) мм(?:ъ)?(?: ртутного столба)?\s*$(\d+) гектопаскалей$/gi,
             '$2 гектопаскалей ($1 ммъ ртутнаго столба)')
    .replace(/(\d+,\d+)\s*°\s*—/g, '$1°С —')
    .replace(/^Погода на ([а-яёѣ]+(?:,\s*\d+[^,]*)?),\s*[^:]*:\s*тепръ\s+отъ/i,
             'Метеорная станция доносит: $1, отъ');
}

var __zfixAnswerWeather = (typeof answerWeather === 'function') ? answerWeather : null;

function answerWeather() {
  if (!__zfixAnswerWeather) return null;
  var r = __zfixAnswerWeather.apply(this, arguments);
  if (r && typeof r.then === 'function') return r.then(zfixTidy);
  return r ? zfixTidy(r) : r;
}

var __zfixKlev = (typeof zaharKlevReply === 'function') ? zaharKlevReply : null;

function zaharKlevReply() {
  if (!__zfixKlev) return null;
  var r = __zfixKlev.apply(this, arguments);
  var done = function (s) { return s ? zfixTidy(s) : s; };
  return (r && typeof r.then === 'function') ? r.then(done) : done(r);
}

if (window.console) console.log('[zahar_fix] надетъ: погода-файлъ первенствуетъ, стражъ 77 переписанъ, выходы причесаны.');
