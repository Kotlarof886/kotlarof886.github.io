/* ============================================================
   zahar_river.js — мостъ рѣки для Захара (уровень Оби въ Барнаулѣ)
   Версія 4: фразологія живётъ въ scripts/zahar_ob.js и приходитъ
   готовой въ data/ob-level.json (полѣ phrase). Мостъ только несётъ:
   кэшъ полчаса, запасъ — старая сборка изъ полей, вода въ запасѣ изъ
   data/klev.json. Ничего не дублируемъ.
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

  /* вода изъ кэша мгновенно — для запасной сборки, если въ JSON фразы нѣтъ */
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

  /* запасная сборка — только если въ ob-level.json фраза не доехала */
  function fallbackPhrase(d) {
    var s;
    var delta = (typeof d.delta === 'number') ? d.delta : 0;
    if (delta > 0) s = 'Уровень Оби въ Барнаулѣ нынче ' + d.level + ' смъ, идётъ на подъёмъ (+' + delta + ' смъ за сутки)';
    else if (delta < 0) s = 'Уровень Оби въ Барнаулѣ нынче ' + d.level + ' смъ, идётъ на спадъ (−' + Math.abs(delta) + ' смъ за сутки)';
    else s = 'Уровень Оби въ Барнаулѣ нынче ' + d.level + ' смъ, за сутки — безъ перемѣнъ';
    var tw = waterNow();
    if (tw !== null) s += ', вода въ Оби ' + String(tw).replace('.', ',') + '°С';
    return s + '.';
  }

  function serve(d, stale) {
    var s = d.phrase ? String(d.phrase) : fallbackPhrase(d);
    if (stale) s += ' (Данные могли устарѣть — запрошу свежіе при следующей депешѣ.)';
    return s;
  }

  /* главный входъ: Promise со строкой-ответомъ */
  function ask() {
    var d = readCache();
    if (d && Date.now() - d.ts < TTL) {   /* кэшъ живой — отвечаемъ сразу */
      return Promise.resolve(serve(d, false));
    }
    return new Promise(function (res) {
      load(SRC, function (o) {
        if (o) {
          writeCache(o);
          load(KSRC, function () {}); /* вода прогрѣвается впрокъ для запаса */
          res(serve(o, false));
        } else if (d) {   /* источникъ не ответилъ — старый кэшъ лучше пустоты */
          res(serve(d, true));
        } else {
          res('Про уровень Оби сведеній пока нѣтъ — гляньте на метеорную станцію или спросите черезъ минуту.');
        }
      });
    });
  }

  window.ZAHAR_RIVER_ASK = ask;
})();