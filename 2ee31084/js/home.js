/* home.js — level cards + live grading demo */
(function () {
  'use strict';
  const { $, Progress, LEVEL_META, escapeHtml, toast } = window.TD;

  const COUNTS = { 1: 150, 2: 147, 3: 298, 4: 598, 5: 1298, 6: 2500 };
  const TITLES = {
    1: 'Chào hỏi & con số',
    2: 'Sinh hoạt hằng ngày',
    3: 'Kể chuyện & cảm xúc',
    4: 'Xã hội & quan điểm',
    5: 'Báo chí & thành ngữ',
    6: 'Văn viết & chuyên sâu'
  };

  function renderLevels() {
    const grid = $('#levelGrid');
    if (!grid) return;
    let html = '';
    for (let n = 1; n <= 6; n++) {
      const meta = LEVEL_META[n];
      const sum = Progress.getLevelSummary(n);
      const total = sum && sum.total ? sum.total : COUNTS[n];
      const mastered = sum ? sum.mastered : 0;
      const pct = total ? Math.round((mastered / total) * 100) : 0;
      html += '<a class="level-card card" href="learn.html?level=' + n + '">' +
        '<div class="lv-top">' +
        '<div class="lv-num"><small>HSK</small>' + n + '</div>' +
        '<span class="pill">' + total + ' từ</span>' +
        '</div>' +
        '<h3>' + escapeHtml(TITLES[n]) + '</h3>' +
        '<p>' + escapeHtml(meta.desc) + '</p>' +
        '<div class="lv-bar"><i style="width:' + pct + '%"></i></div>' +
        '<div class="lv-foot"><span>Đã thuộc ' + mastered + '/' + total + '</span><span>Vào học →</span></div>' +
        '<div class="lv-han">' + meta.han + '</div>' +
        '</a>';
    }
    grid.innerHTML = html;
  }

  function initDemo() {
    const host = $('#demoPad');
    if (!host || !window.TD.InkPad) return;
    const pad = new window.TD.InkPad(host, { reference: '爱', showRef: true });
    const out = $('#demoResult');

    $('#demoClear').addEventListener('click', () => pad.clear());
    $('#demoUndo').addEventListener('click', () => pad.undo());
    $('#demoGrade').addEventListener('click', () => {
      if (pad.isEmpty()) {
        toast('Thầy chưa thấy nét nào cả, trò ạ.');
        return;
      }
      const res = window.TD.grade(pad.strokes, '爱');
      const t = window.TD.review(res);
      out.innerHTML =
        '<div class="result-top" style="gap:14px">' +
        '<div class="seal-stamp stamped" style="width:58px;height:58px;font-size:1.6rem">' + t.seal + '</div>' +
        '<div><div class="result-score" style="font-size:2.1rem">' + res.score + '<small> /100</small></div>' +
        '<div class="result-rank" style="color:var(--gold)">' + escapeHtml(t.grade) + '</div></div>' +
        '</div>' +
        '<div class="score-bars" style="margin-top:16px">' +
        bar('Khớp nét', res.fit) + bar('Bố cục', res.layout) + bar('Độ mượt', res.smooth) +
        '</div>' +
        '<div class="teacher-note" style="margin-top:14px"><b>Thầy phê:</b> ' + escapeHtml(t.quip) +
        '<div class="muted small" style="margin-top:6px">' + escapeHtml(t.tip) + '</div></div>' +
        '<a class="btn btn-ghost btn-sm" href="thaydo.html" style="margin-top:14px">Thi thật với Thầy →</a>';
      out.querySelectorAll('.score-bar i').forEach((el) => {
        const w = el.dataset.w;
        requestAnimationFrame(() => { el.style.width = w + '%'; });
      });
    });

    function bar(label, v) {
      return '<div class="score-bar-row"><span>' + label + '</span><div class="score-bar"><i data-w="' + v + '"></i></div><span>' + v + '</span></div>';
    }
  }

  function initRankPill() {
    const r = Progress.rank();
    const el = document.createElement('span');
    el.className = 'pill';
    el.style.marginLeft = '8px';
    el.textContent = r.name;
    const note = $('.hero-note');
    if (note) note.appendChild(el);
  }

  renderLevels();
  initDemo();
  if (Progress.get().xp > 0) initRankPill();

  window.addEventListener('resize', () => { /* pads resize themselves */ });
})();
