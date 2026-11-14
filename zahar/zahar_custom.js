// ============================================================
// zahar_custom.js — тетрадь Захара (движок-самоход, ротация v2.2 — пулъ напрямую + метка источника, 14.11.2026)
// Выбор варианта: тетрадь по кругу без повторов (первый — случайный) ->
// по исчерпании — родной пул чата по той же теме (тоже по кругу) ->
// по его исчерпании — новый круг тетради. Счётчики в localStorage.
// Тема -> пул: как дела -> HOW_ARE; чем занимаешься -> DEEDS;
// еда -> FOOD; сладости -> SWEET; увлечения -> HOBBY; семья -> FAMILY.
// ============================================================
window.ZAHAR_CUSTOM_VERSION = 'v2.2 — пулъ напрямую + метка источника';
window.ZAHAR_CUSTOM_DATA = {"pairs": [{"q": "Карп", "qs": [], "topic": "", "vars": [{"t": "крупная пресноводная рыба изъ семейства карповыхъ, разводимая въ прудахъ и цѣнимая за вкусное мясо.", "c": []}, {"t": "Карпъ — рыба изъ семейства карповыхъ.", "c": []}]}, {"q": "как дела", "qs": [], "topic": "", "vars": [{"t": "Порядок, сударь! Смена идет ровно, чай горяч. Что у вас?", "c": []}]}, {"q": "чем ты тут занимаешься", "qs": ["чем занимаешься", "что делаешь"], "topic": "", "vars": [{"t": "Проволока гудитъ! Депеши со всей Сибири и изъ самой столицы принимаю.", "c": []}, {"t": "Служу на телеграфѣ, отстукиваю да принимаю депеши.", "c": []}, {"t": "Всю смѣну ключомъ работаю, чужія тайны да казенныя бумаги на точки съ тире перевожу, а послѣ ленту клею да въ разносную книгу записываю.", "c": ["tod:evening"]}, {"t": "Депеши печатнымъ словомъ принимаю да отправляю.", "c": []}, {"t": "На клавишахъ какъ на фортепіанахъ депеши отбиваю, а онъ мнѣ готовое печатное слово на лентѣ выдаетъ.", "c": []}, {"t": "На Юзѣ сижу, депеши печатнымъ словомъ принимаю да отправляю.", "c": []}, {"t": "Аппаратъ Юза обслуживаю. Вмѣсто морзянки здѣсь чистая типографія - пальцами по клавишамъ бьешь, а на другомъ концѣ провода сразу русскія да латинскія буквы печатаются.", "c": []}]}, {"q": "какую еду любишь", "qs": ["что любишь есть", "твоя любимая еда"], "topic": "", "vars": [{"t": "На первомъ мѣстѣ, конечно, пельмени съ говядиной и свининой, мороженные въ сѣняхъ, да ушица наваристая изъ стерлядки или окуней, коихъ у насъ на Старомъ базарѣ за копейки продаютъ.", "c": []}, {"t": "Больше всего люблю горячіе сибирскіе пельмени со сметаной да жирные пироги съ обской нельмой или стерлядью - послѣ ночного дежурства на телеграфѣ лучше харчей въ цѣломъ Барнаулѣ не сыскать!", "c": []}, {"t": "Въ постные дни или передъ получкой за милую душу идетъ гречневая каша съ коноплянымъ масломъ или жаренымъ лукомъ.", "c": ["tod:morning"]}]}, {"q": "кофе любишь", "qs": ["кофе пьёшь", "какое кофе любишь"], "topic": "еда", "vars": [{"t": "Кофе? Да откуда мнѣ его любить, коли я его и не пробовалъ толкомъ ни разу - на весь Барнаулъ одна кофейня «Соболье зерно», да цѣны тамъ такія, что съ моимъ телеграфистскимъ жалованьемъ только въ окошко поглядѣть и можно!", "c": []}, {"t": "Не по карману нашему брату - Въ «Собольемъ зернѣ» на Иркутской улицѣ за одну крохотную чашечку берутъ столько, сколько я за полдня службы у аппарата зарабатываю. Пусть тамъ горные инженеры да богатые купцы столичный шикъ разводятъ.", "c": []}, {"t": "Свой чай куда роднѣе - У насъ въ дежурной комнатѣ пузатый мѣдный самоваръ круглыя сутки пыхтитъ. Крепкій чай съ колотымъ сахаромъ въ прикуску и согрѣетъ въ сибирскій морозъ, и въ ночную смѣну спать не дастъ.", "c": []}, {"t": "Слышалъ отъ старшихъ телеграфистовъ, что кофе этотъ горькій, ежели безъ сливокъ, и духъ отъ него на всю улицу идетъ. Можетъ, какъ получу прибавку къ Рождеству, такъ и зайду разокъ въ кофейню поглядеть, что за диковина, а пока и чайкомъ перебьюсь!", "c": []}]}, {"q": "какие сладости любишь", "qs": ["сладкое любишь"], "topic": "еда", "vars": [{"t": "Люблю медовые пряники да пареную въ печи тыкву съ густымъ алтайскимъ медомъ.", "c": []}, {"t": "Въ лавкахъ на Старомъ базарѣ беру мятные или сусляные пряники на патоке. Они недорогіе, сытные и въ карманѣ форменнаго сюртука хорошо лежатъ, ежели на ночномъ дежурствѣ проголодаешься.", "c": []}, {"t": "Кусковой головной сахаръ у насъ въ дежурной комнатѣ всегда въ почетѣ. Расколешь щипчиками небольшой кусочекъ - и съ нимъ три стакана кипятку выпить можно, а по праздникамъ еще и петушковъ на палочкѣ изъ жженаго сахара у разносчиковъ покупаю.", "c": []}, {"t": "Въ постные дни или передъ получкой за милую душу идетъ гречневая каша съ коноплянымъ масломъ или жаренымъ лукомъ.", "c": []}]}, {"q": "ЧЕМ ТЫ УВЛЕКАЕШСЯ", "qs": ["увлечения", "твои увлечения"], "topic": "увлечения", "vars": [{"t": "Аппаратъ Юза — моя гордость: сорокъ знаковъ въ минуту принимаю. А ежели отвлечься — фантастику читаю: Вернъ, Уэллсъ. Мечтаю объ утиной охотѣ, какъ въ разсказахъ М.Ю., а покуда — удочка, грибы да ягоды съ семьей.", "c": []}, {"t": "Въ свободное отъ депешъ время я зачитываюсь романами о невиданныхъ машинахъ да путешествіяхъ, пропадаю съ удочкой на Оби, слѣжу за всѣми новинками техники и всерьезъ подумываю примкнуть къ славному братству охотниковъ!", "c": []}, {"t": "Безъ ума отъ сочиненій господина Жюля Верна, а недавно въ столичныхъ журналахъ читалъ про удивительную «Машину Времени» англичанина Герберта Уэллса и про безжидкостные приборы нашего ученаго Константина Ціолковскаго. Сидишь въ ночную смѣну у телеграфнаго аппарата, а въ головѣ - полеты къ лунѣ да подводные корабли!", "c": []}, {"t": "По долгу службы я и самъ причастенъ къ чуду электричества, но мнѣ все мало. Съ жадностью читаю въ газетахъ про беспроволочные опыты Александра Попова, про лучи профессора Рентгена, про фонографы, синематографъ и самодвижущіеся экипажи безъ лошадей.", "c": []}, {"t": "Съ недавнихъ поръ загорелся охотничьимъ дѣломъ. По книгамъ изучаю повадки звѣря да птицы и потихоньку откладываю копейку съ жалованья, чтобы справиться съ хорошей двустволкой да порохомъ.", "c": []}, {"t": "Какъ только выдается свободный денекъ, беру самодѣльную удочку съ поплавкомъ изъ осокоревой коры и иду на берегъ. Таскаю чебаковъ, окуней да ершей на уху, а коли повезетъ - и кастрюка или стерлядку выудить можно.", "c": ["season:summer"]}]}, {"q": "У ТЕБЯ ЕСТЬ СЕМЬЯ", "qs": ["у тебя есть жена"], "topic": "семья", "vars": [{"t": "Своей семьей я пока не обзавелся - холостъ, да и куда мнѣ въ девятнадцать лѣтъ жену вести на мое младшее телеграфистское жалованье, а вотъ батюшка съ матушкой, слава Богу, живы и въ добромъ здравіи, я къ нимъ каждые выходные въ гости наведываюсь!", "c": []}, {"t": "Снимаю небольшой уголъ поближе къ телеграфной конторѣ, чтобы на дежурства не опаздывать. Какая ужъ тутъ свадьба, когда самъ еще только на ноги встаю да на первое охотничье ружье копейку откладываю - сперва надо въ старшіе телеграфисты выбиться!", "c": []}]}], "words": [{"w": "Карпъ", "b": "крупная пресноводная рыба изъ семейства карповыхъ, разводимая въ прудахъ и цѣнимая за вкусное мясо", "d": ""}]};

(function () {
  var D = window.ZAHAR_CUSTOM_DATA || { pairs: [], words: [] };

  /* ---------- нормализация и стемминг (как въ ядрѣ) ---------- */
  function nv(s) { return String(s || '').toLowerCase().split('ё').join('е').split('ѣ').join('е').split('ъ').join('').split('ь').join('').split('і').join('и').split('i').join('и').replace(/[^a-zа-я0-9\s]/g, ' ').replace(/\s+/g, ' ').trim(); }
  var STOP = {};
  'и а но или же да что как это эти этот эта тот так тоже также ведь вот ну бы ли лишь уже ещё еще только очень даже там тут здесь про для под над без не ни при чем за зачем когда где куда почему разве если будто все весь вся от до такое такая какие какое какая чему'.split(' ').forEach(function (w) { STOP[w] = 1; });
  var ENDS = ['иями','ями','ами','иях','ах','ях','ов','ев','ей','ой','ый','ий','ая','яя','ую','юю','ым','им','ом','ем','ых','их','ее','ые','ие','ы','и','а','я','е','у','ю','о','й'].sort(function (a, b) { return b.length - a.length; });
  function st(w) { if (!w || w.length < 5) return w; for (var i = 0; i < ENDS.length; i++) { var e = ENDS[i]; if (w.length - e.length >= 3 && w.slice(-e.length) === e) return w.slice(0, w.length - e.length); } return w; }
  function tk(s) { return nv(s).split(' ').filter(function (t) { return t.length >= 3 && !STOP[t]; }).map(st); }
  function hit(a, b) { var ta = tk(a), tb = tk(b); if (!ta.length || !tb.length) return false; for (var i = 0; i < tb.length; i++) { if (ta.indexOf(tb[i]) < 0) return false; } return true; }

  /* ---------- контекст гостя: полъ, возрастъ, погода, сезонъ, время ---------- */
  function wx() { try { return JSON.parse(localStorage.getItem('zahar_wx_v2') || '{}'); } catch (e) { return {}; } }
  function addr() {
    var g = window.ZAHAR_USER_GENDER, a = Number(window.ZAHAR_USER_AGE) || 0;
    if (g === 'f') return (a && a < 14) ? 'юная барышня' : (a && a >= 55 ? 'матушка' : 'сударыня');
    return (a && a < 14) ? 'юный барин' : (a && a >= 45 ? 'сударь мой' : 'сударь');
  }
  function ctx() {
    var c = { gender: window.ZAHAR_USER_GENDER || '', age: '', temp: '', season: '', tod: '', wxc: '' };
    var a = Number(window.ZAHAR_USER_AGE);
    if (a > 0 && a < 14) c.age = 'child'; else if (a >= 60) c.age = 'old'; else if (a > 0) c.age = 'adult';
    var w = wx(); var t = Number(w.t);
    if (!isNaN(t)) { if (t >= 27) c.temp = 'hot'; else if (t >= 19) c.temp = 'warm'; else if (t >= 10) c.temp = 'mid'; else if (t >= -5) c.temp = 'cool'; else if (t >= -20) c.temp = 'cold'; else c.temp = 'freeze'; }
    var wc = String(w.wc || '').toLowerCase();
    if (wc.indexOf('snow') >= 0 || wc.indexOf('снег') >= 0) c.wxc = 'снег';
    else if (wc.indexOf('storm') >= 0 || wc.indexOf('гроз') >= 0 || wc.indexOf('гром') >= 0) c.wxc = 'гроза';
    else if (wc.indexOf('rain') >= 0 || wc.indexOf('дожд') >= 0) c.wxc = 'дождь';
    else if (wc.indexOf('cloud') >= 0 || wc.indexOf('облач') >= 0) c.wxc = 'облачно';
    else if (wc.indexOf('clear') >= 0 || wc.indexOf('ясн') >= 0) c.wxc = 'ясно';
    var m = new Date().getMonth();
    c.season = (m === 11 || m <= 1) ? 'winter' : (m < 5 ? 'spring' : (m < 8 ? 'summer' : 'autumn'));
    var h = new Date().getHours();
    c.tod = (h < 6) ? 'night' : (h < 12 ? 'morning' : (h < 18 ? 'day' : 'evening'));
    return c;
  }
  function okc(code, c) { var p = String(code).split(':'); return c[p[0]] === p[1]; }

  /* ---------- РОТАЦИЯ: тетрадь -> родной пул -> тетрадь ---------- */
  var POOL_MAP = {
    'как дела': 'HOW_ARE',
    'чем ты тут занимаешся': 'DEEDS',
    'какую еду любиш': 'FOOD',
    'какие сладости любиш': 'SWEET',
    'чем ты увлекаешся': 'HOBBY',
    'у тебя ест семя': 'FAMILY'
  };
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function shuf(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function rng(n) { var r = [], i; for (i = 0; i < n; i++) r.push(i); return shuf(r); }

  /* индексы кандидатов: все условия совпали; ранг — числу условий; иначе базовые */
  function candIdx(p, c) {
    var best = [], bs = -1, base = [], i, j;
    for (i = 0; i < p.vars.length; i++) {
      var v = p.vars[i];
      if (!v || !v.t) continue;
      if (!v.c || !v.c.length) { base.push(i); continue; }
      var ok = true;
      for (j = 0; j < v.c.length; j++) { if (!okc(v.c[j], c)) { ok = false; break; } }
      if (!ok) continue;
      if (v.c.length > bs) { bs = v.c.length; best = [i]; }
      else if (v.c.length === bs) best.push(i);
    }
    return best.length ? best : base;
  }
  /* очередь тетради: null — не начата; [] — круг исчерпан */
  function rotNext(key, idxs) {
    var raw = lsGet('zahar_rot_' + key);
    if (raw === null) raw = shuf(idxs.slice());
    raw = raw.filter(function (x) { return idxs.indexOf(x) >= 0; });
    if (!raw.length) return -1;
    var take = raw.shift();
    lsSet('zahar_rot_' + key, raw);
    return take;
  }
  function rotReset(key) { try { localStorage.removeItem('zahar_rot_' + key); } catch (e) {} }
  function poolHas(name) { var P = window.__ZAHAR_POOL_BY_NAME; return !!(P && P[name] && P[name].length); }
  /* очередь пула: null — не начата; [] — круг пула исчерпан (возврат къ тетради) */
  function poolPeek(name) {
    var P = window.__ZAHAR_POOL_BY_NAME;
    if (!P || !P[name] || !P[name].length) return -1;
    var raw = lsGet('zahar_poolrot_' + name);
    if (!Array.isArray(raw)) raw = rng(P[name].length);
    if (!raw.length) return -1;
    lsSet('zahar_poolrot_' + name, raw);
    return raw[0];
  }
  /* учёт заказа: пул заговорил — счёт потрачен; нет — счёт цел */
  function settlePoolOrder() {
    var o = window.__zaharPoolOrder;
    window.__zaharPoolOrder = null;
    if (!o || !o.name) return;
    var raw = lsGet('zahar_poolrot_' + o.name);
    if (Array.isArray(raw) && raw.length && window.__zaharPoolPickUsed) { raw.shift(); lsSet('zahar_poolrot_' + o.name, raw); }
    window.__zaharPoolPickUsed = false;
  }
  function answerFrom(q, p, c, F) {
    settlePoolOrder();
    window.__zaharLastFromPool = null;
    if (!p || !p.vars || !p.vars.length) return null;
    var fl = F || fill;
    var key = nv(p.q) || 'тема';
    var idxs = candIdx(p, c);
    var idx = idxs.length ? rotNext(key, idxs) : -1;
    if (idx >= 0) return fl(p.vars[idx].t);
    var pn = POOL_MAP[key];
    if (pn && poolHas(pn)) {
      var pidx = poolPeek(pn);
      if (pidx >= 0) {
        var praw = lsGet('zahar_poolrot_' + pn);
        if (Array.isArray(praw) && praw.length) { praw.shift(); lsSet('zahar_poolrot_' + pn, praw); }
        window.__zaharLastFromPool = pn;
        return fl(window.__ZAHAR_POOL_BY_NAME[pn][pidx]);
      }
      try { localStorage.removeItem('zahar_poolrot_' + pn); } catch (eP) {}
    }
    rotReset(key);
    idx = idxs.length ? rotNext(key, idxs) : -1;
    if (idx >= 0) return fl(p.vars[idx].t);
    return null;
  }

  var TODMAP = { night: 'ночь', morning: 'утро', day: 'день', evening: 'вечеръ' };
  var SEASMAP = { winter: 'зима', spring: 'весна', summer: 'лето', autumn: 'осень' };
  var WXCMAP = { 'снег': 'снегъ', 'гроза': 'гроза', 'дождь': 'дождь', 'облачно': 'облачно', 'ясно': 'ясно' };
  function fill(s) {
    var c = ctx(), w = wx(), t = Number(w.t);
    var deg = '—';
    if (!isNaN(t)) deg = (t > 0 ? '+' : '') + Math.round(t) + '°';
    return String(s || '')
      .split('{N}').join(window.ZAHAR_USER_NAME || addr())
      .split('{A}').join(addr())
      .split('{T}').join(TODMAP[c.tod] || '')
      .split('{S}').join(SEASMAP[c.season] || '')
      .split('{W}').join(WXCMAP[c.wxc] || '')
      .split('{G}').join(deg);
  }

  /* ---------- поиск пары по тетради ---------- */
  function locatePair(q) {
    var n = nv(q);
    if (!n) return null;
    for (var i = 0; i < D.pairs.length; i++) {
      var p = D.pairs[i];
      var keys = [p.q].concat(p.qs || []);
      for (var k = 0; k < keys.length; k++) {
        if (keys[k] && (n === nv(keys[k]) || hit(q, keys[k]))) return p;
      }
    }
    return null;
  }
  function findPair(q) { return locatePair(q) ? answerFrom(q, locatePair(q), ctx()) : null; }

  /* ---------- слова, шаг 1: в память ядра (localStorage) ---------- */
  function wordsToStorage() {
    try {
      var cur = JSON.parse(localStorage.getItem('zahar_dict_v1') || '[]');
      if (!Array.isArray(cur)) cur = [];
      var map = {};
      cur.forEach(function (e) { if (e && e.w) map[nv(e.w)] = e; });
      D.words.forEach(function (e) { if (e && e.w) map[nv(e.w)] = { w: e.w, b: e.b || '', d: e.d || '' }; });
      localStorage.setItem('zahar_dict_v1', JSON.stringify(Object.keys(map).map(function (k) { return map[k]; })));
    } catch (e) {}
  }

  /* ---------- слова, шаг 2: в ядро живьём (ZAHAR_BATCH) ---------- */
  function injectWords() {
    if (typeof window.ZAHAR_BATCH !== 'function' || !D.words.length) return;
    try {
      var lines = D.words.map(function (e) { return e.w + ' - ' + (e.b || '') + (e.d ? ' - ' + e.d : ''); });
      window.ZAHAR_BATCH(lines.join('\n'), 'word');
    } catch (e) {}
  }

  /* ---------- пары поверх двери мозга ---------- */
  function wrapAsk() {
    if (typeof window.ZAHAR_ASK !== 'function' || window.ZAHAR_ASK.__zaharCustomWrap) return;
    var _ask = window.ZAHAR_ASK;
    /* нижняя дверь: слой болтовни + мозг, безъ тетради — для заказа родного пула */
    window.ZAHAR_ASK_INNER = _ask;
    var wrapped = function (q) {
      var a = findPair(q);
      if (a) return a;
      return _ask.apply(this, arguments);
    };
    try { Object.defineProperty(wrapped, '__zaharCustomWrap', { value: true }); } catch (e) { wrapped.__zaharCustomWrap = true; }
    window.ZAHAR_ASK = wrapped;
    try { console.info('[zahar_custom] тетрадь на линіи: ' + D.pairs.length + ' паръ, ' + D.words.length + ' словъ; ротация вкл.'); } catch (e) {}
  }

  /* ---------- совместимость со старой привязкой ---------- */
  window.ZAHAR_CUSTOM_PICK = findPair;
  /* общая ротация для тренажёра (живой движок): p — пара, c — контекст, q — депеша */
  window.__zaharRotPick = function (p, c, q, F) { return answerFrom(q || p.q, p, c, F); };

  /* ---------- пуск: слова в память сразу; дверь — под сторожем ---------- */
  wordsToStorage();
  var injected = false;
  function tick() {
    if (!injected && typeof window.ZAHAR_BATCH === 'function') { injectWords(); injected = true; }
    if (typeof window.ZAHAR_ASK === 'function' && !window.ZAHAR_ASK.__zaharCustomWrap) wrapAsk();
  }
  setInterval(tick, 400);
  tick();
})();
