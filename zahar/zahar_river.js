/* ============================================================
   zahar_river.js — мостъ рѣки для Захара (уровень Оби въ Барнаулѣ)
   Источникъ: data/ob-level.json, обновляетъ GitHub Actions (раз въ часъ).
   Версія 3: къ уровню добавлена температура воды изъ data/klev.json.
   Прежняя логика не тронута — вода лишь хвостомъ въ концѣ.
   ============================================================ */
(function () {
  'use strict';

  var TTL = 30 * 60 * 1000;
  var KEY = 'barnaul-ob-level';
  var WKEY = 'zahar-klev-water';
  var SRC = 'data/ob-level.json';
  var KSRC = 'data/klev.json';

  function readCache() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (o && typeof o.level === 'number' && typeof o.ts === 'number') return o;
    } catch (e) {}
    return null;
  }

  function writeCache(d) {
    try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {}
  }

  function load(src, cb) {
    var x = new XMLHttpRequest();
    x.open('GET', src, true);
    x.timeout = 10000;
    x.onload = function () {
      if (x.status !== 200) return cb(null);
      try { cb(JSON.parse(x.responseText)); } catch (e) { cb(null); }
    };
    x.onerror = function () { cb(null); };
    x.ontimeout = function () { cb(null); };
    x.send();
  }

  /* температура воды: кэш полчаса, не тормозит главный ответъ */
  function readWater(cb) {
    try {
      var raw = localStorage.getItem(WKEY);
      if (raw) {
        var o = JSON.parse(raw);
        if (o && typeof o.temp === 'number' && typeof o.ts === 'number' && Date.now() - o.ts < TTL) return cb(o.temp);
      }
    } catch (e) {}
    load(KSRC, function (o) {
      var t = (o && o.level && typeof o.level.temp === 'number') ? o.level.temp : null;
      if (t !== null) {
        try { localStorage.setItem(WKEY, JSON.stringify({ temp: t, ts: Date.now() })); } catch (e) {}
      }
      cb(t);
    });
  }

  var WATER_TAILS = [
    'Вода въ Оби теперича {W} град.',
    'Да и вода въ рекѣ — {W} град.',
    'Вода въ Оби на {W} град.'
  ];

  /* готовая фраза Захара въ дореформенной орѳографіи */
  function phrase(d, stale, tw) {
    var s;
    if (d.trend === 'подъём') {
      s = 'Уровень Оби въ Барнаулѣ нынче ' + d.level + ' смъ, рѣка идеть на подъемъ: за сутки прибыло ' + Math.abs(d.delta) + ' смъ.';
    } else if (d.trend === 'спад') {
      s = 'Уровень Оби въ Барнаулѣ нынче ' + d.level + ' смъ, рѣка идетъ на спадъ: за сутки убыло ' + Math.abs(d.delta) + ' смъ.';
    } else if (d.trend === null || d.trend === undefined) {
      s = 'Уровень Оби въ Барнаулѣ нынче ' + d.level + ' смъ; динамику за сутки не доносятъ — распоряженійе не прислали.';
    } else {
      s = 'Уровень Оби въ Барнаулѣ нынче ' + d.level + ' смъ, за сутки — безъ переменъ.';
    }
        s += ' Измереніе отъ ' + (d.date || new Date(d.ts).toLocaleDateString('ru-RU')) + ', данные: ' + (d.source || 'fishingsib.ru') + '.';
    if (stale) s += ' (Данные могли устарѣть — запрошу свежіе при следующей депешѣ.)';
    if (tw !== null && tw !== undefined) {
      s += ' ' + WATER_TAILS[Math.floor(Math.random() * WATER_TAILS.length)].replace(/\{W\}/g, String(tw).replace('.', ','));
    }
    return s;
  }

  /* главный входъ: Promise со строкой-ответомъ, вода — хвостомъ въ концѣ */
  function ask() {
    var d = readCache();
    if (d && Date.now() - d.ts < TTL) {   /* кэшъ живой — отвечаемъ сразу */
      readWater(function (tw) { /* вода догрузится къ следующему вопросу, ответъ не ждёмъ */ });
      return Promise.resolve(phrase(d, false, waterNow()));
    }
    return new Promise(function (res) {
      load(SRC, function (o) {
        if (o) {
          writeCache(o);
          readWater(function (tw) {});
          res(phrase(o, false, waterNow()));
        } else if (d) {   /* источникъ не ответилъ — старый кэшъ лучше пустоты */
          res(phrase(d, true, waterNow()));
        } else {
          res('Про уровень Оби сведеній пока нѣтъ — гляньте на метеорную станцію или спросите черезъ минуту.');
        }
      });
    });
  }

  /* вода изъ кэша мгновенно, безъ ожиданія — при нѣтъ, хвостъ молчитъ */
  function waterNow() {
    try {
      var raw = localStorage.getItem(WKEY);
      if (raw) {
        var o = JSON.parse(raw);
        if (o && typeof o.temp === 'number' && typeof o.ts === 'number' && Date.now() - o.ts < TTL) return o.temp;
      }
    } catch (e) {}
    return null;
  }

  window.ZAHAR_RIVER_ASK = ask;
})();

