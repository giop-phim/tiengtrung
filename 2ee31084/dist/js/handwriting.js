/* ============================================================
   handwriting.js — ink pad, stroke capture, grading, teacher
   ============================================================ */
(function () {
  'use strict';
  const { clamp, pick, FONT_HAN, Progress } = window.TD;

  const charSpan = (ch) => Array.from(ch || '').length;
  function glyphFontSize(ch, box) {
    const n = Math.max(1, charSpan(ch));
    return box * (n === 1 ? 0.76 : Math.min(0.5, 0.9 / n));
  }

  /* ------------------------------------------------------------------
     InkPad: a 田字格 writing surface with brush-like ink
     ------------------------------------------------------------------ */
  class InkPad {
    constructor(host, opts) {
      this.host = host;
      this.opts = Object.assign({ reference: '', showRef: true, readOnly: false }, opts || {});
      this.strokes = [];
      this.current = null;
      this.pointerDown = false;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2.5);

      this.bg = document.createElement('canvas');
      this.fg = document.createElement('canvas');
      this.bg.className = 'ink-bg';
      this.fg.className = 'ink-fg';
      host.appendChild(this.bg);
      host.appendChild(this.fg);
      this.bg.style.touchAction = 'none';
      this.fg.style.touchAction = 'none';

      this._bind();
      this._observe();
      this.resize();
    }

    _observe() {
      if (window.ResizeObserver) {
        this.ro = new ResizeObserver(() => this.resize());
        this.ro.observe(this.host);
      } else {
        window.addEventListener('resize', () => this.resize());
      }
    }

    resize() {
      const rect = this.host.getBoundingClientRect();
      const size = Math.max(120, Math.round(rect.width));
      if (size === this.size && this.bg.width) return;
      this.size = size;
      for (const c of [this.bg, this.fg]) {
        c.width = Math.round(size * this.dpr);
        c.height = Math.round(size * this.dpr);
      }
      this.ctxBg = this.bg.getContext('2d');
      this.ctxFg = this.fg.getContext('2d');
      this.ctxBg.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.ctxFg.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this._drawGrid();
      this._drawReference();
      this._redrawInk();
    }

    setReference(ch) {
      this.opts.reference = ch || '';
      this._drawReference();
    }

    setShowRef(v) {
      this.opts.showRef = !!v;
      this._drawReference();
    }

    _drawGrid() {
      const c = this.ctxBg, s = this.size;
      c.clearRect(0, 0, s, s);
      c.save();
      c.strokeStyle = 'rgba(168,35,29,.30)';
      c.lineWidth = 1.2;
      c.strokeRect(2, 2, s - 4, s - 4);
      c.strokeStyle = 'rgba(168,35,29,.22)';
      c.lineWidth = 1;
      c.setLineDash([5, 6]);
      c.beginPath();
      c.moveTo(s / 2, 3); c.lineTo(s / 2, s - 3);
      c.moveTo(3, s / 2); c.lineTo(s - 3, s / 2);
      c.stroke();
      c.globalAlpha = 0.55;
      c.beginPath();
      c.moveTo(3, 3); c.lineTo(s - 3, s - 3);
      c.moveTo(s - 3, 3); c.lineTo(3, s - 3);
      c.stroke();
      c.restore();
    }

    _drawReference() {
      const c = this.ctxBg;
      if (!c) return;
      this._drawGrid();
      const ch = this.opts.reference;
      if (!ch || !this.opts.showRef) return;
      const s = this.size;
      const fs = glyphFontSize(ch, s);
      c.save();
      c.font = fs + 'px ' + FONT_HAN;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillStyle = 'rgba(32,28,23,.16)';
      const m = c.measureText(ch);
      const h = m.actualBoundingBoxAscent || fs * 0.72;
      const d = m.actualBoundingBoxDescent || fs * 0.14;
      c.fillText(ch, s / 2, s / 2 + (h - d) / 2 - fs * 0.02);
      c.restore();
    }

    _bind() {
      const el = this.host;
      const down = (e) => {
        if (this.opts.readOnly) return;
        if (e.button != null && e.button !== 0) return;
        try { el.setPointerCapture && el.setPointerCapture(e.pointerId); } catch (err) { /* synthetic events */ }
        e.preventDefault();
        this.pointerDown = true;
        const p = this._pt(e);
        this.current = { pts: [p] };
        this.strokes.push(this.current);
        this._drawLastSegment();
        if (this.onchange) this.onchange();
      };
      const move = (e) => {
        if (!this.pointerDown || !this.current) return;
        e.preventDefault();
        const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
        for (const ev of evs) {
          const p = this._pt(ev);
          const last = this.current.pts[this.current.pts.length - 1];
          const dist = Math.hypot(p.x - last.x, p.y - last.y);
          if (dist < 0.0025) continue;
          const dt = Math.max(1, p.t - last.t);
          const speed = (dist * this.size) / dt;
          const target = clamp(1.45 - speed * 0.55, 0.62, 1.42);
          p.w = last.w ? last.w + (target - last.w) * 0.35 : target;
          this.current.pts.push(p);
          this._drawLastSegment();
        }
        if (this.onchange) this.onchange();
      };
      const up = (e) => {
        if (!this.pointerDown) return;
        this.pointerDown = false;
        if (this.current && this.current.pts.length < 2) {
          const p = this.current.pts[0];
          p.w = p.w || 1;
          this.current.pts.push({ x: p.x + 0.0006, y: p.y + 0.0006, t: p.t + 12, w: p.w });
          this._redrawInk();
        }
        this.current = null;
        if (this.onchange) this.onchange();
      };
      el.addEventListener('pointerdown', down);
      el.addEventListener('pointermove', move, { passive: false });
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('pointerleave', (e) => { if (this.pointerDown) up(e); });
      el.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    _pt(e) {
      const r = this.host.getBoundingClientRect();
      return {
        x: clamp((e.clientX - r.left) / r.width, 0, 1),
        y: clamp((e.clientY - r.top) / r.height, 0, 1),
        t: e.timeStamp || performance.now(),
        w: 1
      };
    }

    _strokeStyle(ctx) {
      ctx.strokeStyle = '#191410';
      ctx.fillStyle = '#191410';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(25,20,16,.22)';
      ctx.shadowBlur = 1.4;
    }

    _drawLastSegment() {
      const c = this.ctxFg;
      const pts = this.current.pts;
      if (pts.length < 2) return;
      const a = pts[pts.length - 2], b = pts[pts.length - 1];
      const s = this.size;
      const base = s * 0.052;
      c.save();
      this._strokeStyle(c);
      c.lineWidth = base * ((a.w + b.w) / 2 || 1);
      c.beginPath();
      c.moveTo(a.x * s, a.y * s);
      const mx = ((a.x + b.x) / 2) * s, my = ((a.y + b.y) / 2) * s;
      c.quadraticCurveTo(a.x * s, a.y * s, mx, my);
      c.lineTo(b.x * s, b.y * s);
      c.stroke();
      c.restore();
    }

    _redrawInk() {
      const c = this.ctxFg, s = this.size;
      c.clearRect(0, 0, s, s);
      const base = s * 0.052;
      for (const st of this.strokes) {
        const pts = st.pts;
        if (pts.length === 1) {
          c.save();
          this._strokeStyle(c);
          c.beginPath();
          c.arc(pts[0].x * s, pts[0].y * s, base * 0.5, 0, Math.PI * 2);
          c.fill();
          c.restore();
          continue;
        }
        for (let i = 1; i < pts.length; i++) {
          const a = pts[i - 1], b = pts[i];
          c.save();
          this._strokeStyle(c);
          c.lineWidth = base * ((a.w + b.w) / 2 || 1);
          c.beginPath();
          c.moveTo(a.x * s, a.y * s);
          c.lineTo(b.x * s, b.y * s);
          c.stroke();
          c.restore();
        }
      }
    }

    undo() {
      if (!this.strokes.length) return;
      this.strokes.pop();
      this._redrawInk();
      if (this.onchange) this.onchange();
    }

    clear() {
      this.strokes = [];
      this._redrawInk();
      if (this.onchange) this.onchange();
    }

    isEmpty() {
      return !this.strokes.length;
    }

    strokeCount() {
      return this.strokes.filter((s) => s.pts.length > 1).length;
    }

    dispose() {
      if (this.ro) this.ro.disconnect();
    }
  }

  /* ------------------------------------------------------------------
     Grading — compare ink raster against a rendered glyph
     ------------------------------------------------------------------ */
  const N = 192;

  function rasterizeChar(ch) {
    const cv = document.createElement('canvas');
    cv.width = N; cv.height = N;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const fs = glyphFontSize(ch, N);
    ctx.font = fs + 'px ' + FONT_HAN;
    const m = ctx.measureText(ch);
    const asc = m.actualBoundingBoxAscent || fs * 0.72;
    const desc = m.actualBoundingBoxDescent || fs * 0.14;
    ctx.fillText(ch, N / 2, N / 2 + (asc - desc) / 2 - fs * 0.02);
    const data = ctx.getImageData(0, 0, N, N).data;
    const mask = new Uint8Array(N * N);
    let count = 0;
    for (let i = 0; i < N * N; i++) {
      if (data[i * 4 + 3] > 90) { mask[i] = 1; count++; }
    }
    return { mask, count };
  }

  function rasterizeInk(strokes) {
    const cv = document.createElement('canvas');
    cv.width = N; cv.height = N;
    const ctx = cv.getContext('2d');
    ctx.strokeStyle = '#000';
    ctx.fillStyle = '#000';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const base = N * 0.055;
    for (const st of strokes) {
      const pts = st.pts;
      if (pts.length === 1) {
        ctx.beginPath();
        ctx.arc(pts[0].x * N, pts[0].y * N, base * 0.5, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i];
        ctx.lineWidth = base * ((a.w + b.w) / 2 || 1);
        ctx.beginPath();
        ctx.moveTo(a.x * N, a.y * N);
        ctx.lineTo(b.x * N, b.y * N);
        ctx.stroke();
      }
    }
    const data = ctx.getImageData(0, 0, N, N).data;
    const mask = new Uint8Array(N * N);
    let count = 0;
    for (let i = 0; i < N * N; i++) {
      if (data[i * 4 + 3] > 40) { mask[i] = 1; count++; }
    }
    return { mask, count };
  }

  function dilate(mask, radius) {
    const out = new Uint8Array(N * N);
    const r = Math.max(1, Math.round(radius));
    const r2 = r * r;
    for (let y = 0; y < N; y++) {
      const row = y * N;
      for (let x = 0; x < N; x++) {
        if (!mask[row + x]) continue;
        const y0 = Math.max(0, y - r), y1 = Math.min(N - 1, y + r);
        const x0 = Math.max(0, x - r), x1 = Math.min(N - 1, x + r);
        for (let yy = y0; yy <= y1; yy++) {
          const dy = yy - y;
          const base = yy * N;
          for (let xx = x0; xx <= x1; xx++) {
            const dx = xx - x;
            if (dx * dx + dy * dy <= r2) out[base + xx] = 1;
          }
        }
      }
    }
    return out;
  }

  function overlap(a, b) {
    let hit = 0;
    for (let i = 0; i < a.length; i++) if (a[i] && b[i]) hit++;
    return hit;
  }

  function inkBounds(strokes) {
    let x0 = 1, y0 = 1, x1 = 0, y1 = 0, n = 0;
    for (const st of strokes) {
      for (const p of st.pts) {
        x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y);
        x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y);
        n++;
      }
    }
    if (!n) return null;
    return { x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 };
  }

  function smoothness(strokes) {
    let totalTurn = 0, totalLen = 0;
    for (const st of strokes) {
      const pts = st.pts;
      for (let i = 2; i < pts.length; i++) {
        const a = pts[i - 2], b = pts[i - 1], c = pts[i];
        const v1x = b.x - a.x, v1y = b.y - a.y;
        const v2x = c.x - b.x, v2y = c.y - b.y;
        const l1 = Math.hypot(v1x, v1y), l2 = Math.hypot(v2x, v2y);
        if (l1 < 1e-5 || l2 < 1e-5) continue;
        let dot = (v1x * v2x + v1y * v2y) / (l1 * l2);
        dot = clamp(dot, -1, 1);
        const ang = Math.acos(dot);
        totalTurn += ang * (l1 + l2);
        totalLen += l1 + l2;
      }
    }
    if (!totalLen) return 60;
    const avgTurn = totalTurn / totalLen; // radians per unit length
    const score = 100 - clamp((avgTurn - 0.02) * 90, 0, 62);
    return Math.round(score);
  }

  function grade(strokes, ch) {
    if (!strokes || !strokes.length) return { score: 0, empty: true };
    const ref = rasterizeChar(ch);
    const user = rasterizeInk(strokes);
    if (!user.count || !ref.count) return { score: 0, empty: true };

    const refDil = dilate(ref.mask, Math.round(N * 0.055));
    const userDil = dilate(user.mask, Math.round(N * 0.05));

    const precision = overlap(user.mask, refDil) / user.count; // ink inside the glyph
    const recall = overlap(ref.mask, userDil) / ref.count;      // glyph covered by ink
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    const bb = inkBounds(strokes);
    const size = Math.max(bb.w, bb.h);
    const sizeScore = clamp(100 - Math.abs(size - 0.7) * 240, 0, 100);
    const off = Math.hypot(bb.cx - 0.5, bb.cy - 0.5);
    const centerScore = clamp(100 - off * 260, 0, 100);
    const layout = Math.round(centerScore * 0.62 + sizeScore * 0.38);
    const smooth = smoothness(strokes);

    let score = 0.6 * (f1 * 100) + 0.22 * layout + 0.18 * smooth;

    // a mark far smaller than the grid is not a written character
    score *= 0.55 + 0.45 * clamp(size / 0.62, 0, 1);
    // missing strokes cannot be a good copy, however neat the rest looks
    score *= 0.55 + 0.45 * clamp((recall - 0.25) / 0.4, 0, 1);

    // too much ink for the character = scribble: subtract
    const inkRatio = user.count / ref.count;
    if (inkRatio > 2.1) score -= clamp((inkRatio - 2.1) * 16, 0, 40);
    score = clamp(Math.round(score), 0, 100);

    return {
      score,
      precision: Math.round(precision * 100),
      recall: Math.round(recall * 100),
      fit: Math.round(f1 * 100),
      layout, smooth,
      precisionRaw: precision,
      inkRatio: user.count / ref.count,
      bounds: bb,
      empty: false
    };
  }

  /* ------------------------------------------------------------------
     Teacher voice
     ------------------------------------------------------------------ */
  const BANDS = [
    {
      min: 96, seal: '神', grade: 'Thần bút',
      quips: [
        'Chữ này thầy đóng dấu son, treo lên vách học đường!',
        'Nét bút có thần, thầy không dám sửa một ly nào.',
        'Trò viết thế này, thầy... xin làm học trò của trò.'
      ]
    },
    {
      min: 88, seal: '优', grade: 'Thượng phẩm',
      quips: [
        'Đẹp đấy! Chỉ thiếu chút khí thế là thành bia đá rồi.',
        'Chữ này dán lên cổng làng cũng không ai cười.',
        'Thầy gật đầu ba cái. Cái thứ ba là vì vui.'
      ]
    },
    {
      min: 76, seal: '良', grade: 'Khá giỏi',
      quips: [
        'Khá lắm, thầy gật đầu. Viết thêm vài lượt là chuẩn.',
        'Nét còn hơi ngập ngừng, nhưng có tương lai đấy.',
        'Trò này mà thi Hương, thầy yên tâm phần nào.'
      ]
    },
    {
      min: 62, seal: '中', grade: 'Trung bình',
      quips: [
        'Tạm được. Thầy nhìn ra được chữ, thế là thầy mừng.',
        'Chữ chưa nét nhưng có cố gắng, thầy cho qua.',
        'Thầy đọc được — nhưng thầy phải nheo mắt.'
      ]
    },
    {
      min: 45, seal: '平', grade: 'Cần cố gắng',
      quips: [
        'Thầy phải nghiêng đầu mới đọc được. Nghiêng nữa thì gãy cổ.',
        'Chữ trò viết như rồng bị cảm — vẫn là rồng, nhưng hắt hơi.',
        'Thầy thấy nét, thầy chưa thấy chữ. Cố thêm nhé.'
      ]
    },
    {
      min: 25, seal: '差', grade: 'Yếu',
      quips: [
        'Chữ này thầy nhìn nửa ngày mới nhận ra. Trò viết hơi... tự do!',
        'Gà bới! Nhưng thầy chưa bỏ trò đâu, viết lại nào.',
        'Thầy đành lấy thước gõ nhẹ. Gõ xong rồi, viết lại.'
      ]
    },
    {
      min: 0, seal: '劣', grade: 'Rất yếu',
      quips: [
        'Thầy xin phép... ho một tiếng. Viết lại từ đầu nhé.',
        'Trang giấy này thầy giữ lại làm kỷ niệm. Viết lại đi trò.',
        'Mực thì có, chữ thì chưa. Thầy chờ trò.'
      ]
    }
  ];

  function review(result, ctx) {
    const band = BANDS.find((b) => result.score >= b.min) || BANDS[BANDS.length - 1];
    const quip = pick(band.quips);
    const tips = [];
    if (result.recall < 62) tips.push('Còn thiếu nét — bật "Nét mẫu" rồi tô theo cho quen tay.');
    if (result.precision < 62) tips.push('Mực lem ra ngoài nhiều — đi chậm lại và bám sát nét mẫu.');
    if (result.layout < 62) tips.push('Chữ lệch khỏi ô — viết to hơn và đặt đúng giữa ô.');
    if (result.smooth < 62) tips.push('Tay hơi run — thả lỏng cổ tay và kéo một hơi dứt khoát.');
    if (ctx && ctx.strokes != null && ctx.refStrokes && ctx.strokes < ctx.refStrokes * 0.7) {
      tips.push('Trò viết thiếu nét — bấm "Cách viết" để xem thứ tự nét.');
    }
    if (!tips.length) tips.push('Giữ đúng thứ tự nét và viết đều tay, chữ sẽ càng có thần.');
    return {
      seal: band.seal,
      grade: band.grade,
      quip,
      tip: tips[0],
      allTips: tips
    };
  }

  /* ------------------------------------------------------------------
     Stroke order (Hanzi Writer, optional CDN)
     ------------------------------------------------------------------ */
  let hwPromise = null;
  function loadHanziWriter() {
    if (window.HanziWriter) return Promise.resolve(true);
    if (hwPromise) return hwPromise;
    hwPromise = new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/hanzi-writer@3.5.0/dist/hanzi-writer.min.js';
      s.async = true;
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.head.appendChild(s);
      setTimeout(() => resolve(!!window.HanziWriter), 6000);
    });
    return hwPromise;
  }

  const strokeCache = {};
  async function strokeInfo(ch) {
    const ok = await loadHanziWriter();
    if (!ok || !window.HanziWriter || !window.HanziWriter.loadCharacterData) return null;
    if (strokeCache[ch]) return strokeCache[ch];
    try {
      const data = await window.HanziWriter.loadCharacterData(ch, {
        charDataLoader: (c, onComplete, onError) => {
          fetch('https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/' + encodeURIComponent(c) + '.json')
            .then((r) => { if (!r.ok) throw new Error('404'); return r.json(); })
            .then(onComplete)
            .catch(onError);
        }
      });
      strokeCache[ch] = data;
      return data;
    } catch (e) {
      return null;
    }
  }

  function openStrokeModal(ch, label) {
    let modal = document.getElementById('strokeModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'strokeModal';
      modal.className = 'modal-backdrop';
      modal.innerHTML =
        '<div class="modal">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px">' +
        '<div><h3>Cách viết chữ</h3><p id="strokeSub"></p></div>' +
        '<button class="btn btn-ghost btn-sm" data-close>Đóng</button>' +
        '</div>' +
        '<div id="strokeArea" style="margin-top:16px;display:grid;place-items:center"></div>' +
        '<div class="modal-actions"><button class="btn btn-ghost btn-sm" id="strokeReplay">Xem lại</button></div>' +
        '</div>';
      document.body.appendChild(modal);
      modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.hasAttribute('data-close')) modal.classList.remove('open');
      });
    }
    modal.querySelector('#strokeSub').textContent = (label || '') + ' · ' + ch;
    const area = modal.querySelector('#strokeArea');
    area.innerHTML = '<div class="muted small">Đang tải nét mẫu…</div>';
    modal.classList.add('open');

    const size = Math.min(280, window.innerWidth - 120);
    loadHanziWriter().then((ok) => {
      if (!ok) {
        area.innerHTML = '<div class="muted small" style="text-align:center">Không tải được nét mẫu (cần mạng). Hãy quan sát chữ mẫu và tự viết.</div>';
        return;
      }
      area.innerHTML = '<div id="hwbox" style="width:' + size + 'px;height:' + size + 'px"></div>';
      try {
        const writer = window.HanziWriter.create('hwbox', ch, {
          width: size, height: size, padding: 8,
          strokeColor: '#201c17',
          radicalColor: '#a8231d',
          outlineColor: 'rgba(168,35,29,.18)',
          highlightColor: '#c0392b',
          showOutline: true,
          strokeAnimationSpeed: 1.1,
          delayBetweenStrokes: 220,
          charDataLoader: (c, onComplete, onError) => {
            fetch('https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/' + encodeURIComponent(c) + '.json')
              .then((r) => { if (!r.ok) throw new Error('404'); return r.json(); })
              .then(onComplete)
              .catch(onError);
          }
        });
        writer.animateCharacter();
        const replay = modal.querySelector('#strokeReplay');
        replay.onclick = () => writer.animateCharacter();
      } catch (e) {
        area.innerHTML = '<div class="muted small">Không hiển thị được nét mẫu.</div>';
      }
    });
  }

  window.TD.InkPad = InkPad;
  window.TD.grade = grade;
  window.TD.review = review;
  window.TD.strokeInfo = strokeInfo;
  window.TD.openStrokeModal = openStrokeModal;
  window.TD.loadHanziWriter = loadHanziWriter;
})();
