/* ============================================================
   zahar_fix.js — правки поверхъ zahar_chat.js
   Версія 4 (24.11.2026).
   Подключать СТРОГО послѣ zahar_chat.js въ index.html:
   <script src="zahar_fix.js?v=4"></script>

   Что дѣлаетъ:
   1) слой-хранитель поверхъ всей цепи ZAHAR_ASK: присвоенія
      window.ZAHAR_ASK ловятся на лету — какія бы обертки ни
      надѣвали хук эмбеда и циклы чата, нашъ слой всегда вверху;
   2) перехватываетъ раньше внутреннихъ стражей: «ты рыбакъ»,
      «пойдемъ на рыбалку», охота въ день недели и «как охотиться»,
      «рассветъ/закатъ», «звёзды» по настоящему небу, луна прямымъ
      счетомъ;
   3) погода «сейчас» съ data/wxnow.json: прогревъ при загрузкѣ,
      запасъ въ localStorage; пустыя «ленты не содержатъ»
      спасаются запаснымъ градусомъ;
   4) уровень Оби въ статьѣ клёва выправляется свежимъ кешемъ моста;
   5) причѣска выходовъ: Тепръ, ветеръ метрами первыми, давленіе
      гектопаскалями первыми.
   ============================================================ */
(function () {
  'use strict';
  if (window.__ZFIX_V__) return;
  window.__ZFIX_V__ = 4;

  /* ---------- 0. Помощники ---------- */

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

  /* ---------- 1. Погода «сейчас»: файлъ-сводка + запасъ ---------- */

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

  /* ---------- 2. Луна: прямой счетъ (Меёусъ) ---------- */

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
    var mon = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
    var d = new Date((j - 2440587.5) * 86400000 + 7 * 3600000); /* Барнаулъ UTC+7 */
    if (d.getUTCHours() >= 18) {
      var d2 = new Date(d.getTime() + 86400000);
      return 'в ночь съ ' + d.getUTCDate() + '-го на ' + d2.getUTCDate() + '-е ' + mon[d2.getUTCMonth()];
    }
    return d.getUTCDate() + '-го ' + mon[d.getUTCMonth()];
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

  /* ---------- 3. Солнце для Барнаула (восходъ/закатъ) ---------- */

  function zfixSun(kind) { /* kind: 'rise' | 'set' */
    var now = new Date();
    var start = new Date(now.getFullYear(), 0, 0);
    var n = Math.floor((now - start) / 86400000);
    var B = 2 * Math.PI * (n - 81) / 364;
    var eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B); /* минуты */
    var decl = 0.4093 * Math.sin(2 * Math.PI * (n - 81) / 364);
    var lat = 53.35 * Math.PI / 180;
    var cosw = (-0.01454 - Math.sin(lat) * Math.sin(decl)) / (Math.cos(lat) * Math.cos(decl));
    if (cosw > 1) cosw = 1; if (cosw < -1) cosw = -1;
    var half = Math.acos(cosw) * 12 / Math.PI;
    var solar = (kind === 'rise') ? 12 - half : 12 + half;
    var local = solar - eot / 60 + (7 - 83.78 / 15); /* UTC+7, Барнаульская долгота */
    var h = Math.floor(local), m = Math.round((local - h) * 60);
    if (m === 60) { h++; m = 0; }
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }

  /* ---------- 4. Реплики слоя (на утверждение Максима) ---------- */

  var Z92_ZID = [
    'Я — Захаръ Давыдовичъ Кузнецовъ, {A}: служу на телеграфѣ неполный годъ, толкую слова, читаю фантастиковъ и мечтаю объ автоматическомъ аппаратѣ безъ проводовъ. Чемъ могу услужить?',
    'Захаръ я, Кузнецовъ Давыдовичъ, {A}: при аппаратѣ служу, слова толкую, по вечерамъ Уэллса вычитываю. Приказывайте!'
  ];
  var Z92_RYBAK = [
    'Рыбакъ ли я? Вѣрно, что такъ, {N}: удочка у меня завсегда въ чуланѣ, а налимъ ночью на живца беретъ — ершика али пескаря.',
    'Рыбакъ, {N}, изъ простыхъ: по выходнымъ на Обь выбираюсь, на блесну по щуку хожу.',
    'Рыбакъ смирный, {N}: при аппарате служу, а въ чуланѣ — удочка да мотокъ лесы.'
  ];
  var Z92_PLAN = [
    'Съ Богомъ на Обь, {N}! Живца запаси — у ямъ да корягъ налимъ нынчѣ хозяйничаетъ, а по перволедью и щука не прочь. Уху въ котелкѣ обещаю мысленно.',
    'Вотъ и славно, {N}: на Обь собирайтесь — по перволедью самая пора, у омутовъ щучьи жерлицы ставьте. Удачи на воде!',
    'Пора, {N}, пора: снасть бери, живца — ершика али пескаря, закидку у ямъ оставляй до утра. А я смена сдамъ — самъ нагоню.'
  ];
  var Z92_HUNT_PLAN = [
    'Съ Богомъ на промыселъ, {N}: по свежей пороше выходъ лучший — къ зорѣ будьте на лѣсной опушкѣ. Добычи вамъ!',
    'Добрая затѣя, {N}: по осеннему снѣгу следъ видать какъ на ладони. Подъодъ — противъ вѣтра, тишкомъ — и въ добрый часъ!',
    'Охота нынчѣ въ самую пору, {N}: морось не пугаетъ, въ угодье тишь. Ружье проверьте, патроны — вторымъ номеромъ.'
  ];
  var Z92_HUNT_METHOD = {
    'косул': 'Косуля, {N}, чуткая на слухъ и взглядъ: по пороше тропы прямо читаются, подходъ — противъ вѣтра и тишкомъ, выстрѣлъ на десятъ саженей.',
    'заяц': 'Заяц по пороше тропится на лежку, {N}: тропы по краю поля, подходъ — противъ вѣтра, выстрѣлъ съ подъезда.',
    'глухар': 'Глухарь въ ноябре по березовымъ сережкамъ держится, {N}: подходъ подъ вѣтромъ, безъ шума — пт ица сторога.'
  };
  function z92HuntMethod(s) {
    for (var k in Z92_HUNT_METHOD) if (s.indexOf(k) !== -1) return Z92_HUNT_METHOD[k];
    return 'По свежей пороше следы прямо, {N}: подходъ — противъ вѣтра и безъ шума, выстрѣлъ наверняка.';
  }

  /* ---------- 5. Звёзды по настоящему небу ---------- */

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
    'Небо слезами умывается, {N}: до звёздъ нынчѣ не дотянуться — пелена.
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

  /* ---------- 6. Прическа выходовъ ---------- */

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

  /* ---------- 7. Слой-хранитель поверхъ всей цепи ---------- */

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
      /* №92б: спасеніе «ленты не содержатъ» запаснымъ градусомъ */
      if (/(ленты сей день не содержатъ|Тепръ на сей день не доносятъ|Градусъ на сей день въ сводкѣ нѣтъ|метеорологія недосмотрѣла|приборы молчатъ)/.test(out)) {
        var t = zfixWxRecall();
        if (t !== null) {
          var warm = zfixYo('Метеорная станція доноситъ: ' + (t < 0 ? '−' : '') + Math.abs(Math.round(t)) + '°С.');
          out = out.replace(/[^.!?]*(ленты сей день не содержатъ|Тепръ на сей день не доносятъ|Градусъ на сей день въ сводкѣ нѣтъ|метеорологія недосмотрѣла|приборы молчатъ)[^.!?]*[.!?]?/, warm);
        }
      }
      /* №92в: свежій уровень Оби въ статьѣ клёва */
      var ob = zfixObFresh();
      if (ob) {
        out = out.replace(/Обь нынчѣ на \d+ смъ(?:\s*$спадъ \d+ смъ$)?(?:,\s*вода [\d.,]+°С)?\.?/, function () {
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

    /* «ты рыбак» — личный отвѣтъ, не статья клёва */
    if (/^(ты|вы)\s+рыбак|^рыбак\s+ли\s+(ты|вы)/.test(s)) return zfixSay(zfixPick(Z92_RYBAK));

    /* «пойдемъ со мной на рыбалку» — планъ, не прогнозъ */
    if (/(пойд[еи]м\b|пойд[еи]шь\b|пошли\b|со мной)/.test(s) && /рыбалк|рыбачить|на обь/.test(s)) {
      return zfixSay(zfixPick(Z92_PLAN));
    }

    /* охота: планъ на день и «как охотиться» */
    if (/охот/.test(s)) {
      if (/как\s+охотит/.test(s)) return zfixSay(z92HuntMethod(s));
      if (/(пойду|пойд[еи]м|пойд[еи]шь|собираюсь|собира|на охоту)/.test(s)) return zfixSay(zfixPick(Z92_HUNT_PLAN));
    }

    /* рассветъ/закатъ — солнце, не рыбацкій совѣтъ */
    if (/рассвет|восход|закат/.test(s) && !/рыб|клев/.test(s)) {
      var wantSet = /закат/.test(s), wantRise = /рассвет|восход/.test(s);
      var dt = new Date();
      var dd = dt.getDate(), mm = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'][dt.getMonth()];
      var parts = [];
      if (wantRise) parts.push('Солнце сегодня (' + dd + ' ' + mm + ') встанетъ въ ' + zfixSun('rise'));
      if (wantSet) parts.push((parts.length ? 'а зайдетъ въ ' : 'Солнце сегодня (' + dd + ' ' + mm + ') зайдетъ въ ') + zfixSun('set'));
      if (!parts.length) parts.push('Солнце сегодня (' + dd + ' ' + mm + ') встанетъ въ ' + zfixSun('rise') + ', зайдетъ въ ' + zfixSun('set'));
      return zfixSay(parts.join(' ') + ' — по счету Барнаульской долготы.');
    }

    return null; /* все прочее — внутренней цепи */
  }

  var realAsk = window.ZAHAR_ASK;
  var layerFn = null;

  function zfixLayer() {
    var q = arguments[0];
    var pre = null;
    try { pre = zfixIntercept(q); } catch (eI) { pre = null; }
    if (pre != null) {
      try { if (window.console) console.log('[zahar_fix] стражъ перехватилъ: ' + String(q).slice(0, 40)); } catch (eC) {}
      return pre;
    }
    var r = realAsk.apply(this, arguments);
    try { return zfixPost(q, r); } catch (eP) { return r; }
  }
  zfixLayer.__zaharGuard71 = true; /* чатовъ циклъ не перекроитъ слой */

  /* двойникъ-ловушка: всякое присвоеніе ZAHAR_ASK подводится подъ нашъ слой */
  Object.defineProperty(window, 'ZAHAR_ASK', {
    configurable: true,
    get: function () { return layerFn || realAsk; },
    set: function (v) { realAsk = v; layerFn = zfixLayer; }
  });
  layerFn = zfixLayer;

  /* контроль: ZFIX_DBG() въ консоли */
  window.ZFIX_DBG = function () {
    return JSON.stringify({
      v: window.__ZFIX_V__,
      layerOnTop: (window.ZAHAR_ASK === zfixLayer),
      tempCache: zfixWxRecall(),
      obFresh: !!zfixObFresh()
    });
  };

  if (window.console) console.log('[zahar_fix] v4 надетъ: слой-хранитель на ZAHAR_ASK, звёзды по небу, охота и солнце отъ клёва освобождены, погода со запасомъ.');
})();
