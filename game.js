(() => {
  'use strict';

  /* =========================================================
   *  ДАНІ: літери, регіони
   * ========================================================= */

  // На українських номерах використовують лише 12 кириличних літер,
  // що збігаються за написанням з латинськими.
  const LAT2CYR = { A: 'А', B: 'В', C: 'С', E: 'Е', H: 'Н', I: 'І', K: 'К', M: 'М', O: 'О', P: 'Р', T: 'Т', X: 'Х' };
  const LETTERS = Object.keys(LAT2CYR);
  const cyr = (s) => s.replace(/[A-Z]/g, (c) => LAT2CYR[c] || c);

  const REGION_LIST = [
    ['AA', 'KA', 'м. Київ'],
    ['AI', 'KI', 'Київська обл.'],
    ['AB', 'KB', 'Вінницька обл.'],
    ['AC', 'KC', 'Волинська обл.'],
    ['AE', 'KE', 'Дніпропетровська обл.'],
    ['AH', 'KH', 'Донецька обл.'],
    ['AM', 'KM', 'Житомирська обл.'],
    ['AO', 'KO', 'Закарпатська обл.'],
    ['AP', 'KP', 'Запорізька обл.'],
    ['AT', 'KT', 'Івано-Франківська обл.'],
    ['BA', 'HA', 'Кіровоградська обл.'],
    ['BB', 'HB', 'Луганська обл.'],
    ['BC', 'HC', 'Львівська обл.'],
    ['BE', 'HE', 'Миколаївська обл.'],
    ['BH', 'HH', 'Одеська обл.'],
    ['BI', 'HI', 'Полтавська обл.'],
    ['BK', 'HK', 'Рівненська обл.'],
    ['BM', 'HM', 'Сумська обл.'],
    ['BO', 'HO', 'Тернопільська обл.'],
    ['AX', 'KX', 'Харківська обл.'],
    ['BT', 'HT', 'Херсонська обл.'],
    ['BX', 'HX', 'Хмельницька обл.'],
    ['CA', 'IA', 'Черкаська обл.'],
    ['CB', 'IB', 'Чернігівська обл.'],
    ['CE', 'IE', 'Чернівецька обл.'],
    ['AK', 'KK', 'АР Крим'],
    ['CH', 'IH', 'м. Севастополь'],
  ];
  const REGIONS = [];
  const REGION_NAME = {};
  REGION_LIST.forEach(([a, b, name]) => {
    REGIONS.push(a, b);
    REGION_NAME[a] = name;
    REGION_NAME[b] = name;
  });

  /* =========================================================
   *  ПРАВИЛА РІДКОСТІ
   *  Перше правило, що підійшло, і є «найкращим» для цієї частини.
   *  Шанс кожного правила рахується точно — перебором усіх варіантів.
   * ========================================================= */

  const isStep = (d) => {
    let up = true, down = true;
    for (let i = 1; i < 4; i++) {
      const diff = d.charCodeAt(i) - d.charCodeAt(i - 1);
      if (diff !== 1) up = false;
      if (diff !== -1) down = false;
    }
    return up || down;
  };

  const DIGIT_RULES = [
    { id: 'bond',    name: 'агент 007',             why: () => 'номер як у Джеймса Бонда',                 test: (d) => d === '0007' },
    { id: 'same',    name: 'чотири однакові цифри', why: (d) => `усі цифри — «${d[0]}»`,                   test: (d) => /^(\d)\1{3}$/.test(d) },
    { id: 'first',   name: 'номер-одиничка',        why: () => 'один із перших номерів серії',             test: (d) => /^000[1-9]$/.test(d) },
    { id: 'round',   name: 'круглий номер',         why: (d) => `«${d[0]}» і три нулі`,                    test: (d) => /^[1-9]000$/.test(d) },
    { id: 'step',    name: 'сходинка',              why: () => 'цифри йдуть підряд',                       test: isStep },
    { id: 'mirror',  name: 'дзеркальні цифри',      why: () => 'читаються однаково з обох боків',          test: (d) => d[0] === d[3] && d[1] === d[2] },
    { id: 'repeat',  name: 'повтор пари',           why: (d) => `«${d.slice(0, 2)}» двічі поспіль`,        test: (d) => d[0] === d[2] && d[1] === d[3] },
    { id: 'pairs',   name: 'дві пари',              why: (d) => `«${d[0]}${d[0]}» і «${d[2]}${d[2]}»`,     test: (d) => d[0] === d[1] && d[2] === d[3] },
    { id: 'triple',  name: 'три однакові підряд',   why: () => 'три однакові цифри поспіль',               test: (d) => /(\d)\1\1/.test(d) },
    { id: 'hundred', name: 'кругла сотня',          why: () => 'закінчується на «00»',                     test: (d) => /^[1-9]\d00$/.test(d) },
    { id: 'small',   name: 'маленький номер',       why: () => 'починається з «00»',                       test: (d) => /^00\d\d$/.test(d) },
  ];

  const LETTER_RULES = [
    { id: 'quad',    name: 'чотири однакові літери', why: (r) => `регіон і серія — «${cyr(r)}»`,                 test: (r, s) => r[0] === r[1] && s === r, parts: ['reg', 'ser'] },
    { id: 'lmirror', name: 'дзеркальні літери',      why: (r, s) => `«${cyr(r)}» ↔ «${cyr(s)}»`,                  test: (r, s) => s === r[1] + r[0],        parts: ['reg', 'ser'] },
    { id: 'lrepeat', name: 'серія = регіон',         why: (r) => `«${cyr(r)}» на початку і в кінці`,             test: (r, s) => s === r,                  parts: ['reg', 'ser'] },
    { id: 'l2pairs', name: 'дві пари літер',         why: (r, s) => `«${cyr(r)}» і «${cyr(s)}»`,                  test: (r, s) => r[0] === r[1] && s[0] === s[1], parts: ['reg', 'ser'] },
    { id: 'ldouble', name: 'однакові літери серії',  why: (r, s) => `серія «${cyr(s)}»`,                          test: (r, s) => s[0] === s[1],            parts: ['ser'] },
    { id: 'lgold',   name: '«золотий» регіон',       why: (r) => `код регіону «${cyr(r)}» з однакових літер`,     test: (r) => r[0] === r[1],               parts: ['reg'] },
  ];

  const DIGIT_TOTAL = 9999;                     // 0001…9999 (0000 не видають)
  const LETTER_TOTAL = REGIONS.length * LETTERS.length * LETTERS.length;

  (function computeOdds() {
    const dc = {}, lc = {};
    for (let i = 1; i <= 9999; i++) {
      const d = String(i).padStart(4, '0');
      const rule = DIGIT_RULES.find((x) => x.test(d));
      if (rule) dc[rule.id] = (dc[rule.id] || 0) + 1;
    }
    for (const r of REGIONS) for (const a of LETTERS) for (const b of LETTERS) {
      const rule = LETTER_RULES.find((x) => x.test(r, a + b));
      if (rule) lc[rule.id] = (lc[rule.id] || 0) + 1;
    }
    DIGIT_RULES.forEach((x) => { x.odds = DIGIT_TOTAL / (dc[x.id] || 1); });
    LETTER_RULES.forEach((x) => { x.odds = LETTER_TOTAL / (lc[x.id] || 1); });
  })();

  const TIERS = [
    { id: 'common', min: 0,      name: 'Звичайний' },
    { id: 'nice',   min: 10,     name: 'Цікавий' },
    { id: 'rare',   min: 100,    name: 'Рідкісний' },
    { id: 'epic',   min: 1000,   name: 'Епічний' },
    { id: 'legend', min: 10000,  name: 'Легендарний' },
    { id: 'myth',   min: 100000, name: 'Міфічний' },
  ];
  const TIER_BY_ID = Object.fromEntries(TIERS.map((t) => [t.id, t]));
  const COLLECT_MIN = 100;        // з «Рідкісного» — у скриню
  const INCOME_RATE = 0.004;      // номер у колекції приносить 0,4 % ціни за секунду
  const FINDER_BONUS = 0.1;       // 10 % ціни одразу на рахунок за знахідку
  const LOCK_MS = { rare: 450, epic: 900, legend: 1400, myth: 2000 };

  const tierFor = (n) => TIERS.reduce((acc, t) => (n >= t.min ? t : acc), TIERS[0]);

  const niceRound = (x) => {
    if (x < 100) return Math.max(1, Math.round(x));
    const p = Math.pow(10, Math.floor(Math.log10(x)) - 1);
    return Math.round(x / p) * p;
  };

  function evaluate(r, n, s) {
    const dRule = DIGIT_RULES.find((x) => x.test(n));
    const lRule = LETTER_RULES.find((x) => x.test(r, s));
    const parts = [];
    let odds = 1;
    if (dRule) {
      odds *= dRule.odds;
      parts.push({ kind: 'digits', label: `Цифри «${n}»`, name: dRule.name, why: dRule.why(n), odds: dRule.odds, hl: ['num'] });
    }
    if (lRule) {
      odds *= lRule.odds;
      parts.push({ kind: 'letters', label: `Літери «${cyr(r)}…${cyr(s)}»`, name: lRule.name, why: lRule.why(r, s), odds: lRule.odds, hl: lRule.parts });
    }
    const tier = tierFor(odds);
    return { r, n, s, odds, tier, parts, price: niceRound(odds) };
  }

  const rnd = (k) => Math.floor(Math.random() * k);
  function randomPlate() {
    const r = REGIONS[rnd(REGIONS.length)];
    const n = String(1 + rnd(9999)).padStart(4, '0');
    const s = LETTERS[rnd(12)] + LETTERS[rnd(12)];
    return evaluate(r, n, s);
  }

  /* =========================================================
   *  СТАН ГРИ + ЗБЕРЕЖЕННЯ
   * ========================================================= */

  const SAVE_KEY = 'ua-plate-clicker-v1';
  const state = {
    balance: 0,
    earned: 0,
    taps: 0,
    found: 0,
    sold: 0,
    best: null,           // {r,n,s,odds}
    clickLvl: 0,
    luckLvl: 0,
    collection: [],       // {id,r,n,s,odds,price,t}
    profile: { name: '', surname: '', age: '', avatar: '' },
    sound: true,
    lastSeen: 0,
  };

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      Object.assign(state, s);
      state.profile = Object.assign({ name: '', surname: '', age: '', avatar: '' }, s.profile || {});
      if (!Array.isArray(state.collection)) state.collection = [];
    } catch (e) { /* немає сховища — граємо без збереження */ }
  }
  function save() {
    state.lastSeen = Date.now();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  const clickPower = () => 1 + state.clickLvl;
  const rollsPerTap = () => 1 + state.luckLvl;
  let incomeCache = 0;
  const recalcIncome = () => {
    incomeCache = state.collection.reduce((a, it) => a + it.price, 0) * INCOME_RATE;
  };

  /* =========================================================
   *  ФОРМАТУВАННЯ
   * ========================================================= */

  const nf = new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 0 });
  const nf1 = new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 1 });
  function money(x) {
    x = Math.floor(x);
    if (x >= 1e12) return nf1.format(x / 1e12) + ' трлн';
    if (x >= 1e9) return nf1.format(x / 1e9) + ' млрд';
    if (x >= 1e7) return nf1.format(x / 1e6) + ' млн';
    return nf.format(x);
  }
  const rate = (x) => (x < 10 ? nf1.format(x) : money(x));
  const oddsText = (o) => '1 з ' + money(Math.round(o));
  const plateText = (p) => `${cyr(p.r)} ${p.n} ${cyr(p.s)}`;

  /* =========================================================
   *  DOM
   * ========================================================= */

  const $ = (id) => document.getElementById(id);
  const plateEl = $('plate');
  const balanceEl = $('balance');
  const incomeEl = $('income');
  const walletEl = $('wallet');
  const regionEl = $('region');
  const findEl = $('find');
  const bannerEl = $('banner');
  const hintEl = $('hint');
  const chestBtn = $('chestBtn');
  const chestBadge = $('chestBadge');
  const tapinfoEl = $('tapinfo');
  const toastEl = $('toast');

  function fillPlate(el, p) {
    el.querySelector('.reg').textContent = cyr(p.r);
    el.querySelector('.num').textContent = p.n;
    el.querySelector('.ser').textContent = cyr(p.s);
  }
  function plateHTML(p, tierId) {
    return `<div class="plate tier-${tierId}"><div class="plate-flag"><span class="flag"><i></i><i></i></span><span class="ua">UA</span></div>` +
      `<div class="plate-text"><span class="reg">${cyr(p.r)}</span><span class="num">${p.n}</span><span class="ser">${cyr(p.s)}</span></div></div>`;
  }

  const TIER_CLASSES = TIERS.map((t) => 'tier-' + t.id);
  function setTierClass(el, tierId) {
    el.classList.remove(...TIER_CLASSES);
    if (tierId) el.classList.add('tier-' + tierId);
  }

  let toastTimer = 0;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2400);
  }

  function restartAnim(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }

  function floatText(text, x, y) {
    const f = document.createElement('div');
    f.className = 'float';
    f.textContent = text;
    f.style.left = x + 'px';
    f.style.top = y + 'px';
    f.style.transform = 'translate(-50%, -50%)';
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 850);
  }

  function coinBurst(count) {
    const from = plateEl.getBoundingClientRect();
    const to = walletEl.getBoundingClientRect();
    const tx = to.left + 40, ty = to.top + to.height / 2;
    for (let i = 0; i < count; i++) {
      const c = document.createElement('div');
      c.className = 'coin';
      c.textContent = '₴';
      document.body.appendChild(c);
      const sx = from.left + from.width * (0.2 + Math.random() * 0.6);
      const sy = from.top + from.height / 2;
      const mx = sx + (Math.random() - 0.5) * 160;
      const my = sy - 40 - Math.random() * 90;
      const anim = c.animate([
        { transform: `translate(${sx}px, ${sy}px) scale(.4)`, opacity: 0 },
        { transform: `translate(${mx}px, ${my}px) scale(1.1)`, opacity: 1, offset: 0.35 },
        { transform: `translate(${tx}px, ${ty}px) scale(.6)`, opacity: 0.9 },
      ], { duration: 750 + Math.random() * 350, delay: i * 35, easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'both' });
      anim.onfinish = () => c.remove();
    }
    setTimeout(() => restartAnim(walletEl, 'pulse'), 800);
  }

  function countUp(el, to, ms) {
    const start = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - start) / ms);
      const e = 1 - Math.pow(1 - k, 3);
      el.textContent = money(to * e);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* =========================================================
   *  ЗВУК (WebAudio, без файлів)
   * ========================================================= */

  let actx = null;
  function beep(freq, dur, type = 'sine', vol = 0.05, when = 0) {
    if (!state.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const t = actx.currentTime + when;
      const o = actx.createOscillator();
      const g = actx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(actx.destination);
      o.start(t);
      o.stop(t + dur + 0.02);
    } catch (e) { /* без звуку */ }
  }
  const sfxTap = () => beep(560 + Math.random() * 90, 0.05, 'triangle', 0.035);
  function sfxFind(tierId) {
    const seqs = {
      nice: [660, 880],
      rare: [523, 659, 784],
      epic: [523, 659, 784, 1047],
      legend: [523, 659, 784, 1047, 1319],
      myth: [392, 523, 659, 784, 1047, 1319, 1568],
    };
    (seqs[tierId] || []).forEach((f, i) => beep(f, 0.22, 'triangle', 0.06, i * 0.09));
  }
  const vibrate = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) { /* ignore */ } };

  /* =========================================================
   *  ГОЛОВНА МЕХАНІКА: КЛІК ПО НОМЕРУ
   * ========================================================= */

  let current = null;
  let lockUntil = 0;

  function roll() {
    let best = null;
    for (let i = 0; i < rollsPerTap(); i++) {
      const p = randomPlate();
      if (!best || p.odds > best.odds) best = p;
    }
    return best;
  }

  function tap(x, y) {
    const now = performance.now();
    if (now < lockUntil) return;

    hintEl.classList.add('hide');
    state.taps++;
    const power = clickPower();
    addMoney(power);
    floatText('+' + power, x, y);
    sfxTap();

    const p = roll();
    current = p;
    fillPlate(plateEl, p);
    regionEl.textContent = `${cyr(p.r)} — ${REGION_NAME[p.r]}`;
    plateEl.classList.remove('glow', 'soft');
    plateEl.querySelectorAll('.hl').forEach((s) => s.classList.remove('hl'));
    setTierClass(plateEl, null);
    restartAnim(plateEl, 'bump');
    findEl.classList.add('old');

    if (p.odds >= COLLECT_MIN) onRare(p);
    else if (p.odds >= TIER_BY_ID.nice.min) onNice(p);
  }

  function highlight(p, soft) {
    setTierClass(plateEl, p.tier.id);
    plateEl.classList.add('glow');
    if (soft) plateEl.classList.add('soft');
    p.parts.forEach((part) => part.hl.forEach((cls) => plateEl.querySelector('.' + cls).classList.add('hl')));
  }

  function onNice(p) {
    const bonus = Math.max(2, Math.round(p.odds / 3)) * clickPower();
    addMoney(bonus);
    highlight(p, true);
    renderFind(p, { collected: false, bonus });
    sfxFind('nice');
  }

  function onRare(p) {
    const item = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      r: p.r, n: p.n, s: p.s, odds: p.odds, price: p.price, t: Date.now(),
    };
    state.collection.push(item);
    state.found++;
    if (!state.best || p.odds > state.best.odds) state.best = { r: p.r, n: p.n, s: p.s, odds: p.odds };
    recalcIncome();

    const bonus = Math.round(p.price * FINDER_BONUS);
    addMoney(bonus);

    highlight(p, false);
    renderFind(p, { collected: true, bonus });
    showBanner(p.tier);
    coinBurst(Math.min(26, 6 + Math.round(Math.log10(p.odds) * 4)));
    updateChestBadge();
    setTimeout(() => restartAnim(chestBtn, 'chest-shake'), 500);
    sfxFind(p.tier.id);
    vibrate(p.tier.id === 'rare' ? 40 : [40, 50, 90]);
    lockUntil = performance.now() + (LOCK_MS[p.tier.id] || 400);
    save();
  }

  function showBanner(tier) {
    bannerEl.textContent = tier.name + '!';
    setTierClass(bannerEl, tier.id);
    restartAnim(bannerEl, 'show');
  }

  function renderFind(p, { collected, bonus }) {
    findEl.className = 'find show tier-' + p.tier.id;
    const reasons = p.parts.map((part) =>
      `<li><b>${part.label}</b> — ${part.name}: ${part.why}. <i>Шанс ${oddsText(part.odds)}</i></li>`
    ).join('');
    const combo = p.parts.length > 1
      ? `<div class="find-total">Разом комбінація: ${oddsText(p.odds)} — рідше за кожну частину окремо!</div>`
      : `<div class="find-total">Рідкість комбінації: ${oddsText(p.odds)}</div>`;
    const note = collected
      ? `📦 Номер у скрині · приносить +${rate(p.price * INCOME_RATE)} ₴/с · +${money(bonus)} ₴ за знахідку`
      : `+${money(bonus)} ₴ на рахунок · у скриню йдуть номери від «Рідкісного» (1 з 100)`;
    findEl.innerHTML =
      `<div class="find-head"><span class="badge">${p.tier.name}</span><span class="find-plate">${plateText(p)}</span></div>` +
      `<div class="find-price"><span>${collected ? 'Ціна номера' : 'Бонус'}</span><b><span class="cnt">0</span> ₴</b></div>` +
      `<ul class="find-reasons">${reasons}</ul>${combo}<div class="find-note">${note}</div>`;
    countUp(findEl.querySelector('.cnt'), collected ? p.price : bonus, collected ? 1100 : 500);
  }

  function addMoney(x) {
    state.balance += x;
    state.earned += x;
  }

  plateEl.addEventListener('pointerdown', (e) => {
    if (e.button !== undefined && e.button > 0) return;
    e.preventDefault();
    tap(e.clientX, e.clientY);
  });
  plateEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const r = plateEl.getBoundingClientRect();
      tap(r.left + r.width / 2, r.top + r.height / 3);
    }
  });
  plateEl.addEventListener('contextmenu', (e) => e.preventDefault());

  /* =========================================================
   *  ВЕРХНІЙ РЯДОК, ЦИКЛ, ПАСИВНИЙ ДОХІД
   * ========================================================= */

  let shown = 0;
  let lastFrame = performance.now();
  let lastBalanceText = '';
  function frame(now) {
    const dt = Math.min(1, (now - lastFrame) / 1000);
    lastFrame = now;
    if (incomeCache > 0) addMoney(incomeCache * dt);
    const diff = state.balance - shown;
    shown = Math.abs(diff) < 1 ? state.balance : shown + diff * Math.min(1, dt * 7);
    const txt = money(shown);
    if (txt !== lastBalanceText) { balanceEl.textContent = txt; lastBalanceText = txt; }
    requestAnimationFrame(frame);
  }

  function renderTop() {
    incomeEl.textContent = `+${rate(incomeCache)} ₴/с`;
    tapinfoEl.textContent = `+${clickPower()} ₴ за клік` + (state.luckLvl ? ` · удача ×${rollsPerTap()}` : '');
  }
  function updateChestBadge() {
    const n = state.collection.length;
    chestBadge.hidden = n === 0;
    chestBadge.textContent = n > 99 ? '99+' : String(n);
    renderTop();
  }

  /* =========================================================
   *  ПРОФІЛЬ / АВАТАРКА
   * ========================================================= */

  const PERSON_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4.2" fill="#fff"/><path d="M3.5 21c.8-4.4 4.3-6.8 8.5-6.8s7.7 2.4 8.5 6.8" fill="#fff"/></svg>';

  function paintAvatar(el, p) {
    el.textContent = '';
    if (p.avatar) {
      const img = new Image();
      img.alt = '';
      img.src = p.avatar;
      el.appendChild(img);
    } else {
      const ini = ((p.name || '').trim()[0] || '') + ((p.surname || '').trim()[0] || '');
      if (ini) el.textContent = ini.toUpperCase();
      else el.innerHTML = PERSON_SVG;
    }
  }
  function renderAvatar() {
    paintAvatar($('avatar'), state.profile);
    $('avatarName').textContent = state.profile.name.trim() || 'Профіль';
  }

  let draftAvatar = '';
  function openProfile() {
    const p = state.profile;
    draftAvatar = p.avatar;
    $('fName').value = p.name;
    $('fSurname').value = p.surname;
    $('fAge').value = p.age;
    $('fSound').checked = state.sound;
    paintAvatar($('profileAvatar'), p);
    const best = state.best ? `${plateText(state.best)}` : '—';
    $('profileStats').innerHTML =
      stat(money(state.taps), 'кліків') +
      stat(money(state.found), 'рідкісних знайдено') +
      stat(money(state.earned) + ' ₴', 'зароблено всього') +
      stat(best, 'найкраща знахідка');
    openModal('profileModal');
  }
  const stat = (v, l) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`;

  $('photoInput').addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 192;
        const cv = document.createElement('canvas');
        cv.width = cv.height = size;
        const ctx = cv.getContext('2d');
        const m = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, size, size);
        draftAvatar = cv.toDataURL('image/jpeg', 0.85);
        paintAvatar($('profileAvatar'), { ...state.profile, avatar: draftAvatar });
      };
      img.onerror = () => toast('Не вдалося відкрити це фото');
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
  $('photoRemove').addEventListener('click', () => {
    draftAvatar = '';
    paintAvatar($('profileAvatar'), { name: $('fName').value, surname: $('fSurname').value, avatar: '' });
  });

  $('profileForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const ageRaw = $('fAge').value.trim();
    let age = '';
    if (ageRaw) {
      const a = Math.round(Number(ageRaw));
      if (!(a >= 1 && a <= 120)) { toast('Вкажи вік від 1 до 120'); return; }
      age = String(a);
    }
    state.profile = {
      name: $('fName').value.trim().slice(0, 30),
      surname: $('fSurname').value.trim().slice(0, 30),
      age,
      avatar: draftAvatar,
    };
    state.sound = $('fSound').checked;
    save();
    renderAvatar();
    closeModal('profileModal');
    const who = [state.profile.name, state.profile.surname].filter(Boolean).join(' ');
    toast(who ? `Збережено! Привіт, ${who}${age ? `, ${age} р.` : ''}` : 'Профіль збережено');
  });

  /* =========================================================
   *  СКРИНЯ (КОЛЕКЦІЯ)
   * ========================================================= */

  let chestSort = 'price';
  let confirmId = null;
  let confirmTimer = 0;

  function renderChest() {
    const list = state.collection.slice();
    if (chestSort === 'price') list.sort((a, b) => b.price - a.price || b.t - a.t);
    else list.sort((a, b) => b.t - a.t);

    const total = list.reduce((a, it) => a + it.price, 0);
    $('chestStats').innerHTML =
      stat(money(list.length), 'номерів') +
      stat(money(total) + ' ₴', 'вартість') +
      stat('+' + rate(incomeCache) + ' ₴/с', 'дохід');

    const box = $('chestList');
    if (!list.length) {
      box.innerHTML = '<div class="chest-empty">Скриня поки порожня.<br>Клікай по номеру — рідкісні знаки (від «1 з 100») потраплять сюди автоматично.<br><br>Номери в колекції щосекунди приносять гроші, а ще їх можна продати за повну ціну.</div>';
      return;
    }
    box.innerHTML = list.map((it) => {
      const ev = evaluate(it.r, it.n, it.s);
      const why = ev.parts.map((x) => x.name).join(' + ');
      const isConfirm = confirmId === it.id;
      return `<div class="item tier-${ev.tier.id}">` +
        plateHTML(it, ev.tier.id) +
        `<div class="item-info">` +
          `<div class="item-top"><span class="badge">${ev.tier.name}</span><span>${oddsText(it.odds)} · ${REGION_NAME[it.r]}</span></div>` +
          `<div class="item-why">${why}</div>` +
          `<div class="item-price">Ціна: <b>${money(it.price)} ₴</b> <span>· +${rate(it.price * INCOME_RATE)} ₴/с</span></div>` +
        `</div>` +
        `<button class="btn small sell${isConfirm ? ' confirm' : ''}" data-sell="${it.id}">${isConfirm ? 'Точно?' : 'Продати'}</button>` +
        `</div>`;
    }).join('');
    box.querySelectorAll('.item .plate').forEach((pl, i) => {
      const it = list[i];
      evaluate(it.r, it.n, it.s).parts.forEach((part) => part.hl.forEach((c) => pl.querySelector('.' + c).classList.add('hl')));
    });
  }

  $('chestList').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-sell]');
    if (!btn) return;
    const id = btn.dataset.sell;
    if (confirmId !== id) {
      confirmId = id;
      clearTimeout(confirmTimer);
      confirmTimer = setTimeout(() => { confirmId = null; renderChest(); }, 2500);
      renderChest();
      return;
    }
    confirmId = null;
    const idx = state.collection.findIndex((x) => x.id === id);
    if (idx < 0) return;
    const [it] = state.collection.splice(idx, 1);
    state.balance += it.price;
    state.sold++;
    recalcIncome();
    updateChestBadge();
    renderChest();
    restartAnim(walletEl, 'pulse');
    beep(880, 0.12, 'triangle', 0.06);
    beep(1320, 0.18, 'triangle', 0.05, 0.08);
    toast(`Продано ${plateText(it)} за ${money(it.price)} ₴`);
    save();
  });

  document.querySelectorAll('[data-sort]').forEach((b) => b.addEventListener('click', () => {
    chestSort = b.dataset.sort;
    document.querySelectorAll('[data-sort]').forEach((x) => x.classList.toggle('active', x === b));
    renderChest();
  }));

  /* =========================================================
   *  ПОКРАЩЕННЯ
   * ========================================================= */

  const LUCK_MAX = 6;
  const clickCost = () => Math.round(25 * Math.pow(1.6, state.clickLvl));
  const luckCost = () => Math.round(400 * Math.pow(3.2, state.luckLvl));

  function renderShop() {
    const lMax = state.luckLvl >= LUCK_MAX;
    $('shopList').innerHTML =
      `<div class="upg"><h3>💪 Сила кліку</h3><span class="lvl">Рівень ${state.clickLvl} · зараз +${clickPower()} ₴ за клік</span>` +
        `<p>Кожен клік по номеру дає на 1 ₴ більше.</p>` +
        `<button class="btn small" data-buy="click" ${state.balance < clickCost() ? 'disabled' : ''}>${money(clickCost())} ₴</button></div>` +
      `<div class="upg"><h3>🍀 Удача</h3><span class="lvl">Рівень ${state.luckLvl}/${LUCK_MAX} · ${rollsPerTap()} ${rollsPerTap() === 1 ? 'номер' : 'номери'} за клік</span>` +
        `<p>Кожен клік перебирає більше номерів і показує найрідкісніший.</p>` +
        `<button class="btn small" data-buy="luck" ${lMax || state.balance < luckCost() ? 'disabled' : ''}>${lMax ? 'Макс.' : money(luckCost()) + ' ₴'}</button></div>` +
      `<p class="shop-note">Рідкість: Цікавий — від 1 з 10, Рідкісний — 1 з 100, Епічний — 1 з 1 000, Легендарний — 1 з 10 000, Міфічний — 1 з 100 000. Ціна номера ≈ його рідкості.</p>`;
  }
  function updateShopButtons() {
    const c = $('shopList').querySelector('[data-buy="click"]');
    const l = $('shopList').querySelector('[data-buy="luck"]');
    if (c) c.disabled = state.balance < clickCost();
    if (l) l.disabled = state.luckLvl >= LUCK_MAX || state.balance < luckCost();
  }
  $('shopList').addEventListener('click', (e) => {
    const b = e.target.closest('[data-buy]');
    if (!b || b.disabled) return;
    if (b.dataset.buy === 'click' && state.balance >= clickCost()) {
      state.balance -= clickCost();
      state.clickLvl++;
    } else if (b.dataset.buy === 'luck' && state.luckLvl < LUCK_MAX && state.balance >= luckCost()) {
      state.balance -= luckCost();
      state.luckLvl++;
    } else return;
    beep(740, 0.15, 'triangle', 0.06);
    renderShop();
    renderTop();
    save();
  });

  /* =========================================================
   *  МОДАЛЬНІ ВІКНА
   * ========================================================= */

  let shopTimer = 0;
  function openModal(id) {
    $(id).hidden = false;
    if (id === 'shopModal') { renderShop(); shopTimer = setInterval(updateShopButtons, 500); }
  }
  function closeModal(id) {
    $(id).hidden = true;
    if (id === 'shopModal') clearInterval(shopTimer);
  }
  document.querySelectorAll('.modal').forEach((m) => {
    m.addEventListener('click', (e) => {
      if (e.target === m || e.target.closest('[data-close]')) closeModal(m.id);
    });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') document.querySelectorAll('.modal:not([hidden])').forEach((m) => closeModal(m.id));
  });

  $('avatarBtn').addEventListener('click', openProfile);
  chestBtn.addEventListener('click', () => { confirmId = null; renderChest(); openModal('chestModal'); });
  $('shopBtn').addEventListener('click', () => openModal('shopModal'));

  /* =========================================================
   *  СТАРТ
   * ========================================================= */

  load();
  recalcIncome();

  // дохід колекції, поки гри не було (до 2 годин)
  if (state.lastSeen && incomeCache > 0) {
    const away = Math.min(7200, Math.max(0, (Date.now() - state.lastSeen) / 1000));
    const got = incomeCache * away;
    if (got >= 1) {
      addMoney(got);
      setTimeout(() => toast(`Поки тебе не було, колекція заробила ${money(got)} ₴`), 600);
    }
  }
  shown = state.balance;

  current = randomPlate();
  fillPlate(plateEl, current);
  regionEl.textContent = `${cyr(current.r)} — ${REGION_NAME[current.r]}`;
  if (state.taps > 0) hintEl.classList.add('hide');

  renderAvatar();
  updateChestBadge();
  renderTop();
  requestAnimationFrame(frame);

  setInterval(save, 3000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  window.addEventListener('pagehide', save);

  // для тестів у консолі
  window.plateGame = { state, evaluate, DIGIT_RULES, LETTER_RULES };
})();
