/* game.js — Thầy Đồ chấm chữ */
(function () {
  'use strict';
  const TD = window.TD;
  const { $, $$, Progress, Speech, escapeHtml, pick, clamp, toast, Data } = TD;

  const COUNTS = { 1: 150, 2: 147, 3: 298, 4: 598, 5: 1298, 6: 2500 };
  const GREETINGS = [
    'Viết đi trò, thầy ngồi đây. Không vội.',
    'Chữ này thầy chấm khó lắm đấy, liệu hồn.',
    'Bình tĩnh. Chậm mà chắc, thầy không đuổi.',
    'Thầy đã mài mực rồi. Trò viết được chưa?',
    'Nét bút là tấm lòng. Viết cho thật.'
  ];
  const THINKING = ['Hmm… để thầy xem…', 'Thầy nheo mắt…', 'Nét này… nét này…', 'Thầy lật giấy, soi kỹ…'];

  const state = {
    level: 1,
    words: [],
    pool: [],
    word: null,
    pad: null,
    hideHint: false,
    busy: false,
    turns: 0,
    bestSession: 0,
    recent: [],
    typeTimer: null
  };

  /* ---------------- ui helpers ---------------- */
  function setTeacher(text, typing) {
    const el = $('#teacherSays');
    clearInterval(state.typeTimer);
    if (!typing) {
      el.textContent = text;
      return;
    }
    el.innerHTML = '';
    let i = 0;
    const caret = document.createElement('span');
    caret.className = 'caret';
    el.appendChild(caret);
    state.typeTimer = setInterval(() => {
      i += 2;
      el.textContent = text.slice(0, i);
      el.appendChild(caret);
      if (i >= text.length) {
        clearInterval(state.typeTimer);
        caret.remove();
      }
    }, 26);
  }

  function status(text) {
    $('#teacherStatus').textContent = text;
  }

  function updatePills() {
    const s = Progress.get();
    $('#gStreak').textContent = '🔥 ' + (s.streak.n || 0) + ' ngày';
    $('#gXp').textContent = s.xp + ' XP';
    $('#gRank').textContent = Progress.rank().name;
  }

  function renderLevels() {
    const box = $('#gLevels');
    let html = '';
    for (let n = 1; n <= 6; n++) {
      html += '<button class="g-level' + (n === state.level ? ' active' : '') + '" data-level="' + n + '">HSK ' + n +
        '<small>' + (state.words.length && n === state.level ? state.words.length : COUNTS[n]) + ' chữ</small></button>';
    }
    box.innerHTML = html;
  }

  function renderRank() {
    const s = Progress.get();
    const r = Progress.rank(s.xp);
    let html = '';
    Progress.RANKS.forEach((rank) => {
      const on = rank.name === r.name;
      html += '<div class="rank-row' + (on ? ' on' : '') + '">' +
        '<span class="rk">' + rank.han + '</span>' +
        '<span style="width:74px">' + rank.name + '</span>' +
        '<span class="bar"><i style="width:' + (on ? Math.round(r.progress * 100) : (s.xp >= rank.xp ? 100 : 0)) + '%"></i></span>' +
        '</div>';
    });
    $('#rankLadder').innerHTML = html;
  }

  function renderLog() {
    const h = Progress.get().history.slice(0, 5);
    if (!h.length) {
      $('#scoreLog').textContent = 'Chưa có lượt chấm nào.';
      return;
    }
    $('#scoreLog').innerHTML = h.map((x) =>
      '<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px dashed rgba(110,87,52,.2)">' +
      '<span class="han-clean" style="font-size:1rem">' + escapeHtml(x.w) + '</span>' +
      '<b style="color:' + (x.s >= 70 ? 'var(--green)' : 'var(--red)') + '">' + x.s + '</b></div>'
    ).join('');
  }

  function renderDots() {
    const dots = $('#dots');
    const recent = state.recent.slice(-5);
    let html = '';
    for (let i = 0; i < 5; i++) {
      const r = recent[i];
      html += '<i class="' + (r ? (r >= 70 ? 'ok' : 'used') : '') + '"></i>';
    }
    dots.innerHTML = html;
  }

  /* ---------------- word ---------------- */
  function pickWord(focus) {
    const pool = state.pool.length ? state.pool : state.words;
    if (!pool.length) return;
    let w = null;
    if (focus) {
      const f = Array.from(focus)[0];
      w = pool.find((x) => x.w === focus) || pool.find((x) => x.w === f);
    }
    if (!w) {
      let tries = 0;
      do {
        w = pool[Math.floor(Math.random() * pool.length)];
        tries++;
      } while (state.word && w.w === state.word.w && tries < 20);
    }
    state.word = w;
    state.hideHint = false;
    $('#gwToggle').textContent = 'Ẩn gợi ý';
    $('#gwHan').textContent = w.w;
    $('#gwPy').textContent = w.p;
    $('#gwMean').textContent = w.m || w.en || '';
    $$('#gwPy, #gwMean').forEach((el) => el.classList.remove('gw-hidden'));
    $('#assignWord').textContent = w.w;
    $('#assignPy').textContent = w.p;
    $('#gBest').textContent = Progress.get().best[w.w] || '—';
    $('#resultCard').classList.remove('show');
    if (state.pad) {
      state.pad.clear();
      state.pad.setReference(w.w);
    }
    setTeacher(pick(GREETINGS), true);
    status('Đang chờ trò viết…');
    renderDots();
    history.replaceState(null, '', 'thaydo.html?level=' + state.level + '&w=' + encodeURIComponent(w.w));
  }

  /* ---------------- grading ---------------- */
  function submit() {
    if (!state.pad || state.busy || !state.word) return;
    if (state.pad.isEmpty()) {
      setTeacher('Trò chưa đặt nét nào. Thầy chấm giấy trắng thì… cũng được, nhưng không tính điểm.', true);
      status('Chưa có bài');
      return;
    }
    state.busy = true;
    $('#gSubmit').disabled = true;
    status('Đang chấm…');
    setTeacher(pick(THINKING), true);

    setTimeout(() => {
      const w = state.word;
      const res = TD.grade(state.pad.strokes, w.w);
      const t = TD.review(res, { strokes: state.pad.strokeCount() });
      const xp = Math.max(2, Math.round(res.score / 4));

      Progress.recordGame(w.w, res.score);
      Progress.answer(w.w, res.score >= 70, { best: res.score });
      Progress.addXp(xp, true);
      Progress.saveLevelSummary(state.level, Progress.levelStats(state.words).mastered, state.words.length);

      state.turns++;
      state.bestSession = Math.max(state.bestSession, res.score);
      state.recent.push(res.score);
      state.recent = state.recent.slice(-5);

      $('#gTurns').textContent = state.turns;
      $('#gSession').textContent = state.bestSession;
      $('#gBest').textContent = Progress.get().best[w.w] || res.score;

      // result panel
      $('#resultCard').classList.add('show');
      $('#scoreNum').textContent = res.score;
      $('#scoreRank').textContent = t.grade;
      const seal = $('#seal');
      seal.textContent = t.seal;
      seal.classList.remove('stamped');
      void seal.offsetWidth;
      seal.classList.add('stamped');
      $('#verdict').textContent = t.quip;
      $('#advice').textContent = t.tip;
      $('#scoreBars').innerHTML =
        bar('Khớp nét', res.fit) + bar('Bố cục', res.layout) + bar('Độ mượt', res.smooth);
      $$('#scoreBars .score-bar i').forEach((el) => {
        const v = el.dataset.w;
        el.style.width = '0%';
        requestAnimationFrame(() => { setTimeout(() => { el.style.width = v + '%'; }, 40); });
      });

      setTeacher(t.quip, true);
      status(res.score >= 85 ? 'Thầy hài lòng' : res.score >= 60 ? 'Thầy gật đầu' : 'Thầy đang thở dài');
      updatePills();
      renderRank();
      renderLog();
      renderDots();
      toast('Thầy đã chấm', xp);
      state.busy = false;
      $('#gSubmit').disabled = false;
      $('#resultCard').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 780);
  }

  function bar(label, v) {
    return '<div class="score-bar-row"><span>' + label + '</span><div class="score-bar"><i data-w="' + v + '"></i></div><span>' + v + '</span></div>';
  }

  /* ---------------- data ---------------- */
  function setLevel(n, focus) {
    state.level = n;
    renderLevels();
    $('#gwHan').textContent = '…';
    Data.load(n).then((words) => {
      state.words = words || [];
      state.pool = state.words.filter((x) => Array.from(x.w).length === 1);
      renderLevels();
      pickWord(focus);
    }).catch(() => {
      setTeacher('Thầy không mở được sách HSK ' + n + '.', true);
    });
  }

  /* ---------------- init ---------------- */
  function init() {
    const params = new URLSearchParams(location.search);
    const level = clamp(parseInt(params.get('level') || '1', 10) || 1, 1, 6);
    const focus = params.get('w') || '';

    state.pad = new TD.InkPad($('#gamePad'), { reference: '', showRef: true });

    $('#gLevels').addEventListener('click', (e) => {
      const b = e.target.closest('.g-level');
      if (!b) return;
      setLevel(+b.dataset.level);
    });

    $('#gUndo').onclick = () => state.pad.undo();
    $('#gClear').onclick = () => state.pad.clear();
    $('#gNew').onclick = () => pickWord();
    $('#rNext').onclick = () => pickWord();
    $('#rAgain').onclick = () => {
      state.pad.clear();
      $('#resultCard').classList.remove('show');
      setTeacher('Viết lại đi. Thầy chờ.', true);
      status('Đang chờ trò viết…');
    };
    $('#gSubmit').onclick = submit;

    let refOn = true;
    $('#gRef').onclick = (e) => {
      refOn = !refOn;
      state.pad.setShowRef(refOn);
      e.target.textContent = refOn ? 'Ẩn chữ mẫu' : 'Hiện chữ mẫu';
    };
    $('#gStroke').onclick = () => {
      if (state.word) TD.openStrokeModal(state.word.w, state.word.p);
    };
    $('#gwToggle').onclick = (e) => {
      state.hideHint = !state.hideHint;
      $$('#gwPy, #gwMean').forEach((el) => el.classList.toggle('gw-hidden', state.hideHint));
      e.target.textContent = state.hideHint ? 'Hiện gợi ý' : 'Ẩn gợi ý';
    };

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') submit();
    });

    document.addEventListener('progresschange', updatePills);
    document.addEventListener('xpchange', () => { updatePills(); renderRank(); });

    renderRank();
    renderLog();
    renderDots();
    updatePills();
    setLevel(level, focus);
  }

  init();
})();
