/* zahar_fix.js — правки поверхъ zahar_chat.js. Версія 3 (№92): всё въ ОДНОМЪ файлѣ.

   1) погода «сейчас» съ data/wxnow.json; 2) стражъ 77: луна прямымъ счетомъ;

   3) выходы причесаны; 4) №91а: «а васъ, сударь, какъ звать?»; 5) №92: клевъ молчитъ

   на чужихъ темахъ (охота, «ты рыбакъ», «пойдемъ на рыбалку», «какъ ловить»), звѣзды

   смотрятъ въ небо, уровень Оби въ статьѣ клёва свежій. Подключать ПОСЛѣДНИМЪ:

   <script src="zahar_fix.js?v=3"></script>

   ============================================================ */


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
  var dow = ['воскресенье','понедельник','вторникъ','среда','четвергъ','пятница','суббота'];
  var d = new Date((j - 2440587.5) * 86400000 + 7 * 3600000);
  if (d.getUTCHours() >= 18) {
    var d2 = new Date(d.getTime() + 86400000);
    return 'в ночь съ ' + d.getUTCDate() + '-го на ' + d2.getUTCDate() + '-е ' + mon[d2.getUTCMonth()];
  }
  return d.getUTCDate() + '-го ' + mon[d.getUTCMonth()] + ' (' + dow[d.getUTCDay()] + ')';
}

function zfixSay(t) {
  try { return femizeOut(fill(t)); } catch (e) { return String(t).replace('{N}', 'сударь'); }
}

function zaharSkyGuard77(q) {
  var s = String(q || '').toLowerCase().replace(/ё/g, 'е').replace(/ѣ/g, 'е').replace(/[ъь]/g, '');
  if (!s) return null;
  if (/лун/.test(s)) {
    if (/новолун/.test(s)) {
      try { awaitingJob = false; } catch (e77a) {}
      return zfixSay('Новолуніе, {N}, выйдетъ ' + zfixMoonWhen(zfixNextMoon('new')) + '. По лунѣ примечають: въ тёмную ночь налимъ держится ямъ — тихая, добычливая пора.');
    }
    if (/полнолун/.test(s)) {
      try { awaitingJob = false; } catch (e77b) {}
      return zfixSay('Полнолуніе, {N}, выйдетъ ' + zfixMoonWhen(zfixNextMoon('full')) + '. По лунѣ примечають: налимъ на светлую ночь беретъ бойче.');
    }
    if (/когда|скоро/.test(s)) return null;
    try { awaitingJob = false; } catch (e77c) {}
    var ph = 'прибываетъ';
    try { ph = String(moonPhase77()).replace(/^\s*луна\s+/i, ''); } catch (e77d) {}
    return zfixSay('Луна нынчѣ, {N}, ' + ph + '.');
  }
  return null;
}

function zfixTidy(s) {
  return String(s)
    .replace(/Тепра/g, 'Тепръ')
    .replace(/завтро/g, 'завтра')
    .replace(/до ([\d.,]+)\s*в[её]рст\S*\s*в\S*\s*час\S*\s*\(([\d.,]+)\s*метра\s*в\S*\s*секунду\)/gi,
             'до $2 метра въ секунду ($1 вёрстъ въ часъ)')
    .replace(/(\d+) мм(?:ъ)?(?: ртутного столба)?\s*\((\d+) гектопаскалей\)/gi,
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

if (window.console) console.log('[zahar_fix] базовые правки на мѣстѣ.');

/* ============================================================
   5. Оверлей №92 поверхъ window.ZAHAR_ASK: первымъ встречаетъ вопросъ.
   Метка __zaharGuard71 не даетъ чату наворачивать вторую обвязку.
   ============================================================ */
(function () {
  'use strict';

  function s92(x) {
    return String(x || '').toLowerCase().replace(/ё/g, 'е').replace(/ѣ/g, 'е')
      .replace(/і/g, 'и').replace(/[ъь]/g, '').replace(/\s+/g, ' ').trim();
  }
  function pick92(a) { return a[Math.floor(Math.random() * a.length)]; }

  var R92_RYBAK = [
    'Рыбакъ ли я? Вѣрно, что такъ, {N}: удочка у меня завсегда въ чуланѣ, а налимъ ночью на живца беретъ — ершика али пескаря.',
    'Рыбакъ, {N}, изъ простыхъ: по выходнымъ на Обь выбираюсь, на блесну по щуку хожу.',
    'Рыбакъ смирный, {N}: при аппарате служу, а въ чуланѣ — удочка да мотокъ лесы.'
  ];
  var R92_PLAN = [
    'Съ Богомъ на Обь, {N}! Живца запаси — у ямъ да корягъ налимъ нынчѣ хозяйничаетъ, а по перволедью и щука не прочь. Уху въ котелкѣ обещаю мысленно.',
    'Вотъ и славно, {N}: на Обь собирайтесь — по перволедью самая пора, у омутовъ щучьи жерлицы ставьте. Удачи на воде!',
    'Пора, {N}, пора: снасть бери, живца — ершика али пескаря, закидку у ямъ оставляй до утра. А я смена сдамъ — самъ нагоню.'
  ];
  var R92_HUNT = [
    'Съ Богомъ, {N}: по пороше тропы прямо, подходъ противъ вѣтра, выстрѣлъ на десятъ саженей — такъ косулю берутъ. Патроны — дробь седьмымъ номеромъ.',
    'Охота нынчѣ по пороше хороша, {N}: тихий шагъ, вѣтръ въ лицо, у опушекъ съ ранней зорѣ стойте. Ружье на ремне держи, а на тропахъ — взадъ ногамъ: скользко.',
    'Пора на косулю, {N}: кормовые тропы къ озимямъ нынчѣ свежіе. Возвращайтесь съ дичью — слава будетъ на весь кварталъ!'
  ];
  var R92_STARCLOUD = [
    'Звёзд нынчѣ не видать, {N}: пелена на небѣ — весь сводъ закрытъ.',
    'На нѣбѣ нынчѣ пасмурно, {N}: ни Бѣлого Медвѣдя, ни Плеядъ не разглядѣть.'
  ];
  var R92_NAME = 'Я — Захаръ Кузнецовъ, {N}: служу на телеграфѣ неполный годъ, толкую слова, читаю фантастиковъ и мечтаю объ автоматическомъ аппаратѣ безъ проводовъ. Чемъ могу услужить?';

  var FISH92 = {
    'ерш': 'Ершъ, {N}, брался весь день на червя: грузило потяжелѣе, крючокъ помѣлче, у дна — онъ тамъ зимуетъ. Клюетъ резко — подсѣкай сразу.',
    'судак': 'Судакъ ночами беретъ, {N}: живецъ — ершикъ али пескарь, жерлица да дорожка съ бѣлесой блесной, у омутовъ ставьте. Клѣвъ тихій — подсѣчка широка.',
    'налим': 'Налимъ — ночной гость, {N}: живецъ ершикъ али пескарь, закидка у ямъ да корягъ, и до утра оставляйте. Вода студена — его часъ.',
    'щука': 'Щука по перволедью — самая пора, {N}: жерлицы у края травы да у омутовъ, на живца. Вѣтръ южный ей въ помощь.',
    'карась': 'Карась въ иле зимовать легъ, {N} — до весны не будить: развѣ что въ оттепель на прикормку. Снасть отложите.',
    'лещ': 'Лещъ зимой клѣвомъ вялъ, {N}: мотыль у дна, прикормка съ вечера, ямъ поглубже ищите.',
    'язь': 'Язь зимой вялый, {N}: мотыль да прикормка, у ямъ попробуйте — а болѣе ждать.',
    'окунь': 'Окунь на блесну да на червя, {N}: стайка ходитъ у травы, дергаетъ мелко — подсѣкай часто.',
    'сазан': 'Сазанъ въ ямахъ залегъ до весны, {N} — будить не стоитъ, клѣва не предвидится.',
    'пескарь': 'Пескарь зимой дремлетъ, {N}: червячокъ у дна въ оттепель — но добыча мелка, рѣчь не о немъ.',
    'сорога': 'Сорога (плотва) зимой вялая, {N}: мотыль да прикормка у дна — клѣвъ смирный.',
    'плотва': 'Плотва зимой вялая, {N}: мотыль да прикормка у дна — клѣвъ смирный.',
    'елец': 'Елец зимой вялый, {N}: мотыль на легкой снасти у дна — но ждать лучше.',
    'пелядь': 'Пелядь зимой клѣвомъ смирна, {N}: мотыль у дна, прикормка съ вечера.'
  };
  FISH92['щук'] = FISH92['щука']; FISH92['окун'] = FISH92['окунь']; FISH92['пескар'] = FISH92['пескарь'];
  FISH92['сорог'] = FISH92['сорога']; FISH92['плотв'] = FISH92['плотва']; FISH92['пеляд'] = FISH92['пелядь'];

  function obFresh92() {
    try {
      var ob = JSON.parse(localStorage.getItem('barnaul-ob-level') || 'null');
      if (!ob || !ob.ts || (Date.now() - ob.ts) > 6 * 3600 * 1000) return null;
      return ob;
    } catch (e) { return null; }
  }

  function cloudBad92() {
    try {
      var sk = (typeof window.ZAHAR_SKY_INFO === 'function') ? window.ZAHAR_SKY_INFO() : null;
      if (!sk) return false;
      if (typeof sk.cc === 'number' && sk.cc >= 60) return true;
      var w = String(sk.wtext || sk.wx || '').toLowerCase();
      return /морось|дожд|туман|снег|снѣгъ|ливн|гроза|пасмурно/.test(w);
    } catch (e) { return false; }
  }

  function z92sun(what) {
    var now = new Date();
    var lat = 53.348, lon = 83.777, tzo = 7;
    var start = new Date(now.getFullYear(), 0, 1);
    var N = Math.floor((now - start) / 86400000) + 1;
    var rad = Math.PI / 180;
    var d = -23.44 * Math.cos(2 * Math.PI * (N + 10) / 365);
    var cH = (Math.cos(90.833 * rad) - Math.sin(lat * rad) * Math.sin(d * rad)) /
             (Math.cos(lat * rad) * Math.cos(d * rad));
    cH = Math.max(-1, Math.min(1, cH));
    var haH = Math.acos(cH) / rad / 15;
    var noon = 12 - (lon / 15 - tzo);
    var x = (what === 'rise') ? (noon - haH) : (noon + haH);
    x = ((x % 24) + 24) % 24;
    var h = Math.floor(x), m = Math.round((x - h) * 60);
    if (m === 60) { h++; m = 0; }
    var MN = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
    return { t: (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m, day: now.getDate() + ' ' + MN[now.getMonth()] };
  }

  function fixLevel92(s) {
    var ob = obFresh92();
    if (!ob || typeof s !== 'string') return s;
    var lvl = (ob.level != null) ? ob.level : ((ob.levelCm != null) ? ob.levelCm : ob.cm);
    if (typeof lvl !== 'number' || isNaN(lvl)) return s;
    var dlt = (ob.delta != null) ? ob.delta : ((ob.diff != null) ? ob.diff : null);
    var seg = 'Обь нынчѣ на ' + lvl + ' смъ';
    if (dlt != null) seg += (dlt < 0) ? ' (спадъ ' + Math.abs(dlt) + ' смъ)' : ' (прибытокъ ' + dlt + ' смъ)';
    var out = s.replace(/Обь нынчѣ на [0-9.,]+ смъ(?:\s*\((?:спадъ|прибытокъ) [0-9.,]+ смъ\))?/, seg);
    if (typeof ob.temp === 'number' && !isNaN(ob.temp)) {
      out = out.replace(/, вода [0-9,]+°С/, ', вода ' + String(ob.temp).replace('.', ',') + '°С');
    }
    return out;
  }

  function z92pre(q, s) {
    if (!s) return null;
    /* №91а: «а васъ, сударь, какъ звать?» — прямая вѣсъ, не словарь */
    if (/(как\s+(вас|тебя)\s+звать|вас\s+(?:сударь|сударыня)\s+как\s+звать)/.test(s)) {
      try { awaitingJob = false; } catch (eN) {}
      return zfixSay(R92_NAME);
    }
    /* «ты рыбак» и «ты охотник» — личный ответ №87, а не статьѣ клёва */
    if (/^ты\s+рыбак$|^вы\s+рыбак$|^рыбак\s+ли\s+(ты|вы)$|^ты\s+охотник$|^вы\s+охотник$/.test(s) ||
        /^(ты|вы)\s+на\s+охоту\s+ходиш/.test(s)) {
      try { awaitingJob = false; } catch (eR) {}
      return zfixSay(pick92(R92_RYBAK));
    }
    /* приглашеніе на рыбалку — планъ */
    if (/(пойд[её]м|пойд[её]шь|пойди|пошли|собирайся|соберемся|ид[её]м)/.test(s) &&
        /(рыбалк|рыбачить|на\s+обь|ловить)/.test(s)) {
      try { awaitingJob = false; } catch (eP) {}
      return zfixSay(pick92(R92_PLAN));
    }
    /* охота: дни недели, «пойду на охоту», «как охотиться» — клёвъ молчитъ */
    if (/(охот|косул|глухар|тетерев|ружь|собол|марал|зайц)/.test(s) &&
        !/рыб|клев|трактир|промысловик/.test(s)) {
      try { awaitingJob = false; } catch (eH) {}
      var hm = s.match(/как\s+охот(?:ится|иться)\s+на\s+([а-я]+)/) || s.match(/на\s+([а-я]+)\s+пойду\s+охот/);
      if (hm && !/косул/.test(s92(hm[1])))
        return zfixSay('Про охоту на «' + hm[1] + '» въ записяхъ моихъ покуда мало, {N} — спрошу у промысловиковъ въ трактирѣ, растолкую въ следующий разъ.');
      return zfixSay(pick92(R92_HUNT));
    }
    /* звѣзды — только въ ясную ночь */
    if (/зв[е]зд/.test(s) && cloudBad92()) {
      try { awaitingJob = false; } catch (eS) {}
      return zfixSay(pick92(R92_STARCLOUD));
    }
    /* рассвѣтъ/закатъ — прямымъ счетомъ; «на Обь къ россвѣту» — планъ, не время */
    if (/рассвет|восход|закат/.test(s) && !/рыб|клев|охот/.test(s)) {
      try { awaitingJob = false; } catch (eSun) {}
      if (/рассвет|восход/.test(s) && !/когда|во\s+сколько|скоро/.test(s)) {
        return zfixSay('На Обь къ рассвѣту, {N}? Червяка прикупите на рынкѣ: въ ноябрѣ земля въ камень, изъ-подъ снѣга не накопаешь. Ежели обрыбимся — уха въ котелкѣ будетъ по первому разряду!');
      }
      var sun = z92sun(/рассвет|восход/.test(s) ? 'rise' : 'set');
      var verb = (/рассвет|восход/.test(s)) ? 'взойдетъ' : 'зайдетъ';
      return zfixSay('Солнце сегодня (' + sun.day + ') ' + verb + ' въ ' + sun.t + ' — по счету Барнаульской долги.');
    }
    return null;
  }

  function z92post(q, s, r) {
    if (!r || typeof r !== 'string') return r;
    if (/Обь нынчѣ на [0-9]/.test(r)) return fixLevel92(r);
    return r;
  }

  function z92wrap(f) {
    if (!f || f.__zfixOverlay) return f;
    var g = function (q) {
      var s = s92(q);
      try { var pre = z92pre(q, s); if (pre != null) return pre; } catch (ePre) {}
      var r = f.apply(this, arguments);
      var done = function (x) { try { return z92post(q, s, x); } catch (ePost) { return x; } };
      if (r && typeof r.then === 'function') return r.then(done);
      return done(r);
    };
    g.__zfixOverlay = true;
    g.__zaharGuard71 = true;
    return g;
  }

  var installed92 = false;
  function z92install() {
    if (installed92) return;
    var f = window.ZAHAR_ASK;
    if (typeof f !== 'function') return;
    if (f.__zfixOverlay) { installed92 = true; return; }
    var g = z92wrap(f);
    window.ZAHAR_ASK = g;
    installed92 = true;
    if (window.console) console.log('[zahar_fix] №92: клевъ молчитъ на чужихъ темахъ, звѣзды смотрятъ въ небо, уровень Оби свежій.');
  }
  setTimeout(function () { setTimeout(z92install, 220); setInterval(z92install, 600); }, 0);
})();


if (window.console) console.log('[zahar_fix] v3 надетъ: погода первенствуетъ, стражъ 77 переписанъ, выходы причесаны, №91а+№92 въ одномъ файлѣ.');
