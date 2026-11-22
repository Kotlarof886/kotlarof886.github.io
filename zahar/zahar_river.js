/* ============================================================
   zahar_river.js — мостъ рѣки для Захара (уровень Оби въ Барнаулѣ)
   Источникъ: data/ob-level.json въ репозитории, обновляетъ GitHub Actions
   (scripts/zahar_ob.js, разъ въ часъ). Версія 3 (22.11.2026): скриптъ
   собираетъ фразу самъ, въ шести классахъ суточного сдвига, съ датой
   «N ноября 1896 года» и подписью водомѣрнаго поста — здѣсь она берется
   готовой изъ поля phrase; старая сборка — запасъ на старый JSON.
   Ответъ — обещаніемъ (Promise), какъ погодныя ветки чата.
   ============================================================ */
(function () {
  'use strict';

  var TTL = 30 * 60 * 1000;   /* свежесть кэша: полчаса */
  var KEY = 'barnaul-ob-level';
  var SRC = 'data/ob-level.json';   /* относительный путь — переживетъ смену домена */

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

  function load(cb) {
    var x = new XMLHttpRequest();
    x.open('GET', SRC, true);
    x.timeout = 10000;
    x.onload = function () {
      if (x.status !== 200) return cb(null);
      try {
        var o = JSON.parse(x.responseText);
        cb(o && typeof o.level === 'number' ? o : null);
      } catch (e) { cb(null); }
    };
    x.onerror = function () { cb(null); };
    x.ontimeout = function () { cb(null); };
    x.send();
  }

  /* готовая фраза: изъ JSON, если скриптъ ея прислалъ; иначе старая сборка */
  function phrase(d, stale) {
    var s;
    if (d.phrase && typeof d.phrase === 'string') {
      s = d.phrase;
    } else if (d.trend === 'подъём') {
      s = 'Уровень Оби въ Барнаулѣ нынче ' + d.level + ' смъ, рѣка идеть на подъемъ: за сутки прибыло ' + Math.abs(d.delta) + ' смъ.';
    } else if (d.trend === 'спад') {
      s = 'Уровень Оби въ Барнаулѣ нынче ' + d.level + ' смъ, рѣка идетъ на спадъ: за сутки убыло ' + Math.abs(d.delta) + ' смъ.';
    } else if (d.trend === null || d.trend === undefined) {
      s = 'Уровень Оби въ Барнаулѣ нынче ' + d.level + ' смъ; динамику за сутки не доносятъ — распоряженійе не прислали.';
    } else {
      s = 'Уровень Оби въ Барнаулѣ нынче ' + d.level + ' смъ, за сутки — безъ переменъ.';
    }
    if (!d.phrase) {
      s += ' Измереніе отъ ' + (d.date || new Date(d.ts).toLocaleDateString('ru-RU')) + ', данные: ' + (d.source || 'fishingsib.ru') + '.';
    }
    if (stale) s += ' (Данные могли устарѣть — запрошу свежіе при следующей депешѣ.)';
    return s;
  }

  /* главный входъ: возвращаетъ Promise со строкой-ответомъ (контрактъ чата) */
  function ask() {
    var d = readCache();
    if (d && Date.now() - d.ts < TTL) {   /* кэшъ живой — отвечаемъ сразу */
      return Promise.resolve(phrase(d, false));
    }
    return new Promise(function (res) {
      load(function (o) {
        if (o) {
          writeCache(o);
          res(phrase(o, false));
        } else if (d) {   /* источникъ не ответилъ — старый кэшъ лучше пустоты */
          res(phrase(d, true));
        } else {
          res('Про уровень Оби сведеній пока нѣтъ — гляньте на метеорную станцію или спросите черезъ минуту.');
        }
      });
    });
  }

  window.ZAHAR_RIVER_ASK = ask;
})();
