/* learn.js — HSK 1–6 browser + four-skill practice */
(function () {
  'use strict';
  const TD = window.TD;
  const { $, $$, Progress, Speech, recognize, similarity, escapeHtml, shuffle, clamp, toast, LEVEL_META, Data } = TD;

  const state = {
    level: 1,
    words: [],
    view: [],
    index: 0,
    mode: 'card',
    filter: 'all',
    query: '',
    chunk: 70,
    hidePy: false,
    pad: null,
    gen: 0
  };

  const norm = (s) => (s || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  /* ------------------------------------------------------------------ */
  /* data + list                                                         */
  /* ------------------------------------------------------------------ */
  function loadLevel(level, focusWord) {
    state.level = level;
    state.words = [];
    state.view = [];
    state.index = 0;
    $('#wordlist').innerHTML = '<div class="muted small" style="padding:14px 6px">Đang tải ' + level + '…</div>';
    Data.load(level).then((words) => {
      state.words = words || [];
      applyFilters();
      const idx = focusWord ? state.view.findIndex((w) => w.w === focusWord) : 0;
      state.index = Math.max(0, idx);
      renderAll();
      Progress.saveLevelSummary(level, Progress.levelStats(state.words).mastered, state.words.length);
      updatePills();
    }).catch((e) => {
      $('#wordlist').innerHTML = '<div class="muted small" style="padding:14px 6px">Không tải được dữ liệu: ' + escapeHtml(e.message) + '</div>';
    });
  }

  function applyFilters() {
    const q = norm(state.query).trim();
    const now = Date.now();
    state.view = state.words.filter((w) => {
      const st = Progress.get().words[w.w];
      if (state.filter === 'new' && st && (st.seen || st.ok || st.bad)) return false;
      if (state.filter === 'learning' && !Progress.isLearning(w.w)) return false;
      if (state.filter === 'done' && !Progress.isMastered(w.w)) return false;
      if (state.filter === 'due' && !(st && st.next && st.next <= now && st.ok + st.bad > 0)) return false;
      if (q) {
        const hay = norm(w.w + ' ' + w.p + ' ' + w.m + ' ' + (w.en || '') + ' ' + (w.pos || ''));
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    state.chunk = 70;
  }

  function renderLevelPills() {
    let html = '';
    for (let n = 1; n <= 6; n++) {
      html += '<button class="level-pill' + (n === state.level ? ' active' : '') + '" data-level="' + n + '">' + n + '</button>';
    }
    $('#levelPills').innerHTML = html;
  }

  function renderList() {
    const list = $('#wordlist');
    const part = state.view.slice(0, state.chunk);
    let html = '';
    for (let i = 0; i < part.length; i++) {
      const w = part[i];
      const st = Progress.get().words[w.w];
      let cls = 'wi-state';
      if (Progress.isMastered(w.w)) cls += ' ok';
      else if (Progress.isLearning(w.w)) cls += ' learning';
      html += '<button class="worditem' + (i === state.index ? ' active' : '') + '" data-i="' + i + '">' +
        '<span class="wi-char">' + escapeHtml(w.w) + '</span>' +
        '<span class="wi-body"><span class="wi-py">' + escapeHtml(w.p) + '</span>' +
        '<span class="wi-mean">' + escapeHtml(w.m || w.en || '') + '</span></span>' +
        '<span class="' + cls + '" title="' + (Progress.isMastered(w.w) ? 'Đã thuộc' : Progress.isLearning(w.w) ? 'Đang học' : 'Chưa học') + '"></span>' +
        '</button>';
    }
    if (!part.length) {
      html = '<div class="muted small" style="padding:18px 6px;text-align:center">Không có từ nào khớp bộ lọc.<br>Thử bỏ bộ lọc hoặc đổi cấp độ.</div>';
    } else if (state.view.length > state.chunk) {
      html += '<button class="list-more" id="moreBtn">Tải thêm ' + Math.min(60, state.view.length - state.chunk) + ' từ (còn ' + (state.view.length - state.chunk) + ')</button>';
    }
    list.innerHTML = html;

    const meta = $('#listMeta');
    meta.textContent = state.view.length + ' / ' + state.words.length + ' từ';
    const stats = Progress.levelStats(state.words);
    $('#levelPct').textContent = state.words.length ? Math.round((stats.mastered / state.words.length) * 100) + '% thuộc' : '';
    $('#railLevel').textContent = state.level;
    $('#railCount').textContent = state.words.length;

    const active = list.querySelector('.worditem.active');
    if (active) active.scrollIntoView({ block: 'nearest' });
  }

  function renderAll() {
    renderLevelPills();
    renderList();
    renderStage();
    updateHeader();
  }

  function updateHeader() {
    const w = state.view[state.index];
    if (!w) {
      $('#curWord').textContent = 'HSK ' + state.level;
      $('#curIndex').textContent = '';
      return;
    }
    $('#curWord').textContent = w.w + '  ' + w.p;
    $('#curIndex').textContent = (state.index + 1) + ' / ' + state.view.length;
    $('#prevWord').disabled = state.index <= 0;
    $('#nextWord').disabled = state.index >= state.view.length - 1;
  }

  function setWord(i) {
    if (i < 0 || i >= state.view.length) return;
    state.index = i;
    if (i >= state.chunk) { state.chunk = i + 40; renderList(); }
    else $$('#wordlist .worditem').forEach((b) => b.classList.toggle('active', +b.dataset.i === i));
    const w = state.view[i];
    if (w) Progress.markSeen(w.w);
    renderStage();
    updateHeader();
    const active = $('#wordlist .worditem.active');
    if (active) active.scrollIntoView({ block: 'nearest' });
  }

  function updatePills() {
    const s = Progress.get();
    $('#pillStreak').textContent = '🔥 ' + (s.streak.n || 0) + ' ngày';
    $('#pillXp').textContent = s.xp + ' XP';
    $('#pillRank').textContent = Progress.rank().name;
  }

  /* ------------------------------------------------------------------ */
  /* stage rendering                                                     */
  /* ------------------------------------------------------------------ */
  function clearPad() {
    if (state.pad) { state.pad.dispose(); state.pad = null; }
  }

  function renderStage() {
    clearPad();
    Speech.stop();
    state.gen++;
    const stage = $('#stage');
    const w = state.view[state.index];
    if (!w) {
      stage.innerHTML = '<div class="center muted" style="padding:60px 0">Chọn một từ ở danh sách bên cạnh để bắt đầu.</div>';
      return;
    }
    if (state.mode === 'card') renderCard(stage, w);
    else if (state.mode === 'listen') renderListen(stage, w);
    else if (state.mode === 'speak') renderSpeak(stage, w);
    else if (state.mode === 'read') renderRead(stage, w);
    else renderWrite(stage, w);
  }

  function speakBtn(text, label, rate, cls) {
    const id = 'sp' + Math.random().toString(36).slice(2, 8);
    setTimeout(() => {
      const b = document.getElementById(id);
      if (!b) return;
      b.addEventListener('click', () => {
        $$('.icon-btn.playing').forEach((x) => x.classList.remove('playing'));
        b.classList.add('playing');
        Speech.speak(text, {
          rate: rate,
          onend: (ok) => {
            b.classList.remove('playing');
            if (!ok) toast('Chưa phát được âm thanh. Kiểm tra mạng rồi bấm lại.');
          }
        });
      });
    }, 0);
    return '<button class="icon-btn ' + (cls || '') + '" id="' + id + '">' +
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a9 9 0 0 1 0 14"/></svg>' +
      (label || 'Nghe') + '</button>';
  }

  function wordChips(w) {
    const parts = [];
    if (w.pos) parts.push('<span class="tag">' + escapeHtml(w.pos) + '</span>');
    parts.push('<span class="tag">HSK ' + state.level + '</span>');
    if (w.rad) parts.push('<span class="tag">bộ ' + escapeHtml(w.rad) + '</span>');
    return '<div style="display:flex;gap:6px;flex-wrap:wrap">' + parts.join('') + '</div>';
  }

  /* ---------------------------- card ---------------------------- */
  function renderCard(stage, w) {
    const st = Progress.wordState(w.w);
    const best = Progress.get().best[w.w];
    stage.innerHTML =
      '<div class="flashcard-wrap">' +
      '  <div>' +
      '    <div class="flashcard">' +
      '      <div class="fc-char">' + escapeHtml(w.w) + (w.t ? '<span class="trad">' + escapeHtml(w.t) + '</span>' : '') + '</div>' +
      '      <div class="fc-pinyin' + (state.hidePy ? ' blur' : '') + '">' + escapeHtml(w.p) + '</div>' +
      '      <div class="small muted">' + (w.t ? 'Giản thể · ' + escapeHtml(w.t) + ' phồn thể' : '') + '</div>' +
      '    </div>' +
      '    <div class="audio-row" style="margin-top:12px">' +
      speakBtn(w.w, 'Nghe', 1) +
      speakBtn(w.w, 'Chậm', 0.65) +
      '      <button class="icon-btn" id="cardStroke">Cách viết</button>' +
      '      <button class="icon-btn" id="cardHide">' + (state.hidePy ? 'Hiện phiên âm' : 'Ẩn phiên âm') + '</button>' +
      '    </div>' +
      '  </div>' +
      '  <div class="fc-detail">' +
      wordChips(w) +
      '    <div class="fc-meaning"><small>Nghĩa</small>' + escapeHtml(w.m || w.en || '—') + '</div>' +
      (w.ex ?
        '    <div class="fc-ex"><div class="ex-cn">' + escapeHtml(w.ex) + '</div>' +
        '    <div class="ex-vi">' + escapeHtml(w.ev || '') + '</div>' +
        '    <div style="margin-top:8px">' + speakBtn(w.ex, 'Nghe câu', 0.9) + '</div></div>'
        : '') +
      '    <div class="small muted">' + (st.ok || st.bad ? 'Đã trả lời đúng ' + st.ok + ' lần · sai ' + st.bad + ' lần' : 'Chưa luyện từ này') +
      (best ? ' · điểm viết cao nhất ' + best : '') + '</div>' +
      '    <div class="self-check">' +
      '      <button class="btn btn-ghost" id="cardNo">Chưa thuộc</button>' +
      '      <button class="btn btn-red" id="cardYes">Đã thuộc</button>' +
      '    </div>' +
      '  </div>' +
      '</div>';

    $('#cardHide').addEventListener('click', () => { state.hidePy = !state.hidePy; renderStage(); });
    $('#cardStroke').addEventListener('click', () => TD.openStrokeModal(w.w, w.p));
    $('#cardYes').addEventListener('click', () => { Progress.answer(w.w, true); toast('Ghi nhận: đã thuộc', 10); nextWord(); });
    $('#cardNo').addEventListener('click', () => { Progress.answer(w.w, false); nextWord(); });
  }

  /* ---------------------------- listen ---------------------------- */
  function renderListen(stage, w) {
    const gen = state.gen;
    const useChars = Math.random() < 0.45;
    const pool = state.words.filter((x) => x.w !== w.w);
    const sameLen = pool.filter((x) => x.w.length === w.w.length);
    const distract = shuffle(sameLen.length >= 3 ? sameLen : pool).slice(0, 3);
    const options = shuffle([w].concat(distract)).map((o) => ({
      o,
      text: useChars ? o.w : (o.m || o.en || o.w),
      sub: useChars ? '' : (o.p || '')
    }));

    stage.innerHTML =
      '<div class="quiz">' +
      '  <div class="quiz-prompt">' +
      '    <div class="quiz-big" style="font-size:2.6rem;letter-spacing:.08em">' + (useChars ? '？' : '？') + '</div>' +
      '    <div style="margin-top:6px">' + speakBtn(w.w, 'Nghe từ', 1) + ' ' + speakBtn(w.w, 'Nghe chậm', 0.6) + '</div>' +
      '    <div class="quiz-sub">' + (useChars ? 'Nghe và chọn đúng chữ Hán' : 'Nghe và chọn đúng nghĩa') + '</div>' +
      '    <div class="small muted" id="listenHint" style="margin-top:8px"></div>' +
      '  </div>' +
      '  <div class="quiz-options">' +
      options.map((op, i) =>
        '<button class="quiz-opt" data-ok="' + (op.o.w === w.w ? '1' : '0') + '">' +
        '<span class="k">' + 'ABCD'[i] + '</span>' +
        '<span>' + (useChars ? '<span class="han-clean" style="font-size:1.2rem">' + escapeHtml(op.text) + '</span>' : escapeHtml(op.text)) + '</span>' +
        '</button>').join('') +
      '  </div>' +
      '  <div class="quiz-feedback" id="fb"></div>' +
      '  <div class="quiz-next" id="qn"></div>' +
      '</div>';

    if (!Speech.hasVoice()) {
      $('#listenHint').textContent = 'Đang ngoại tuyến. Kết nối mạng rồi bấm “Nghe từ” để phát âm.';
    }
    const btns = $$('.quiz-opt', stage);
    let answered = false;
    btns.forEach((b) => b.addEventListener('click', () => {
      if (answered) return;
      answered = true;
      const ok = b.dataset.ok === '1';
      btns.forEach((x) => {
        x.disabled = true;
        if (x.dataset.ok === '1') x.classList.add('correct');
      });
      if (!ok) b.classList.add('wrong');
      const fb = $('#fb');
      fb.className = 'quiz-feedback ' + (ok ? 'good' : 'bad');
      fb.innerHTML = (ok ? 'Đúng rồi! ' : 'Chưa đúng. ') + '<span class="han-clean">' + escapeHtml(w.w) + '</span> · ' + escapeHtml(w.p) + ' — ' + escapeHtml(w.m || w.en || '');
      Progress.answer(w.w, ok);
      $('#qn').innerHTML = '<button class="btn btn-red" id="nextQ">Từ tiếp theo →</button>';
      $('#nextQ').addEventListener('click', nextWord);
      if (ok) setTimeout(() => { if (gen === state.gen) Speech.speak(w.w, { rate: 1 }); }, 350);
    }));
    setTimeout(() => {
      if (gen !== state.gen) return;
      Speech.speak(w.w, {
        rate: 0.95,
        onend: (ok) => {
          if (ok || gen !== state.gen) return;
          const hint = $('#listenHint');
          if (hint && !hint.textContent) hint.textContent = 'Bấm “Nghe từ” để nghe lại phát âm.';
        }
      });
    }, 250);
  }

  /* ---------------------------- speak ---------------------------- */
  function renderSpeak(stage, w) {
    const gen = state.gen;
    stage.innerHTML =
      '<div class="speak-panel">' +
      '  <div class="speak-char">' + escapeHtml(w.w) + '</div>' +
      '  <div class="speak-py">' + escapeHtml(w.p) + '</div>' +
      '  <div class="small muted" style="margin-top:4px">' + escapeHtml(w.m || w.en || '') + '</div>' +
      '  <div class="mic-wrap">' +
      '    <button class="mic-btn" id="mic" aria-label="Bắt đầu nói">' +
      '      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8"/></svg>' +
      '    </button>' +
      '    <div class="speak-hint" id="speakHint">Bấm micro rồi đọc to từ này. Cho phép trình duyệt dùng micro khi được hỏi.</div>' +
      '    <div class="transcript" id="transcript"></div>' +
      '    <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">' +
      speakBtn(w.w, 'Nghe mẫu', 0.9) + speakBtn(w.w, 'Nghe chậm', 0.6) +
      '    </div>' +
      '  </div>' +
      '</div>';

    const mic = $('#mic');
    const hint = $('#speakHint');
    const tr = $('#transcript');
    let listening = false;
    let selfMode = false;

    mic.addEventListener('click', async () => {
      if (listening) return;
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) {
        selfMode = true;
        hint.innerHTML = 'Trình duyệt này không hỗ trợ nhận diện giọng nói (hãy thử Chrome/Edge). Bạn vẫn có thể tự đánh giá:';
        tr.innerHTML = '<div style="display:flex;gap:8px;justify-content:center;margin-top:6px">' +
          '<button class="btn btn-ghost btn-sm" id="selfNo">Chưa đúng</button>' +
          '<button class="btn btn-red btn-sm" id="selfYes">Tôi đọc đúng</button></div>';
        $('#selfYes').onclick = () => { Progress.answer(w.w, true); toast('Ghi nhận', 10); nextWord(); };
        $('#selfNo').onclick = () => { Progress.answer(w.w, false); nextWord(); };
        return;
      }
      if (!window.isSecureContext && location.protocol === 'file:') {
        hint.textContent = 'Micro cần chạy trên https:// hoặc localhost. Khi trang được đưa lên mạng, phần này sẽ hoạt động.';
        return;
      }
      listening = true;
      mic.classList.add('listening');
      hint.textContent = 'Thầy đang nghe… đọc to lên nào.';
      tr.innerHTML = '';
      const res = await recognize({ lang: 'zh-CN' });
      if (gen !== state.gen) return;
      listening = false;
      mic.classList.remove('listening');
      if (!res.supported) { hint.textContent = 'Trình duyệt không hỗ trợ nhận diện giọng nói.'; return; }
      if (res.error === 'not-allowed' || res.error === 'service-not-allowed') {
        hint.textContent = 'Bạn chưa cho phép dùng micro. Hãy bật quyền micro cho trang này rồi thử lại.';
        return;
      }
      if (!res.transcript) {
        hint.textContent = 'Thầy chưa nghe rõ. Thử lại gần micro hơn nhé.';
        return;
      }
      const score = Math.round(similarity(res.transcript, w.w) * 100);
      const ok = score >= 70;
      Progress.answer(w.w, ok);
      tr.innerHTML =
        '<div>Thầy nghe được: <b class="han-clean">' + escapeHtml(res.transcript) + '</b></div>' +
        '<div class="speak-score ' + (ok ? '' : 'low') + '">' + score + '<small style="font-size:.8rem">/100</small></div>' +
        '<div class="small muted">' + (ok ? 'Phát âm tốt, thầy gật đầu.' : 'Chưa khớp lắm — nghe mẫu rồi đọc chậm lại.') + '</div>' +
        '<div style="display:flex;gap:8px;justify-content:center;margin-top:10px">' +
        '<button class="btn btn-ghost btn-sm" id="retrySpeak">Thử lại</button>' +
        '<button class="btn btn-red btn-sm" id="nextSpeak">Từ tiếp →</button></div>';
      $('#retrySpeak').onclick = () => mic.click();
      $('#nextSpeak').onclick = nextWord;
      if (ok) Speech.speak(w.w, { rate: 1 });
    });
  }

  /* ---------------------------- read ---------------------------- */
  function renderRead(stage, w) {
    const pool = state.words.filter((x) => x.w !== w.w && x.p && x.p !== w.p);
    const distract = shuffle(pool).slice(0, 3);
    const options = shuffle([w].concat(distract));
    stage.innerHTML =
      '<div class="quiz">' +
      '  <div class="quiz-prompt">' +
      '    <div class="quiz-big han-clean">' + escapeHtml(w.w) + '</div>' +
      '    <div class="quiz-sub">Chữ này đọc là gì?</div>' +
      '  </div>' +
      '  <div class="quiz-options">' +
      options.map((op, i) =>
        '<button class="quiz-opt" data-ok="' + (op.w === w.w ? '1' : '0') + '">' +
        '<span class="k">' + 'ABCD'[i] + '</span><span style="font-size:1.02rem">' + escapeHtml(op.p) + '</span></button>').join('') +
      '  </div>' +
      '  <div class="quiz-feedback" id="fb"></div>' +
      '  <div id="readExtra"></div>' +
      '</div>';

    let answered = false;
    $$('.quiz-opt', stage).forEach((b) => b.addEventListener('click', () => {
      if (answered) return;
      answered = true;
      const ok = b.dataset.ok === '1';
      $$('.quiz-opt', stage).forEach((x) => { x.disabled = true; if (x.dataset.ok === '1') x.classList.add('correct'); });
      if (!ok) b.classList.add('wrong');
      const fb = $('#fb');
      fb.className = 'quiz-feedback ' + (ok ? 'good' : 'bad');
      fb.textContent = ok ? 'Chuẩn! ' + w.p + ' — ' + (w.m || w.en) : 'Chưa đúng. Đáp án: ' + w.p + ' — ' + (w.m || w.en);
      Progress.answer(w.w, ok);
      $('#readExtra').innerHTML =
        '<div class="read-sentence">' +
        (w.ex ? '<div class="cn">' + escapeHtml(w.ex) + '</div><div class="vi">' + escapeHtml(w.ev || '') + '</div>' : '<div class="cn">' + escapeHtml(w.w) + '</div><div class="vi">' + escapeHtml(w.m || '') + '</div>') +
        '</div>' +
        '<div class="read-tools">' + speakBtn(w.ex || w.w, 'Nghe câu', 0.9) + speakBtn(w.ex || w.w, 'Đọc chậm', 0.6) +
        '<button class="btn btn-red btn-sm" id="nextRead">Từ tiếp →</button></div>';
      $('#nextRead').addEventListener('click', nextWord);
    }));
  }

  /* ---------------------------- write ---------------------------- */
  function renderWrite(stage, w) {
    const chars = Array.from(w.w);
    let activeChar = chars[0];
    stage.innerHTML =
      '<div class="write-wrap">' +
      '  <div>' +
      '    <div class="inkpad" id="writePad"></div>' +
      '    <div class="ink-tools">' +
      '      <button class="icon-btn" id="wUndo">Lùi nét</button>' +
      '      <button class="icon-btn" id="wClear">Xoá hết</button>' +
      '      <button class="icon-btn" id="wRef">Ẩn chữ mẫu</button>' +
      '    </div>' +
      '  </div>' +
      '  <div class="write-side">' +
      '    <div class="write-target">' +
      '      <div class="wt-char han" id="wtChar">' + escapeHtml(activeChar) + '</div>' +
      (chars.length > 1 ?
        '<div class="char-chips" id="charChips">' +
        chars.map((c, i) => '<button class="char-chip' + (i === 0 ? ' active' : '') + '" data-i="' + i + '">' + escapeHtml(c) + '</button>').join('') +
        '</div>' : '') +
      '      <div class="wt-py">' + escapeHtml(w.p) + '</div>' +
      '      <div class="wt-mean">' + escapeHtml(w.m || w.en || '') + (chars.length > 1 ? ' · luyện từng chữ' : '') + '</div>' +
      '      <div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">' +
      '        <button class="icon-btn" id="wStroke">Cách viết</button>' + speakBtn(w.w, 'Nghe', 0.9) +
      '      </div>' +
      '    </div>' +
      '    <button class="btn btn-red" id="wGrade">Nộp bài cho Thầy</button>' +
      '    <div id="wResult"></div>' +
      '    <ul class="write-tips">' +
      '      <li>Viết trong ô, chữ chiếm khoảng 70% ô.</li>' +
      '      <li>Bật chữ mẫu mờ để tô theo khi mới học.</li>' +
      '      <li>Đi chậm, dứt khoát — nét sẽ mượt hơn.</li>' +
      '    </ul>' +
      '  </div>' +
      '</div>';

    const pad = new TD.InkPad($('#writePad'), { reference: activeChar, showRef: true });
    state.pad = pad;
    let refOn = true;
    $('#wUndo').onclick = () => pad.undo();
    $('#wClear').onclick = () => pad.clear();
    $('#wRef').onclick = (e) => {
      refOn = !refOn;
      pad.setShowRef(refOn);
      e.target.textContent = refOn ? 'Ẩn chữ mẫu' : 'Hiện chữ mẫu';
    };
    $('#wStroke').onclick = () => TD.openStrokeModal(activeChar, w.p);

    const chips = $$('#charChips .char-chip');
    chips.forEach((b) => b.addEventListener('click', () => {
      activeChar = chars[+b.dataset.i];
      chips.forEach((x) => x.classList.toggle('active', x === b));
      $('#wtChar').textContent = activeChar;
      pad.setReference(activeChar);
      pad.clear();
      const r = $('#wResult');
      if (r) r.innerHTML = '';
    }));

    $('#wGrade').onclick = () => {
      if (pad.isEmpty()) { toast('Trò chưa viết nét nào.'); return; }
      const res = TD.grade(pad.strokes, activeChar);
      const t = TD.review(res, { strokes: pad.strokeCount() });
      const ok = res.score >= 60;
      Progress.answer(w.w, ok, { best: res.score });
      Progress.recordGame(activeChar, res.score);
      const best = Progress.get().best[activeChar];
      const box = $('#wResult');
      box.innerHTML =
        '<div class="grade-result">' +
        '  <div class="result-top">' +
        '    <div class="seal-stamp stamped">' + t.seal + '</div>' +
        '    <div><div class="score-big">' + res.score + '<small>/100</small></div>' +
        '    <div class="result-rank">' + escapeHtml(t.grade) + ' · chữ ' + escapeHtml(activeChar) + ' · kỷ lục ' + best + '</div></div>' +
        '  </div>' +
        '  <div class="score-bars">' +
        bar('Khớp nét', res.fit) + bar('Bố cục', res.layout) + bar('Độ mượt', res.smooth) +
        '  </div>' +
        '  <div class="teacher-note"><b>Thầy phê:</b> ' + escapeHtml(t.quip) +
        '  <div class="muted small" style="margin-top:6px">' + escapeHtml(t.tip) + '</div></div>' +
        '  <div style="display:flex;gap:8px">' +
        '    <button class="btn btn-ghost btn-sm" id="wAgain">Viết lại</button>' +
        '    <button class="btn btn-red btn-sm" id="wNext" style="flex:1">Từ tiếp →</button>' +
        '  </div>' +
        '</div>';
      box.querySelectorAll('.score-bar i').forEach((el) => {
        const v = el.dataset.w;
        requestAnimationFrame(() => { el.style.width = v + '%'; });
      });
      $('#wAgain').onclick = () => { pad.clear(); box.innerHTML = ''; };
      $('#wNext').onclick = nextWord;
    };

    function bar(label, v) {
      return '<div class="score-bar-row"><span>' + label + '</span><div class="score-bar"><i data-w="' + v + '"></i></div><span>' + v + '</span></div>';
    }
  }

  /* ------------------------------------------------------------------ */
  /* navigation + events                                                 */
  /* ------------------------------------------------------------------ */
  function nextWord() {
    if (state.index < state.view.length - 1) setWord(state.index + 1);
    else {
      const n = state.level < 6 ? state.level + 1 : 1;
      toast('Hết cấp ' + state.level + ' — chuyển sang HSK ' + n);
      location.href = 'learn.html?level=' + n;
    }
  }

  function init() {
    const params = new URLSearchParams(location.search);
    const level = clamp(parseInt(params.get('level') || '1', 10) || 1, 1, 6);
    const skill = params.get('skill');
    if (['card', 'listen', 'speak', 'read', 'write'].includes(skill)) state.mode = skill;
    const focus = params.get('w') || '';

    $$('#modeTabs .mode-tab').forEach((b) => {
      b.classList.toggle('active', b.dataset.mode === state.mode);
      b.addEventListener('click', () => {
        if (state.mode === b.dataset.mode) return;
        state.mode = b.dataset.mode;
        $$('#modeTabs .mode-tab').forEach((x) => x.classList.toggle('active', x === b));
        renderStage();
      });
    });

    $('#levelPills').addEventListener('click', (e) => {
      const b = e.target.closest('.level-pill');
      if (!b) return;
      loadLevel(+b.dataset.level);
      history.replaceState(null, '', 'learn.html?level=' + b.dataset.level + (state.mode !== 'card' ? '&skill=' + state.mode : ''));
    });

    let searchTimer;
    $('#search').addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      const v = e.target.value;
      searchTimer = setTimeout(() => {
        state.query = v;
        applyFilters();
        state.index = 0;
        renderList();
        renderStage();
        updateHeader();
      }, 160);
    });

    $('#filters').addEventListener('click', (e) => {
      const b = e.target.closest('.filter-chip');
      if (!b) return;
      $$('#filters .filter-chip').forEach((x) => x.classList.toggle('active', x === b));
      state.filter = b.dataset.f;
      applyFilters();
      state.index = 0;
      renderList();
      renderStage();
      updateHeader();
    });

    $('#wordlist').addEventListener('click', (e) => {
      const more = e.target.closest('#moreBtn');
      if (more) { state.chunk += 60; renderList(); return; }
      const item = e.target.closest('.worditem');
      if (item) setWord(+item.dataset.i);
    });

    $('#prevWord').addEventListener('click', () => setWord(state.index - 1));
    $('#nextWord').addEventListener('click', nextWord);
    $('#randomWord').addEventListener('click', () => {
      if (!state.view.length) return;
      let i = state.index;
      while (i === state.index && state.view.length > 1) i = Math.floor(Math.random() * state.view.length);
      setWord(i);
    });

    document.addEventListener('keydown', (e) => {
      if (e.target.matches('input, textarea')) return;
      if (e.key === 'ArrowLeft') setWord(state.index - 1);
      if (e.key === 'ArrowRight') nextWord();
    });

    $('#railOpen').addEventListener('click', () => {
      $('#rail').classList.add('open');
      $('#railBackdrop').classList.add('open');
    });
    const closeRail = () => {
      $('#rail').classList.remove('open');
      $('#railBackdrop').classList.remove('open');
    };
    $('#railClose').addEventListener('click', closeRail);
    $('#railBackdrop').addEventListener('click', closeRail);

    document.addEventListener('progresschange', updatePills);
    document.addEventListener('xpchange', updatePills);

    loadLevel(level, focus);
    updatePills();
  }

  init();
})();
