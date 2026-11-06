/* ============================================================
   core.js — shared utilities, data loader, progress, speech, chrome
   ============================================================ */
(function () {
  'use strict';

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const todayKey = () => {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const escapeHtml = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  /* ---------------- toast ---------------- */
  let toastEl = null;
  let toastTimer = null;
  function toast(msg, xp) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      document.body.appendChild(toastEl);
    }
    toastEl.innerHTML = escapeHtml(msg) + (xp ? ' <span class="xp">+' + xp + ' XP</span>' : '');
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
  }

  /* ---------------- data ---------------- */
  const Data = {
    cache: {},
    load(level) {
      if (this.cache[level]) return Promise.resolve(this.cache[level]);
      if (window.HSK && window.HSK[level]) {
        this.cache[level] = window.HSK[level];
        return Promise.resolve(this.cache[level]);
      }
      return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'data/hsk' + level + '.js';
        s.async = true;
        s.onload = () => {
          const list = (window.HSK && window.HSK[level]) || [];
          this.cache[level] = list;
          resolve(list);
        };
        s.onerror = () => reject(new Error('Không tải được dữ liệu HSK ' + level));
        document.head.appendChild(s);
      });
    },
    emptyLevel() {
      return [];
    }
  };

  const LEVEL_META = {
    1: { name: 'Nhập môn', desc: 'Chào hỏi, số đếm, gia đình, thời gian. Nền móng đầu tiên.', han: '一' },
    2: { name: 'Sơ cấp', desc: 'Sinh hoạt hằng ngày, mua sắm, đi lại, sở thích.', han: '二' },
    3: { name: 'Trung cấp', desc: 'Kể chuyện, cảm xúc, học tập, công việc đơn giản.', han: '三' },
    4: { name: 'Trung cao cấp', desc: 'Thảo luận xã hội, diễn đạt quan điểm, đọc hiểu dài.', han: '四' },
    5: { name: 'Cao cấp', desc: 'Báo chí, văn viết, thành ngữ, sắc thái tinh tế.', han: '五' },
    6: { name: 'Thượng cấp', desc: 'Ngôn ngữ trang trọng, văn học, chuyên môn sâu.', han: '六' }
  };

  /* ---------------- progress store ---------------- */
  const KEY = 'thaydo.progress.v2';
  const SRS_STEPS = [0, 1, 3, 7, 16, 35, 70];

  function defaults() {
    return {
      xp: 0,
      streak: { n: 0, last: null, best: 0 },
      words: {},
      best: {},
      history: [],
      settings: { showRef: true, rate: 1, sound: true },
      daily: { day: null, xp: 0, goal: 100 },
      summaries: {},
      createdAt: Date.now()
    };
  }

  function read() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!raw || typeof raw !== 'object') return defaults();
      const d = defaults();
      return Object.assign(d, raw, {
        streak: Object.assign(d.streak, raw.streak || {}),
        settings: Object.assign(d.settings, raw.settings || {}),
        daily: Object.assign(d.daily, raw.daily || {}),
        words: raw.words || {},
        best: raw.best || {},
        summaries: raw.summaries || {},
        history: raw.history || []
      });
    } catch (e) {
      return defaults();
    }
  }

  let state = null;
  function getState() {
    if (!state) state = read();
    return state;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* quota */ }
  }

  function touchDaily(amount) {
    const s = getState();
    const day = todayKey();
    if (s.daily.day !== day) {
      s.daily.day = day;
      s.daily.xp = 0;
    }
    s.daily.xp += amount || 0;
  }

  function bumpStreak() {
    const s = getState();
    const day = todayKey();
    if (s.streak.last === day) return;
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const yKey = y.getFullYear() + '-' + String(y.getMonth() + 1).padStart(2, '0') + '-' + String(y.getDate()).padStart(2, '0');
    s.streak.n = s.streak.last === yKey ? s.streak.n + 1 : 1;
    s.streak.last = day;
    s.streak.best = Math.max(s.streak.best || 0, s.streak.n);
  }

  function addXp(amount, silent) {
    if (!amount) return;
    const s = getState();
    s.xp += amount;
    touchDaily(amount);
    bumpStreak();
    save();
    if (!silent) toast('Tốt lắm!', amount);
    document.dispatchEvent(new CustomEvent('xpchange'));
  }

  function wordState(word) {
    const s = getState();
    if (!s.words[word]) {
      s.words[word] = { seen: 0, ok: 0, bad: 0, streak: 0, last: null, next: 0, lastOk: 0, best: 0 };
    }
    return s.words[word];
  }

  function markSeen(word) {
    const st = wordState(word);
    st.seen = (st.seen || 0) + 1;
    save();
  }

  function answer(word, correct, opts) {
    const s = getState();
    const st = wordState(word);
    st.last = Date.now();
    if (correct) {
      st.ok++;
      st.streak = (st.streak || 0) + 1;
      st.lastOk = 1;
      const step = SRS_STEPS[Math.min(st.streak, SRS_STEPS.length - 1)];
      st.next = Date.now() + Math.max(step, 0.25) * 864e5;
    } else {
      st.bad++;
      st.streak = 0;
      st.lastOk = 0;
      st.next = Date.now() + 1000 * 60 * 10;
    }
    if (opts && typeof opts.best === 'number') st.best = Math.max(st.best || 0, opts.best);
    save();
    addXp(correct ? 10 : 2, true);
    document.dispatchEvent(new CustomEvent('progresschange'));
    return st;
  }

  function isMastered(word) {
    const st = getState().words[word];
    if (!st) return false;
    return st.ok >= 2 && st.lastOk === 1;
  }
  function isLearning(word) {
    const st = getState().words[word];
    return !!st && st.ok + st.bad > 0 && !isMastered(word);
  }

  function levelStats(words) {
    let mastered = 0, learning = 0;
    for (const w of words) {
      if (isMastered(w.w)) mastered++;
      else if (isLearning(w.w)) learning++;
    }
    return { mastered, learning, total: words.length };
  }

  const RANKS = [
    { xp: 0, name: 'Học trò mới', han: '童', cls: 'Đồng sinh' },
    { xp: 250, name: 'Đồng sinh', han: '生', cls: 'Đồng sinh' },
    { xp: 800, name: 'Tú tài', han: '才', cls: 'Tú tài' },
    { xp: 2000, name: 'Cử nhân', han: '舉', cls: 'Cử nhân' },
    { xp: 4500, name: 'Tiến sĩ', han: '進', cls: 'Tiến sĩ' },
    { xp: 9000, name: 'Trạng nguyên', han: '狀', cls: 'Trạng nguyên' }
  ];
  function rank(xp) {
    const v = xp == null ? getState().xp : xp;
    let r = RANKS[0], next = RANKS[1];
    for (let i = 0; i < RANKS.length; i++) {
      if (v >= RANKS[i].xp) { r = RANKS[i]; next = RANKS[i + 1] || null; }
    }
    return { ...r, next, progress: next ? clamp((v - r.xp) / (next.xp - r.xp), 0, 1) : 1 };
  }

  function saveLevelSummary(level, mastered, total) {
    const s = getState();
    s.summaries[level] = { mastered, total, t: Date.now() };
    save();
  }
  function getLevelSummary(level) {
    return getState().summaries[level] || null;
  }

  function recordGame(word, score) {
    const s = getState();
    s.best[word] = Math.max(s.best[word] || 0, score);
    s.history.unshift({ w: word, s: score, t: Date.now() });
    s.history = s.history.slice(0, 40);
    save();
  }

  const Progress = {
    get: getState, save, addXp, answer, markSeen, wordState,
    isMastered, isLearning, levelStats, rank, recordGame, RANKS, touchDaily, bumpStreak,
    saveLevelSummary, getLevelSummary
  };

  /* ---------------- speech ---------------- */
  const Speech = (() => {
    let voices = [];
    let zhVoice = null;
    let token = 0;
    let audio = null;

    function loadVoices() {
      if (!('speechSynthesis' in window)) return;
      voices = speechSynthesis.getVoices() || [];
      const zh = voices.filter((v) => /zh|cmn|Chinese/i.test(v.lang + ' ' + v.name));
      zhVoice = zh.find((v) => /zh[-_]CN/i.test(v.lang)) || zh[0] || null;
    }
    if ('speechSynthesis' in window) {
      loadVoices();
      speechSynthesis.onvoiceschanged = loadVoices;
    }

    // The browser voice engine often has no Chinese voice installed, so the
    // default path streams a Mandarin MP3 from an online TTS service. Both
    // services reject requests that carry a Referer, so every page sets
    // <meta name="referrer" content="no-referrer">.
    function sources(text) {
      const q = encodeURIComponent(text);
      return [
        'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=zh-CN&q=' + q,
        'https://fanyi.baidu.com/gettts?lan=zh&text=' + q + '&spd=3&source=web',
        'https://translate.googleapis.com/translate_tts?client=gtx&tl=zh-CN&q=' + q
      ];
    }

    function clearAudio() {
      if (!audio) return;
      try {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
      } catch (e) { /* ignore */ }
      audio = null;
    }

    function stop() {
      token++;
      clearAudio();
      if ('speechSynthesis' in window) speechSynthesis.cancel();
    }

    function speakVoice(text, rate, onDone) {
      if (!('speechSynthesis' in window)) { onDone(false); return; }
      try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'zh-CN';
        if (zhVoice) u.voice = zhVoice;
        u.rate = rate;
        u.pitch = 1;
        let done = false;
        const end = (ok) => { if (done) return; done = true; onDone(ok); };
        u.onend = () => end(true);
        u.onerror = () => end(false);
        speechSynthesis.speak(u);
      } catch (e) {
        onDone(false);
      }
    }

    function speak(text, opts) {
      const o = opts || {};
      if (!text) {
        if (o.onend) o.onend(false);
        return false;
      }
      const my = ++token;
      clearAudio();
      if ('speechSynthesis' in window) speechSynthesis.cancel();
      const rate = clamp(Number(o.rate) || 1, 0.5, 1.6);
      let finished = false;
      let index = 0;

      const done = (ok) => {
        if (finished || my !== token) return;
        finished = true;
        clearAudio();
        if (o.onend) o.onend(ok);
      };

      const fallbackVoice = () => {
        if (my !== token || finished) return;
        speakVoice(text, rate, (ok) => done(ok));
      };

      const tryNext = () => {
        if (my !== token || finished) return;
        const list = sources(text);
        if (index >= list.length) { fallbackVoice(); return; }
        const url = list[index++];
        let settled = false;
        let playTimer = null;
        let loadTimer = null;

        const a = new Audio();
        audio = a;
        a.preload = 'auto';
        a.playbackRate = rate;

        const cleanup = () => {
          clearTimeout(playTimer);
          clearTimeout(loadTimer);
          a.onplaying = null;
          a.onended = null;
          a.onerror = null;
        };
        const next = () => {
          if (settled || my !== token) return;
          settled = true;
          cleanup();
          if (audio === a) audio = null;
          try { a.pause(); a.removeAttribute('src'); a.load(); } catch (e) { /* ignore */ }
          tryNext();
        };

        a.onplaying = () => {
          clearTimeout(playTimer);
          clearTimeout(loadTimer);
          a.playbackRate = rate;
        };
        a.onended = () => {
          if (settled || my !== token) return;
          settled = true;
          cleanup();
          done(true);
        };
        a.onerror = next;
        playTimer = setTimeout(next, 9000);
        loadTimer = setTimeout(() => { if (!a.duration) next(); }, 4500);

        try {
          a.src = url;
          const p = a.play();
          if (p && p.catch) p.catch(next);
        } catch (e) {
          next();
        }
      };

      tryNext();
      return true;
    }

    function hasVoice() {
      return !!zhVoice || (typeof navigator === 'undefined' ? true : navigator.onLine !== false);
    }

    return { speak, stop, hasVoice, supported: true, online: true };
  })();

  /* ---------------- speech recognition ---------------- */
  function recognize(opts) {
    const o = Object.assign({ lang: 'zh-CN', timeout: 9000 }, opts || {});
    return new Promise((resolve) => {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) {
        resolve({ supported: false, transcript: '', error: 'unsupported' });
        return;
      }
      let done = false;
      let rec;
      try {
        rec = new SR();
      } catch (e) {
        resolve({ supported: false, transcript: '', error: 'init' });
        return;
      }
      rec.lang = o.lang;
      rec.interimResults = false;
      rec.maxAlternatives = 3;
      rec.continuous = false;
      const finish = (payload) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        try { rec.stop(); } catch (e) { /* noop */ }
        resolve(payload);
      };
      const timer = setTimeout(() => finish({ supported: true, transcript: '', error: 'timeout' }), o.timeout);
      rec.onresult = (ev) => {
        const alts = [];
        const res = ev.results[0];
        for (let i = 0; i < res.length; i++) alts.push(res[i].transcript || '');
        finish({ supported: true, transcript: alts[0] || '', alternatives: alts, error: '' });
      };
      rec.onerror = (ev) => {
        finish({ supported: true, transcript: '', error: ev.error || 'error' });
      };
      rec.onend = () => {
        if (!done) finish({ supported: true, transcript: '', error: 'no-speech' });
      };
      try {
        rec.start();
        if (o.onstart) o.onstart();
      } catch (e) {
        finish({ supported: true, transcript: '', error: 'start' });
      }
    });
  }

  function similarity(a, b) {
    if (!a || !b) return 0;
    const A = a.replace(/\s/g, ''), B = b.replace(/\s/g, '');
    const m = A.length, n = B.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = A[i - 1] === B[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
    return (2 * dp[m][n]) / (m + n);
  }

  /* ---------------- chinese font helper ---------------- */
  const FONT_HAN = '"Noto Serif SC","Songti SC","SimSun","Microsoft YaHei","STSong",serif';

  /* ---------------- nav ---------------- */
  function initNav() {
    const burger = $('.burger');
    const links = $('.navlinks');
    if (burger && links) {
      burger.addEventListener('click', () => links.classList.toggle('open'));
      links.addEventListener('click', (e) => {
        if (e.target.tagName === 'A') links.classList.remove('open');
      });
    }
    const path = location.pathname.split('/').pop() || 'index.html';
    $$('.navlinks a').forEach((a) => {
      const href = (a.getAttribute('href') || '').split('#')[0];
      if (href === path) a.classList.add('active');
    });
    $$('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));
  }

  /* ---------------- classroom presence, name and stars ---------------- */
  const Classroom = (() => {
    const ID_KEY = 'thaydo.player.v2';
    const STAR_KEY = 'thaydo.starred.v1';
    const API = '/functions/v1/app';
    let id = '';
    let name = '';
    let count = null;
    let stars = null;
    let starred = false;
    let walking = false;
    let pending = null;
    let timer = null;
    const listeners = [];

    function makeId() {
      try {
        if (crypto && crypto.randomUUID) return crypto.randomUUID();
      } catch (e) { /* fall through */ }
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    }
    function clean(v) {
      return String(v || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 24);
    }
    function save() {
      try { localStorage.setItem(ID_KEY, JSON.stringify({ id, name })); } catch (e) { /* ignore */ }
    }
    (function load() {
      try {
        const raw = JSON.parse(localStorage.getItem(ID_KEY) || 'null');
        if (raw && typeof raw.id === 'string' && /^[0-9a-f-]{36}$/i.test(raw.id)) {
          id = raw.id;
          name = clean(raw.name);
        }
        starred = localStorage.getItem(STAR_KEY) === '1';
      } catch (e) { /* storage can be blocked */ }
      if (!id) id = makeId();
      save();
    })();

    function emit() {
      const snapshot = { id, name, count, stars, starred };
      listeners.forEach((fn) => { try { fn(snapshot); } catch (e) { /* ignore */ } });
    }

    function paintCount() {
      $$('#classCount, [data-class-count]').forEach((el) => {
        el.textContent = count == null ? '…' : String(count);
      });
      const btn = $('#classJoinBtn');
      if (btn) {
        const label = (count == null ? 'Đang kết nối lớp học' : count + ' học sinh đang học') + ' — bấm để ' + (name ? 'đổi tên' : 'đặt tên và tham gia');
        btn.setAttribute('aria-label', name ? name + ', ' + label : label);
        if (!btn.classList.contains('is-offline')) {
          btn.title = (name ? name + ' · ' : '') + (count == null ? 'Đang kết nối lớp học' : count + ' học sinh đang học') + ' · bấm để ' + (name ? 'đổi tên' : 'đặt tên và tham gia');
        }
      }
    }

    function paintName() {
      const el = $('#scenePlayerName');
      if (el) {
        el.textContent = name;
        el.hidden = !name;
      }
      $$('[data-player-name]').forEach((node) => {
        node.textContent = name;
        node.hidden = !name;
      });
      paintCount();
    }

    function paintStars() {
      const shortcut = navigator.platform && /Mac/i.test(navigator.platform) ? '⌘+D' : 'Ctrl+D';
      $$('#starBtn').forEach((btn) => {
        btn.classList.toggle('is-on', starred);
        btn.setAttribute('aria-pressed', String(starred));
        btn.setAttribute('aria-label', (starred ? 'Bạn đã tặng sao' : 'Tặng sao cho lớp') + (stars == null ? '' : ', ' + stars + ' sao') + ' · nhấn ' + shortcut + ' để lưu trang');
        btn.title = starred
          ? 'Bạn đã tặng sao · nhấn ' + shortcut + ' để lưu trang'
          : 'Tặng sao và lưu trang vào trình duyệt';
      });
      $$('#starCount, [data-star-count]').forEach((el) => {
        el.textContent = stars == null ? '…' : String(stars);
      });
    }

    function applyCount(n) {
      if (!Number.isFinite(n) || n < 0) return;
      count = Math.max(0, Math.round(n));
      paintCount();
      emit();
    }

    function applyStars(n) {
      if (!Number.isFinite(n) || n < 0) return;
      stars = Math.max(0, Math.round(n));
      paintStars();
      emit();
    }

    function offline(on) {
      const btn = $('#classJoinBtn');
      if (btn) {
        btn.classList.toggle('is-offline', !!on);
        if (on) btn.title = 'Chưa kết nối được lớp học — bạn vẫn có thể đặt tên và xem bài.';
      }
      if (!on) paintCount();
    }

    async function heartbeat(force) {
      if (pending) {
        if (!force) return pending;
        try { await pending; } catch (e) { /* retry below */ }
      }
      if (!force && document.hidden) return count;
      const task = (async () => {
        try {
          const res = await fetch(API + '/presence/heartbeat', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            credentials: 'same-origin',
            cache: 'no-store',
            body: JSON.stringify({ id, name: name || 'Học trò', walking })
          });
          if (!res.ok) throw new Error('HTTP ' + res.status);
          const data = await res.json();
          if (data && Number.isFinite(data.count)) applyCount(data.count);
          offline(false);
          return count;
        } catch (e) {
          offline(true);
          return count;
        } finally {
          pending = null;
        }
      })();
      pending = task;
      return task;
    }

    async function loadStars() {
      try {
        const res = await fetch(API + '/stars', { credentials: 'same-origin', cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (data && Number.isFinite(data.count)) applyStars(data.count);
      } catch (e) { /* popularity is optional */ }
    }

    async function giveStar() {
      const shortcut = navigator.platform && /Mac/i.test(navigator.platform) ? '⌘+D' : 'Ctrl+D';
      if (starred) {
        toast('Bạn đã tặng sao cho lớp rồi. Nhấn ' + shortcut + ' để lưu trang nhé!');
        return;
      }
      try {
        const res = await fetch(API + '/stars', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'same-origin',
          cache: 'no-store',
          body: JSON.stringify({ id })
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        if (data && Number.isFinite(data.count)) applyStars(data.count);
        starred = true;
        try { localStorage.setItem(STAR_KEY, '1'); } catch (e) { /* ignore */ }
        paintStars();
        toast('Cảm ơn bạn đã tặng sao! Nhấn ' + shortcut + ' để lưu trang.');
      } catch (e) {
        toast('Chưa gửi được sao — nhấn ' + shortcut + ' để lưu trang nhé.');
      }
    }

    function setName(v) {
      name = clean(v);
      save();
      paintName();
      heartbeat(true);
      emit();
      return name;
    }

    function setWalking(v) {
      walking = !!v;
      heartbeat(true);
    }

    function identity() {
      return { id, name };
    }

    function onChange(fn) {
      if (typeof fn === 'function') listeners.push(fn);
    }

    function openOwnJoin() {
      let box = $('#classJoinModal');
      if (!box) {
        box = document.createElement('div');
        box.className = 'modal-backdrop';
        box.id = 'classJoinModal';
        box.innerHTML =
          '<form class="modal" id="classJoinForm" autocomplete="off">' +
            '<span class="eyebrow">Nhập học · 入学</span>' +
            '<h3 style="margin-top:8px">Tham gia lớp học</h3>' +
            '<p>Đặt tên nhân vật của bạn để thầy và các bạn nhận ra khi đi dạo trong trường.</p>' +
            '<label class="class-label" for="classJoinName">Tên hiển thị</label>' +
            '<input class="class-field" id="classJoinName" maxlength="24" required placeholder="Ví dụ: Lan, Minh, 小明…">' +
            '<p class="class-modal-count">👥 Hiện có <b id="classModalCount">…</b> học sinh đang học cùng bạn</p>' +
            '<div class="modal-actions">' +
              '<button class="btn btn-ghost" type="button" data-close>Để sau</button>' +
              '<button class="btn btn-red" type="submit">Tham gia lớp</button>' +
            '</div>' +
            '<p class="class-note">Không cần đăng nhập. Bạn có thể đổi tên bất cứ lúc nào.</p>' +
          '</form>';
        document.body.appendChild(box);
        const close = () => box.classList.remove('open');
        box.addEventListener('click', (e) => { if (e.target === box) close(); });
        box.querySelector('[data-close]').addEventListener('click', close);
        box.querySelector('#classJoinForm').addEventListener('submit', (e) => {
          e.preventDefault();
          const input = box.querySelector('#classJoinName');
          const value = input.value.trim();
          if (!value) { input.reportValidity(); return; }
          setName(value);
          close();
          toast('Chào ' + name + '! Đang kiểm tra lớp học…');
          heartbeat(true).then((n) => {
            box.querySelector('#classModalCount').textContent = n == null ? '…' : String(n);
            toast('Chào ' + name + '! Hiện có ' + (n == null ? '…' : n) + ' học sinh đang học.');
          });
        });
      }
      box.querySelector('#classJoinName').value = name || '';
      box.querySelector('#classModalCount').textContent = count == null ? '…' : String(count);
      box.classList.add('open');
      setTimeout(() => box.querySelector('#classJoinName').focus(), 60);
    }

    function bindWidget() {
      const join = $('#classJoinBtn');
      if (join) {
        join.addEventListener('click', () => {
          if (window.TD && typeof window.TD.openJoin === 'function') window.TD.openJoin();
          else openOwnJoin();
        });
      }
      const star = $('#starBtn');
      if (star) star.addEventListener('click', giveStar);
    }

    function injectTopbar() {
      if ($('#classJoinBtn')) return;
      const wrap = $('.topbar .wrap');
      if (!wrap) return;
      const box = document.createElement('div');
      box.className = 'topbar-class';
      box.innerHTML =
        '<button class="class-pill" id="classJoinBtn" type="button" aria-haspopup="dialog" aria-label="Tham gia lớp học và đặt tên nhân vật" title="Bấm để đặt tên và tham gia lớp">' +
          '<span class="class-pin" aria-hidden="true"></span><b id="classCount">…</b><span class="class-label"> học sinh</span>' +
        '</button>' +
        '<button class="class-star" id="starBtn" type="button" aria-pressed="false" aria-label="Tặng sao cho lớp và lưu trang" title="Tặng sao và lưu trang vào trình duyệt">' +
          '<span class="star-glyph" aria-hidden="true">★</span><b id="starCount">…</b>' +
        '</button>';
      const burger = wrap.querySelector('.burger');
      wrap.insertBefore(box, burger || null);
    }

    function start() {
      injectTopbar();
      paintName();
      paintStars();
      bindWidget();
      onChange((snap) => {
        const modalCount = $('#classModalCount');
        if (modalCount && snap.count != null) modalCount.textContent = String(snap.count);
      });
      heartbeat(true);
      loadStars();
      timer = setInterval(() => heartbeat(false), 15000);
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) heartbeat(false);
      });
    }

    return {
      identity, setName, heartbeat, setWalking, giveStar, loadStars,
      setCount: applyCount, setStars: applyStars, getCount: () => count,
      onChange, start
    };
  })();

  function bootChrome() {
    initNav();
    Classroom.start();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootChrome);
  } else {
    bootChrome();
  }

  window.TD = {
    $, $$, clamp, todayKey, shuffle, escapeHtml, pick,
    Data, LEVEL_META, Progress, Speech, recognize, similarity, FONT_HAN, toast,
    Classroom
  };
})();
