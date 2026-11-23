/* ============================================================
   zahar_fix.js — правки поверхъ zahar_chat.js
   Версія 8 (24.11.2026).
   Подключать СТРОГО послѣ zahar_chat.js въ index.html:
   <script src="zahar_fix.js?v=8"></script>

   Отличія отъ v7: рыбалка и охота — по живымъ даннымъ.
   data/klev.json читается слоемъ: клѣвъ дня, лучшая рыба, вода.
   «пойдемъ на рыбалку» — планъ по клёву нынчѣ (хорошъ — куда, плохъ —
   «идти не стоитъ», у завтра лучше — «заделайся завтра»).
   «когда на рыбалку» — воскресенье по настоящей датѣ + клѣвъ въ
   воскресенье изъ данныхъ. «ты рыбакъ» — безъ сезонной присяги налиму:
   живой клѣвъ добавляется, лишь когда онъ есть.
   Охота — по погодѣ (морось/морозъ/пороша). «Какъ ловить X» — статьи.
   ============================================================ */
(function () {
  'use strict';
  if (window.__ZFIX_V__) return;
  window.__ZFIX_V__ = 8;

  /* ---------- 0. Помощники ---------- */

  var Z92_MON = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
  var Z92_KLAB = { 1: 'нѣтъ вовсе', 2: 'почти нѣтъ', 3: 'жидкій', 4: 'вялый', 5: 'половинчатый', 6: 'серединный', 7: 'серединный съ добромъ', 8: 'добрый', 9: 'добрый превыше хвалы', 10: 'сильный, яръ' };

  function zfixCanon(x) {
    return String(x || '').toLowerCase().replace(/ё/g, 'е').replace(/ѣ/g, 'е').replace(/[ъь]/g, '');
  }
  function zfixName() {
    var n = String(window.ZAHAR_USER_NAME || '').trim();
    return n || (window.ZAHAR_USER_GENDER === 'f' ? 'сударыня' : 'сударь');
  }
  function zfixAddr() { return window.ZAHAR_USER_GENDER === 'f' ? 'сударыня' : 'сударь'; }
  function zfixFill(t) {
    return String(t).replace(/\{N\}/g, zfixName()).replace(/\{A\}/g, zfixAddr());
  }
  function zfixYo(s) { return String(s).replace(/ё/g, 'е').replace(/Ё/g, 'Е'); }
  function zfixSay(t) { return zfixYo(zfixFill(t)); }
  function zfixPick(a) { return a[Math.floor(Math.random() * a.length)]; }

  /* ---------- 1. Живой клёв: data/klev.json (свой кэшъ слоя) ---------- */

  var ZFIX_KLEV = null, ZFIX_KLEV_TS = 0;
  function zfixKlevFetch() {
    var now = Date.now();
    if (ZFIX_KLEV && now - ZFIX_KLEV_TS < 10 * 60 * 1000) return;
    try {
      fetch('/data/klev.json').then(function (r) {
        if (!r.ok) throw 0; return r.json();
      }).then(function (d) {
        if (d && d.days && d.days.length) { ZFIX_KLEV = d; ZFIX_KLEV_TS = Date.now(); }
      }).catch(function () {});
    } catch (e) {}
  }
  zfixKlevFetch();
  setInterval(zfixKlevFetch, 10 * 60 * 1000);

  function zfixKlevDay(i) {
    var d = ZFIX_KLEV;
    if (!d || !d.days || !d.days.length) return null;
    var day = d.days[i] || d.days[0];
    var sc10 = Math.min(10, Math.max(1, Math.round((day.score || 0) / 10)));
    var best = null;
    if (day.top && day.top.length) {
      for (var k = 0; k < day.top.length; k++) {
        var e = day.top[k];
        if (!e) continue;
        var sv = (typeof e.s === 'number') ? e.s : (typeof e.score === 'number' ? e.score : 0);
        if (sv >= 40) { best = { name: (e.n || e.name || ''), gear: (e.g || e.gear || '') }; break; }
      }
    }
    return { sc10: sc10, label: Z92_KLAB[sc10], best: best, day: day };
  }

  function zfixWaterStr() {
    try {
      var ob = JSON.parse(localStorage.getItem('barnaul-ob-level') || 'null');
      if (ob && typeof ob.temp === 'number') return 'Вода въ Оби ' + String(ob.temp).replace('.', ',') + '°С.';
    } catch (e) {}
    var d = ZFIX_KLEV;
    if (d && d.level && typeof d.level.temp === 'number') return 'Вода въ Оби ' + String(d.level.temp).replace('.', ',') + '°С.';
    return '';
  }

  /* ---------- 2. Погода «сейчас»: файлъ-сводка + запасъ ---------- */

  function zfixWxNow() {
    return fetch('data/wxnow.json?_cb=' + Date.now())
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (f) {
        if (!f || typeof f.t !== 'number') return null;
        return {
          t: Math.round(f.t * 10) / 10,
          ws: (typeof f.ws === 'number') ? Math.round(f.ws * 10) / 10 : null,
          wd: (typeof f.wd === 'number') ? f.wd : null,
          pr: (typeof f.pr === 'number') ? f.pr : null,
          wc: (typeof f.wc === 'number') ? f.wc : null,
          cc: (typeof f.cc === 'number') ? f.cc : null,
          ts: f.ts || Date.now(),
          src: 'файлъ-сводка'
        };
      })
      .catch(function () { return null; });
  }

  var ZFIX_WX_KEY = 'zfix-wxnow-last';
  function zfixWxStore(d) {
    try { localStorage.setItem(ZFIX_WX_KEY, JSON.stringify({ t: d.t, ts: Date.now() })); } catch (e) {}
  }
  function zfixWxRecall(maxAge) {
    try {
      var raw = localStorage.getItem(ZFIX_WX_KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (o && typeof o.t === 'number' && Date.now() - o.ts < (maxAge || 6 * 3600000)) return o.t;
    } catch (e) {}
    return null;
  }

  var __zfixFetchFull = (typeof fetchFull === 'function') ? fetchFull : null;
  function fetchFull() {
    return zfixWxNow().then(function (d) {
      if (d) {
        zfixWxStore(d);
        try {
          if (typeof warn === 'function') warn('погода маршрутъ ответилъ: файлъ-сводка');
          else if (window.console) console.log('[zahar_fix] погода маршрутъ ответилъ: файлъ-сводка');
        } catch (e) {}
        return d;
      }
      return __zfixFetchFull ? __zfixFetchFull() : null;
    });
  }

  function zfixWarm() { zfixWxNow().then(function (d) { if (d) zfixWxStore(d); }); }
  setTimeout(zfixWarm, 400);
  setInterval(zfixWarm, 10 * 60 * 1000);

  /* ---------- 3. Луна: прямой счетъ (Меёусъ) ---------- */

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
  function zfixNextMoon(kind) {
    var nowJD = Date.now() / 86400000 + 2440587.5;
    var k0 = Math.floor((nowJD - 2451550.09766) / 29.530588861);
    for (var i = -1; i <= 3; i++) {
      var j = zfixSyzygy(k0 + i + (kind === 'full' ? 0.5 : 0));
      if (j > nowJD) return j;
    }
    return zfixSyzygy(k0 + 2 + (kind === 'full' ? 0.5 : 0));
  }
  function zfixMoonWhen(j) {
    var d = new Date((j - 2440587.5) * 86400000 + 7 * 3600000); /* Барнаулъ UTC+7 */
    if (d.getUTCHours() >= 18) {
      var d2 = new Date(d.getTime() + 86400000);
      return 'в ночь съ ' + d.getUTCDate() + '-го на ' + d2.getUTCDate() + '-е ' + Z92_MON[d2.getUTCMonth()];
    }
    return d.getUTCDate() + '-го ' + Z92_MON[d.getUTCMonth()];
  }
  function zfixMoonPhase() {
    var SYN = 29.530588853;
    var ref = Date.UTC(2000, 0, 6, 18, 14);
    var days = (Date.now() - ref) / 86400000;
    var frac = days / SYN - Math.floor(days / SYN);
    if (frac < 0.03 || frac >= 0.97) return 'новолуніе — мѣсяца не видать';
    if (frac < 0.22) return 'молодой серпъ — мѣсяцъ сталью блеститъ';
    if (frac < 0.28) return 'первая четверть — мѣсяцъ наполовину налитъ';
    if (frac < 0.47) return 'луна прибываетъ, идетъ къ полнолунію';
    if (frac < 0.53) return 'полнолуніе — светлая ночь';
    if (frac < 0.72) return 'луна на убыли, послѣ полнолунія';
    if (frac < 0.78) return 'послѣдняя четверть — мѣсяцъ наполовину отбылъ';
    return 'старый серпъ — луна къ новолунію клонится';
  }

  /* ---------- 4. Солнце для Барнаула (восходъ/закатъ) ---------- */

  function zfixSun(kind) {
    var now = new Date();
    var start = new Date(now.getFullYear(), 0, 0);
    var n = Math.floor((now - start) / 86400000);
    var B = 2 * Math.PI * (n - 81) / 364;
    var eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
    var decl = 0.4093 * Math.sin(2 * Math.PI * (n - 81) / 364);
    var lat = 53.35 * Math.PI / 180;
    var cosw = (-0.01454 - Math.sin(lat) * Math.sin(decl)) / (Math.cos(lat) * Math.cos(decl));
    if (cosw > 1) cosw = 1; if (cosw < -1) cosw = -1;
    var half = Math.acos(cosw) * 12 / Math.PI;
    var solar = (kind === 'rise') ? 12 - half : 12 + half;
    var local = solar - eot / 60 + (7 - 83.78 / 15);
    var h = Math.floor(local), m = Math.round((local - h) * 60);
    if (m === 60) { h++; m = 0; }
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }

  /* ---------- 5. Рыбалка по живому клёву ---------- */

  function zfixFishingPlan() {
    if (!ZFIX_KLEV) return zfixSay(zfixPick([
      'Съ Богомъ на Обь, {N}: снасть наведите съ вечера, живца запасите — и въ добрый часъ!',
      'На Обь, {N}, извольте: живца запаси — и удачи на воде!'
    ]));
    var t0 = zfixKlevDay(0), t1 = zfixKlevDay(1);
    if (!t0 || !t1) return zfixSay('Съ Богомъ на Обь, {N}: снасть наведите съ вечера — и въ добрый часъ!');
    if (t0.sc10 >= 4) {
      var tail = '';
      if (t0.best) tail = ' Беретъ нынчѣ: ' + t0.best.name + (t0.best.gear ? ' — ' + t0.best.gear : '') + '.';
      var wat = zfixWaterStr();
      return zfixSay('Съ Богомъ на Обь, {N}: клѣвъ нынчѣ ' + t0.label + '.' + tail + (wat ? ' ' + wat : '') + ' Живца запаси — и въ добрый часъ!');
    }
    if (t1.sc10 >= 4) {
      return zfixSay('Нынчѣ, {N}, идти не стоитъ: клѣвъ ' + t0.label + '. А завтра клѣвъ ' + t1.label +
        (t1.best ? ' — беретъ ' + t1.best.name : '') + ': вотъ тогда и заделайся на Обь.');
    }
    return zfixSay('Не нынчѣ, {N}: клѣвъ ' + t0.label + ', да и завтра ' + t1.label + ' — съ снастью сидѣть зря. Какъ выправится — гляньте опосля.');
  }

  function zfixSundayIdx() {
    var d = ZFIX_KLEV;
    if (!d || !d.days) return -1;
    for (var j = 0; j < d.days.length; j++) if (d.days[j].dow === 'воскресенье') return j;
    return -1;
  }
  function zfixFishSunday() {
    var now = new Date();
    var ts = (7 - now.getDay()) % 7;
    var base;
    if (ts === 0) {
      base = 'Нынчѣ какъ разъ воскресенье, {N}: какъ смѣну сдамъ къ вечеру — такъ и на Обь.';
    } else {
      var sun = new Date(now.getFullYear(), now.getMonth(), now.getDate() + ts);
      base = 'Въ воскресенье, {N} — выходной мой: ' + sun.getDate() + '-е ' + Z92_MON[sun.getMonth()] + '. На Обь къ рассвету.';
    }
    base += ' Снасть наведите съ вечера; червяка прикупите на рынкѣ, а у мальчишекъ возле трактира за пару копеекъ продадутъ и червяка, и опарыша.';
    if (ZFIX_KLEV) {
      var idx = (ts === 0) ? 0 : zfixSundayIdx();
      var day = zfixKlevDay(idx);
      if (day) {
        base += ' Клѣвъ въ воскресенье ожидается ' + day.label +
          (day.best ? ' — беретъ ' + day.best.name : '') + '.';
      }
    }
    return zfixSay(base);
  }

  function zfixRybakReply() {
    var base = zfixPick([
      'Рыбакъ, {N}, изъ простыхъ: по выходнымъ на Обь выбираюсь, снасть да мотокъ лесы въ чуланѣ держу.',
      'Рыбакъ смирный, {N}: при аппарате служу, а въ чуланѣ — снасти да леса.'
    ]);
    var t0 = zfixKlevDay(0);
    if (t0 && t0.sc10 >= 6 && t0.best) base += ' А нынчѣ, к слову, беретъ ' + t0.best.name + ' — клѣвъ ' + t0.label + '.';
    else if (t0 && t0.sc10 <= 3) base += ' А нынчѣ клѣвъ смирный, {N} — не всякій день.';
    return zfixSay(base);
  }

  /* способы ловли — статьи перенесены изъ чата дословно */
  var Z92_HOW = {
    'щук': 'Щука берется на живца жерлицами: у травы да у омутовъ поставьте, на ершика али пескаря — по перволедью самая пора. Жерлицу осмотрите к утру: щука снасть не щадитъ.',
    'налим': 'Налимъ ловится ночами на живца: закидка да перемычка съ крюками, у ямъ да корягъ; закидку у ямъ оставляйте до утра — налимъ ночникъ.',
    'карас': 'Карася по такой порѣ не потревожите — въ иле зимовать легъ; а весной и лѣтомъ — поплавочная удочка у берега, гдѣ трава да илъ, на червя да на хлебный мякишъ.',
    'окун': 'Окунь — мелкою удочкой на червя да на малька у затоновъ; со льда — мормышкой съ червемъ. Клевъ мѣлкій, зато постоянный.',
    'судак': 'Судака — закидкою у омутовъ, на живца: пескаря али ершика; беретъ подъ вечеръ да на зорькѣ.',
    'лещ': 'Леща къ ямамъ: съ вечера прикормку запарьте — хлебъ да крупа, съ утра поплавочной на червя да на мякишъ; по холодной водѣ беретъ вяло.',
    'яз': 'Язь лѣтомъ поверху беретъ — на хлебъ да кузнечика; по холоду въ ямахъ на червя. Подходить къ омуту надо тихонько: рыба пугливая.',
    'ерш': 'Ерша — на червя гдѣ глубже да тишѣ; со льда такъ же. Уха изъ ершей навариста.',
    'елец': 'Ельца — поплавочной удочкой на перекатахъ, на мушку да на червя.',
    'пескар': 'Пескаря — на червя у песчаной мели; а самъ онъ славный живецъ для налима да судака.',
    'хариус': 'Хариусъ лѣтомъ на искусственную мушку поверху, на быстрыхъ перекатахъ; по осени — подъ льдомъ со мормышкой.',
    'таймен': 'Таймень — на дорожку съ блесной да на живца въ омутахъ верховьевъ; снасть держать крепкую: рыба бревномъ.',
    'ленок': 'Ленокъ на мушку да на червя беретъ, въ быстринахъ; братъ тайменю меньшой.',
    'нельм': 'Нельма — на дорожку да на живца въ глубинѣ; рыба нынѣ редкая, въ ямахъ зимовать отходитъ.',
    'муксун': 'Муксуна удочкой мало возьмешь: промысловое дѣло, неводами подъ льдомъ берутъ.',
    'сырок': 'Сырка (чира) неводами больше берутъ; удочкой въ заводяхъ на червя.',
    'пеляд': 'Пелядь — на опарыша поплавочной удочкой у заводей; по перволедью со льда на мормышку.',
    'стерляд': 'Стерлядь — къ ямамъ съ прикормкой, на червя; снасть — закидка съ крюками малыми.',
    'осетр': 'Осетра нынѣ мало: снасть — закидка у ямъ на червя да на малька, да и то беречь надобно — по чину.',
    'сазан': 'Сазана — къ тихимъ заводямъ, на хлебъ да горохъ пареный; рыба сильная — снасть крепкая.',
    'сорог': 'Сорогу (плотву) — мелкою удочкой у берега, на мякишъ да на мушку; клевъ осторожный.',
    'плотв': 'Сорогу (плотву) — мелкою удочкой у берега, на мякишъ да на мушку; клевъ осторожный.'
  };
  function zfixFishGuide(s) {
    var m = s.match(/как\s+(?:ловить|ловят|поймать)\s+([а-я]+)/);
    if (!m) return null;
    var w = m[1];
    for (var k in Z92_HOW) { if (w.indexOf(k) === 0) return Z92_HOW[k]; }
    return null;
  }

  /* ---------- 6. Охота по погодѣ ---------- */

  var z92Last = ''; /* последнее названное животное — для «а как на него охотится?» */

  function zfixHuntPlan() {
    var sk = zfixSkyInfo();
    var pr = 0, cc = null;
    if (sk) {
      pr = (typeof sk.precip === 'number') ? sk.precip : ((typeof sk.pr === 'number') ? sk.pr : 0);
      if (sk.rain) pr = Math.max(pr, 1);
      if (typeof sk.cloud === 'number') cc = sk.cloud;
      else if (typeof sk.cc === 'number') cc = sk.cc;
    }
    var t = zfixWxRecall();
    var cond;
    if (pr > 0.2) cond = 'морось сеетъ — следа не выжидайте, зато въ тишину зверь смѣлѣе выходитъ';
    else if (t !== null && t <= -5) cond = 'морозъ крепкій — следъ на пороше въ глаза видатъ';
    else if (t !== null && t <= 2) cond = 'по свежему снѣгу следъ видать какъ на ладони';
    else cond = 'въ угодье тишь — подъходъ тихій и противъ вѣтра';
    return zfixSay('Съ Богомъ на промыселъ, {N}: ' + cond + '. Ружье наведите съ вечера — смазка на морозе дубеетъ. Добычи вамъ!');
  }

  var Z92_HUNT_METHOD = {
    'косул': 'Косуля, {N}, чуткая на слухъ и взглядъ: по пороше тропы прямо читаются, подходъ — противъ вѣтра и тишкомъ, выстрѣлъ на десятъ саженей.',
    'заяц': 'Заяц по пороше тропится на лежку, {N}: тропы по краю поля, подходъ — противъ вѣтра, выстрѣлъ съ подъезда.',
    'глухар': 'Глухарь въ ноябре по березовымъ сережкамъ держится, {N}: подходъ подъ вѣтромъ, безъ шума — птица сторога.'
  };
  function z92HuntMethod(s) {
    for (var k in Z92_HUNT_METHOD) if (s.indexOf(k) !== -1) return Z92_HUNT_METHOD[k];
    if (z92Last && Z92_HUNT_METHOD[z92Last]) return Z92_HUNT_METHOD[z92Last];
    return 'По свежей пороше следы прямо, {N}: подходъ — противъ вѣтра и безъ шума, выстрѣлъ наверняка.';
  }

  /* ---------- 7. Знакомство (№91а) ---------- */

  var Z92_ZID = [
    'Я — Захаръ Давыдовичъ Кузнецовъ, {A}: служу на телеграфѣ неполный годъ, толкую слова, читаю фантастиковъ и мечтаю объ автоматическомъ аппаратѣ безъ проводовъ. Чемъ могу услужить?',
    'Захаръ я, Кузнецовъ Давыдовичъ, {A}: при аппаратѣ служу, слова толкую, по вечерамъ Уэллса вычитываю. Приказывайте!'
  ];

  /* ---------- 8. Звёзды по настоящему небу ---------- */

  var Z92_STARS_CLEAR = [
    'Звёзды нынче горятъ, {N}: Плеяды надъ Обью, Оріонъ въ полную силу — ночь душевна.',
    'На нѣбе ясная ночь, {N}: Бѣлый Медвѣдь надъ крышами ходитъ — по нему полюсъ находятъ.',
    'Звёздное небо нынче чистое, {N}: мороза по приметѣ ждать.'
  ];
  var Z92_STARS_HALF = [
    'Кое-гдѣ звёзды сквозятъ, {N}: да тучи частыми стаями ходятъ — то видать, то нетъ.',
    'Плеяды то проглянутъ, то сгинутъ, {N}: небо не пустое — тучки ходятъ.'
  ];
  var Z92_STARS_OVER = [
    'Хмарь нынче, {N}: небо тучами затянуто — ни Плеядъ, ни Оріона не разглядѣть.',
    'Звёздамъ сіять не по чину, {N}: сплошныя тучи — погода съ завалинкой.'
  ];
  var Z92_STARS_WET = [
    'Морось сеетъ, {N}: звёзды за пеленой — небо нынчѣ не звездное.',
    'Небо слезами умывается, {N}: до звёздъ нынчѣ не дотянуться — пелена.'
  ];

  function zfixSkyInfo() {
    try {
      var sk = (typeof window.ZAHAR_SKY_INFO === 'function') ? window.ZAHAR_SKY_INFO() : null;
      return sk || null;
    } catch (e) { return null; }
  }
  function zfixStarsReply() {
    var sk = zfixSkyInfo();
    var cl = null, pr = 0;
    if (sk) {
      if (typeof sk.cloud === 'number') cl = sk.cloud;
      else if (typeof sk.cc === 'number') cl = sk.cc;
      else if (typeof sk.cloudCover === 'number') cl = sk.cloudCover;
      if (typeof sk.precip === 'number') pr = sk.precip;
      else if (typeof sk.pr === 'number') pr = sk.pr;
      else if (sk.rain) pr = 1;
    }
    if (pr > 0.2) return zfixSay(zfixPick(Z92_STARS_WET));
    if (cl !== null) {
      if (cl >= 60) return zfixSay(zfixPick(Z92_STARS_OVER));
      if (cl >= 45) return zfixSay(zfixPick(Z92_STARS_HALF));
      return zfixSay(zfixPick(Z92_STARS_CLEAR));
    }
    return zfixSay(zfixPick(Z92_STARS_CLEAR));
  }

  /* ---------- 9. Прическа выходовъ ---------- */

  function zfixTidy(s) {
    return String(s)
      .replace(/Тепра/g, 'Тепръ')
      .replace(/завтро/g, 'завтра')
      .replace(/до ([\d.,]+)\s*в[её]рст\S*\s*в\S*\s*час\S*\s*[(]([\d.,]+)\s*метра\s*в\S*\s*секунду[)]/gi,
               'до $2 метра въ секунду ($1 вёрстъ въ часъ)')
      .replace(/(\d+) мм(?:ъ)?(?: ртутного столба)?\s*[(](\d+) гектопаскалей[)]/gi,
               '$2 гектопаскалей ($1 ммъ ртутнаго столба)')
      .replace(/(\d+,\d+)\s*°\s*—/g, '$1°С —')
      .replace(/^Погода на ([а-яёѣ]+(?:,\s*\d+[^,]*)?),\s*[^:]*:\s*тепръ\s+отъ/i,
               'Метеорная станция доносит: $1, отъ');
  }

  function zfixObFresh() {
    try {
      var ob = JSON.parse(localStorage.getItem('barnaul-ob-level') || 'null');
      if (ob && typeof ob.level === 'number' && ob.ts && (Date.now() - ob.ts) < 6 * 3600000) return ob;
    } catch (e) {}
    return null;
  }

  function zfixPost(q, r) {
    if (r === null || r === undefined) return r;
    var done = function (s) {
      if (typeof s !== 'string') return s;
      var out = zfixTidy(s);
      if (/(ленты сей день не содержатъ|Тепръ на сей день не доносятъ|Градусъ на сей день въ сводкѣ нѣтъ|метеорологія недосмотрѣла|приборы молчатъ)/.test(out)) {
        var t = zfixWxRecall();
        if (t !== null) {
          var warm = zfixYo('Метеорная станція доноситъ: ' + (t < 0 ? '−' : '') + Math.abs(Math.round(t)) + '°С.');
          out = out.replace(/[^.!?]*(ленты сей день не содержатъ|Тепръ на сей день не доносятъ|Градусъ на сей день въ сводкѣ нѣтъ|метеорологія недосмотрѣла|приборы молчатъ)[^.!?]*[.!?]?/, warm);
        }
      }
      var ob = zfixObFresh();
      if (ob) {
        out = out.replace(/Обь нынчѣ на \d+ смъ(?:\s*[(]спадъ \d+ смъ[)])?(?:,\s*вода [\d.,]+°С)?\.?/, function () {
          var dlt = (typeof ob.delta === 'number') ? ob.delta : null;
          var seg = 'Обь нынчѣ на ' + ob.level + ' смъ';
          if (dlt !== null && dlt !== 0) seg += (dlt < 0 ? ' (спадъ ' + Math.abs(dlt) + ' смъ)' : ' (прибытокъ ' + dlt + ' смъ)');
          if (typeof ob.temp === 'number') seg += ', вода ' + String(ob.temp).replace('.', ',') + '°С';
          return seg + '.';
        });
      }
      return zfixYo(out);
    };
    if (r && typeof r.then === 'function') return r.then(done);
    return done(r);
  }

  /* ---------- 10. Перехватъ слоя ---------- */

  function zfixIntercept(q) {
    var s = zfixCanon(q);
    if (!s) return null;

    /* звёзды и созвездія — по настоящему небу */
    if (/зв[еи]зд|созвезд/.test(s)) return zfixStarsReply();

    /* луна: прямой счетъ */
    if (/лун/.test(s)) {
      if (/новолун/.test(s)) {
        return zfixSay('Новолуніе, {N}, выйдетъ ' + zfixMoonWhen(zfixNextMoon('new')) + '. По лунѣ примечають: въ темную ночь налимъ держится ямъ — тихая, добычливая пора.');
      }
      if (/полнолун/.test(s)) {
        return zfixSay('Полнолуніе, {N}, выйдетъ ' + zfixMoonWhen(zfixNextMoon('full')) + '. По лунѣ примечають: налимъ на светлую ночь беретъ бойче.');
      }
      if (/когда|скоро|числа/.test(s)) return zfixSay('Луна нынчѣ, {N}, ' + zfixMoonPhase() + '.');
      return zfixSay('Луна нынчѣ, {N}, ' + zfixMoonPhase().replace(/^луна\s+/, '') + '.');
    }

    /* №91а: «а васъ, сударь, как звать?» — про Захара */
    if (/как\s+(вас|тебя)\s+(звать|зовут)/.test(s) || /(?:вас|тебя)\s+[^?]{0,20}как\s+звать/.test(s)) {
      return zfixSay(zfixPick(Z92_ZID));
    }

    /* «ты рыбак» — личный отвѣтъ съ живымъ клёvamъ, если онъ есть */
    if (/^(ты|вы)\s+рыбак|^рыбак\s+ли\s+(ты|вы)/.test(s)) return zfixRybakReply();

    /* «когда на рыбалку пойдем» — воскресенье по датѣ + клѣвъ въ воскресенье */
    if (/когда/.test(s) && /(рыбалк|пойдем)/.test(s) && !/(пасх|крещен|купал|рождеств|праздник)/.test(s)) {
      return zfixFishSunday();
    }

    /* приглашеніе на рыбалку — планъ по живому клёву */
    if (/(пойд[еи]м\b|пойд[еи]шь\b|пошли\b|сходим\b|со мной)/.test(s) && /(рыбалк|рыбачить|на обь)/.test(s)) {
      return zfixFishingPlan();
    }

    /* «как ловить/поймать X» — статья (перенесена изъ чата) */
    var guide = zfixFishGuide(s);
    if (guide) return zfixSay(guide);

    /* охота: планъ по погодѣ и методъ въ любомъ порядкѣ словъ */
    if (/охот/.test(s)) {
      var _anims = ['косул', 'заяц', 'глухар'];
      for (var _a = 0; _a < _anims.length; _a++) if (s.indexOf(_anims[_a]) !== -1) z92Last = _anims[_a];
      if (/как/.test(s)) return zfixSay(z92HuntMethod(s));
      if (/(пойду|пойд[еи]м|пойд[еи]шь|собираюсь|собира|на охоту)/.test(s)) return zfixHuntPlan();
    }

    /* рассветъ/закатъ — солнце, не рыбацкій совѣтъ */
    if (/рассвет|восход|закат/.test(s) && !/рыб|клев/.test(s)) {
      var wantSet = /закат/.test(s), wantRise = /рассвет|восход/.test(s);
      var dt = new Date();
      var dd = dt.getDate();
      var mm = Z92_MON[dt.getMonth()];
      var parts = [];
      if (wantRise) parts.push('Солнце сегодня (' + dd + ' ' + mm + ') встанетъ въ ' + zfixSun('rise'));
      if (wantSet) parts.push((parts.length ? 'а зайдетъ въ ' : 'Солнце сегодня (' + dd + ' ' + mm + ') зайдетъ въ ') + zfixSun('set'));
      if (!parts.length) parts.push('Солнце сегодня (' + dd + ' ' + mm + ') встанетъ въ ' + zfixSun('rise') + ', зайдетъ въ ' + zfixSun('set'));
      return zfixSay(parts.join(' ') + ' — по счету Барнаульской долготы.');
    }

    return null; /* все прочее — внутренней цепи */
  }

  /* ---------- 11. Слой-хранитель (логика v7) ---------- */

  var realAsk = null;
  var layerFn = null;
  var booted = false;

  function zfixLayer() {
    var q = arguments[0];
    var pre = null;
    try { pre = zfixIntercept(q); } catch (eI) { pre = null; }
    if (pre != null) {
      try { if (window.console) console.log('[zahar_fix] стражъ перехватилъ: ' + String(q).slice(0, 40)); } catch (eC) {}
      return pre;
    }
    var r;
    try { r = realAsk.apply(this, arguments); } catch (eR) { r = null; }
    try { return zfixPost(q, r); } catch (eP) { return r; }
  }
  zfixLayer.__zaharGuard71 = true;
  zfixLayer.__zfix = true;

  function zfixAttach() {
    var cur = window.ZAHAR_ASK;
    if (typeof cur !== 'function') return false;
    if (cur === zfixLayer || cur.__zfix) { layerFn = zfixLayer; return true; }
    if (!booted) {
      if (!cur.__zaharGuard71) return false;
      booted = true;
    }
    realAsk = cur;
    try {
      Object.defineProperty(window, 'ZAHAR_ASK', {
        configurable: true,
        get: function () { return layerFn || realAsk; },
        set: function (v) {
          if (v === zfixLayer) { layerFn = zfixLayer; return; }
          realAsk = v; layerFn = zfixLayer;
        }
      });
      layerFn = zfixLayer;
      return true;
    } catch (eD) {
      try { window.ZAHAR_ASK = zfixLayer; layerFn = zfixLayer; return true; } catch (eA) { return false; }
    }
  }
  zfixAttach();
  setInterval(function () { try { zfixAttach(); } catch (eA2) {} }, 500);

  window.ZFIX_DBG = function () {
    return JSON.stringify({
      v: window.__ZFIX_V__,
      booted: booted,
      layerOnTop: (window.ZAHAR_ASK === layerFn),
      klev: !!ZFIX_KLEV,
      tempCache: zfixWxRecall(),
      obFresh: !!zfixObFresh()
    });
  };

  if (window.console) console.log('[zahar_fix] v8 надетъ: рыбалка и охота по живому клёву и погодѣ, статьи ловли на мѣстѣ, слой дожидается чатовъ стражей.');
})();
