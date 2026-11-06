/* ============================================================
   scene.js — Lớp học 3D tương tác của Thầy Đồ
   ============================================================ */
import * as THREE from '../vendor/three/three.module.js';
import { OrbitControls } from '../vendor/three/OrbitControls.js';

const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const isPortrait = () => viewAspect() < 0.85;

function viewSize() {
  const el = document.getElementById('stage3d');
  return {
    w: Math.max(1, (el && el.clientWidth) || window.innerWidth),
    h: Math.max(1, (el && el.clientHeight) || window.innerHeight)
  };
}
const viewAspect = () => {
  const s = viewSize();
  return s.w / s.h;
};

const HSK_COUNTS = { 1: 150, 2: 147, 3: 298, 4: 598, 5: 1298, 6: 2500 };
const LEVELS = {
  1: { han: '一', name: 'Nhập môn', desc: 'Chào hỏi, số đếm, gia đình, thời gian.', count: 150 },
  2: { han: '二', name: 'Sơ cấp', desc: 'Sinh hoạt hằng ngày, mua sắm, đi lại.', count: 147 },
  3: { han: '三', name: 'Trung cấp', desc: 'Kể chuyện, cảm xúc, học tập, công việc.', count: 298 },
  4: { han: '四', name: 'Trung cao cấp', desc: 'Thảo luận xã hội, diễn đạt quan điểm.', count: 598 },
  5: { han: '五', name: 'Cao cấp', desc: 'Báo chí, thành ngữ, sắc thái tinh tế.', count: 1298 },
  6: { han: '六', name: 'Thượng cấp', desc: 'Ngôn ngữ trang trọng, văn học, chuyên môn.', count: 2500 }
};
const SKILLS = [
  { key: 'listen', han: '听', py: 'tīng', name: 'Nghe', short: 'Nghe giọng đọc, chọn nghĩa hoặc chọn chữ.' },
  { key: 'speak', han: '说', py: 'shuō', name: 'Nói', short: 'Bật micro, đọc to, máy chấm phát âm.' },
  { key: 'read', han: '读', py: 'dú', name: 'Đọc', short: 'Phiên âm, nghĩa Việt, câu ví dụ.' },
  { key: 'write', han: '写', py: 'xiě', name: 'Viết', short: 'Viết trên ô 田字格, Thầy chấm điểm.' }
];

/* ---------------- panel content ---------------- */
function skillPanel() {
  return `
    <span class="panel-eyebrow">Bảng kỹ năng · 四技</span>
    <div class="panel-head"><span class="panel-han">藝</span><h2>Bốn kỹ năng<small>Nghe · Nói · Đọc · Viết</small></h2></div>
    <p class="panel-desc">Chọn một cấp HSK, rồi chọn kỹ năng muốn luyện. Mỗi cấp là một bộ từ riêng — không khóa thứ tự.</p>
    <div class="panel-levels" id="skillLevelChips">
      ${[1, 2, 3, 4, 5, 6].map((n) => `<button type="button" class="lv-chip${n === 1 ? ' is-on' : ''}" data-lv="${n}">HSK ${n}</button>`).join('')}
    </div>
    <p class="panel-note">Đang chọn <b id="skillLevelLabel">HSK 1</b> · bấm nút Học để vào đúng phần luyện.</p>
    <div class="skill-list">
      ${SKILLS.map((s) => `
        <div class="skill-row">
          <span class="skill-han">${s.han}</span>
          <span class="skill-meta"><b>${s.name} · ${s.py}</b><i>${s.short}</i></span>
          <a class="btn btn-red" data-skill="${s.key}" href="learn.html?level=1&amp;skill=${s.key}">Học</a>
        </div>`).join('')}
    </div>
    <div class="panel-actions">
      <a class="btn btn-ghost" href="thaydo.html">Thi chấm chữ cùng Thầy →</a>
    </div>`;
}

function levelPanel() {
  return `
    <span class="panel-eyebrow">Bảng gỗ · 六級</span>
    <div class="panel-head"><span class="panel-han">級</span><h2>HSK 1–6<small>Chọn đúng tầng của bạn</small></h2></div>
    <p class="panel-desc">Từ 150 từ đầu tiên đến 2.500 từ thượng cấp. Bấm vào tên cấp để mở bảng học, hoặc ô 写 để vào thẳng phần luyện viết.</p>
    <div class="level-list">
      ${[1, 2, 3, 4, 5, 6].map((n) => {
        const L = LEVELS[n];
        return `<div class="lv-row">
          <a class="lv-main" href="learn.html?level=${n}">
            <span class="lv-han">${L.han}</span>
            <span class="lv-meta"><b>HSK ${n} · ${L.name}</b><i>${L.count} từ · ${L.desc}</i></span>
          </a>
          <a class="lv-write" href="learn.html?level=${n}&amp;skill=write" title="Luyện viết HSK ${n}" aria-label="Luyện viết HSK ${n}">写</a>
        </div>`;
      }).join('')}
    </div>
    <p class="panel-note">Tổng cộng 4.991 từ, không trùng giữa các cấp. Tiến độ được lưu trên máy này.</p>`;
}

const TEACHER_LINES = [
  { han: '老师好！', py: 'lǎo shī hǎo!', vi: 'Chào thầy ạ!' },
  { han: '我是你的汉语老师。', py: 'wǒ shì nǐ de hàn yǔ lǎo shī.', vi: 'Thầy là giáo viên tiếng Trung của em.' },
  { han: '你叫什么名字？', py: 'nǐ jiào shén me míng zi?', vi: 'Em tên là gì?' },
  { han: '今天我们一起学习汉语。', py: 'jīn tiān wǒ men yì qǐ xué xí hàn yǔ.', vi: 'Hôm nay chúng ta cùng học tiếng Trung.' },
  { han: '请再说一遍。', py: 'qǐng zài shuō yí biàn.', vi: 'Em nói lại một lần nữa nhé.' },
  { han: '很好，继续努力！', py: 'hěn hǎo, jì xù nǔ lì!', vi: 'Giỏi lắm, cố gắng tiếp nhé!' },
  { han: '再见，明天见！', py: 'zài jiàn, míng tiān jiàn!', vi: 'Tạm biệt, mai gặp lại!' }
];
const TEACHER_QUESTIONS = [2, 3, 4, 6];

function teacherPanel() {
  return `
    <span class="panel-eyebrow">Thầy Đồ · 老師</span>
    <div class="panel-head"><span class="panel-han">師</span><h2>Thầy Đồ<small>Nói chuyện cùng thầy</small></h2></div>
    <p class="panel-desc">Thầy ngồi đây từ sáng. Chạm vào từng câu để nghe thầy nói tiếng Trung, rồi bấm micro trả lời. Thầy sẽ khen hoặc nhắc em nói lại.</p>

    <div class="teacher-lines">
      ${TEACHER_LINES.map((l, i) => `
        <button class="teacher-line" type="button" data-say="${l.han}" data-vi="${l.vi}" data-i="${i}">
          <span class="tl-play">听</span>
          <span class="tl-text">
            <b class="tl-han">${l.han}</b>
            <i class="tl-py">${l.py}</i>
            <em class="tl-vi">${l.vi}</em>
          </span>
        </button>`).join('')}
    </div>

    <div class="teacher-chat">
      <button class="btn btn-red" id="teacherAsk" type="button">Thầy hỏi em</button>
      <button class="btn btn-ghost" id="teacherMic" type="button">Trả lời bằng micro</button>
      <p class="teacher-status" id="teacherStatus">Bấm một câu để nghe thầy nói, hoặc để thầy hỏi trước.</p>
    </div>

    <div class="panel-stats">
      <div class="panel-stat"><b>4</b><span>kỹ năng</span></div>
      <div class="panel-stat"><b>6</b><span>cấp HSK</span></div>
      <div class="panel-stat"><b>5.000</b><span>từ vựng</span></div>
    </div>
    <div class="panel-actions">
      <a class="btn btn-red" href="thaydo.html">Vào lớp chấm chữ</a>
      <a class="btn btn-ghost" href="learn.html?level=1&amp;skill=write">Tập viết trước</a>
    </div>
    <p class="panel-note">Âm thanh phát trực tuyến bằng giọng đọc tiếng Trung. Nếu mạng chậm, bấm lại câu đó.</p>`;
}

function bindTeacherPanel() {
  const S = window.TD && window.TD.Speech;
  const status = $('#teacherStatus', panelBody);
  const lines = $$('.teacher-line', panelBody);
  let micBusy = false;

  const say = (text, el, vi, rate) => {
    lines.forEach((x) => x.classList.remove('is-playing'));
    if (el) el.classList.add('is-playing');
    if (status) {
      status.classList.remove('is-live');
      status.textContent = vi || '';
    }
    if (!S) {
      if (status) status.textContent = 'Trình duyệt chưa hỗ trợ phát âm.';
      return;
    }
    S.speak(text, {
      rate: rate || 0.9,
      onend: (ok) => {
        if (el) el.classList.remove('is-playing');
        if (!ok && status) status.textContent = 'Không phát được âm thanh — kiểm tra mạng rồi bấm lại.';
      }
    });
  };

  lines.forEach((b) => {
    b.addEventListener('click', () => say(b.dataset.say, b, b.dataset.vi));
  });

  const ask = $('#teacherAsk', panelBody);
  if (ask) {
    ask.addEventListener('click', () => {
      const q = TEACHER_LINES[TEACHER_QUESTIONS[Math.floor(Math.random() * TEACHER_QUESTIONS.length)]];
      say(q.han, null, q.vi);
      if (status) {
        status.classList.add('is-live');
        status.textContent = q.han + ' · ' + q.py + ' — ' + q.vi;
      }
    });
  }

  const mic = $('#teacherMic', panelBody);
  if (mic) {
    mic.addEventListener('click', async () => {
      if (micBusy) return;
      const TDx = window.TD;
      if (!TDx || !TDx.recognize) {
        if (status) status.textContent = 'Trình duyệt này chưa hỗ trợ micro.';
        return;
      }
      if (S) S.stop();
      micBusy = true;
      mic.disabled = true;
      if (status) {
        status.classList.add('is-live');
        status.textContent = 'Đang nghe em nói… Hãy đọc to bằng tiếng Trung.';
      }
      const res = await TDx.recognize({ lang: 'zh-CN', timeout: 9000 });
      micBusy = false;
      mic.disabled = false;
      if (!document.body.contains(status)) return;
      if (!res.supported) {
        status.textContent = 'Trình duyệt này chưa hỗ trợ micro. Em có thể bấm câu mẫu rồi đọc theo.';
        return;
      }
      if (!res.transcript) {
        status.textContent = 'Thầy chưa nghe rõ. Bấm micro và đọc chậm hơn nhé.';
        return;
      }
      status.textContent = 'Em vừa nói: ' + res.transcript;
      const reply = res.transcript.replace(/\s/g, '').length >= 2 ? TEACHER_LINES[5] : TEACHER_LINES[4];
      setTimeout(() => {
        if (!document.body.contains(status)) return;
        say(reply.han, null, reply.vi, 0.92);
      }, 320);
    });
  }
}

function deskPanel() {
  return `
    <span class="panel-eyebrow">Bàn viết · 書桌</span>
    <div class="panel-head"><span class="panel-han">寫</span><h2>Bàn viết<small>Nghiên mực đã sẵn</small></h2></div>
    <p class="panel-desc">Giấy ô 田字格 còn trắng. Viết một chữ bằng ngón tay hoặc chuột — Thầy chấm điểm, đóng dấu và phê một câu. Muốn xem thứ tự nét, mở lớp chấm chữ.</p>
    <div class="panel-actions">
      <a class="btn btn-red" href="thaydo.html">Thi chấm chữ ngay</a>
      <a class="btn btn-ghost" href="learn.html?level=1&amp;skill=write">Luyện viết HSK 1</a>
      <a class="btn btn-ghost" href="learn.html?skill=write">Luyện viết theo cấp</a>
    </div>
    <p class="panel-note">Mẹo của thầy: viết chậm, bám sát nét mờ, đặt chữ vào giữa ô.</p>`;
}

function starterPanel() {
  return `
    <span class="panel-eyebrow">Nhập môn · 初學</span>
    <div class="panel-head"><span class="panel-han">始</span><h2>Bắt đầu từ số 0<small>Chưa biết một chữ nào?</small></h2></div>
    <p class="panel-desc">Thanh điệu, phiên âm, 8 nét cơ bản, 20 bộ thủ và 20 câu giao tiếp đầu tiên — có phát âm mẫu. Học xong thì bước sang HSK 1.</p>
    <div class="panel-stats">
      <div class="panel-stat"><b>4</b><span>thanh điệu</span></div>
      <div class="panel-stat"><b>8</b><span>nét cơ bản</span></div>
      <div class="panel-stat"><b>20</b><span>câu đầu</span></div>
    </div>
    <div class="panel-actions">
      <a class="btn btn-gold" href="starter.html">Học nhập môn</a>
      <a class="btn btn-ghost" href="learn.html?level=1">Vào thẳng HSK 1</a>
    </div>`;
}

function shelfPanel() {
  return `
    <span class="panel-eyebrow">Tủ sách · 書櫃</span>
    <div class="panel-head"><span class="panel-han">書</span><h2>Tủ sách HSK<small>4.991 từ, đủ sáu cấp</small></h2></div>
    <p class="panel-desc">Mỗi cấp là một kệ riêng. Chọn nhanh một cấp để mở bảng học, hoặc luyện ngay kỹ năng bạn đang cần.</p>
    <div class="shelf-links">
      ${[1, 2, 3, 4, 5, 6].map((n) => `<a href="learn.html?level=${n}">HSK ${n}</a>`).join('')}
    </div>
    <div class="panel-actions">
      <a class="btn btn-red" href="learn.html">Mở bảng học</a>
      <div class="panel-actions-row">
        <a class="btn btn-ghost" href="learn.html?skill=listen">Luyện nghe</a>
        <a class="btn btn-ghost" href="learn.html?skill=speak">Luyện nói</a>
      </div>
    </div>`;
}

const POIS = {
  library: {
    han: '图书馆', py: 'tú shū guǎn', vi: 'Thư viện', level: 3,
    desc: 'Kệ gỗ cao ba tầng, sách HSK xếp theo cấp. Nơi yên nhất trong trường để đọc chữ và nghe audio.'
  },
  canteen: {
    han: '食堂', py: 'shí táng', vi: 'Nhà ăn', level: 1,
    desc: 'Sáng sớm có cháo, trưa có cơm. Bảng thực đơn viết bằng chữ Hán để học luôn tên món ăn.'
  },
  playground: {
    han: '游乐场', py: 'yóu lè chǎng', vi: 'Khu vui chơi', level: 2,
    desc: 'Xích đu, cầu trượt, bập bênh và sân cát. Chơi một vòng rồi quay lại học tiếp.'
  },
  lake: {
    han: '荷花湖', py: 'hé huā hú', vi: 'Hồ sen', level: 4,
    desc: 'Sen nở tháng sáu, cầu đá bắc qua. Ngồi ở chòi nghỉ có thể nghe thầy kể chuyện chữ nghĩa.'
  },
  gate: {
    han: '校门', py: 'xiào mén', vi: 'Cổng trường', level: 1,
    desc: 'Cổng tam quan sơn son, trên treo biển vàng đề chữ “Trường”. Hai bên là đôi sư tử đá, hai tấm băng rôn Tư Tiên Học Viện và Thiên Hạ Đệ Nhất. Bước qua cổng là vào khuôn viên của Thầy Đồ.'
  },
  pond: {
    han: '锦鲤池', py: 'jǐn lǐ chí', vi: 'Hồ cá koi', level: 2,
    desc: 'Hồ nhỏ trước cổng có cá koi lượn quanh lá sen. Cây cầu đá bắc ngang là chỗ đứng ngắm cảnh và học từ mới về nước, cá, hoa sen.'
  }
};

function poiPanel(key) {
  const p = POIS[key];
  return `
    <span class="panel-eyebrow">${p.vi} · 校園</span>
    <div class="panel-head"><span class="panel-han">${p.han.charAt(0)}</span><h2>${p.vi}<small>${p.han} · ${p.py}</small></h2></div>
    <p class="panel-desc">${p.desc}</p>
    <div class="poi-word">
      <b>${p.han}</b>
      <span>${p.py}</span>
      <i>${p.vi}</i>
    </div>
    <div class="panel-actions">
      <a class="btn btn-red" href="learn.html?level=${p.level}">Học HSK ${p.level}</a>
      <a class="btn btn-ghost" href="learn.html?level=${p.level}&amp;skill=listen">Nghe từ mới</a>
      <a class="btn btn-ghost" href="learn.html?level=${p.level}&amp;skill=write">Viết chữ</a>
    </div>
    <p class="panel-note">Đi dạo quanh trường rồi chạm vào bảng tên để mở lại chỗ này.</p>`;
}

const PANELS = {
  teacher: teacherPanel,
  desk: deskPanel,
  levels: levelPanel,
  skills: skillPanel,
  starter: starterPanel,
  shelf: shelfPanel,
  library: () => poiPanel('library'),
  canteen: () => poiPanel('canteen'),
  playground: () => poiPanel('playground'),
  lake: () => poiPanel('lake'),
  gate: () => poiPanel('gate'),
  gateOutside: () => poiPanel('gate'),
  pond: () => poiPanel('pond')
};

const HOTSPOT_META = {
  teacher: { label: 'Thầy Đồ', hint: 'chấm chữ' },
  desk: { label: 'Bàn viết', hint: 'thi chấm chữ' },
  levels: { label: 'HSK 1–6', hint: 'chọn cấp' },
  skills: { label: '4 kỹ năng', hint: 'nghe nói đọc viết' },
  starter: { label: 'Nhập môn', hint: 'từ số 0' },
  shelf: { label: 'Tủ sách', hint: '5.000 từ' }
};

const FOCUS = {
  teacher: { cam: [0, 2.34, 4.35], target: [0, 1.46, -2.2] },
  desk: { cam: [0, 1.75, 3.4], target: [0, 1.02, 1.2] },
  levels: { cam: [-0.7, 1.95, 3.7], target: [-2.4, 1.3, 0.72] },
  skills: { cam: [0.7, 1.95, 3.7], target: [2.4, 1.3, 0.72] },
  starter: { cam: [1.15, 2.15, -0.35], target: [2.45, 2.75, -5.05] },
  shelf: { cam: [1.7, 1.95, 0.25], target: [4.15, 1.55, -4.85] }
};

/* ---------------- runtime state ---------------- */
let renderer, scene, camera, controls, clock;
let dprCap = 1.8;
let dprNow = 1.8;
const perf = { acc: 0, frames: 0, last: 0 };
let camTween = null;
let hoverBox = null;
let activeHotspot = null;
let labelsOn = true;
let hoveredId = null;
let downInfo = null;
let lastHoverCheck = 0;

const pickables = [];
const pickableById = {};
const anchors = {};
const labelEls = {};
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const tmpVec = new THREE.Vector3();

const animated = { teacher: null, head: null, lanterns: [], lamp: null, dust: null, swings: [], seesaws: [], flags: [], koi: [], petals: [] };
const signSprites = [];
let MAX_ANISO = 8;

const walk = {
  on: false,
  keys: new Set(),
  target: null,
  player: null,
  parts: null,
  phase: 0,
  moving: false,
  near: null,
  speed: 0,
  baseY: 0,
  boxes: [],
  circles: [],
  points: [],
  stick: { active: false, x: 0, y: 0, id: null },
  promptEl: null,
  btn: null,
  activity: null,
  builds: []
};
const SPAWN = { x: 0, z: 42.6, ry: Math.PI };
const CLASSROOM = { x0: -5.12, x1: 5.12, z0: -4.85, z1: 9.0 };
const YARD = { x0: -23.2, x1: 23.2, z0: 9.0, z1: 35.4 };
const APPROACH = { x0: -17.6, x1: 17.6, z0: 34.8, z1: 47.0 };
const CAMPUS = {
  lake: { x: -13, z: 26, rx: 5.4, rz: 3.8 },
  bridge: { x: -13, z0: 21.8, z1: 30.2, half: 0.95 },
  pond: { x: 11.7, z: 42.3, rx: 3.5, rz: 2.05 },
  pondBridge: { z: 42.3, x0: 7.9, x1: 15.5, half: 0.78 },
  gate: { z: 35.1, half: 2.35 }
};
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const UP = new THREE.Vector3(0, 1, 0);
const walkDir = new THREE.Vector3();
const walkFwd = new THREE.Vector3();
const walkRight = new THREE.Vector3();
const walkNext = new THREE.Vector3();
const followDelta = new THREE.Vector3();
const followFocus = new THREE.Vector3();

const remote = { players: new Map(), lastSeen: new Map(), online: 0, offline: false, poll: 0, polling: false, retryAt: 0 };
const self = { id: '', name: '', color: 0, walking: false };

/* ---------------- utilities ---------------- */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) {
    return false;
  }
}

function ensureFonts() {
  if (!document.fonts || !document.fonts.load) return Promise.resolve();
  const jobs = ['700 100px "Ma Shan Zheng"', '600 70px "Noto Serif SC"', '700 40px "Be Vietnam Pro"'];
  return Promise.race([
    Promise.all(jobs.map((f) => document.fonts.load(f).catch(() => null))),
    delay(2600)
  ]);
}

function drawCanvas(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  return c;
}

function texFrom(canvas, opts) {
  const o = opts || {};
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = MAX_ANISO;
  if (o.clamp) {
    t.wrapS = THREE.ClampToEdgeWrapping;
    t.wrapT = THREE.ClampToEdgeWrapping;
  } else {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    const r = o.repeat || [1, 1];
    t.repeat.set(r[0], r[1]);
  }
  return t;
}

function loadTexture(url, timeout) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeout || 5000);
    new THREE.TextureLoader().load(url, (t) => {
      clearTimeout(timer);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = MAX_ANISO;
      resolve(t);
    }, undefined, () => {
      clearTimeout(timer);
      resolve(null);
    });
  });
}

/* ---------------- procedurally drawn textures ---------------- */
function woodCanvas(seed, base, plankCount) {
  return drawCanvas(512, 512, (ctx, w, h) => {
    const rand = rng(seed);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, base || '#6d4728');
    g.addColorStop(0.55, '#5d3a20');
    g.addColorStop(1, '#4a2d18');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 170; i++) {
      const y = rand() * h;
      ctx.strokeStyle = `rgba(34,18,8,${0.04 + rand() * 0.12})`;
      ctx.lineWidth = 0.5 + rand() * 1.6;
      ctx.beginPath();
      ctx.moveTo(0, y);
      const amp = 2 + rand() * 6;
      for (let x = 0; x <= w; x += w / 10) {
        ctx.lineTo(x, y + Math.sin((x / w) * Math.PI * (1 + rand() * 2) + rand() * 8) * amp);
      }
      ctx.stroke();
    }
    for (let i = 0; i < 6; i++) {
      const x = rand() * w;
      const y = rand() * h;
      ctx.strokeStyle = 'rgba(28,14,6,.28)';
      ctx.lineWidth = 1;
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.ellipse(x, y, 8 + k * 5, 3 + k * 2, rand() * 3, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    if (plankCount) {
      for (let i = 1; i < plankCount; i++) {
        const y = (h * i) / plankCount;
        ctx.strokeStyle = 'rgba(22,11,5,.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,228,180,.06)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, y + 2);
        ctx.lineTo(w, y + 2);
        ctx.stroke();
      }
    }
  });
}

function plasterCanvas() {
  return drawCanvas(512, 512, (ctx, w, h) => {
    const rand = rng(31);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#d8c19c');
    g.addColorStop(0.55, '#cbb08a');
    g.addColorStop(1, '#b99b74');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      const r = 2 + rand() * 22;
      ctx.fillStyle = `rgba(${120 + rand() * 40},${92 + rand() * 30},${58 + rand() * 26},${0.015 + rand() * 0.05})`;
      ctx.beginPath();
      ctx.arc(rand() * w, rand() * h, r, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 16; i++) {
      ctx.strokeStyle = `rgba(110,80,48,${0.02 + rand() * 0.03})`;
      ctx.lineWidth = 1 + rand() * 4;
      const x = rand() * w;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + 20, h * 0.3, x - 16, h * 0.7, x + 6, h);
      ctx.stroke();
    }
    const v = ctx.createRadialGradient(w * 0.5, h * 0.45, w * 0.2, w * 0.5, h * 0.5, w * 0.8);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(60,40,22,.16)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  });
}

function boardCanvas() {
  return drawCanvas(1024, 512, (ctx, w, h) => {
    const rand = rng(77);
    ctx.fillStyle = '#22322b';
    ctx.fillRect(0, 0, w, h);
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, 'rgba(255,255,255,.05)');
    g.addColorStop(0.5, 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(0,0,0,.18)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 220; i++) {
      ctx.fillStyle = `rgba(235,240,225,${0.01 + rand() * 0.03})`;
      ctx.beginPath();
      ctx.arc(rand() * w, rand() * h, 1 + rand() * 8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,.35)';
    ctx.shadowBlur = 3;
    ctx.fillStyle = 'rgba(244,239,222,.92)';
    ctx.font = '700 122px "Ma Shan Zheng","Noto Serif SC",KaiTi,serif';
    ctx.fillText('學而時習之', w / 2, 148);
    ctx.font = '600 56px "Noto Serif SC",KaiTi,serif';
    ctx.fillStyle = 'rgba(238,233,214,.8)';
    ctx.fillText('不亦說乎', w / 2, 238);

    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(238,233,214,.42)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w * 0.3, 286);
    ctx.quadraticCurveTo(w * 0.5, 298, w * 0.7, 286);
    ctx.stroke();

    ctx.font = '600 28px "Be Vietnam Pro","Segoe UI",sans-serif';
    ctx.fillStyle = 'rgba(238,233,214,.62)';
    ctx.fillText('THẦY ĐỒ · HSK 1–6 · 聽說讀寫', w / 2, 336);

    ctx.font = '400 30px "Ma Shan Zheng",KaiTi,serif';
    ctx.fillStyle = 'rgba(240,234,216,.45)';
    ctx.fillText('温故而知新', w * 0.17, 410);
    ctx.font = '400 24px "Be Vietnam Pro",sans-serif';
    ctx.fillText('nghe · nói · đọc · viết', w * 0.83, 412);

    ctx.strokeStyle = 'rgba(240,234,216,.25)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(w * 0.11, 446);
    ctx.lineTo(w * 0.2, 446);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w * 0.24, 452);
    ctx.lineTo(w * 0.27, 438);
    ctx.stroke();
  });
}

function practicePaperCanvas() {
  return drawCanvas(512, 640, (ctx, w, h) => {
    const rand = rng(44);
    ctx.fillStyle = '#f6ebd2';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 500; i++) {
      ctx.fillStyle = `rgba(150,120,80,${0.015 + rand() * 0.03})`;
      ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 2, 1 + rand() * 2);
    }
    const unit = w / 2;
    ctx.strokeStyle = 'rgba(180,60,50,.42)';
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.strokeStyle = 'rgba(180,60,50,.28)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([7, 7]);
    for (let x = 60; x < w - 40; x += unit) {
      ctx.beginPath();
      ctx.moveTo(x, 30);
      ctx.lineTo(x, h - 30);
      ctx.stroke();
    }
    for (let y = 90; y < h - 40; y += 150) {
      ctx.beginPath();
      ctx.moveTo(30, y);
      ctx.lineTo(w - 30, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(70,52,34,.16)';
    ctx.font = '300px "Ma Shan Zheng",KaiTi,serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('永', w / 2, h / 2 + 12);
    ctx.fillStyle = 'rgba(120,88,52,.55)';
    ctx.font = '600 20px "Be Vietnam Pro",sans-serif';
    ctx.fillText('VĨNH · VĨNH VIỄN', w / 2, h - 22);
  });
}

function matCanvas() {
  return drawCanvas(512, 512, (ctx, w, h) => {
    const rand = rng(6);
    ctx.fillStyle = '#b9965c';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) {
      ctx.strokeStyle = `rgba(${100 + rand() * 60},${72 + rand() * 40},${38 + rand() * 26},${0.18 + rand() * 0.22})`;
      ctx.lineWidth = 1 + rand() * 2;
      const y = rand() * h;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    for (let i = 0; i < 40; i++) {
      ctx.strokeStyle = `rgba(90,62,32,${0.12 + rand() * 0.18})`;
      ctx.beginPath();
      ctx.moveTo(rand() * w, 0);
      ctx.lineTo(rand() * w, h);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(120,26,22,.75)';
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w / 2 - 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(216,181,101,.55)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w / 2 - 36, 0, Math.PI * 2);
    ctx.stroke();
    const v = ctx.createRadialGradient(w / 2, h / 2, w * 0.2, w / 2, h / 2, w * 0.55);
    v.addColorStop(0, 'rgba(60,36,16,0)');
    v.addColorStop(1, 'rgba(60,36,16,.24)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  });
}

function lanternCanvas() {
  return drawCanvas(256, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#f6d69c');
    g.addColorStop(0.5, '#efc07a');
    g.addColorStop(1, '#e0a65e');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 24) {
      ctx.strokeStyle = 'rgba(140,80,28,.18)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(140,80,28,.22)';
    ctx.lineWidth = 3;
    for (let y = 22; y < h; y += 46) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(150,40,30,.3)';
    ctx.font = '92px "Ma Shan Zheng",KaiTi,serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('學', w / 2, h / 2 + 4);
  });
}

function plaqueTexture(n) {
  const L = LEVELS[n];
  return drawCanvas(256, 300, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#f4e5c7');
    g.addColorStop(1, '#e2caa0');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(120,88,46,.7)';
    ctx.lineWidth = 6;
    ctx.strokeRect(9, 9, w - 18, h - 18);
    ctx.strokeStyle = 'rgba(168,35,29,.45)';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, w - 40, h - 40);
    ctx.fillStyle = '#5a3f22';
    ctx.beginPath();
    ctx.arc(w / 2, 26, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#a8231d';
    ctx.font = '86px "Ma Shan Zheng",KaiTi,serif';
    ctx.fillText(L.han, w / 2, 148);
    ctx.fillStyle = '#2a2218';
    ctx.font = '700 30px "Be Vietnam Pro","Segoe UI",sans-serif';
    ctx.fillText('HSK ' + n, w / 2, 208);
    ctx.fillStyle = '#6a6053';
    ctx.font = '400 21px "Be Vietnam Pro",sans-serif';
    ctx.fillText(H([L.count]) + ' từ', w / 2, 244);
  });
}

function skillPlaqueTexture(s) {
  return drawCanvas(512, 192, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#f4e5c7');
    g.addColorStop(1, '#e3cba1');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(120,88,46,.7)';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#a8231d';
    ctx.font = '94px "Ma Shan Zheng",KaiTi,serif';
    ctx.textAlign = 'center';
    ctx.fillText(s.han, 88, h / 2 + 6);
    ctx.strokeStyle = 'rgba(168,35,29,.28)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(150, 34);
    ctx.lineTo(150, h - 34);
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.fillStyle = '#2a2218';
    ctx.font = '600 46px "Be Vietnam Pro","Segoe UI",sans-serif';
    ctx.fillText(s.name, 178, 78);
    ctx.fillStyle = '#8a6a35';
    ctx.font = '500 26px "Be Vietnam Pro",sans-serif';
    ctx.fillText(s.py.toUpperCase(), 178, 126);
  });
}

function fallbackScrollCanvas() {
  return drawCanvas(512, 768, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#f1e5c9');
    g.addColorStop(1, '#e4d2ae');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(50,44,36,.55)';
    const rand = rng(15);
    for (let k = 0; k < 3; k++) {
      const base = 350 + k * 110;
      ctx.beginPath();
      ctx.moveTo(0, base);
      for (let x = 0; x <= w; x += 32) {
        ctx.lineTo(x, base - Math.abs(Math.sin(x * 0.012 + k * 2)) * (110 - k * 24) - rand() * 10);
      }
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fillStyle = `rgba(52,48,40,${0.12 + k * 0.16})`;
      ctx.fill();
    }
    ctx.fillStyle = '#a8231d';
    ctx.fillRect(w - 90, h - 110, 46, 46);
    ctx.fillStyle = '#f6e6c8';
    ctx.font = '34px "Ma Shan Zheng",serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('山', w - 67, h - 86);
  });
}

function fallbackShojiCanvas() {
  return drawCanvas(512, 768, (ctx, w, h) => {
    ctx.fillStyle = '#f2dfb8';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(90,92,66,.55)';
    for (let i = 0; i < 4; i++) {
      const x = 90 + i * 100 + (i % 2) * 20;
      ctx.fillRect(x, 90, 7, h - 160);
      for (let k = 0; k < 5; k++) {
        ctx.save();
        ctx.translate(x + 4, 180 + k * 90);
        ctx.rotate((k % 2 ? -1 : 1) * 0.7);
        ctx.fillRect(0, 0, 70, 4);
        ctx.restore();
      }
    }
    ctx.fillStyle = 'rgba(90,92,66,.35)';
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      ctx.ellipse(120 + (i * 47) % 300, 140 + i * 62, 26, 6, -0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

/* ---------------- campus textures ---------------- */
function grassCanvas() {
  return drawCanvas(512, 512, (ctx, w, h) => {
    const rand = rng(812);
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#4f6d36');
    g.addColorStop(0.5, '#45612e');
    g.addColorStop(1, '#3c5529');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      const x = rand() * w;
      const y = rand() * h;
      const r = 4 + rand() * 26;
      ctx.fillStyle = `rgba(${70 + rand() * 40},${100 + rand() * 40},${45 + rand() * 26},${0.05 + rand() * 0.09})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 1400; i++) {
      const x = rand() * w;
      const y = rand() * h;
      const len = 2 + rand() * 6;
      ctx.strokeStyle = `rgba(${120 + rand() * 60},${150 + rand() * 50},${70 + rand() * 40},${0.12 + rand() * 0.2})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rand() - 0.5) * 3, y - len);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(232,205,130,.18)';
    for (let i = 0; i < 60; i++) {
      ctx.beginPath();
      ctx.arc(rand() * w, rand() * h, 1 + rand() * 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function pavingCanvas() {
  return drawCanvas(512, 512, (ctx, w, h) => {
    const rand = rng(433);
    ctx.fillStyle = '#8f8069';
    ctx.fillRect(0, 0, w, h);
    const cols = 4;
    const rows = 4;
    const tw = w / cols;
    const th = h / rows;
    for (let ix = 0; ix < cols; ix++) {
      for (let iy = 0; iy < rows; iy++) {
        const tone = 128 + Math.floor(rand() * 34);
        ctx.fillStyle = `rgb(${tone},${tone - 10},${tone - 26})`;
        ctx.fillRect(ix * tw + 4, iy * th + 4, tw - 8, th - 8);
        for (let k = 0; k < 26; k++) {
          ctx.fillStyle = `rgba(70,58,42,${0.02 + rand() * 0.06})`;
          ctx.beginPath();
          ctx.arc(ix * tw + rand() * tw, iy * th + rand() * th, 1 + rand() * 7, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.strokeStyle = 'rgba(255,244,214,.09)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ix * tw + 7, iy * th + 7);
        ctx.lineTo(ix * tw + tw - 7, iy * th + 7);
        ctx.stroke();
      }
    }
    ctx.strokeStyle = 'rgba(56,46,34,.35)';
    ctx.lineWidth = 3;
    for (let ix = 0; ix <= cols; ix++) {
      ctx.beginPath();
      ctx.moveTo(ix * tw, 0);
      ctx.lineTo(ix * tw, h);
      ctx.stroke();
    }
    for (let iy = 0; iy <= rows; iy++) {
      ctx.beginPath();
      ctx.moveTo(0, iy * th);
      ctx.lineTo(w, iy * th);
      ctx.stroke();
    }
  });
}

function roofCanvas() {
  return drawCanvas(512, 512, (ctx, w, h) => {
    const rand = rng(271);
    ctx.fillStyle = '#37474a';
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 32) {
      for (let x = -16; x < w; x += 34) {
        const ox = (Math.floor(y / 32) % 2) * 17;
        ctx.fillStyle = `rgba(${58 + rand() * 22},${74 + rand() * 22},${74 + rand() * 20},1)`;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(x + ox, y + 2, 30, 27, 10) : ctx.rect(x + ox, y + 2, 30, 27);
        ctx.fill();
        ctx.strokeStyle = 'rgba(18,26,26,.55)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.strokeStyle = 'rgba(190,214,200,.12)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + ox + 4, y + 6);
        ctx.lineTo(x + ox + 26, y + 6);
        ctx.stroke();
      }
    }
    const v = ctx.createLinearGradient(0, 0, 0, h);
    v.addColorStop(0, 'rgba(255,238,200,.14)');
    v.addColorStop(0.5, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,.2)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  });
}

function waterCanvas() {
  return drawCanvas(512, 512, (ctx, w, h) => {
    const rand = rng(918);
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#2f5c58');
    g.addColorStop(0.45, '#386c66');
    g.addColorStop(1, '#24514f');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {
      const y = rand() * h;
      ctx.strokeStyle = `rgba(${170 + rand() * 60},${205 + rand() * 40},${195 + rand() * 40},${0.05 + rand() * 0.12})`;
      ctx.lineWidth = 1 + rand() * 2;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 16) {
        const yy = y + Math.sin((x / w) * Math.PI * (1 + rand() * 2) + i) * (2 + rand() * 5);
        x === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    for (let i = 0; i < 26; i++) {
      ctx.strokeStyle = 'rgba(244,226,188,.12)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(rand() * w, rand() * h, 10 + rand() * 34, 2 + rand() * 5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
}

function skyCanvas() {
  return drawCanvas(1024, 1024, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#2c3358');
    g.addColorStop(0.32, '#5c4f6c');
    g.addColorStop(0.52, '#b4786a');
    g.addColorStop(0.63, '#e7ac74');
    g.addColorStop(0.7, '#f7d09b');
    g.addColorStop(0.78, '#a97a52');
    g.addColorStop(1, '#4e3a27');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const sun = ctx.createRadialGradient(w * 0.7, h * 0.63, 6, w * 0.7, h * 0.63, 210);
    sun.addColorStop(0, 'rgba(255,238,196,.95)');
    sun.addColorStop(0.18, 'rgba(255,214,150,.55)');
    sun.addColorStop(0.5, 'rgba(255,186,112,.16)');
    sun.addColorStop(1, 'rgba(255,180,110,0)');
    ctx.fillStyle = sun;
    ctx.beginPath();
    ctx.arc(w * 0.7, h * 0.63, 210, 0, Math.PI * 2);
    ctx.fill();
    const rand = rng(55);
    for (let i = 0; i < 16; i++) {
      const y = h * (0.24 + rand() * 0.26);
      const x = rand() * w;
      const rw = 60 + rand() * 180;
      const rh = 10 + rand() * 22;
      const cg = ctx.createRadialGradient(x, y, 2, x, y, rw);
      cg.addColorStop(0, 'rgba(255,222,190,.12)');
      cg.addColorStop(1, 'rgba(255,222,190,0)');
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.ellipse(x, y, rw, rh, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function signCanvas(han, pinyin, vi) {
  return drawCanvas(1024, 288, (ctx, w, h) => {
    const pad = 10;
    const r = 40;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(pad, pad, w - pad * 2, h - pad * 2, r);
    else ctx.rect(pad, pad, w - pad * 2, h - pad * 2);
    ctx.fillStyle = 'rgba(21,14,8,.9)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(224,185,105,.92)';
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(pad + 14, pad + 14, w - pad * 2 - 28, h - pad * 2 - 28, r - 12);
    else ctx.rect(pad + 14, pad + 14, w - pad * 2 - 28, h - pad * 2 - 28);
    ctx.strokeStyle = 'rgba(224,185,105,.32)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f4d69b';
    ctx.font = '700 128px "Ma Shan Zheng","Noto Serif SC",KaiTi,serif';
    ctx.fillText(han, 176, h / 2 + 6, 300);

    ctx.strokeStyle = 'rgba(224,185,105,.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(340, 68);
    ctx.lineTo(340, h - 68);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#fdf0d2';
    ctx.font = '600 64px "Be Vietnam Pro","Segoe UI",sans-serif';
    ctx.fillText(pinyin, 372, 104, 610);
    ctx.fillStyle = 'rgba(248,232,200,.76)';
    ctx.font = '400 56px "Be Vietnam Pro","Segoe UI",sans-serif';
    ctx.fillText(vi, 372, 196, 610);

    [[44, 44], [w - 44, 44], [44, h - 44], [w - 44, h - 44]].forEach(([x, y]) => {
      ctx.fillStyle = 'rgba(224,185,105,.9)';
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    });
  });
}

function nameCanvas(name) {
  return drawCanvas(512, 144, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(14, 18, w - 28, h - 36, 48);
    else ctx.rect(14, 18, w - 28, h - 36);
    ctx.fillStyle = 'rgba(20,14,9,.84)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(224,185,105,.75)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f9e9c8';
    ctx.font = '600 46px "Be Vietnam Pro","Segoe UI",sans-serif';
    ctx.fillText(name, w / 2, h / 2 - 8, 420);
    ctx.fillStyle = 'rgba(224,185,105,.78)';
    ctx.font = '500 22px "Noto Serif SC","Be Vietnam Pro",sans-serif';
    ctx.fillText('同学 · học trò', w / 2, h / 2 + 36);
  });
}

function H(n) {
  return n.toLocaleString('vi-VN');
}

/* ---------------- texture set ---------------- */
const TX = {};
function buildTextures() {
  TX.floor = texFrom(woodCanvas(3, '#6a4527', 6), { repeat: [4, 6] });
  TX.desk = texFrom(woodCanvas(11, '#7b4f2c', 0), { repeat: [1, 1] });
  TX.plaster = texFrom(plasterCanvas(), { repeat: [2.4, 1] });
  TX.board = texFrom(boardCanvas(), { clamp: true });
  TX.paper = texFrom(practicePaperCanvas(), { clamp: true });
  TX.mat = texFrom(matCanvas(), { clamp: true });
  TX.lantern = texFrom(lanternCanvas(), { repeat: [1, 1] });
  TX.grass = texFrom(grassCanvas(), { repeat: [26, 26] });
  TX.paving = texFrom(pavingCanvas(), { repeat: [2, 9] });
  TX.roof = texFrom(roofCanvas(), { repeat: [3, 2] });
  TX.water = texFrom(waterCanvas(), { repeat: [3, 3] });
  TX.sky = texFrom(skyCanvas(), { clamp: true });
}

/* ---------------- material set ---------------- */
let MAT = {};
function buildMaterials() {
  MAT = {
    wood: new THREE.MeshStandardMaterial({ map: TX.floor, roughness: 0.82, metalness: 0.02 }),
    desk: new THREE.MeshStandardMaterial({ map: TX.desk, roughness: 0.76, metalness: 0.02 }),
    woodDark: new THREE.MeshStandardMaterial({ color: 0x3b2717, roughness: 0.7, metalness: 0.03 }),
    woodMid: new THREE.MeshStandardMaterial({ color: 0x5a3b22, roughness: 0.78 }),
    plaster: new THREE.MeshStandardMaterial({ map: TX.plaster, roughness: 0.96 }),
    paper: new THREE.MeshStandardMaterial({ color: 0xf1e2c4, roughness: 0.95 }),
    paperSheet: new THREE.MeshStandardMaterial({ map: TX.paper, roughness: 0.95 }),
    cream: new THREE.MeshStandardMaterial({ color: 0xe6d4ae, roughness: 0.93 }),
    ink: new THREE.MeshStandardMaterial({ color: 0x17110c, roughness: 0.42 }),
    inkPool: new THREE.MeshStandardMaterial({ color: 0x080604, roughness: 0.12, metalness: 0.15 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xb6893c, roughness: 0.38, metalness: 0.55 }),
    red: new THREE.MeshStandardMaterial({ color: 0x9c221d, roughness: 0.62 }),
    redBright: new THREE.MeshStandardMaterial({ color: 0xb52a22, roughness: 0.58 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xd8a474, roughness: 0.86 }),
    robe: new THREE.MeshStandardMaterial({ color: 0x33466e, roughness: 0.88 }),
    robeTrim: new THREE.MeshStandardMaterial({ color: 0x6a7ea6, roughness: 0.84 }),
    beard: new THREE.MeshStandardMaterial({ color: 0xe6dfd1, roughness: 1 }),
    hair: new THREE.MeshStandardMaterial({ color: 0x2a241d, roughness: 0.92 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x18130f, roughness: 0.28, metalness: 0.35 }),
    ceramic: new THREE.MeshStandardMaterial({ color: 0x2b3833, roughness: 0.24 }),
    chalk: new THREE.MeshStandardMaterial({ color: 0xf0e7d3, roughness: 0.92 }),
    mat: new THREE.MeshStandardMaterial({ map: TX.mat, roughness: 0.94 }),
    ceiling: new THREE.MeshStandardMaterial({ color: 0x241811, roughness: 0.95 }),
    lantern: new THREE.MeshStandardMaterial({
      map: TX.lantern,
      emissive: 0xff9a45,
      emissiveMap: TX.lantern,
      emissiveIntensity: 0.55,
      roughness: 0.9
    }),
    board: new THREE.MeshStandardMaterial({
      map: TX.board,
      emissive: 0x2a332b,
      emissiveMap: TX.board,
      emissiveIntensity: 0.32,
      roughness: 0.94
    }),
    grass: new THREE.MeshStandardMaterial({ map: TX.grass, roughness: 0.98 }),
    paving: new THREE.MeshStandardMaterial({ map: TX.paving, roughness: 0.92 }),
    roof: new THREE.MeshStandardMaterial({ map: TX.roof, roughness: 0.86, metalness: 0.03 }),
    water: new THREE.MeshStandardMaterial({
      map: TX.water,
      color: 0x9fd4c8,
      roughness: 0.16,
      metalness: 0.3,
      transparent: true,
      opacity: 0.95
    }),
    plasterDouble: new THREE.MeshStandardMaterial({ map: TX.plaster, roughness: 0.96, side: THREE.DoubleSide }),
    ceilingDouble: new THREE.MeshStandardMaterial({ color: 0x241811, roughness: 0.95, side: THREE.DoubleSide }),
    whiteWall: new THREE.MeshStandardMaterial({ color: 0xd9c7a6, roughness: 0.94 }),
    stone: new THREE.MeshStandardMaterial({ color: 0x8b8372, roughness: 0.95 }),
    stoneDark: new THREE.MeshStandardMaterial({ color: 0x5d584d, roughness: 0.96 }),
    redPillar: new THREE.MeshStandardMaterial({ color: 0x8c2a22, roughness: 0.68 }),
    woodPath: new THREE.MeshStandardMaterial({ color: 0x6b4a2b, roughness: 0.9 }),
    foliage: new THREE.MeshStandardMaterial({ color: 0x3f6334, roughness: 0.94 }),
    foliageLight: new THREE.MeshStandardMaterial({ color: 0x567b3d, roughness: 0.94 }),
    foliageWarm: new THREE.MeshStandardMaterial({ color: 0x6e7d3a, roughness: 0.94 }),
    blossom: new THREE.MeshStandardMaterial({ color: 0xd98b9b, roughness: 0.9 }),
    trunk: new THREE.MeshStandardMaterial({ color: 0x4a3524, roughness: 0.98 }),
    sand: new THREE.MeshStandardMaterial({ color: 0xd9bd88, roughness: 1 }),
    playRed: new THREE.MeshStandardMaterial({ color: 0xb4443c, roughness: 0.6 }),
    playBlue: new THREE.MeshStandardMaterial({ color: 0x3f6f8c, roughness: 0.6 }),
    playYellow: new THREE.MeshStandardMaterial({ color: 0xd3a13f, roughness: 0.6 }),
    playGreen: new THREE.MeshStandardMaterial({ color: 0x4f7a48, roughness: 0.62 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x8e918c, roughness: 0.35, metalness: 0.6 }),
    paperGlow: new THREE.MeshStandardMaterial({ color: 0xf6dfb5, emissive: 0xffb96e, emissiveIntensity: 0.4, roughness: 0.9 }),
    windowDark: new THREE.MeshStandardMaterial({ color: 0x2a1d13, roughness: 0.7 }),
    flagRed: new THREE.MeshStandardMaterial({ color: 0xb3261f, roughness: 0.8, side: THREE.DoubleSide }),
    cloud: new THREE.MeshBasicMaterial({ color: 0xffe6c8, transparent: true, opacity: 0.22, depthWrite: false })
  };
}

function box(w, h, d, material, x, y, z, opts) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x || 0, y || 0, z || 0);
  if (opts && opts.rot) m.rotation.set(opts.rot[0] || 0, opts.rot[1] || 0, opts.rot[2] || 0);
  m.castShadow = !opts || opts.cast !== false;
  m.receiveShadow = !opts || opts.receive !== false;
  return m;
}

function cyl(rt, rb, h, material, x, y, z, seg, opts) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 20), material);
  m.position.set(x || 0, y || 0, z || 0);
  if (opts && opts.rot) m.rotation.set(opts.rot[0] || 0, opts.rot[1] || 0, opts.rot[2] || 0);
  m.castShadow = !opts || opts.cast !== false;
  m.receiveShadow = !opts || opts.receive !== false;
  return m;
}

function addAnchor(id, x, y, z) {
  const o = new THREE.Object3D();
  o.position.set(x, y, z);
  scene.add(o);
  anchors[id] = o;
}

function registerHotspot(id, object) {
  object.traverse((o) => { o.userData.hotspot = id; });
  object.userData.hotspot = id;
  pickables.push(object);
  pickableById[id] = object;
}

/* ---------------- room ---------------- */
function buildRoom() {
  scene.background = new THREE.Color(0x140e09);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(11, 14.2), new THREE.MeshStandardMaterial({ map: TX.floor, roughness: 0.85, metalness: 0.02 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, 1.85);
  floor.receiveShadow = true;
  scene.add(floor);

  const rug = new THREE.Mesh(new THREE.CircleGeometry(1.55, 56), MAT.mat);
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0, 0.006, 1.1);
  rug.receiveShadow = true;
  scene.add(rug);

  const back = new THREE.Mesh(new THREE.PlaneGeometry(11, 5), MAT.plasterDouble);
  back.position.set(0, 2.5, -5.2);
  back.receiveShadow = true;
  scene.add(back);

  const left = new THREE.Mesh(new THREE.PlaneGeometry(15, 5), MAT.plasterDouble);
  left.rotation.y = Math.PI / 2;
  left.position.set(-5.5, 2.5, 1.4);
  left.receiveShadow = true;
  scene.add(left);

  const right = new THREE.Mesh(new THREE.PlaneGeometry(15, 5), MAT.plasterDouble);
  right.rotation.y = -Math.PI / 2;
  right.position.set(5.5, 2.5, 1.4);
  right.receiveShadow = true;
  scene.add(right);

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(11, 15), MAT.ceilingDouble);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, 4.96, 1.4);
  scene.add(ceiling);

  scene.add(box(11, 0.17, 0.09, MAT.woodDark, 0, 0.085, -5.14, { cast: false }));
  scene.add(box(0.09, 0.17, 15, MAT.woodDark, -5.46, 0.085, 1.4, { cast: false }));
  scene.add(box(0.09, 0.17, 15, MAT.woodDark, 5.46, 0.085, 1.4, { cast: false }));

  [-3.4, -0.2, 3.0].forEach((z) => {
    scene.add(box(11, 0.17, 0.22, MAT.woodDark, 0, 4.85, z, { cast: false }));
  });

  scene.add(box(0.22, 0.22, 15, MAT.woodDark, -5.34, 4.85, 1.4, { cast: false }));
  scene.add(box(0.22, 0.22, 15, MAT.woodDark, 5.34, 4.85, 1.4, { cast: false }));
}

/* ---------------- shoji ---------------- */
function buildShoji(w, h, shojiTex) {
  const g = new THREE.Group();
  const paper = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({
      color: 0xf4e2bd,
      map: shojiTex,
      emissive: 0xffc27d,
      emissiveMap: shojiTex,
      emissiveIntensity: shojiTex ? 0.42 : 0.3,
      roughness: 0.95
    })
  );
  paper.receiveShadow = true;
  g.add(paper);

  const frameMat = MAT.woodDark;
  const fw = 0.06;
  g.add(box(w, fw, 0.05, frameMat, 0, h / 2 - fw / 2, 0.035));
  g.add(box(w, fw, 0.05, frameMat, 0, -h / 2 + fw / 2, 0.035));
  g.add(box(fw, h, 0.05, frameMat, -w / 2 + fw / 2, 0, 0.035));
  g.add(box(fw, h, 0.05, frameMat, w / 2 - fw / 2, 0, 0.035));
  for (let i = 1; i < 3; i++) {
    g.add(box(0.035, h - 0.08, 0.04, frameMat, -w / 2 + (w * i) / 3, 0, 0.04));
  }
  for (let i = 1; i < 4; i++) {
    g.add(box(w - 0.08, 0.035, 0.04, frameMat, 0, -h / 2 + (h * i) / 4, 0.04));
  }
  return g;
}

/* ---------------- blackboard ---------------- */
function buildBoard() {
  const g = new THREE.Group();
  g.position.set(-1.3, 2.68, -5.12);
  g.add(box(4.74, 2.5, 0.1, MAT.woodDark, 0, 0, 0));
  const board = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 2.25), MAT.board);
  board.position.z = 0.056;
  board.receiveShadow = true;
  g.add(board);
  g.add(box(4.55, 0.06, 0.22, MAT.woodDark, 0, -1.16, 0.18));
  g.add(box(0.16, 0.035, 0.035, MAT.chalk, -0.9, -1.11, 0.2, { cast: false }));
  g.add(box(0.12, 0.035, 0.035, MAT.chalk, -0.62, -1.11, 0.21, { cast: false }));
  g.add(box(0.1, 0.03, 0.03, new THREE.MeshStandardMaterial({ color: 0xa8231d, roughness: 0.7 }), 0.75, -1.11, 0.2, { cast: false }));
  scene.add(g);
}

/* ---------------- hanging scroll ---------------- */
function buildScroll(scrollTex) {
  const g = new THREE.Group();
  g.position.set(2.45, 2.72, -5.1);

  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.82), MAT.cream);
  cloth.position.z = -0.004;
  cloth.receiveShadow = true;
  g.add(cloth);

  const artMat = new THREE.MeshStandardMaterial({
    color: 0xf3e7cd,
    map: scrollTex,
    emissive: 0x3b2c1a,
    emissiveMap: scrollTex,
    emissiveIntensity: scrollTex ? 0.35 : 0,
    roughness: 0.92
  });
  if (!scrollTex) {
    const t = texFrom(fallbackScrollCanvas(), { clamp: true });
    artMat.map = t;
    artMat.emissiveMap = t;
    artMat.emissiveIntensity = 0.22;
  }
  const art = new THREE.Mesh(new THREE.PlaneGeometry(1.04, 1.56), artMat);
  art.position.z = 0.004;
  art.receiveShadow = true;
  g.add(art);

  g.add(cyl(0.028, 0.028, 1.3, MAT.woodDark, 0, 0.9, 0.012, 12, { rot: [0, 0, Math.PI / 2] }));
  g.add(cyl(0.028, 0.028, 1.3, MAT.woodDark, 0, -0.9, 0.012, 12, { rot: [0, 0, Math.PI / 2] }));
  [-0.58, 0.58].forEach((x) => {
    g.add(cyl(0.004, 0.004, 1.32, MAT.ink, x, 1.56, 0, 6, { rot: [0, 0, 0] }));
    const tassel = cyl(0.012, 0.012, 0.2, MAT.redBright, x, -1.02, 0.02, 8);
    g.add(tassel);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 8), MAT.redBright);
    tip.position.set(x, -1.14, 0.02);
    tip.rotation.x = Math.PI;
    g.add(tip);
  });
  return g;
}

/* ---------------- bookshelf ---------------- */
function buildShelf() {
  const g = new THREE.Group();
  g.position.set(4.15, 0, -4.92);
  const W = 1.55;
  const H = 2.6;
  const D = 0.34;
  const frame = MAT.woodMid;

  g.add(box(W, 0.08, D, frame, 0, H - 0.04, 0));
  g.add(box(W, 0.08, D, frame, 0, 0.04, 0));
  g.add(box(0.07, H, D, frame, -W / 2 + 0.035, H / 2, 0));
  g.add(box(0.07, H, D, frame, W / 2 - 0.035, H / 2, 0));
  g.add(box(W, H, 0.03, new THREE.MeshStandardMaterial({ color: 0x452f1d, roughness: 0.92 }), 0, H / 2, -D / 2 + 0.015));

  const shelfYs = [0.62, 1.28, 1.94];
  shelfYs.forEach((y) => g.add(box(W - 0.12, 0.05, D - 0.03, frame, 0, y, 0)));

  const rand = rng(19);
  const palette = [0x7b2f26, 0x314a5c, 0x4a5c3a, 0x8a6a35, 0x5a3a52, 0xb08a3c, 0x6b3b28, 0x2f4a44, 0x843b2c];
  shelfYs.forEach((y) => {
    let x = -W / 2 + 0.12;
    while (x < W / 2 - 0.16) {
      const bw = 0.035 + rand() * 0.045;
      const bh = 0.24 + rand() * 0.13;
      const bd = 0.2 + rand() * 0.05;
      const bmat = new THREE.MeshStandardMaterial({ color: palette[Math.floor(rand() * palette.length)], roughness: 0.82 });
      const b = box(bw, bh, bd, bmat, x + bw / 2, y + 0.028 + bh / 2, 0.01);
      b.rotation.z = rand() < 0.1 ? (rand() - 0.5) * 0.18 : 0;
      b.castShadow = false;
      g.add(b);
      x += bw + 0.009 + (rand() < 0.12 ? 0.05 : 0);
    }
  });

  const stack = new THREE.Group();
  stack.position.set(-0.36, H + 0.02, 0.02);
  stack.add(box(0.36, 0.05, 0.25, new THREE.MeshStandardMaterial({ color: 0x7b2f26, roughness: 0.8 }), 0, 0.02, 0));
  stack.add(box(0.33, 0.045, 0.23, new THREE.MeshStandardMaterial({ color: 0x314a5c, roughness: 0.8 }), 0.015, 0.07, 0.01));
  stack.add(box(0.3, 0.04, 0.21, new THREE.MeshStandardMaterial({ color: 0x8a6a35, roughness: 0.8 }), -0.01, 0.115, -0.005));
  g.add(stack);

  const vase = cyl(0.05, 0.085, 0.24, MAT.ceramic, 0.42, H + 0.12, 0.02, 16);
  g.add(vase);
  const branch = cyl(0.006, 0.009, 0.45, MAT.woodDark, 0.44, H + 0.42, 0.02, 6, { rot: [0.1, 0, 0.28] });
  g.add(branch);

  return g;
}

/* ---------------- low cabinet ---------------- */
function buildCabinet() {
  const g = new THREE.Group();
  g.position.set(-4.35, 0, -4.82);
  g.add(box(1.3, 0.82, 0.42, MAT.woodMid, 0, 0.41, 0));
  g.add(box(1.34, 0.06, 0.46, MAT.woodDark, 0, 0.84, 0));
  g.add(box(0.6, 0.52, 0.02, MAT.woodDark, -0.32, 0.42, 0.215));
  g.add(box(0.6, 0.52, 0.02, MAT.woodDark, 0.32, 0.42, 0.215));
  const knob1 = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), MAT.gold);
  knob1.position.set(-0.06, 0.42, 0.235);
  g.add(knob1);
  const knob2 = knob1.clone();
  knob2.position.x = 0.06;
  g.add(knob2);
  g.add(cyl(0.06, 0.09, 0.26, MAT.ceramic, -0.36, 1.0, 0, 16));
  g.add(box(0.32, 0.06, 0.24, new THREE.MeshStandardMaterial({ color: 0x7b2f26, roughness: 0.8 }), 0.32, 0.9, 0));
  g.add(box(0.29, 0.05, 0.22, new THREE.MeshStandardMaterial({ color: 0x314a5c, roughness: 0.8 }), 0.33, 0.955, 0.01));
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.22), new THREE.MeshStandardMaterial({ color: 0xe9dbbd, roughness: 0.9 }));
  plate.position.set(-0.36, 1.0, 0.09);
  plate.rotation.x = -0.3;
  g.add(plate);
  return g;
}

/* ---------------- desk ---------------- */
function buildDesk(lampLightOut) {
  const g = new THREE.Group();
  g.position.set(0, 0, 1.25);

  g.add(box(1.9, 0.09, 0.84, MAT.desk, 0, 0.94, 0));
  g.add(box(1.72, 0.34, 0.06, MAT.woodDark, 0, 0.7, 0.4));
  [[-0.85, -0.32], [0.85, -0.32], [-0.85, 0.32], [0.85, 0.32]].forEach(([x, z]) => {
    g.add(box(0.08, 0.9, 0.08, MAT.woodDark, x, 0.45, z));
  });
  g.add(box(1.7, 0.06, 0.06, MAT.woodDark, 0, 0.2, 0.32));

  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.54, 0.67), MAT.paperSheet);
  sheet.rotation.x = -Math.PI / 2;
  sheet.rotation.z = 0.06;
  sheet.position.set(-0.34, 0.99, -0.02);
  sheet.receiveShadow = true;
  g.add(sheet);

  const sheet2 = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.52), MAT.paper);
  sheet2.rotation.x = -Math.PI / 2;
  sheet2.rotation.z = -0.13;
  sheet2.position.set(0.08, 0.988, 0.03);
  sheet2.receiveShadow = true;
  g.add(sheet2);

  g.add(box(0.32, 0.05, 0.24, MAT.ink, 0.46, 0.985, 0.16));
  const pool = cyl(0.062, 0.062, 0.014, MAT.inkPool, 0.46, 1.011, 0.16, 20);
  g.add(pool);

  g.add(box(0.05, 0.06, 0.09, MAT.woodDark, -0.02, 0.995, 0.28));
  g.add(box(0.05, 0.06, 0.09, MAT.woodDark, 0.32, 0.995, 0.28));
  const brush = cyl(0.011, 0.011, 0.42, MAT.woodMid, 0.15, 1.04, 0.28, 8, { rot: [0, 0, Math.PI / 2] });
  g.add(brush);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.08, 8), MAT.ink);
  tip.position.set(-0.1, 1.04, 0.28);
  tip.rotation.z = Math.PI / 2;
  g.add(tip);

  g.add(cyl(0.075, 0.065, 0.2, MAT.ceramic, -0.72, 1.09, 0.24, 18));
  [[-0.76, 0.22, -0.06], [-0.7, 0.24, 0.05], [-0.68, 0.22, -0.02]].forEach(([x, z, tilt]) => {
    g.add(cyl(0.008, 0.008, 0.34, MAT.woodMid, x, 1.28, z, 6, { rot: [tilt, 0, tilt * 2] }));
  });

  [-0.03, 0.035, 0.01].forEach((dy, i) => {
    const colors = [0x7b2f26, 0x314a5c, 0x8a6a35];
    const m = new THREE.MeshStandardMaterial({ color: colors[i], roughness: 0.8 });
    const b = box(0.3 - i * 0.02, 0.035, 0.2, m, -0.62, 1.0 + dy, -0.2);
    b.rotation.y = i * 0.12;
    g.add(b);
  });

  g.add(box(0.055, 0.06, 0.055, MAT.redBright, -0.08, 1.0, 0.3));
  g.add(cyl(0.016, 0.016, 0.05, MAT.redBright, -0.08, 1.05, 0.3, 8));

  const lampG = new THREE.Group();
  lampG.position.set(0.72, 1.0, -0.26);
  lampG.add(cyl(0.075, 0.085, 0.045, MAT.ceramic, 0, 0.022, 0, 16));
  lampG.add(cyl(0.045, 0.075, 0.05, MAT.ceramic, 0, 0.065, 0, 16));
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xffcb7a });
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.075, 10), flameMat);
  flame.position.y = 0.13;
  lampG.add(flame);
  const lampLight = new THREE.PointLight(0xffb066, 2.6, 3.2, 2);
  lampLight.position.set(0, 0.16, 0);
  lampG.add(lampLight);
  g.add(lampG);
  if (lampLightOut) lampLightOut.light = lampLight;

  return g;
}

/* ---------------- teacher ---------------- */
function buildTeacher() {
  const g = new THREE.Group();
  g.position.set(0, 0, -2.7);

  const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.5, 1.2, 26), MAT.robe);
  robe.position.y = 0.6;
  robe.castShadow = true;
  robe.receiveShadow = true;
  g.add(robe);

  const shoulders = new THREE.Mesh(new THREE.SphereGeometry(0.31, 22, 16), MAT.robe);
  shoulders.position.y = 1.32;
  shoulders.scale.set(1.06, 0.56, 0.8);
  shoulders.castShadow = true;
  g.add(shoulders);

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.32, 0.42, 24), MAT.robe);
  torso.position.y = 1.14;
  torso.castShadow = true;
  g.add(torso);

  const collarL = box(0.055, 0.3, 0.02, MAT.robeTrim, -0.07, 1.25, 0.29);
  collarL.rotation.z = 0.24;
  g.add(collarL);
  const collarR = box(0.055, 0.3, 0.02, MAT.robeTrim, 0.07, 1.25, 0.29);
  collarR.rotation.z = -0.24;
  g.add(collarR);

  const sash = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.026, 8, 26), MAT.robeTrim);
  sash.rotation.x = Math.PI / 2;
  sash.position.y = 0.97;
  g.add(sash);

  const sleeveL = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.115, 0.46, 16), MAT.robe);
  sleeveL.position.set(-0.27, 1.12, 0.06);
  sleeveL.rotation.z = -0.24;
  sleeveL.castShadow = true;
  g.add(sleeveL);

  const sleeveR = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.115, 0.46, 16), MAT.robe);
  sleeveR.position.set(0.27, 1.12, 0.06);
  sleeveR.rotation.z = 0.24;
  sleeveR.castShadow = true;
  g.add(sleeveR);

  [-1, 1].forEach((s) => {
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.018, 6, 16), MAT.robeTrim);
    cuff.rotation.x = Math.PI / 2;
    cuff.position.set(s * 0.31, 0.91, 0.07);
    g.add(cuff);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.055, 14, 10), MAT.skin);
    hand.position.set(s * 0.31, 0.87, 0.12);
    g.add(hand);
  });

  g.add(box(0.17, 0.07, 0.3, MAT.woodDark, -0.14, 0.035, 0.18, { cast: false }));
  g.add(box(0.17, 0.07, 0.3, MAT.woodDark, 0.14, 0.035, 0.18, { cast: false }));

  const headG = new THREE.Group();
  headG.position.set(0, 1.46, 0);

  const neck = cyl(0.075, 0.085, 0.14, MAT.skin, 0, 0.02, 0, 14);
  headG.add(neck);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.185, 32, 24), MAT.skin);
  head.position.y = 0.18;
  head.scale.set(1, 1.06, 0.98);
  head.castShadow = true;
  headG.add(head);

  [-1, 1].forEach((s) => {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 10), MAT.skin);
    ear.position.set(s * 0.18, 0.17, 0);
    ear.scale.set(0.55, 1, 0.7);
    headG.add(ear);
  });

  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.196, 32, 18, 0, Math.PI * 2, 0, Math.PI * 0.56),
    MAT.hair
  );
  hair.position.y = 0.2;
  headG.add(hair);

  const bun = new THREE.Mesh(new THREE.SphereGeometry(0.072, 18, 14), MAT.hair);
  bun.position.set(0, 0.32, -0.13);
  headG.add(bun);
  const bunPin = cyl(0.008, 0.008, 0.22, MAT.gold, 0, 0.34, -0.13, 6, { rot: [0, 0, Math.PI / 2] });
  headG.add(bunPin);

  const beard = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.32, 22), MAT.beard);
  beard.position.set(0, -0.12, 0.085);
  beard.rotation.x = Math.PI;
  beard.castShadow = true;
  headG.add(beard);

  [-0.062, 0.062].forEach((x) => {
    const brow = box(0.075, 0.016, 0.02, MAT.hair, x, 0.245, 0.168);
    brow.rotation.z = x < 0 ? -0.13 : 0.13;
    brow.castShadow = false;
    headG.add(brow);

    const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.031, 14, 10), MAT.beard);
    sclera.position.set(x, 0.186, 0.163);
    sclera.scale.set(1, 0.72, 0.55);
    headG.add(sclera);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.0145, 12, 10), MAT.glass);
    pupil.position.set(x, 0.185, 0.18);
    headG.add(pupil);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.049, 0.0055, 8, 24), MAT.glass);
    rim.position.set(x, 0.185, 0.191);
    headG.add(rim);

    const arm = box(0.008, 0.01, 0.15, MAT.glass, x * 2.1, 0.19, 0.105, { cast: false });
    headG.add(arm);
  });
  headG.add(box(0.045, 0.01, 0.012, MAT.glass, 0, 0.192, 0.196, { cast: false }));

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.024, 12, 10), MAT.skin);
  nose.position.set(0, 0.145, 0.19);
  nose.scale.set(0.85, 1, 0.9);
  headG.add(nose);

  const mouth = box(0.052, 0.009, 0.012, MAT.redBright, 0, 0.07, 0.169, { cast: false });
  headG.add(mouth);

  const mustacheL = box(0.062, 0.013, 0.02, MAT.beard, -0.036, 0.09, 0.177, { cast: false });
  mustacheL.rotation.z = -0.2;
  headG.add(mustacheL);
  const mustacheR = box(0.062, 0.013, 0.02, MAT.beard, 0.036, 0.09, 0.177, { cast: false });
  mustacheR.rotation.z = 0.2;
  headG.add(mustacheR);

  g.add(headG);
  animated.teacher = g;
  animated.head = headG;
  return g;
}

/* ---------------- student (playable) ---------------- */
function buildStudent(opts) {
  const o = opts || {};
  const g = new THREE.Group();
  const robeMat = new THREE.MeshStandardMaterial({ color: o.robe != null ? o.robe : 0x2f5f8f, roughness: 0.9 });
  const trimMat = new THREE.MeshStandardMaterial({ color: o.trim != null ? o.trim : 0xcbb27a, roughness: 0.86 });
  const strawMat = new THREE.MeshStandardMaterial({ color: 0xd6b478, roughness: 0.95 });
  const bagMat = new THREE.MeshStandardMaterial({ color: 0x5b3a24, roughness: 0.9 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x241a13, roughness: 0.8 });

  const legL = new THREE.Group();
  legL.position.set(-0.1, 0.33, 0);
  legL.add(cyl(0.055, 0.05, 0.28, MAT.hair, 0, -0.14, 0, 10));
  legL.add(box(0.12, 0.06, 0.24, shoeMat, 0, -0.3, 0.05));
  g.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.1;
  g.add(legR);

  const robe = cyl(0.2, 0.31, 0.72, robeMat, 0, 0.7, 0, 24);
  g.add(robe);
  g.add(cyl(0.205, 0.215, 0.06, trimMat, 0, 1.02, 0, 24));

  const sash = new THREE.Mesh(new THREE.TorusGeometry(0.235, 0.022, 6, 24), MAT.redBright);
  sash.rotation.x = Math.PI / 2;
  sash.position.y = 0.76;
  g.add(sash);

  g.add(box(0.045, 0.62, 0.02, trimMat, 0.06, 0.87, 0.2, { cast: false, rot: [0, 0, -0.08] }));

  const armL = new THREE.Group();
  armL.position.set(-0.245, 1.0, 0);
  armL.add(cyl(0.055, 0.07, 0.42, robeMat, 0, -0.2, 0, 14));
  armL.add(new THREE.Mesh(new THREE.SphereGeometry(0.048, 12, 10), MAT.skin).translateY(-0.43));
  g.add(armL);
  const armR = armL.clone();
  armR.position.x = 0.245;
  g.add(armR);

  const neck = cyl(0.055, 0.06, 0.09, MAT.skin, 0, 1.08, 0, 12);
  g.add(neck);

  const headG = new THREE.Group();
  headG.position.y = 1.22;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.148, 28, 22), MAT.skin);
  head.scale.set(1, 1.04, 0.97);
  headG.add(head);
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.156, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55),
    MAT.hair
  );
  hair.position.y = 0.026;
  headG.add(hair);

  [-0.055, 0.055].forEach((x) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.0125, 10, 8), MAT.glass);
    eye.position.set(x, 0.012, 0.133);
    headG.add(eye);
  });
  headG.add(box(0.045, 0.007, 0.01, MAT.redBright, 0, -0.06, 0.142, { cast: false }));
  g.add(headG);

  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.33, 0.16, 28), strawMat);
  hat.position.y = 1.42;
  hat.castShadow = true;
  g.add(hat);
  const brim = new THREE.Mesh(new THREE.TorusGeometry(0.325, 0.008, 6, 30), trimMat);
  brim.rotation.x = Math.PI / 2;
  brim.position.y = 1.345;
  g.add(brim);
  g.add(box(0.5, 0.03, 0.03, MAT.redBright, 0, 1.37, 0.12, { cast: false }));

  const bag = box(0.23, 0.26, 0.1, bagMat, 0.16, 0.8, -0.24);
  g.add(bag);
  g.add(box(0.045, 0.5, 0.02, bagMat, 0.0, 0.95, -0.21, { cast: false, rot: [0, 0, 0.52] }));

  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.visible = false;
  g.position.set(0, 0, 2.5);
  g.rotation.y = Math.PI;

  g.userData.parts = { legL, legR, armL, armR, headG, robe, hat };
  g.userData.ownMats = [robeMat, trimMat, strawMat, bagMat, shoeMat];
  return g;
}

/* ---------------- racks ---------------- */
function rackFrame(w, h, y) {
  const g = new THREE.Group();
  const board = box(w, h, 0.06, MAT.woodMid, 0, y, 0);
  g.add(board);
  g.add(box(w + 0.08, 0.06, 0.09, MAT.woodDark, 0, y + h / 2 + 0.02, 0));
  g.add(box(w + 0.08, 0.06, 0.09, MAT.woodDark, 0, y - h / 2 - 0.02, 0));
  g.add(box(0.06, h + 0.04, 0.09, MAT.woodDark, -w / 2 - 0.02, y, 0));
  g.add(box(0.06, h + 0.04, 0.09, MAT.woodDark, w / 2 + 0.02, y, 0));
  [-1, 1].forEach((s) => {
    g.add(box(0.06, y + h / 2 + 0.16, 0.06, MAT.woodDark, s * (w / 2 - 0.08), (y + h / 2 + 0.16) / 2, 0.06));
    g.add(box(0.34, 0.06, 0.46, MAT.woodDark, s * (w / 2 - 0.08), 0.03, 0.12));
  });
  return g;
}

function buildLevelRack() {
  const g = new THREE.Group();
  g.position.set(-2.4, 0, 0.72);
  g.rotation.y = 0.26;
  const y = 1.35;
  const h = 1.38;
  g.add(rackFrame(1.0, h, y));
  [1, 2, 3, 4, 5, 6].forEach((n, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const px = (col - 1) * 0.315;
    const py = y + 0.32 - row * 0.6;
    const mat = new THREE.MeshStandardMaterial({ map: texFrom(plaqueTexture(n), { clamp: true }), roughness: 0.88 });
    const plaque = box(0.27, 0.32, 0.02, mat, px, py, 0.05);
    plaque.castShadow = false;
    g.add(plaque);
  });
  return g;
}

function buildSkillRack() {
  const g = new THREE.Group();
  g.position.set(2.4, 0, 0.72);
  g.rotation.y = -0.26;
  const y = 1.32;
  const h = 1.34;
  g.add(rackFrame(0.9, h, y));
  [0, 1, 2, 3].forEach((i) => {
    const s = SKILLS[i];
    const mat = new THREE.MeshStandardMaterial({ map: texFrom(skillPlaqueTexture(s), { clamp: true }), roughness: 0.88 });
    const plaque = box(0.64, 0.24, 0.02, mat, 0, y + 0.42 - i * 0.3, 0.05);
    plaque.castShadow = false;
    g.add(plaque);
  });
  return g;
}

/* ---------------- lanterns ---------------- */
function buildLantern(x, y, z, withLight) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.24, 0.44, 22), MAT.lantern);
  body.castShadow = true;
  g.add(body);
  g.add(cyl(0.13, 0.19, 0.06, MAT.woodDark, 0, 0.245, 0, 18));
  g.add(cyl(0.19, 0.13, 0.06, MAT.woodDark, 0, -0.245, 0, 18));
  const ringGeo = new THREE.TorusGeometry(0.215, 0.008, 6, 24);
  [0.08, -0.08].forEach((yy) => {
    const ring = new THREE.Mesh(ringGeo, MAT.gold);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = yy;
    g.add(ring);
  });
  g.add(cyl(0.004, 0.004, 1.02, MAT.ink, 0, 0.78, 0, 6, { cast: false }));
  g.add(cyl(0.005, 0.005, 0.16, MAT.redBright, 0, -0.34, 0, 6, { cast: false }));
  g.add(cyl(0.026, 0.05, 0.16, MAT.redBright, 0, -0.47, 0, 10));
  g.add(cyl(0.05, 0.058, 0.05, MAT.gold, 0, -0.395, 0, 12));
  if (withLight !== false) {
    const light = new THREE.PointLight(0xffa860, 4.2, 6, 2);
    light.position.y = 0;
    g.add(light);
  }
  g.userData.phase = Math.random() * Math.PI * 2;
  return g;
}

/* ---------------- dust ---------------- */
function buildDust() {
  const count = 300;
  const pos = new Float32Array(count * 3);
  const rand = rng(52);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (rand() - 0.5) * 10.4;
    pos[i * 3 + 1] = 0.4 + rand() * 4.1;
    pos[i * 3 + 2] = -4.8 + rand() * 9;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xffdfae,
    size: 0.018,
    transparent: true,
    opacity: 0.52,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true
  });
  const points = new THREE.Points(geo, mat);
  animated.dust = points;
  scene.add(points);
}

/* ---------------- lights ---------------- */
function buildLights() {
  scene.add(new THREE.HemisphereLight(0xffe3bd, 0x1b120c, 0.52));
  scene.add(new THREE.HemisphereLight(0xffd7ae, 0x33261a, 0.32));
  scene.add(new THREE.AmbientLight(0x6b4a2a, 0.28));

  const dir = new THREE.DirectionalLight(0xffd2a0, 1.9);
  dir.position.set(-22, 31, 19);
  dir.castShadow = true;
  const shadowRes = window.innerWidth < 820 ? 1024 : 2048;
  dir.shadow.mapSize.set(shadowRes, shadowRes);
  dir.shadow.camera.near = 1;
  dir.shadow.camera.far = 110;
  dir.shadow.camera.left = -36;
  dir.shadow.camera.right = 36;
  dir.shadow.camera.top = 44;
  dir.shadow.camera.bottom = -30;
  dir.shadow.bias = -0.0006;
  dir.shadow.normalBias = 0.03;
  dir.target.position.set(0, 0, 13);
  scene.add(dir);
  scene.add(dir.target);

  const fill = new THREE.DirectionalLight(0xa8b8d8, 0.32);
  fill.position.set(16, 10, -20);
  scene.add(fill);

  const windowLight = new THREE.PointLight(0xffc98f, 7, 7.5, 2);
  windowLight.position.set(-4.55, 2.65, -4.1);
  scene.add(windowLight);

  const sideLight = new THREE.PointLight(0xffbd7a, 5, 7, 2);
  sideLight.position.set(-4.9, 2.4, 1.2);
  scene.add(sideLight);

  const teacherSpot = new THREE.SpotLight(0xffd9a6, 26, 6.5, 0.5, 0.85, 2);
  teacherSpot.position.set(0.45, 2.75, -1.1);
  teacherSpot.target.position.set(0, 1.62, -2.7);
  scene.add(teacherSpot);
  scene.add(teacherSpot.target);

  const faceFill = new THREE.PointLight(0xffcf9f, 1.4, 2.4, 2);
  faceFill.position.set(0, 1.95, -1.75);
  scene.add(faceFill);
}

/* ---------------- campus ---------------- */
function addWalkBox(obj, pad) {
  const b = new THREE.Box3().setFromObject(obj);
  const p = pad || 0;
  walk.boxes.push({
    x0: b.min.x - p, x1: b.max.x + p,
    z0: b.min.z - p, z1: b.max.z + p
  });
}

function addWalkCircle(x, z, r) {
  walk.circles.push({ x, z, r });
}

function pavingMat(rep) {
  const t = TX.paving.clone();
  t.needsUpdate = true;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rep[0], rep[1]);
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.92 });
}

function pavingPlane(w, d, x, z, rep) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), pavingMat(rep || [2, 6]));
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.012, z);
  m.receiveShadow = true;
  scene.add(m);
  return m;
}

function signSprite(han, py, vi, x, y, z, scale) {
  const tex = texFrom(signCanvas(han, py, vi), { clamp: true });
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: true });
  const s = new THREE.Sprite(mat);
  s.position.set(x, y, z);
  const sc = scale || 3.4;
  s.scale.set(sc, sc * 0.28125, 1);
  s.renderOrder = 4;
  s.visible = false;
  scene.add(s);
  signSprites.push(s);
  return s;
}

function hipRoof(w, d, h, mat) {
  const g = new THREE.Group();
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.7071, h, 4, 1), mat);
  cone.rotation.y = Math.PI / 4;
  cone.scale.set(w, 1, d);
  cone.position.y = h / 2;
  cone.castShadow = true;
  cone.receiveShadow = true;
  g.add(cone);
  const slab = box(w * 1.02, 0.1, d * 1.02, mat, 0, 0.04, 0);
  slab.castShadow = true;
  g.add(slab);
  return g;
}

function buildTree(x, z, s, kind) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const trunkH = 1.9 * s;
  g.add(cyl(0.13 * s, 0.22 * s, trunkH, MAT.trunk, 0, trunkH / 2, 0, 8));
  if (kind === 1) {
    for (let i = 0; i < 3; i++) {
      const c = new THREE.Mesh(new THREE.ConeGeometry((1.15 - 0.26 * i) * s, 1.55 * s, 10), i === 2 ? MAT.foliageLight : MAT.foliage);
      c.position.y = trunkH + 0.45 * s + i * 0.72 * s;
      c.castShadow = true;
      g.add(c);
    }
  } else {
    const leaf = kind === 2 ? MAT.blossom : MAT.foliage;
    const leaf2 = kind === 2 ? MAT.blossom : MAT.foliageLight;
    const canopy = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2 * s, 1), leaf);
    canopy.position.y = trunkH + 1.0 * s;
    canopy.scale.set(1.18, 0.92, 1.18);
    canopy.castShadow = true;
    g.add(canopy);
    const c2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.82 * s, 1), leaf2);
    c2.position.set(0.58 * s, trunkH + 1.58 * s, 0.22 * s);
    c2.castShadow = true;
    g.add(c2);
    const c3 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.66 * s, 1), leaf);
    c3.position.set(-0.55 * s, trunkH + 1.48 * s, -0.18 * s);
    c3.castShadow = true;
    g.add(c3);
  }
  scene.add(g);
  addWalkCircle(x, z, 0.42 * s);
  return g;
}

function buildBench(x, z, rot) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rot || 0;
  g.add(box(1.7, 0.1, 0.5, MAT.woodPath, 0, 0.46, 0));
  g.add(box(1.7, 0.34, 0.08, MAT.woodPath, 0, 0.72, -0.23));
  [-0.7, 0.7].forEach((px) => {
    g.add(box(0.1, 0.46, 0.44, MAT.stoneDark, px, 0.23, 0));
  });
  scene.add(g);
  addWalkBox(g, 0.05);

  const ry = rot || 0;
  walk.points.push({
    id: 'bench-' + Math.round(x * 10) + '-' + Math.round(z * 10),
    x, z, ry, r: 1.7, y: 0.18,
    label: 'Ngồi nghỉ', hint: 'ghế sân trường',
    stand: { x: x - Math.sin(ry) * 1.45, z: z - Math.cos(ry) * 1.45 },
    act: { type: 'sit' }
  });
  return g;
}

function buildStoneLantern(x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.add(box(0.5, 0.16, 0.5, MAT.stoneDark, 0, 0.08, 0));
  g.add(cyl(0.1, 0.14, 0.66, MAT.stone, 0, 0.48, 0, 8));
  g.add(box(0.36, 0.32, 0.36, MAT.paperGlow, 0, 0.96, 0));
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.3, 4), MAT.stoneDark);
  cap.rotation.y = Math.PI / 4;
  cap.position.y = 1.28;
  cap.castShadow = true;
  g.add(cap);
  scene.add(g);
  return g;
}

const FLOWER_MATS = [MAT.playRed, MAT.playYellow, MAT.cream, MAT.blossom, MAT.playBlue];

function buildFlowerBed(x, z, w, d, rot) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rot || 0;
  g.add(box(w, 0.3, d, MAT.stone, 0, 0.15, 0));
  g.add(box(w - 0.3, 0.14, d - 0.3, new THREE.MeshStandardMaterial({ color: 0x4a3826, roughness: 1 }), 0, 0.32, 0));
  const rand = rng(Math.round(Math.abs(x) * 31 + Math.abs(z) * 17) + 7);
  const count = Math.max(6, Math.round(w * d * 7));
  for (let i = 0; i < count; i++) {
    const fx = (rand() - 0.5) * (w - 0.6);
    const fz = (rand() - 0.5) * (d - 0.6);
    g.add(cyl(0.009, 0.009, 0.17, MAT.foliage, fx, 0.38, fz, 5, { cast: false }));
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.055 + rand() * 0.04, 7, 5), FLOWER_MATS[Math.floor(rand() * FLOWER_MATS.length)]);
    f.position.set(fx, 0.48, fz);
    f.castShadow = false;
    g.add(f);
  }
  scene.add(g);
  addWalkBox(g, 0.02);
  return g;
}

function buildSwingSet(x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const H = 2.75;
  const W = 4.4;
  [-W / 2, W / 2].forEach((px) => {
    g.add(box(0.12, H, 0.12, MAT.metal, px, H / 2, -0.55, { rot: [0.26, 0, 0] }));
    g.add(box(0.12, H, 0.12, MAT.metal, px, H / 2, 0.55, { rot: [-0.26, 0, 0] }));
    g.add(box(0.1, 0.1, 1.2, MAT.metal, px, H * 0.86, 0));
  });
  g.add(cyl(0.075, 0.075, W, MAT.metal, 0, H, 0, 10, { rot: [0, 0, Math.PI / 2] }));
  [-0.9, 0.9].forEach((px, i) => {
    const sw = new THREE.Group();
    sw.position.set(px, H, 0);
    sw.add(cyl(0.016, 0.016, 1.95, MAT.metal, -0.24, -0.98, 0, 6));
    sw.add(cyl(0.016, 0.016, 1.95, MAT.metal, 0.24, -0.98, 0, 6));
    sw.add(box(0.56, 0.07, 0.28, MAT.playRed, 0, -1.98, 0));
    g.add(sw);
    animated.swings.push({ g: sw, phase: i * 1.9 });
  });
  scene.add(g);
  addWalkCircle(x - W / 2, z, 0.55);
  addWalkCircle(x + W / 2, z, 0.55);
  [-0.9, 0.9].forEach((px, i) => {
    walk.points.push({
      id: 'swing-' + i,
      x: x + px, z, ry: 0, r: 1.7,
      label: 'Chơi xích đu', hint: 'khu vui chơi',
      stand: { x: x + px, z: z + 1.5 },
      act: { type: 'swing', seatX: x + px, seatZ: z, phase: i * 1.9 }
    });
  });
  return g;
}

function buildSlide(x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.add(box(1.4, 0.12, 1.4, MAT.playBlue, 0, 1.8, 0));
  [[-0.6, -0.6], [-0.6, 0.6], [0.6, 0.6], [0.6, -0.6]].forEach(([px, pz]) => {
    g.add(box(0.1, 1.8, 0.1, MAT.metal, px, 0.9, pz));
  });
  for (let i = 0; i < 4; i++) {
    g.add(box(0.7, 0.06, 0.06, MAT.metal, -0.9, 0.4 + i * 0.42, 0.52));
  }
  g.add(box(0.08, 1.8, 0.08, MAT.metal, -1.2, 0.9, 0.52));
  g.add(box(0.08, 1.8, 0.08, MAT.metal, -1.2, 0.9, -0.52));
  const ramp = box(0.95, 0.08, 3.0, MAT.playYellow, 0.1, 0.98, 1.55, { rot: [-0.44, 0, 0] });
  g.add(ramp);
  [-0.46, 0.46].forEach((px) => {
    g.add(box(0.08, 0.22, 3.0, MAT.playYellow, px, 1.14, 1.55, { rot: [-0.44, 0, 0] }));
  });
  scene.add(g);
  addWalkBox(g, 0.12);
  return g;
}

function buildSeesaw(x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.add(box(0.26, 0.56, 0.26, MAT.metal, 0, 0.28, 0));
  const pivot = new THREE.Group();
  pivot.position.y = 0.62;
  g.add(pivot);
  pivot.add(box(3.0, 0.09, 0.36, MAT.playGreen, 0, 0, 0));
  [-1.3, 1.3].forEach((px) => {
    pivot.add(box(0.1, 0.24, 0.34, MAT.playYellow, px, 0.1, 0));
    pivot.add(box(0.06, 0.32, 0.06, MAT.metal, px, 0.1, 0));
  });
  animated.seesaws.push({ g: pivot, phase: Math.random() * 6 });
  scene.add(g);
  addWalkCircle(x, z, 0.9);
  return g;
}

function buildSandbox(x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const w = 4.2;
  const d = 2.8;
  g.add(box(w, 0.24, 0.18, MAT.woodPath, 0, 0.12, -d / 2));
  g.add(box(w, 0.24, 0.18, MAT.woodPath, 0, 0.12, d / 2));
  g.add(box(0.18, 0.24, d, MAT.woodPath, -w / 2, 0.12, 0));
  g.add(box(0.18, 0.24, d, MAT.woodPath, w / 2, 0.12, 0));
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.2, d - 0.2), MAT.sand);
  sand.rotation.x = -Math.PI / 2;
  sand.position.y = 0.23;
  sand.receiveShadow = true;
  g.add(sand);
  g.add(cyl(0.16, 0.2, 0.26, MAT.playRed, 1.1, 0.38, 0.5, 12));
  const spade = cyl(0.02, 0.02, 0.5, MAT.woodPath, -0.9, 0.42, -0.3, 6, { rot: [0, 0, 1.1] });
  g.add(spade);
  scene.add(g);
  walk.points.push({
    id: 'sandboxBuild',
    x: x - w / 2 - 0.85, z, r: 1.8,
    label: 'Xây lâu đài cát', hint: 'chơi sáng tạo',
    stand: { x: x - w / 2 - 0.85, z },
    act: { type: 'build' }
  });
  return g;
}

function buildHoop(x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.add(cyl(0.08, 0.11, 3.2, MAT.metal, 0, 1.6, 0, 10));
  g.add(box(1.15, 0.78, 0.08, MAT.cream, 0, 3.15, 0.12));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.026, 6, 18), MAT.playRed);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(0, 2.78, 0.42);
  g.add(ring);
  scene.add(g);
  addWalkCircle(x, z, 0.4);
  return g;
}

function bridgeHeight(z) {
  const t = clamp((z - CAMPUS.bridge.z0) / (CAMPUS.bridge.z1 - CAMPUS.bridge.z0), 0, 1);
  return 0.12 + Math.sin(t * Math.PI) * 0.62;
}

function buildBridge() {
  const b = CAMPUS.bridge;
  const segs = 10;
  const len = (b.z1 - b.z0) / segs;
  const g = new THREE.Group();
  for (let i = 0; i < segs; i++) {
    const z = b.z0 + len * (i + 0.5);
    const y = bridgeHeight(z);
    const deck = box(b.half * 2, 0.12, len * 1.04, MAT.woodPath, b.x, y, z);
    deck.receiveShadow = true;
    g.add(deck);
    [-1, 1].forEach((s) => {
      const px = b.x + s * (b.half - 0.06);
      g.add(box(0.09, 0.72, 0.09, MAT.redPillar, px, y + 0.4, z, { cast: false }));
      g.add(box(0.1, 0.09, len * 1.02, MAT.redPillar, px, y + 0.78, z, { cast: false }));
    });
  }
  [-1, 1].forEach((s) => {
    const px = b.x + s * (b.half - 0.06);
    [b.z0, b.z1].forEach((z) => {
      g.add(cyl(0.14, 0.18, 1.3, MAT.stoneDark, px, 0.55, z, 8));
    });
  });
  scene.add(g);
  return g;
}

function isOnBridge(x, z) {
  const b = CAMPUS.bridge;
  return Math.abs(x - b.x) <= b.half - 0.15 && z >= b.z0 + 0.2 && z <= b.z1 - 0.2;
}

function isOnPondBridge(x, z) {
  const b = CAMPUS.pondBridge;
  return z >= b.z - b.half + 0.1 && z <= b.z + b.half - 0.1 && x >= b.x0 + 0.1 && x <= b.x1 - 0.1;
}

function buildPavilion(x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.add(box(4.4, 0.3, 4.4, MAT.stone, 0, 0.15, 0));
  [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]].forEach(([px, pz]) => {
    g.add(cyl(0.12, 0.15, 2.7, MAT.redPillar, px, 1.65, pz, 10));
    addWalkCircle(x + px, z + pz, 0.28);
  });
  [-1.6, 1.6].forEach((px) => {
    g.add(box(0.06, 0.06, 3.2, MAT.redPillar, px, 0.95, 0, { cast: false }));
  });
  const roof = hipRoof(5.8, 5.8, 1.5, MAT.roof);
  roof.position.y = 3.05;
  g.add(roof);
  const fin = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), MAT.gold);
  fin.position.y = 4.75;
  g.add(fin);
  scene.add(g);
  return g;
}

function buildRockery(x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const rand = rng(303);
  for (let i = 0; i < 5; i++) {
    const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55 + rand() * 0.7, 0), MAT.stoneDark);
    r.position.set((rand() - 0.5) * 2.2, 0.35 + rand() * 0.5, (rand() - 0.5) * 2.0);
    r.rotation.set(rand() * 2, rand() * 2, rand() * 2);
    r.scale.y = 1.2 + rand() * 0.6;
    r.castShadow = true;
    r.receiveShadow = true;
    g.add(r);
  }
  scene.add(g);
  addWalkCircle(x, z, 1.6);
  return g;
}

function buildFlagpole() {
  const g = new THREE.Group();
  g.position.set(0, 0, 30);
  g.add(box(2.2, 0.28, 2.2, MAT.stone, 0, 0.14, 0));
  g.add(cyl(0.045, 0.07, 7.4, MAT.metal, 0, 3.86, 0, 12));
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), MAT.gold).translateY(7.58));
  const flagCanvas = drawCanvas(512, 320, (ctx, w, h) => {
    ctx.fillStyle = '#b3261f';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f4cf7e';
    ctx.font = '180px "Ma Shan Zheng","Noto Serif SC",KaiTi,serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('學', w / 2, h / 2 + 6);
    ctx.strokeStyle = 'rgba(244,207,126,.5)';
    ctx.lineWidth = 5;
    ctx.strokeRect(12, 12, w - 24, h - 24);
  });
  const geo = new THREE.PlaneGeometry(2.3, 1.45, 16, 8);
  const flag = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: texFrom(flagCanvas, { clamp: true }), side: THREE.DoubleSide, roughness: 0.82 }));
  flag.position.set(1.2, 6.55, 0);
  flag.castShadow = true;
  g.add(flag);
  animated.flags.push({ mesh: flag, base: geo.attributes.position.array.slice() });
  scene.add(g);
  addWalkCircle(0, 30, 0.55);
  return g;
}

function gatePlaqueTexture() {
  return drawCanvas(1024, 340, (ctx, w, h) => {
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#2f1c0c');
    bg.addColorStop(0.48, '#0d0a07');
    bg.addColorStop(1, '#24160a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#c9a24e';
    ctx.lineWidth = 13;
    ctx.strokeRect(13, 13, w - 26, h - 26);
    ctx.strokeStyle = '#7a5824';
    ctx.lineWidth = 4;
    ctx.strokeRect(34, 34, w - 68, h - 68);
    ctx.strokeStyle = 'rgba(201,162,78,.55)';
    ctx.lineWidth = 2;
    ctx.strokeRect(48, 48, w - 96, h - 96);

    [[56, 56], [w - 56, 56], [56, h - 56], [w - 56, h - 56]].forEach(([cx, cy]) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.strokeStyle = '#d9b865';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 17, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-26, 0);
      ctx.lineTo(26, 0);
      ctx.moveTo(0, -26);
      ctx.lineTo(0, 26);
      ctx.stroke();
      ctx.restore();
    });

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 196px "Ma Shan Zheng","Noto Serif SC","Be Vietnam Pro",KaiTi,serif';
    const gold = ctx.createLinearGradient(0, 66, 0, h - 66);
    gold.addColorStop(0, '#fff0b8');
    gold.addColorStop(0.45, '#e9c469');
    gold.addColorStop(0.72, '#c99a3c');
    gold.addColorStop(1, '#f2d78e');
    ctx.shadowColor = 'rgba(0,0,0,.7)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 5;
    ctx.fillStyle = gold;
    ctx.fillText('Trường', w / 2, h / 2 + 10);
  });
}

function bannerTexture(words) {
  return drawCanvas(320, 840, (ctx, w, h) => {
    ctx.fillStyle = '#efe2c4';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(160,120,70,.1)';
    for (let i = 0; i < 90; i++) {
      ctx.fillRect((i * 53) % w, (i * 97) % h, 2, 26);
    }
    ctx.strokeStyle = '#9c2c24';
    ctx.lineWidth = 16;
    ctx.strokeRect(11, 11, w - 22, h - 22);
    ctx.strokeStyle = '#c9a24e';
    ctx.lineWidth = 3;
    ctx.strokeRect(28, 28, w - 56, h - 56);

    ctx.fillStyle = '#9c2c24';
    ctx.beginPath();
    ctx.arc(w / 2, 70, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f0dba6';
    ctx.beginPath();
    ctx.arc(w / 2, 70, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#9c2c24';
    ctx.font = '700 26px "Noto Serif SC","Be Vietnam Pro",serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('學', w / 2, 71);

    const top = 138;
    const step = (h - top - 70) / words.length;
    const size = Math.min(96, step * 0.66);
    ctx.font = '700 ' + size.toFixed(0) + 'px "Be Vietnam Pro","Noto Serif SC",serif';
    ctx.fillStyle = '#2a2117';
    words.forEach((word, i) => {
      ctx.fillText(word, w / 2, top + step * (i + 0.5));
    });
  });
}

function buildBanner(x, z, words) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.add(box(0.34, 0.26, 0.34, MAT.stoneDark, 0, 0.13, 0));
  g.add(cyl(0.055, 0.075, 4.3, MAT.woodDark, 0, 2.15, 0, 10));
  const fin = new THREE.Mesh(new THREE.SphereGeometry(0.095, 12, 10), MAT.gold);
  fin.position.y = 4.37;
  g.add(fin);
  g.add(box(1.36, 0.08, 0.1, MAT.woodDark, 0, 4.14, 0));
  const tex = texFrom(bannerTexture(words), { clamp: true });
  const geo = new THREE.PlaneGeometry(1.14, 2.7, 8, 10);
  const cloth = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    map: tex, side: THREE.DoubleSide, roughness: 0.94
  }));
  cloth.position.set(0, 2.68, 0.075);
  cloth.castShadow = true;
  g.add(cloth);
  g.add(cyl(0.008, 0.008, 0.12, MAT.gold, 0, 4.08, 0.075, 6, { cast: false }));
  const base = geo.attributes.position.array.slice();
  animated.flags.push({ mesh: cloth, base });
  scene.add(g);
  addWalkCircle(x, z, 0.34);
  return g;
}

function buildStoneLion(x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.add(box(1.2, 0.72, 1.05, MAT.stoneDark, 0, 0.36, 0));
  g.add(box(1.34, 0.13, 1.18, MAT.stone, 0, 0.785, 0));
  g.add(box(1.02, 0.1, 0.9, MAT.stoneDark, 0, 0.87, 0));

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.48, 16, 12), MAT.stone);
  body.position.set(0, 1.55, -0.03);
  body.scale.set(0.98, 1.06, 1.18);
  body.castShadow = true;
  g.add(body);

  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 12), MAT.stone);
  chest.position.set(0, 1.46, 0.33);
  g.add(chest);

  [-0.25, 0.25].forEach((px) => {
    g.add(box(0.17, 0.72, 0.2, MAT.stone, px, 1.24, 0.35));
    g.add(box(0.23, 0.12, 0.34, MAT.stoneDark, px, 0.91, 0.42));
  });

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 18, 14), MAT.stone);
  head.position.set(0, 2.11, 0.2);
  head.scale.set(1.02, 0.96, 0.94);
  head.castShadow = true;
  g.add(head);

  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2;
    const mane = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), MAT.stoneDark);
    mane.position.set(Math.cos(a) * 0.34, 2.11 + Math.sin(a) * 0.33, -0.02);
    mane.scale.set(1, 1, 0.8);
    g.add(mane);
  }
  [-0.22, 0.22].forEach((px) => {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.16, 6), MAT.stoneDark);
    ear.position.set(px, 2.44, 0.12);
    ear.rotation.z = px > 0 ? -0.35 : 0.35;
    g.add(ear);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 6), MAT.ink);
    eye.position.set(px * 0.52, 2.16, 0.49);
    g.add(eye);
  });
  g.add(box(0.14, 0.09, 0.1, MAT.stoneDark, 0, 2.06, 0.52));
  g.add(box(0.24, 0.055, 0.06, MAT.ink, 0, 1.97, 0.5));
  [[-0.09, 0.02], [0.09, -0.02]].forEach(([px, rz]) => {
    g.add(box(0.07, 0.24, 0.07, MAT.stoneDark, px, 1.79, 0.48, { rot: [0, 0, rz] }));
  });

  const tail = cyl(0.05, 0.09, 0.7, MAT.stoneDark, 0, 1.6, -0.5, 8, { rot: [0.5, 0, 0] });
  g.add(tail);
  const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), MAT.stoneDark);
  tuft.position.set(0, 1.93, -0.68);
  g.add(tuft);

  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(g);
  addWalkCircle(x, z, 0.78);
  return g;
}

function buildGate() {
  const g = new THREE.Group();
  const z = CAMPUS.gate.z;

  g.add(box(10.2, 0.1, 1.4, MAT.stone, 0, 0.05, z, { cast: false }));

  // stone steps spreading toward the approach
  [[6.6, 0.06, 36.35], [7.6, 0.05, 36.95], [8.6, 0.04, 37.55]].forEach(([w, h, sz]) => {
    const s = box(w, h, 0.55, MAT.stone, 0, h / 2, sz, { cast: false });
    s.receiveShadow = true;
    g.add(s);
  });

  // central and flanking columns
  [-2.75, 2.75, -7.25, 7.25].forEach((px) => {
    [z - 0.66, z + 0.66].forEach((pz) => {
      g.add(cyl(0.18, 0.22, 4.8, MAT.redPillar, px, 2.4, pz, 14));
      g.add(box(0.62, 0.26, 0.62, MAT.stoneDark, px, 0.13, pz));
      g.add(box(0.5, 0.16, 0.5, MAT.stone, px, 0.32, pz, { cast: false }));
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.025, 6, 18), MAT.gold);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(px, 3.92, z + 0.66);
    g.add(ring);
  });

  // side bays with carved panels and lattice windows
  [-1, 1].forEach((side) => {
    const cx = side * 5.0;
    g.add(box(5.0, 0.55, 0.72, MAT.stoneDark, cx, 0.275, z));
    g.add(box(4.6, 2.25, 0.46, MAT.whiteWall, cx, 1.68, z));
    g.add(box(4.72, 0.14, 0.56, MAT.stone, cx, 0.58, z, { cast: false }));
    g.add(box(4.74, 0.16, 0.6, MAT.woodDark, cx, 2.86, z, { cast: false }));

    [-0.92, 0.92].forEach((off) => {
      const wx = cx + off * side;
      g.add(box(1.2, 1.65, 0.06, MAT.woodDark, wx, 1.78, z + 0.25));
      g.add(box(1.0, 1.45, 0.03, MAT.paperGlow, wx, 1.78, z + 0.29, { cast: false }));
      for (let i = -2; i <= 2; i++) {
        g.add(box(0.035, 1.4, 0.03, MAT.woodDark, wx + i * 0.19, 1.78, z + 0.315, { cast: false }));
      }
      for (let i = -2; i <= 2; i++) {
        g.add(box(0.98, 0.032, 0.03, MAT.woodDark, wx, 1.78 + i * 0.26, z + 0.315, { cast: false }));
      }
    });

    const roof = hipRoof(5.7, 3.5, 1.05, MAT.roof);
    roof.position.set(cx, 2.95, z);
    g.add(roof);
    g.add(box(5.5, 0.1, 0.14, MAT.gold, cx, 3.02, z + 1.74, { cast: false }));
    [-2.62, 2.62].forEach((ox) => {
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.55, 6), MAT.ink);
      tip.position.set(cx + ox, 3.28, z + 1.68);
      tip.rotation.z = ox > 0 ? -0.7 : 0.7;
      g.add(tip);
    });
  });

  // main crossbeam, plaque and roof
  g.add(box(6.6, 0.48, 0.64, MAT.redPillar, 0, 4.32, z));
  g.add(box(6.9, 0.1, 0.7, MAT.gold, 0, 4.08, z, { cast: false }));
  g.add(box(5.6, 0.16, 0.6, MAT.gold, 0, 4.6, z, { cast: false }));
  g.add(box(3.62, 1.2, 0.16, MAT.ink, 0, 5.02, z + 0.34));
  const plaqueTex = texFrom(gatePlaqueTexture(), { clamp: true });
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(3.42, 1.06), new THREE.MeshStandardMaterial({
    map: plaqueTex,
    emissive: 0x4a3413,
    emissiveMap: plaqueTex,
    emissiveIntensity: 0.35,
    roughness: 0.62,
    metalness: 0.18
  }));
  plaque.position.set(0, 5.02, z + 0.43);
  g.add(plaque);
  [[0, 0.66, 3.5, 0.07], [0, -0.66, 3.5, 0.07], [-1.78, 0, 0.07, 1.4], [1.78, 0, 0.07, 1.4]].forEach(([fx, fy, fw, fh]) => {
    g.add(box(fw, fh, 0.12, MAT.gold, fx, 5.02 + fy, z + 0.35, { cast: false }));
  });

  const mainRoof = hipRoof(11.0, 4.5, 2.05, MAT.roof);
  mainRoof.position.set(0, 5.66, z);
  g.add(mainRoof);
  g.add(box(11.2, 0.11, 0.16, MAT.gold, 0, 5.72, z + 2.24, { cast: false }));
  [-5.3, 5.3].forEach((ox) => {
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.72, 6), MAT.ink);
    tip.position.set(ox, 5.9, z + 2.18);
    tip.rotation.z = ox > 0 ? -0.72 : 0.72;
    g.add(tip);
    const tip2 = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.6, 6), MAT.ink);
    tip2.position.set(ox, 5.88, z - 2.18);
    tip2.rotation.z = ox > 0 ? -0.72 : 0.72;
    g.add(tip2);
  });

  const upper = hipRoof(6.2, 3.1, 1.18, MAT.roof);
  upper.position.set(0, 7.18, z);
  g.add(upper);
  const ridge = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 10), MAT.gold);
  ridge.position.set(0, 8.45, z);
  ridge.scale.set(1.5, 0.7, 0.7);
  g.add(ridge);
  [-2.5, 2.5].forEach((ox) => {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.78, 6), MAT.gold);
    horn.position.set(ox, 8.46, z);
    horn.rotation.z = ox > 0 ? -0.95 : 0.95;
    g.add(horn);
  });

  // open red doors, folded back into the courtyard
  [-1, 1].forEach((side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 2.35, 0, z + 0.34);
    pivot.rotation.y = side * 1.9;
    pivot.add(box(1.12, 3.5, 0.1, MAT.red, 0.56 * -side, 1.78, 0));
    pivot.add(box(0.06, 3.5, 0.13, MAT.gold, 0.06 * -side, 1.78, 0, { cast: false }));
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 2; c++) {
        const stud = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), MAT.gold);
        stud.position.set((0.32 + c * 0.45) * -side, 0.9 + r * 0.62, 0.07);
        pivot.add(stud);
      }
    }
    g.add(pivot);
  });

  // flanking courtyard walls
  [-1, 1].forEach((side) => {
    const cx = side * 15.35;
    g.add(box(16.0, 0.5, 0.72, MAT.stoneDark, cx, 0.25, z));
    const wall = box(16.0, 2.2, 0.48, MAT.whiteWall, cx, 1.4, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    g.add(wall);
    g.add(box(16.4, 0.24, 0.9, MAT.roof, cx, 2.62, z, { cast: false }));
    for (let i = 0; i < 4; i++) {
      const wx = side * (9.4 + i * 3.3);
      g.add(box(1.1, 1.2, 0.05, MAT.woodDark, wx, 1.62, z + 0.25));
      g.add(box(0.94, 1.04, 0.03, MAT.paperGlow, wx, 1.62, z + 0.29, { cast: false }));
      g.add(box(0.035, 1.0, 0.03, MAT.woodDark, wx, 1.62, z + 0.315, { cast: false }));
      g.add(box(0.9, 0.035, 0.03, MAT.woodDark, wx, 1.62, z + 0.315, { cast: false }));
    }
  });

  // lanterns under the central eave
  [-2.02, 2.02].forEach((px) => {
    const lantern = buildLantern(px, 3.5, z + 1.02, false);
    g.add(lantern);
    animated.lanterns.push(lantern);
    g.add(cyl(0.012, 0.012, 0.62, MAT.ink, px, 4.02, z + 1.02, 6, { cast: false }));
  });

  scene.add(g);

  walk.boxes.push({ x0: -23.4, x1: -2.35, z0: z - 0.86, z1: z + 0.86 });
  walk.boxes.push({ x0: 2.35, x1: 23.4, z0: z - 0.86, z1: z + 0.86 });

  buildStoneLion(-4.35, 37.25);
  buildStoneLion(4.35, 37.25);
  buildBanner(-9.4, 37.55, ['Tư', 'Tiên', 'Học', 'Viện']);
  buildBanner(9.4, 37.55, ['Thiên', 'Hạ', 'Đệ', 'Nhất']);
  return g;
}

function buildKoiPond() {
  const pond = CAMPUS.pond;
  const g = new THREE.Group();

  const waterMat = new THREE.MeshStandardMaterial({
    map: TX.water,
    color: 0x9fd8c4,
    roughness: 0.12,
    metalness: 0.32,
    transparent: true,
    opacity: 0.74
  });
  const water = new THREE.Mesh(new THREE.CircleGeometry(1, 56), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.scale.set(pond.rx, pond.rz, 1);
  water.position.set(pond.x, 0.035, pond.z);
  g.add(water);

  const shore = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.06, 56), MAT.stoneDark);
  shore.rotation.x = -Math.PI / 2;
  shore.scale.set(pond.rx, pond.rz, 1);
  shore.position.set(pond.x, 0.03, pond.z);
  shore.receiveShadow = true;
  g.add(shore);

  const padMat = new THREE.MeshStandardMaterial({ color: 0x4a7a4c, roughness: 0.9 });
  const pads = [
    [9.6, 41.1, 0.5], [10.9, 43.2, 0.42], [13.4, 41.2, 0.46],
    [14.3, 43.5, 0.38], [12.2, 40.9, 0.34], [8.9, 42.8, 0.32]
  ];
  pads.forEach(([px, pz, ps], i) => {
    const pad = new THREE.Mesh(new THREE.CircleGeometry(ps, 16), padMat);
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(px, 0.05, pz);
    g.add(pad);
    if (i % 2 === 0) {
      const flower = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 7), MAT.blossom);
      flower.position.set(px, 0.16, pz);
      g.add(flower);
    }
  });

  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe07a34, roughness: 0.55 });
  const spotMat = new THREE.MeshStandardMaterial({ color: 0xf4e3c4, roughness: 0.6 });
  for (let i = 0; i < 5; i++) {
    const fish = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), bodyMat);
    body.scale.set(1.9, 0.55, 0.85);
    fish.add(body);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.2, 6), bodyMat);
    tail.rotation.z = Math.PI / 2;
    tail.position.x = -0.21;
    fish.add(tail);
    const spot = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), spotMat);
    spot.position.set(0.04, 0.045, 0.035);
    spot.scale.set(1.4, 0.5, 0.9);
    fish.add(spot);
    scene.add(fish);
    animated.koi.push({
      g: fish,
      a: (i / 5) * Math.PI * 2,
      r: 0.8 + (i % 3) * 0.42,
      speed: 0.35 + i * 0.045,
      cx: pond.x,
      cz: pond.z
    });
  }

  // flat stone bridge across the pond
  const bridge = CAMPUS.pondBridge;
  g.add(box(bridge.x1 - bridge.x0, 0.15, 1.5, MAT.stone, pond.x, 0.085, bridge.z));
  [-0.7, 0.7].forEach((dz) => {
    g.add(box(bridge.x1 - bridge.x0 + 0.4, 0.07, 0.08, MAT.stoneDark, pond.x, 0.64, bridge.z + dz));
    [bridge.x0 + 0.25, pond.x, bridge.x1 - 0.25].forEach((px) => {
      g.add(box(0.09, 0.58, 0.09, MAT.stoneDark, px, 0.35, bridge.z + dz));
    });
  });

  // rocks on the outer bank
  const rand = rng(811);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.25 + rand() * 0.2, 0), MAT.stoneDark);
    rock.position.set(pond.x + Math.cos(a) * (pond.rx + 0.25), 0.2, pond.z + Math.sin(a) * (pond.rz + 0.2));
    rock.rotation.set(rand() * 2, rand() * 2, rand() * 2);
    rock.castShadow = true;
    g.add(rock);
  }

  scene.add(g);
}

function buildPetals() {
  const geo = new THREE.CircleGeometry(0.075, 5);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xe9a3b2, roughness: 0.9, side: THREE.DoubleSide,
    transparent: true, opacity: 0.92
  });
  const rand = rng(707);
  for (let i = 0; i < 48; i++) {
    const m = new THREE.Mesh(geo, mat);
    const onPath = i < 30;
    const x = onPath ? (rand() - 0.5) * 11.5 : (rand() - 0.5) * 25;
    const z = 36.6 + rand() * 10.2;
    m.position.set(x, 0.028, z);
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = rand() * Math.PI * 2;
    m.scale.set(0.7 + rand() * 0.8, 0.55 + rand() * 0.7, 1);
    scene.add(m);
  }

  const airGeo = new THREE.CircleGeometry(0.065, 5);
  for (let i = 0; i < 22; i++) {
    const m = new THREE.Mesh(airGeo, mat);
    const x = (rand() - 0.5) * 22;
    const z = 37 + rand() * 10;
    m.position.set(x, 1.5 + rand() * 3.4, z);
    m.rotation.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI);
    scene.add(m);
    animated.petals.push({ mesh: m, baseX: x, baseZ: z, fall: 0.22 + rand() * 0.24, drift: 0.35 + rand() * 0.5, phase: rand() * 6.28 });
  }
}

function buildFarScenery() {
  const ridgeMat = new THREE.MeshStandardMaterial({ color: 0x5b6a79, roughness: 1 });
  const ridgeMat2 = new THREE.MeshStandardMaterial({ color: 0x6c7b85, roughness: 1 });
  const rand = rng(919);
  const far = [
    [-34, -22, 15, 12], [-22, -24, 22, 15], [-10, -23, 18, 13],
    [-26, -15, 11, 9], [8, -24, 24, 16], [22, -22, 17, 12],
    [34, -23, 20, 14], [16, -16, 10, 8]
  ];
  far.forEach(([x, z, h, r], i) => {
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), i % 2 ? ridgeMat : ridgeMat2);
    m.position.set(x, h / 2 - 0.2, z);
    m.rotation.y = rand() * 1.2;
    m.scale.z = 0.8;
    scene.add(m);
  });

  const pagoda = new THREE.Group();
  pagoda.position.set(13.5, 0, -15.5);
  pagoda.add(box(5.4, 0.6, 5.4, MAT.stoneDark, 0, 0.3, 0));
  let w = 4.6;
  for (let i = 0; i < 5; i++) {
    const y = 0.75 + i * 2.35;
    pagoda.add(box(w * 0.58, 1.8, w * 0.58, i % 2 ? MAT.whiteWall : MAT.redPillar, 0, y + 0.9, 0));
    const r = hipRoof(w, w, 1.05, MAT.roof);
    r.position.y = y + 1.8;
    pagoda.add(r);
    w *= 0.84;
  }
  const spire = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.5, 8), MAT.gold);
  spire.position.y = 13.3;
  pagoda.add(spire);
  pagoda.scale.set(1.25, 1.25, 1.25);
  scene.add(pagoda);
}

function buildApproach() {
  pavingPlane(12.4, 12.4, 0, 41.4, [4, 4]);
  pavingPlane(19.5, 4.6, 0, 37.6, [8, 2]);
  pavingPlane(3.4, 5.4, 16.2, 39.4, [1.4, 2.2]);

  buildKoiPond();
  buildFarScenery();

  buildStoneLantern(-5.9, 38.7);
  buildStoneLantern(5.9, 38.7);
  buildStoneLantern(-16.0, 45.8);
  buildStoneLantern(16.2, 45.6);

  buildTree(-11.2, 40.2, 1.5, 2);
  buildTree(-14.6, 45.8, 1.2, 2);
  buildTree(-7.9, 46.6, 0.95, 2);
  buildTree(16.9, 38.2, 1.25, 2);
  buildTree(15.6, 46.9, 0.9, 2);
  buildTree(-17.0, 38.0, 1.05, 0);
  buildTree(17.2, 43.9, 0.85, 1);

  [-1, 1].forEach((side) => {
    const x = side * 7.3;
    const gap = side > 0;
    if (gap) {
      [38.9, 40.8, 44.6, 46.4].forEach((z) => addFencePost(x, z));
      const railA = box(0.1, 0.09, 2.5, MAT.woodPath, x, 0.78, 39.9);
      railA.castShadow = true;
      scene.add(railA);
      scene.add(box(0.09, 0.08, 2.5, MAT.woodPath, x, 0.44, 39.9));
      scene.add(box(0.1, 0.09, 3.4, MAT.woodPath, x, 0.78, 45.4));
      scene.add(box(0.09, 0.08, 3.4, MAT.woodPath, x, 0.44, 45.4));
      walk.boxes.push({ x0: x - 0.18, x1: x + 0.18, z0: 38.6, z1: 41.35 });
      walk.boxes.push({ x0: x - 0.18, x1: x + 0.18, z0: 43.45, z1: 46.8 });
    } else {
      for (let i = 0; i < 5; i++) addFencePost(x, 38.9 + i * 1.85);
      const rail = box(0.1, 0.09, 8.4, MAT.woodPath, x, 0.78, 42.7);
      rail.castShadow = true;
      scene.add(rail);
      scene.add(box(0.09, 0.08, 8.4, MAT.woodPath, x, 0.44, 42.7));
      walk.boxes.push({ x0: x - 0.18, x1: x + 0.18, z0: 38.6, z1: 46.8 });
    }
  });

  buildPetals();

  walk.points.push(
    { id: 'gateOutside', x: 0, z: 38.4, r: 4.6, label: 'Cổng trường', hint: 'chạm để bước vào' },
    { id: 'yardEntry', x: 2.2, z: 31.2, r: 3.6, label: 'Sân trường', hint: 'chạm để vào lớp' },
    { id: 'classroomDoor', x: 0, z: 10.8, r: 2.6, label: 'Lớp học', hint: 'chạm để bước vào' },
    { id: 'pond', x: 11.7, z: 39.5, r: 2.6, label: 'Hồ cá koi', hint: 'cầu đá' }
  );
}

function addFencePost(x, z) {
  scene.add(box(0.16, 0.95, 0.16, MAT.woodPath, x, 0.475, z));
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), MAT.woodDark);
  cap.position.set(x, 0.99, z);
  scene.add(cap);
}

function buildStudyDesk(x, z, id) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  g.add(box(2.6, 0.12, 0.98, MAT.woodPath, 0, 0.77, 0));
  [-1.12, 1.12].forEach((px) => {
    [-0.37, 0.37].forEach((pz) => {
      g.add(box(0.11, 0.72, 0.11, MAT.woodDark, px, 0.36, pz));
    });
  });
  g.add(box(2.4, 0.09, 0.1, MAT.woodDark, 0, 0.25, 0));
  g.add(box(0.09, 0.09, 0.66, MAT.woodDark, -1.0, 0.25, 0));
  g.add(box(0.09, 0.09, 0.66, MAT.woodDark, 1.0, 0.25, 0));

  const book = new THREE.Group();
  book.position.set(0.18, 0.85, 0.02);
  const pageMat = new THREE.MeshStandardMaterial({ color: 0xf2e7cc, roughness: 0.95 });
  [-1, 1].forEach((side) => {
    const page = box(0.34, 0.015, 0.46, pageMat, side * 0.18, 0.02, 0, { rot: [0, 0, side * 0.09] });
    book.add(page);
  });
  book.rotation.y = 0.25;
  g.add(book);
  g.add(cyl(0.028, 0.028, 0.32, MAT.ink, -0.75, 0.87, 0.12, 8, { rot: [0, 0, 1.15], cast: false }));
  g.add(box(0.14, 0.07, 0.14, MAT.ink, -0.92, 0.84, 0.12, { cast: false }));
  g.add(box(0.2, 0.12, 0.14, MAT.ceramic, -0.55, 0.83, -0.26));

  [-0.8, 0.8].forEach((pz) => {
    g.add(box(2.6, 0.1, 0.42, MAT.woodPath, 0, 0.47, pz));
    [-1.14, 1.14].forEach((px) => {
      g.add(box(0.1, 0.42, 0.38, MAT.woodDark, px, 0.235, pz));
    });
  });

  scene.add(g);

  walk.boxes.push({ x0: x - 1.34, x1: x + 1.34, z0: z - 0.58, z1: z + 0.58 });
  walk.boxes.push({ x0: x - 1.34, x1: x + 1.34, z0: z - 1.03, z1: z - 0.62 });
  walk.boxes.push({ x0: x - 1.34, x1: x + 1.34, z0: z + 0.62, z1: z + 1.03 });

  const makeSpot = (sx, sz, ry) => {
    const standX = sx - Math.sin(ry) * 1.55;
    const standZ = sz - Math.cos(ry) * 1.55;
    walk.points.push({
      id: id + (ry === 0 ? '-b' : '-a'),
      x: sx, z: sz, ry, r: 1.85,
      label: 'Ngồi học', hint: 'bàn sân trường',
      stand: { x: standX, z: standZ },
      act: { type: 'sit' }
    });
  };
  makeSpot(x, z - 0.8, 0);
  makeSpot(x, z + 0.8, Math.PI);

  return g;
}

function buildSandcastle(x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const tower = (tx, tz, r, h) => {
    g.add(cyl(r, r * 1.12, h, MAT.sand, tx, h / 2, tz, 12));
    const roof = new THREE.Mesh(new THREE.ConeGeometry(r * 1.2, r * 1.5, 8), MAT.sand);
    roof.position.set(tx, h + r * 0.7, tz);
    roof.castShadow = true;
    g.add(roof);
  };
  tower(0, 0, 0.26, 0.55);
  tower(-0.35, 0.18, 0.17, 0.34);
  tower(0.34, 0.16, 0.17, 0.38);
  tower(0.02, -0.3, 0.15, 0.3);
  g.add(box(0.9, 0.12, 0.08, MAT.woodDark, 0, 0.2, 0.37));
  scene.add(g);
  return g;
}

function campusBuilding(opts) {
  const o = opts;
  const g = new THREE.Group();
  g.position.set(o.x, 0, o.z);
  g.rotation.y = o.rot || 0;
  const w = o.w;
  const d = o.d;
  const h = o.h;

  g.add(box(w + 0.5, 0.4, d + 0.5, MAT.stone, 0, 0.2, 0));
  g.add(box(w, h, d, MAT.whiteWall, 0, 0.4 + h / 2, 0));

  const front = d / 2 + 0.03;
  const floors = o.floors || 2;
  for (let f = 0; f < floors; f++) {
    const wy = 1.55 + f * (h / floors);
    const cols = o.cols || 3;
    for (let c = 0; c < cols; c++) {
      const wx = (c - (cols - 1) / 2) * (w / cols);
      g.add(box(1.05, 1.35, 0.08, MAT.windowDark, wx, wy, front));
      const glow = box(0.9, 1.2, 0.04, MAT.paperGlow, wx, wy, front + 0.05, { cast: false });
      g.add(glow);
      g.add(box(1.12, 0.08, 0.12, MAT.woodDark, wx, wy + 0.72, front + 0.02, { cast: false }));
      g.add(box(0.08, 1.42, 0.12, MAT.woodDark, wx, wy, front + 0.02, { cast: false }));
    }
  }
  const doorW = 1.5;
  g.add(box(doorW, 2.1, 0.12, MAT.woodDark, 0, 1.45, front + 0.03));
  g.add(box(doorW / 2 - 0.04, 1.9, 0.06, MAT.paperGlow, -doorW / 4, 1.45, front + 0.1, { cast: false }));
  g.add(box(doorW / 2 - 0.04, 1.9, 0.06, MAT.paperGlow, doorW / 4, 1.45, front + 0.1, { cast: false }));

  [-w / 2 + 0.25, w / 2 - 0.25].forEach((px) => {
    g.add(cyl(0.14, 0.17, h - 0.2, MAT.redPillar, px, 0.4 + h / 2 - 0.1, front + 0.35, 10));
  });
  g.add(box(w * 0.62, 0.28, 0.14, MAT.woodDark, 0, h + 0.28, front + 0.3, { cast: false }));

  const roof = hipRoof(w + 1.8, d + 1.6, 2.0, MAT.roof);
  roof.position.y = 0.4 + h;
  g.add(roof);

  [-w * 0.3, w * 0.3].forEach((px) => {
    const lantern = buildLantern(px, 0, 0, false);
    lantern.scale.setScalar(0.5);
    lantern.position.set(px, 3.1, front + 0.45);
    lantern.userData.phase = Math.random() * 6;
    g.add(lantern);
    animated.lanterns.push(lantern);
  });

  scene.add(g);
  addWalkBox(g, 0.25);
  return g;
}

function buildClassroomExterior() {
  const g = new THREE.Group();
  const roof = hipRoof(13.6, 16.8, 2.5, MAT.roof);
  roof.position.set(0, 5.12, 1.8);
  g.add(roof);
  g.add(box(11.6, 0.18, 0.5, MAT.woodDark, 0, 5.02, 9.02, { cast: false }));
  [-4.4, 4.4].forEach((x) => {
    g.add(cyl(0.13, 0.16, 4.9, MAT.redPillar, x, 2.45, 8.62, 12));
    addWalkCircle(x, 8.62, 0.3);
  });
  g.add(box(9.2, 0.26, 0.4, MAT.woodDark, 0, 4.72, 8.62));
  const steps = box(11, 0.08, 1.5, MAT.stone, 0, 0.04, 9.55, { cast: false });
  steps.receiveShadow = true;
  g.add(steps);
  scene.add(g);
  return g;
}

function buildCampus() {
  scene.background = new THREE.Color(0x2c3358);
  scene.fog = new THREE.Fog(0x8a6a4d, 36, 96);

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(130, 32, 20),
    new THREE.MeshBasicMaterial({ map: TX.sky, side: THREE.BackSide, fog: false, depthWrite: false })
  );
  sky.rotation.y = Math.PI * 0.15;
  scene.add(sky);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.MeshStandardMaterial({ map: TX.grass, roughness: 0.98 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.02, 20);
  ground.receiveShadow = true;
  scene.add(ground);

  pavingPlane(4.6, 27.2, 0, 22.2, [2, 13]);
  pavingPlane(46, 4.4, 0, 21.8, [22, 2]);
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(4.6, 48), pavingMat([2, 2]));
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.set(0, 0.014, 30);
  plaza.receiveShadow = true;
  scene.add(plaza);
  pavingPlane(11, 2.6, 0, 9.9, [5, 1.2]);

  buildClassroomExterior();

  const library = campusBuilding({
    x: -15, z: 16.5, w: 8.4, d: 8.4, h: 6.2, rot: Math.PI / 2,
    floors: 2, cols: 3
  });
  const canteen = campusBuilding({
    x: 15, z: 16.5, w: 8.4, d: 8.4, h: 6.2, rot: -Math.PI / 2,
    floors: 2, cols: 3
  });

  buildGate();
  buildApproach();
  buildFlagpole();

  buildSwingSet(13.2, 27.2);
  buildSlide(17.6, 24.4);
  buildSeesaw(10.4, 30.6);
  buildSandbox(13.4, 32.0);
  buildHoop(19.0, 30.6);

  const lake = CAMPUS.lake;
  const water = new THREE.Mesh(new THREE.CircleGeometry(1, 64), MAT.water);
  water.rotation.x = -Math.PI / 2;
  water.scale.set(lake.rx, lake.rz, 1);
  water.position.set(lake.x, 0.035, lake.z);
  water.receiveShadow = true;
  scene.add(water);

  const shore = new THREE.Mesh(new THREE.RingGeometry(0.94, 1.04, 64), MAT.stoneDark);
  shore.rotation.x = -Math.PI / 2;
  shore.scale.set(lake.rx, lake.rz, 1);
  shore.position.set(lake.x, 0.03, lake.z);
  shore.receiveShadow = true;
  scene.add(shore);

  const padMat = new THREE.MeshStandardMaterial({ color: 0x3d6b44, roughness: 0.9 });
  const petalMat = new THREE.MeshStandardMaterial({ color: 0xe5a2b0, roughness: 0.86 });
  const pads = [
    [-16.1, 24.4, 1.1], [-15.0, 27.4, 0.9], [-10.9, 24.9, 1.0],
    [-9.8, 27.9, 0.85], [-14.0, 22.9, 0.75], [-11.6, 28.8, 0.8]
  ];
  pads.forEach(([px, pz, ps], i) => {
    const pad = new THREE.Mesh(new THREE.CircleGeometry(ps, 18), padMat);
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(px, 0.055, pz);
    pad.receiveShadow = true;
    scene.add(pad);
    if (i % 2 === 0) {
      const flower = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.3, 8), petalMat);
      flower.position.set(px + 0.1, 0.2, pz);
      flower.castShadow = true;
      scene.add(flower);
    }
  });

  buildBridge();
  buildPavilion(-20.0, 27.6);
  buildRockery(-18.2, 32.0);

  [-4.5, -2.2, 2.2, 4.5].forEach((x) => buildStoneLantern(x, 12.0));
  [-4.5, -2.2, 2.2, 4.5].forEach((x) => buildStoneLantern(x, 33.6));
  buildStoneLantern(-8.6, 26.6);
  buildStoneLantern(8.2, 26.6);

  buildTree(-3.4, 12.2, 0.85, 2);
  buildTree(3.4, 12.2, 0.85, 2);
  buildTree(-20.8, 11.4, 1.15, 0);
  buildTree(-20.8, 19.8, 1.0, 1);
  buildTree(20.8, 11.4, 1.1, 0);
  buildTree(20.8, 19.8, 1.0, 1);
  buildTree(-7.6, 10.8, 0.9, 2);
  buildTree(7.6, 10.8, 0.9, 0);
  buildTree(-7.0, 33.4, 1.0, 1);
  buildTree(7.0, 33.4, 1.0, 1);
  buildTree(-20.8, 33.2, 1.0, 0);
  buildTree(20.8, 33.2, 1.0, 2);
  buildTree(-8.4, 23.4, 0.85, 2);
  buildTree(-8.2, 29.2, 0.8, 0);
  buildTree(-20.6, 23.2, 1.05, 2);
  buildTree(-6.4, 17.0, 0.75, 0);
  buildTree(6.4, 17.0, 0.75, 2);
  buildTree(7.0, 23.2, 0.8, 1);
  buildTree(6.6, 34.2, 0.7, 2);

  buildBench(-3.6, 14.4, Math.PI / 2);
  buildBench(3.6, 14.4, -Math.PI / 2);
  buildBench(-3.6, 18.8, Math.PI / 2);
  buildBench(3.6, 18.8, -Math.PI / 2);
  buildBench(-3.6, 26.4, Math.PI / 2);
  buildBench(3.6, 26.4, -Math.PI / 2);

  pavingPlane(3.6, 3.0, -5.9, 25.4, [1.6, 1.4]);
  pavingPlane(3.6, 3.0, 5.9, 25.4, [1.6, 1.4]);
  buildStudyDesk(-5.9, 25.4, 'deskW');
  buildStudyDesk(5.9, 25.4, 'deskE');

  buildFlowerBed(-4.2, 9.8, 2.3, 1.0, 0);
  buildFlowerBed(4.2, 9.8, 2.3, 1.0, 0);
  buildFlowerBed(-5.4, 33.0, 2.4, 1.0, 0);
  buildFlowerBed(5.4, 33.0, 2.4, 1.0, 0);

  // notice board
  const board = new THREE.Group();
  board.position.set(-4.6, 0, 10.6);
  board.rotation.y = 0.35;
  board.add(box(2.2, 1.3, 0.1, MAT.woodDark, 0, 1.5, 0));
  board.add(box(1.95, 1.08, 0.04, MAT.cream, 0, 1.5, 0.07, { cast: false }));
  [-0.85, 0.85].forEach((px) => board.add(box(0.1, 1.6, 0.1, MAT.woodDark, px, 0.8, 0)));
  board.add(box(2.5, 0.12, 0.4, MAT.roof, 0, 2.24, 0, { cast: false }));
  scene.add(board);
  addWalkBox(board, 0.1);

  // trilingual signs
  signSprite('教室', 'jiào shì', 'Lớp học', 0, 8.5, 9.2, 4.2);
  signSprite('老师', 'lǎo shī', 'Thầy giáo', 0, 2.95, -2.7, 2.4);
  signSprite('图书馆', 'tú shū guǎn', 'Thư viện', -15, 9.6, 16.5, 4.0);
  signSprite('食堂', 'shí táng', 'Nhà ăn', 15, 9.6, 16.5, 4.0);
  signSprite('游乐场', 'yóu lè chǎng', 'Khu vui chơi', 13.2, 5.6, 27.4, 3.6);
  signSprite('荷花湖', 'hé huā hú', 'Hồ sen', -13, 3.3, 23.0, 3.2);
  signSprite('石桥', 'shí qiáo', 'Cầu đá', -13, 3.4, 29.8, 2.8);
  signSprite('亭子', 'tíng zi', 'Chòi nghỉ', -20, 5.8, 27.6, 2.8);
  signSprite('校门', 'xiào mén', 'Cổng trường', 0, 9.3, 35.6, 3.8);
  signSprite('旗杆', 'qí gān', 'Cột cờ', 0, 9.0, 30, 2.8);
  signSprite('公告栏', 'gōng gào lán', 'Bảng tin', -4.6, 3.5, 10.6, 2.5);
  signSprite('大树', 'dà shù', 'Cây lớn', -20.8, 5.4, 11.4, 2.3);
  signSprite('长椅', 'cháng yǐ', 'Ghế dài', 3.6, 2.1, 14.4, 2.1);
  signSprite('秋千', 'qiū qiān', 'Xích đu', 13.2, 4.5, 27.2, 2.4);
  signSprite('滑梯', 'huá tī', 'Cầu trượt', 17.6, 3.6, 24.4, 2.4);
  signSprite('跷跷板', 'qiāo qiāo bǎn', 'Bập bênh', 10.4, 2.2, 30.6, 2.4);
  signSprite('沙坑', 'shā kēng', 'Hố cát', 13.4, 1.9, 32.0, 2.2);
  signSprite('花坛', 'huā tán', 'Bồn hoa', 4.2, 1.9, 9.8, 2.2);
  signSprite('假山', 'jiǎ shān', 'Hòn non bộ', -18.2, 3.8, 32.0, 2.4);
  signSprite('篮球架', 'lán qiú jià', 'Trụ bóng rổ', 19.0, 4.9, 30.6, 2.4);
  signSprite('石灯', 'shí dēng', 'Đèn đá', 2.2, 2.4, 12.0, 2.0);
  signSprite('书桌', 'shū zhuō', 'Bàn học sân trường', -5.9, 2.5, 24.4, 2.8);
  signSprite('书桌', 'shū zhuō', 'Bàn học sân trường', 5.9, 2.5, 24.4, 2.8);
  signSprite('锦鲤池', 'jǐn lǐ chí', 'Hồ cá koi', 11.7, 2.7, 40.2, 3.2);
  signSprite('石狮', 'shí shī', 'Sư tử đá', 4.35, 3.6, 36.6, 2.5);
  signSprite('牌匾', 'pái biǎn', 'Biển “Trường”', 0, 6.8, 36.4, 3.0);

  walk.points.push(
    { id: 'library', x: -9.6, z: 16.5, r: 2.6 },
    { id: 'canteen', x: 9.6, z: 16.5, r: 2.6 },
    { id: 'playground', x: 9.2, z: 25.6, r: 2.6 },
    { id: 'lake', x: -7.4, z: 25.6, r: 2.4 },
    { id: 'gate', x: 0, z: 32.9, r: 2.6 }
  );
}

/* ---------------- scene assembly ---------------- */
function buildScene(scrollTex, shojiTex) {
  if (!shojiTex) shojiTex = texFrom(fallbackShojiCanvas(), { clamp: true });
  buildRoom();
  buildCampus();
  buildLights();

  buildBoard();

  const backShoji = buildShoji(1.5, 3.05, shojiTex);
  backShoji.position.set(-4.62, 2.48, -5.15);
  scene.add(backShoji);

  const leftShoji = buildShoji(1.75, 2.95, shojiTex);
  leftShoji.position.set(-5.43, 2.4, -2.7);
  leftShoji.rotation.y = Math.PI / 2;
  scene.add(leftShoji);

  const leftShoji2 = buildShoji(1.75, 2.95, shojiTex);
  leftShoji2.position.set(-5.43, 2.4, 1.5);
  leftShoji2.rotation.y = Math.PI / 2;
  scene.add(leftShoji2);

  const rightShoji = buildShoji(1.7, 2.95, shojiTex);
  rightShoji.position.set(5.43, 2.4, -1.9);
  rightShoji.rotation.y = -Math.PI / 2;
  scene.add(rightShoji);

  scene.add(buildCabinet());

  const scroll = buildScroll(scrollTex);
  scene.add(scroll);
  registerHotspot('starter', scroll);
  addAnchor('starter', 2.45, 3.92, -5.03);

  const shelf = buildShelf();
  scene.add(shelf);
  registerHotspot('shelf', shelf);
  addAnchor('shelf', 4.15, 2.98, -4.88);

  const teacher = buildTeacher();
  scene.add(teacher);
  registerHotspot('teacher', teacher);
  addAnchor('teacher', 0, 2.22, -2.68);

  const lampState = {};
  const desk = buildDesk(lampState);
  scene.add(desk);
  registerHotspot('desk', desk);
  addAnchor('desk', 0, 1.24, 1.22);
  animated.lamp = lampState.light || null;

  const levels = buildLevelRack();
  scene.add(levels);
  registerHotspot('levels', levels);
  addAnchor('levels', -2.36, 2.32, 0.74);

  const skills = buildSkillRack();
  scene.add(skills);
  registerHotspot('skills', skills);
  addAnchor('skills', 2.36, 2.32, 0.74);

  [-3.15, 3.15].forEach((x) => {
    const l = buildLantern(x, 3.6, -1.15);
    scene.add(l);
    animated.lanterns.push(l);
  });

  const student = buildStudent();
  student.position.set(SPAWN.x, 0, SPAWN.z);
  student.rotation.y = SPAWN.ry;
  scene.add(student);
  walk.player = student;
  walk.parts = student.userData.parts;

  walk.boxes.push(
    { x0: -1.58, x1: 1.58, z0: 0.7, z1: 1.84 },
    { x0: -3.18, x1: -1.62, z0: -0.08, z1: 1.56 },
    { x0: 1.62, x1: 3.18, z0: -0.08, z1: 1.56 },
    { x0: 3.28, x1: 5.08, z0: -5.2, z1: -4.52 },
    { x0: -5.08, x1: -3.6, z0: -5.15, z1: -4.5 }
  );
  walk.circles.push({ x: 0, z: -2.7, r: 0.55 });
  walk.points.push(
    { id: 'teacher', x: 0, z: -1.45, r: 1.55 },
    { id: 'desk', x: 0, z: 2.8, r: 1.55 },
    { id: 'levels', x: -2.4, z: 2.25, r: 1.45 },
    { id: 'skills', x: 2.4, z: 2.25, r: 1.45 },
    { id: 'starter', x: 2.45, z: -3.0, r: 1.55 },
    { id: 'shelf', x: 3.0, z: -3.4, r: 1.7 }
  );

  buildDust();
}

/* ---------------- camera / renderer ---------------- */
function homeView() {
  const aspect = viewAspect();
  if (aspect < 0.65) {
    return { cam: [0, 2.3, 7.0], target: [0, 1.5, -0.9], fov: 52 };
  }
  if (aspect < 0.8) {
    return { cam: [0, 2.4, 8.1], target: [0, 1.42, -0.85], fov: 55 };
  }
  if (aspect < 1.25) {
    return { cam: [0, 2.55, 6.9], target: [0, 1.5, -0.75], fov: 50 };
  }
  return { cam: [0, 2.15, 5.5], target: [0, 1.55, -0.6], fov: 46 };
}

function applyHomeView() {
  const h = homeView();
  camera.position.set(h.cam[0], h.cam[1], h.cam[2]);
  camera.fov = h.fov;
  camera.updateProjectionMatrix();
  controls.target.set(h.target[0], h.target[1], h.target[2]);
  controls.update();
}

function setupRenderer() {
  renderer = new THREE.WebGLRenderer({
    canvas: $('#stage3d'),
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance'
  });
  const vp = viewSize();
  dprCap = Math.min(window.devicePixelRatio || 1, vp.w < 820 ? 1.6 : 1.9);
  dprNow = dprCap;
  renderer.setPixelRatio(dprNow);
  renderer.setSize(vp.w, vp.h, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene = new THREE.Scene();
  clock = new THREE.Clock();

  const h = homeView();
  camera = new THREE.PerspectiveCamera(h.fov, vp.w / vp.h, 0.1, 260);
  camera.position.set(h.cam[0], h.cam[1], h.cam[2]);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(h.target[0], h.target[1], h.target[2]);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.enablePan = false;
  controls.minDistance = 2;
  controls.maxDistance = 12;
  controls.minPolarAngle = 0.62;
  controls.maxPolarAngle = 1.62;
  controls.minAzimuthAngle = -0.62;
  controls.maxAzimuthAngle = 0.62;
  controls.rotateSpeed = 0.55;
  controls.zoomSpeed = 0.8;
  controls.update();

  controls.addEventListener('start', () => {
    camTween = null;
    controls.enabled = true;
  });

  MAX_ANISO = renderer.capabilities.getMaxAnisotropy();
}

/* ---------------- UI ---------------- */
let panelBody;
let scenePanel;

function createHotspotLabels() {
  const layer = $('#hotspots');
  const dock = $('#hotspotDock');
  Object.entries(HOTSPOT_META).forEach(([id, meta]) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'hotspot';
    btn.dataset.hotspot = id;
    btn.setAttribute('aria-label', 'Mở ' + meta.label);
    btn.innerHTML = `<span>${meta.label}</span><span class="hotspot-hint">${meta.hint}</span>`;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openPanel(id);
    });
    btn.addEventListener('pointerenter', () => setHover(id));
    btn.addEventListener('pointerleave', () => setHover(null));
    btn.addEventListener('focus', () => setHover(id));
    btn.addEventListener('blur', () => setHover(null));
    layer.appendChild(btn);
    labelEls[id] = btn;

    if (dock) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'dock-chip';
      chip.textContent = meta.label;
      chip.addEventListener('click', () => openPanel(id));
      dock.appendChild(chip);
    }
  });
}

function updateLabels() {
  const vp = viewSize();
  const w = vp.w;
  const h = vp.h;
  const topSafe = w < 820 ? 138 : 92;
  const bottomSafe = w < 820 ? 96 : 76;
  const show = labelsOn && !activeHotspot && !walk.on;
  Object.entries(anchors).forEach(([id, anchor]) => {
    const el = labelEls[id];
    if (!el) return;
    if (!show) {
      el.classList.remove('is-visible');
      return;
    }
    tmpVec.setFromMatrixPosition(anchor.matrixWorld);
    tmpVec.project(camera);
    const x = (tmpVec.x * 0.5 + 0.5) * w;
    const y = (-tmpVec.y * 0.5 + 0.5) * h;
    const visible = tmpVec.z > -1 && tmpVec.z < 1 && x > 54 && x < w - 54 && y > topSafe && y < h - bottomSafe;
    el.style.setProperty('--x', x.toFixed(1) + 'px');
    el.style.setProperty('--y', y.toFixed(1) + 'px');
    el.classList.toggle('is-visible', visible);
  });
  const showSigns = labelsOn && walk.on && !activeHotspot;
  for (let i = 0; i < signSprites.length; i++) {
    const s = signSprites[i];
    if (!showSigns) { s.visible = false; continue; }
    const d = s.position.distanceToSquared(camera.position);
    s.visible = d > 11.56;
  }
}

function setHover(id) {
  const next = id && pickableById[id] ? id : null;
  if (next === hoveredId) return;
  if (hoveredId && labelEls[hoveredId]) labelEls[hoveredId].classList.remove('is-hover');
  hoveredId = next;
  if (next && labelEls[next]) labelEls[next].classList.add('is-hover');
  if (renderer) renderer.domElement.style.cursor = next ? 'pointer' : 'grab';
  if (hoverBox) {
    if (next) {
      const obj = pickableById[next];
      const b = new THREE.Box3().setFromObject(obj);
      hoverBox.box.copy(b);
      hoverBox.visible = true;
    } else {
      hoverBox.visible = false;
    }
  }
}

function openPanel(id) {
  const make = PANELS[id];
  if (!make) return;
  activeHotspot = id;
  panelBody.innerHTML = make();
  if (id === 'teacher') bindTeacherPanel();
  panelBody.scrollTop = 0;
  scenePanel.inert = false;
  scenePanel.classList.add('open');
  scenePanel.setAttribute('aria-hidden', 'false');
  setHover(null);
  hoverBox.visible = false;

  if (walk.on) {
    walk.keys.clear();
    walk.target = null;
    walk.stick.active = false;
    walk.stick.x = walk.stick.y = 0;
    resetStick();
  }

  const f = FOCUS[id];
  if (f && !isPortrait() && !walk.on) {
    tweenCamera(f.cam, f.target, 0.85);
  }
}

function closePanel(skipTween) {
  if (!activeHotspot) return;
  activeHotspot = null;
  if (window.TD && window.TD.Speech) window.TD.Speech.stop();
  scenePanel.classList.remove('open');
  scenePanel.setAttribute('aria-hidden', 'true');
  scenePanel.inert = true;
  if (!skipTween && !isPortrait() && !walk.on) {
    const h = homeView();
    tweenCamera(h.cam, h.target, 0.85);
  }
}

function tweenCamera(camArr, targetArr, dur) {
  if (!camera || !controls) return;
  camTween = {
    p0: camera.position.clone(),
    p1: new THREE.Vector3(camArr[0], camArr[1], camArr[2]),
    t0: controls.target.clone(),
    t1: new THREE.Vector3(targetArr[0], targetArr[1], targetArr[2]),
    t: 0,
    dur: dur || 0.85
  };
  controls.enabled = false;
}

function resetView() {
  if (walk.on) {
    exitWalk();
    return;
  }
  closePanel(true);
  const h = homeView();
  if (isPortrait()) {
    camera.position.set(h.cam[0], h.cam[1], h.cam[2]);
    camera.fov = h.fov;
    camera.updateProjectionMatrix();
    controls.target.set(h.target[0], h.target[1], h.target[2]);
    controls.update();
  } else {
    tweenCamera(h.cam, h.target, 0.9);
  }
}

/* ---------------- playable student + campus presence ---------------- */
function makeVisitorId() {
  try {
    if (crypto && crypto.randomUUID) return crypto.randomUUID();
  } catch (e) { /* fall through */ }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function cleanName(v) {
  return String(v || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 24) || 'Học trò';
}

function loadSelf() {
  const C = window.TD && window.TD.Classroom;
  if (C) {
    const who = C.identity();
    self.id = who.id;
    self.name = who.name || '';
  } else {
    try {
      const raw = localStorage.getItem('thaydo.player.v2');
      if (raw) {
        const o = JSON.parse(raw);
        if (o && typeof o.id === 'string' && /^[0-9a-f-]{36}$/i.test(o.id)) {
          self.id = o.id;
          self.name = cleanName(o.name);
        }
      }
    } catch (e) { /* storage can be blocked */ }
  }
  if (!self.id) self.id = makeVisitorId();
  if (!self.name || self.name === 'Học trò') self.name = '';
  saveSelf();
}

function saveSelf() {
  const C = window.TD && window.TD.Classroom;
  if (C) {
    const who = C.identity();
    if (who.name !== self.name) C.setName(self.name);
    return;
  }
  try {
    localStorage.setItem('thaydo.player.v2', JSON.stringify({ id: self.id, name: self.name }));
  } catch (e) { /* ignore */ }
}

function colorForId(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return new THREE.Color().setHSL((h % 360) / 360, 0.42, 0.42).getHex();
}

function attachName(mesh, name) {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texFrom(nameCanvas(name || 'Học trò'), { clamp: true }),
    transparent: true,
    depthWrite: false,
    depthTest: true
  }));
  sprite.scale.set(1.32, 0.371, 1);
  sprite.position.set(0, 1.98, 0);
  sprite.renderOrder = 5;
  mesh.add(sprite);
  return sprite;
}

function setLabelName(sprite, name) {
  if (!sprite) return;
  const old = sprite.material.map;
  sprite.material.map = texFrom(nameCanvas(name || 'Học trò'), { clamp: true });
  sprite.material.needsUpdate = true;
  if (old) old.dispose();
}

function walkFov() {
  const a = viewAspect();
  if (a < 0.65) return 66;
  if (a < 1) return 60;
  if (a < 1.5) return 56;
  return 52;
}

function walkCamDistance() {
  const a = viewAspect();
  if (a < 0.65) return 5.2;
  if (a < 1) return 4.7;
  return 4.1;
}

function walkCameraAtSpawn() {
  const yaw = SPAWN.ry;
  const dist = walkCamDistance();
  const bx = Math.sin(yaw) * -dist;
  const bz = Math.cos(yaw) * -dist;
  return new THREE.Vector3(SPAWN.x + bx, 2.2, SPAWN.z + bz);
}

function groundHeight(x, z) {
  if (isOnBridge(x, z)) return bridgeHeight(z) + 0.07;
  if (isOnPondBridge(x, z)) return 0.17;
  if (x > -22.2 && x < -17.8 && z > 25.4 && z < 29.8) return 0.3;
  return 0;
}

function canStand(x, z) {
  const R = 0.3;
  const inClass = x > CLASSROOM.x0 + R && x < CLASSROOM.x1 - R && z > CLASSROOM.z0 + R && z < CLASSROOM.z1;
  const inYard = x > YARD.x0 + R && x < YARD.x1 - R && z > YARD.z0 && z < YARD.z1 - R;
  const inApproach = x > APPROACH.x0 + R && x < APPROACH.x1 - R && z > APPROACH.z0 && z < APPROACH.z1 - R;
  if (!inClass && !inYard && !inApproach) return false;
  for (let i = 0; i < walk.boxes.length; i++) {
    const b = walk.boxes[i];
    if (x > b.x0 - R && x < b.x1 + R && z > b.z0 - R && z < b.z1 + R) return false;
  }
  const lake = CAMPUS.lake;
  const lx = (x - lake.x) / lake.rx;
  const lz = (z - lake.z) / lake.rz;
  if (lx * lx + lz * lz < 1 && !isOnBridge(x, z)) return false;
  const pond = CAMPUS.pond;
  const px = (x - pond.x) / pond.rx;
  const pz = (z - pond.z) / pond.rz;
  if (px * px + pz * pz < 1 && !isOnPondBridge(x, z)) return false;
  for (let i = 0; i < walk.circles.length; i++) {
    const c = walk.circles[i];
    if (Math.hypot(x - c.x, z - c.z) < c.r + R) return false;
  }
  return true;
}

function updateHudHint() {
  const el = $('#hudHint');
  if (!el) return;
  el.innerHTML = walk.on
    ? '<span class="hint-dot"></span>W A S D để đi · Shift chạy · E mở / ngồi / chơi · kéo để xoay camera'
    : '<span class="hint-dot"></span>Kéo để xoay lớp · cuộn để lại gần · chạm đồ vật để mở bài · bấm Đi dạo để qua cổng trường';
}

function resetStick() {
  const knob = $('#walkStickKnob');
  const ring = $('#walkStick');
  if (knob) knob.style.transform = 'translate(0px, 0px)';
  if (ring) ring.classList.remove('is-active');
}

const WALK_MODAL_MODES = {
  join: {
    title: 'Tham gia lớp học',
    intro: 'Đặt tên nhân vật của bạn để thầy và các bạn nhận ra khi đi dạo trong trường.',
    submit: 'Vào lớp 3D',
    cancel: 'Để sau',
    note: 'Không cần đăng nhập. Bạn có thể đổi tên bất cứ lúc nào khi đi dạo.'
  },
  walk: {
    title: 'Đặt tên trước cổng trường',
    intro: 'Bạn đang đứng ngoài cổng Trường. Đặt tên cho học trò rồi bước qua cổng để vào khuôn viên.',
    submit: 'Qua cổng vào trường',
    cancel: 'Đứng lại',
    note: 'Không cần đăng nhập. Tên hiện trên đầu nhân vật và có thể đổi bất cứ lúc nào.'
  },
  rename: {
    title: 'Đổi tên học trò',
    intro: 'Tên mới sẽ hiện trên đầu nhân vật và với mọi người trong trường.',
    submit: 'Lưu tên',
    cancel: 'Huỷ',
    note: 'Tên chỉ hiện trong lớp học này, không cần đăng nhập.'
  }
};
let walkModalMode = 'walk';

function openWalkModal(mode) {
  const modal = $('#walkModal');
  if (!modal) return;
  loadSelf();
  walkModalMode = WALK_MODAL_MODES[mode] ? mode : (walk.on ? 'rename' : 'walk');
  const copy = WALK_MODAL_MODES[walkModalMode];
  const title = $('#walkTitle');
  const intro = $('#walkIntro');
  const submit = $('#walkSubmit');
  const cancel = $('#walkCancel');
  const note = $('.walk-card-note');
  if (title) title.textContent = copy.title;
  if (intro) intro.textContent = copy.intro;
  if (submit) submit.textContent = copy.submit;
  if (cancel) cancel.textContent = copy.cancel;
  if (note) note.textContent = copy.note;
  const C = window.TD && window.TD.Classroom;
  const countEl = $('#walkCount');
  if (countEl) {
    const n = C ? C.getCount() : null;
    countEl.textContent = n == null ? '…' : String(n);
  }
  const input = $('#walkName');
  if (input) {
    input.value = self.name || '';
    input.setCustomValidity('');
  }
  modal.hidden = false;
  walk.keys.clear();
  walk.target = null;
  walk.stick.active = false;
  walk.stick.x = walk.stick.y = 0;
  resetStick();
  setTimeout(() => {
    if (input) { input.focus(); input.select(); }
  }, 60);
}

function closeWalkModal() {
  const modal = $('#walkModal');
  if (modal) modal.hidden = true;
}

function submitWalkName(e) {
  if (e) e.preventDefault();
  const input = $('#walkName');
  const raw = input ? input.value.trim() : '';
  if (!raw) {
    if (input) {
      input.setCustomValidity('Hãy nhập một tên ngắn để mọi người nhận ra bạn.');
      input.reportValidity();
    }
    return;
  }
  if (input) input.setCustomValidity('');
  const mode = walkModalMode;
  self.name = cleanName(raw);
  saveSelf();
  closeWalkModal();

  const C = window.TD && window.TD.Classroom;
  const finish = (n) => {
    const total = Number.isFinite(n) ? n : (C ? C.getCount() : null);
    if (window.TD && window.TD.toast) window.TD.toast('Chào ' + self.name + '! Hiện có ' + (total == null ? '…' : total) + ' học sinh đang học.');
  };

  // Vào lớp ngay, không chờ máy chủ điểm danh (mạng yếu vẫn vào được).
  if (mode === 'walk' || mode === 'join') {
    enterWalk();
  } else if (walk.on) {
    if (walk.nameLabel) setLabelName(walk.nameLabel, self.name);
    remote.poll = 0;
    presenceTick(true);
  }

  if (C) C.heartbeat(true).then(finish, () => finish(null));
  else finish(null);
}

function requestWalk() {
  if (walk.on) { exitWalk(); return; }
  loadSelf();
  if (self.name && self.name !== 'Học trò') enterWalk();
  else openWalkModal('walk');
}

function enterWalk() {
  if (!walk.on && !walk.player) return;
  loadSelf();
  self.name = cleanName(self.name);
  saveSelf();
  walk.on = true;
  walk.baseY = 0;
  walk.phase = 0;
  walk.target = null;
  walk.near = null;
  walk.activity = null;
  walk.moving = false;
  walk.keys.clear();
  walk.stick.active = false;
  walk.stick.x = walk.stick.y = 0;
  resetStick();

  walk.player.visible = true;
  walk.player.position.set(SPAWN.x, 0, SPAWN.z);
  walk.player.rotation.set(0, SPAWN.ry, 0);
  resetPose(walk.parts);
  if (walk.nameLabel) setLabelName(walk.nameLabel, self.name);
  else walk.nameLabel = attachName(walk.player, self.name);
  walk.promptId = null;

  closePanel(true);
  document.body.classList.add('walking');
  const btn = $('#walkToggle');
  if (btn) btn.setAttribute('aria-pressed', 'true');
  const btnText = $('#walkToggleText');
  if (btnText) btnText.textContent = 'Về lớp';
  const ui = $('#walkUI');
  if (ui) { ui.hidden = false; ui.setAttribute('aria-hidden', 'false'); }
  const C = window.TD && window.TD.Classroom;
  if (C) C.setWalking(true);
  setOnline(C && C.getCount() != null ? C.getCount() : remote.online || 1, false);

  camera.fov = walkFov();
  camera.updateProjectionMatrix();
  camTween = null;
  controls.enabled = true;
  controls.minDistance = 2.2;
  controls.maxDistance = 8.5;
  controls.minPolarAngle = 0.38;
  controls.maxPolarAngle = 1.46;
  controls.minAzimuthAngle = -Infinity;
  controls.maxAzimuthAngle = Infinity;
  camera.position.copy(walkCameraAtSpawn());
  controls.target.set(SPAWN.x, 1.7, SPAWN.z);
  controls.update();

  updateHudHint();
  updateWalkPrompt();
  remote.poll = 0;
  remote.offline = false;
  remote.retryAt = 0;
  presenceTick(true);
}

function exitWalk() {
  if (!walk.on) return;
  walk.on = false;
  walk.keys.clear();
  walk.target = null;
  walk.near = null;
  walk.activity = null;
  walk.stick.active = false;
  walk.stick.x = walk.stick.y = 0;
  resetStick();
  if (walk.player) {
    walk.player.visible = false;
    walk.player.rotation.set(0, SPAWN.ry, 0);
  }
  resetPose(walk.parts);
  document.body.classList.remove('walking');
  closePanel(true);

  const btn = $('#walkToggle');
  if (btn) btn.setAttribute('aria-pressed', 'false');
  const btnText = $('#walkToggleText');
  if (btnText) btnText.textContent = 'Đi dạo';
  const ui = $('#walkUI');
  if (ui) { ui.hidden = true; ui.setAttribute('aria-hidden', 'true'); }
  const C = window.TD && window.TD.Classroom;
  if (C) C.setWalking(false);
  walk.promptId = null;
  const prompt = $('#walkPrompt');
  if (prompt) prompt.hidden = true;
  const action = $('#walkAction');
  if (action) { action.disabled = true; action.classList.remove('is-ready'); }

  remote.players.forEach((r) => scene.remove(r.mesh));
  remote.players.clear();
  remote.lastSeen.clear();
  remote.online = 0;

  controls.minDistance = 2;
  controls.maxDistance = 12;
  controls.minPolarAngle = 0.62;
  controls.maxPolarAngle = 1.62;
  controls.minAzimuthAngle = -0.62;
  controls.maxAzimuthAngle = 0.62;
  controls.enabled = true;
  const h = homeView();
  camera.fov = h.fov;
  camera.updateProjectionMatrix();
  camera.position.set(h.cam[0], h.cam[1], h.cam[2]);
  controls.target.set(h.target[0], h.target[1], h.target[2]);
  controls.update();
  updateHudHint();
  if (renderer) renderer.domElement.style.cursor = 'grab';
}

function updateWalkPrompt() {
  const el = $('#walkPrompt');
  const txt = $('#walkPromptText');
  const action = $('#walkAction');
  const a = walk.activity;
  if (!el) return;

  if (a) {
    if (txt) {
      txt.textContent = a.type === 'swing'
        ? 'Đang chơi xích đu · E xuống'
        : 'Đang ngồi học ở sân trường · E đứng dậy';
    }
    el.hidden = false;
    if (action) {
      action.disabled = false;
      action.classList.add('is-ready');
      setActionLabel(a.type === 'swing' ? 'Xuống' : 'Đứng');
    }
    walk.promptId = 'activity';
    return;
  }

  const p = walk.near;
  if (p) {
    const meta = HOTSPOT_META[p.id] || POIS[p.id];
    const label = p.label || (meta ? (meta.label || meta.vi) : 'Xem');
    const hint = p.hint || (meta && meta.hint ? meta.hint : '');
    if (txt) txt.textContent = label + (hint ? ' · ' + hint : '');
    el.hidden = false;
    if (action) {
      action.disabled = false;
      action.classList.add('is-ready');
      setActionLabel(p.act
        ? (p.act.type === 'sit' ? 'Ngồi' : p.act.type === 'swing' ? 'Chơi' : 'Xây')
        : 'Mở');
    }
    if (walk.promptId !== p.id) {
      walk.promptId = p.id;
      const act = $('#walkAction');
      if (act) act.classList.add('is-pulse');
      setTimeout(() => { if (act) act.classList.remove('is-pulse'); }, 380);
    }
  } else {
    el.hidden = true;
    if (action) { action.disabled = true; action.classList.remove('is-ready'); }
    setActionLabel('Mở');
    walk.promptId = null;
  }
}

function setActionLabel(text) {
  const btn = $('#walkAction');
  if (!btn) return;
  const span = btn.querySelector('span');
  if (span) span.textContent = text;
  btn.setAttribute('aria-label', text);
}

function animateAvatar(parts, moving, phase, t) {
  if (!parts) return;
  const amp = moving ? 0.44 : 0;
  const swing = Math.sin(phase) * amp;
  parts.legL.rotation.x = swing;
  parts.legR.rotation.x = -swing;
  parts.armL.rotation.x = -swing * 0.72 + (moving ? 0 : Math.sin(t * 1.1) * 0.035);
  parts.armR.rotation.x = swing * 0.72 + (moving ? 0 : Math.sin(t * 1.1 + 1.4) * 0.035);
  parts.headG.rotation.y = Math.sin(t * 0.6 + phase * 0.25) * 0.06;
}

function poseSeated(parts, swinging) {
  if (!parts) return;
  parts.legL.rotation.set(swinging ? 0.48 : 1.46, 0, 0.06);
  parts.legR.rotation.set(swinging ? 0.48 : 1.46, 0, -0.06);
  parts.armL.rotation.set(swinging ? 1.12 : 0.62, 0, -0.06);
  parts.armR.rotation.set(swinging ? 1.12 : 0.62, 0, 0.06);
  parts.headG.rotation.set(0.05, 0, 0);
}

function resetPose(parts) {
  if (!parts) return;
  parts.legL.rotation.set(0, 0, 0);
  parts.legR.rotation.set(0, 0, 0);
  parts.armL.rotation.set(0, 0, 0);
  parts.armR.rotation.set(0, 0, 0);
  parts.headG.rotation.set(0, 0, 0);
}

function sitDown(pt) {
  const p = walk.player;
  if (!p || !pt) return;
  const from = { x: p.position.x, z: p.position.z, ry: p.rotation.y };
  walk.activity = {
    type: 'sit',
    from,
    spot: pt,
    y: Number.isFinite(pt.y) ? pt.y : 0.18
  };
  p.position.set(pt.x, walk.activity.y, pt.z);
  p.rotation.set(0, pt.ry || 0, 0);
  walk.baseY = walk.activity.y;
  poseSeated(walk.parts, false);
  walk.near = pt;
  updateWalkPrompt();
  if (window.TD && window.TD.toast) window.TD.toast('Đang ngồi học ở sân trường. Nhấn E để đứng dậy.');
}

function rideSwing(pt) {
  const p = walk.player;
  if (!p) return;
  const from = { x: p.position.x, z: p.position.z, ry: p.rotation.y };
  const seat = pt.act || {};
  walk.activity = {
    type: 'swing',
    from,
    spot: pt,
    seat: {
      x: Number.isFinite(seat.seatX) ? seat.seatX : pt.x,
      z: Number.isFinite(seat.seatZ) ? seat.seatZ : pt.z,
      phase: Number.isFinite(seat.phase) ? seat.phase : 0
    }
  };
  p.position.set(walk.activity.seat.x, 0.5, walk.activity.seat.z);
  p.rotation.set(0, 0, 0);
  walk.baseY = 0;
  poseSeated(walk.parts, true);
  walk.near = pt;
  updateWalkPrompt();
  if (window.TD && window.TD.toast) window.TD.toast('Đang chơi xích đu! Nhấn E để xuống.');
}

function standUp() {
  const a = walk.activity;
  if (!a) return;
  walk.activity = null;
  const p = walk.player;
  if (p) {
    p.position.set(a.from.x, 0, a.from.z);
    p.rotation.set(0, a.from.ry || 0, 0);
  }
  walk.baseY = groundHeight(a.from.x, a.from.z);
  resetPose(walk.parts);
  walk.near = null;
  walk.promptId = null;
  updateWalkPrompt();
}

function updateActivity(dt, t) {
  const a = walk.activity;
  const p = walk.player;
  if (!a || !p) return;
  if (a.type === 'swing') {
    const th = Math.sin(t * 1.35 + a.seat.phase) * 0.34;
    p.position.set(
      a.seat.x,
      0.5 + 1.98 * (1 - Math.cos(th)),
      a.seat.z - 1.98 * Math.sin(th)
    );
    p.rotation.set(0, 0, 0);
    if (walk.parts) {
      walk.parts.legL.rotation.x = 0.48 + Math.sin(t * 1.35 + a.seat.phase) * 0.05;
      walk.parts.legR.rotation.x = 0.48 + Math.sin(t * 1.35 + a.seat.phase) * 0.05;
    }
    followFocus.set(a.seat.x, 1.15, a.seat.z);
  } else {
    p.position.y = a.y;
    if (walk.parts) {
      walk.parts.headG.rotation.y = Math.sin(t * 0.55) * 0.11;
      walk.parts.headG.rotation.x = 0.09 + Math.sin(t * 0.8) * 0.02;
      walk.parts.armR.rotation.x = 0.62 + Math.sin(t * 1.5) * 0.06;
    }
    followFocus.set(p.position.x, 1.3, p.position.z);
  }
  followDelta.copy(followFocus).sub(controls.target);
  camera.position.add(followDelta);
  controls.target.copy(followFocus);
  if (camera.position.y < 0.72) camera.position.y = 0.72;
}

function addSandcastle() {
  const slots = [
    [-0.9, 0.35], [0.9, 0.3], [-0.2, -0.55], [0.45, 0.65],
    [-1.15, -0.35], [1.15, -0.45], [0.1, 0.6]
  ];
  const slot = slots[walk.builds.length % slots.length];
  const castle = buildSandcastle(13.4 + slot[0], 32.0 + slot[1]);
  walk.builds.push(castle);
  while (walk.builds.length > 7) {
    const old = walk.builds.shift();
    scene.remove(old);
    old.traverse((o) => { if (o.isMesh && o.geometry) o.geometry.dispose(); });
  }
  if (window.TD && window.TD.toast) window.TD.toast('Con vừa xây thêm một lâu đài cát! Thử xây cả một thành phố nhé.');
}

function activateSpot(pt) {
  if (!pt) return;
  if (walk.activity) { standUp(); return; }
  const act = pt.act;
  if (!act) { openPanel(pt.id); return; }
  if (act.type === 'sit') sitDown(pt);
  else if (act.type === 'swing') rideSwing(pt);
  else if (act.type === 'build') addSandcastle();
}


function updateWalk(dt, t) {
  const p = walk.player;
  if (!p || !walk.on) return;
  if (walk.activity) {
    const k = walk.keys;
    const wantsMove = k.has('KeyW') || k.has('KeyS') || k.has('KeyA') || k.has('KeyD') ||
      k.has('ArrowUp') || k.has('ArrowDown') || k.has('ArrowLeft') || k.has('ArrowRight') ||
      (walk.stick.active && Math.hypot(walk.stick.x, walk.stick.y) > 0.18);
    if (wantsMove) {
      standUp();
      return;
    }
    updateActivity(dt, t);
    presenceTick(false);
    return;
  }
  const modal = $('#walkModal');
  const frozen = !!activeHotspot || !!(modal && !modal.hidden);
  const k = walk.keys;
  let ix = 0;
  let iz = 0;
  if (!frozen) {
    if (k.has('KeyW') || k.has('ArrowUp')) iz += 1;
    if (k.has('KeyS') || k.has('ArrowDown')) iz -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) ix += 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) ix -= 1;
    if (walk.stick.active) {
      ix += walk.stick.x;
      iz += walk.stick.y;
    }
  } else {
    walk.target = null;
  }
  const mag = Math.hypot(ix, iz);
  if (mag > 1) { ix /= mag; iz /= mag; }
  const run = k.has('ShiftLeft') || k.has('ShiftRight');
  const speed = run ? 3.5 : 2.0;
  const inputLen = Math.min(1, mag);
  let moved = false;

  if (inputLen > 0.08) {
    walk.target = null;
    camera.getWorldDirection(walkFwd);
    walkFwd.y = 0;
    if (walkFwd.lengthSq() < 1e-5) walkFwd.set(0, 0, -1);
    walkFwd.normalize();
    walkRight.crossVectors(walkFwd, UP).normalize();
    walkDir.set(0, 0, 0).addScaledVector(walkFwd, iz).addScaledVector(walkRight, ix);
    if (walkDir.lengthSq() > 1e-4) {
      walkDir.normalize();
      const step = speed * inputLen * dt;
      const nx = p.position.x + walkDir.x * step;
      const nz = p.position.z + walkDir.z * step;
      if (canStand(nx, p.position.z)) { p.position.x = nx; moved = true; }
      if (canStand(p.position.x, nz)) { p.position.z = nz; moved = true; }
      const yaw = Math.atan2(walkDir.x, walkDir.z);
      let diff = yaw - p.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      p.rotation.y += diff * Math.min(1, dt * 11);
    }
  } else if (walk.target) {
    const dx = walk.target.x - p.position.x;
    const dz = walk.target.z - p.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.22) {
      walk.target = null;
    } else {
      const step = Math.min(dist, speed * dt);
      const nx = p.position.x + (dx / dist) * step;
      const nz = p.position.z + (dz / dist) * step;
      let ok = false;
      if (canStand(nx, p.position.z)) { p.position.x = nx; ok = true; }
      if (canStand(p.position.x, nz)) { p.position.z = nz; ok = true; }
      if (!ok) walk.target = null;
      moved = ok;
      const yaw = Math.atan2(dx, dz);
      let diff = yaw - p.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      p.rotation.y += diff * Math.min(1, dt * 11);
      if (moved) walk.target = { x: walk.target.x, z: walk.target.z };
    }
  }

  walk.moving = moved;
  if (moved) walk.phase += dt * (run ? 10.8 : 7.4);
  const gh = groundHeight(p.position.x, p.position.z);
  walk.baseY += (gh - walk.baseY) * Math.min(1, dt * 9);
  const bob = moved ? Math.abs(Math.sin(walk.phase)) * 0.022 : 0;
  p.position.y = walk.baseY + bob;
  animateAvatar(walk.parts, moved, walk.phase, t);

  followFocus.set(p.position.x, 1.7 + walk.baseY, p.position.z);
  followDelta.copy(followFocus).sub(controls.target);
  camera.position.add(followDelta);
  controls.target.copy(followFocus);

  if (p.position.z < 8.9 && Math.abs(p.position.x) < 5.2) {
    camera.position.x = clamp(camera.position.x, -5.05, 5.05);
    camera.position.y = clamp(camera.position.y, 0.95, 4.55);
    camera.position.z = Math.min(camera.position.z, 12.4);
    if (camera.position.z < p.position.z + 3.4) camera.position.z = p.position.z + 3.4;
  }
  if (camera.position.y < 0.72) camera.position.y = 0.72;

  let best = null;
  let bestD = Infinity;
  for (let i = 0; i < walk.points.length; i++) {
    const pt = walk.points[i];
    const d = Math.hypot(p.position.x - pt.x, p.position.z - pt.z);
    if (d < pt.r && d < bestD) { best = pt; bestD = d; }
  }
  const prev = walk.near ? walk.near.id : null;
  walk.near = best;
  if ((best ? best.id : null) !== prev) updateWalkPrompt();

  presenceTick(false);
}

const ENTER_STEPS = {
  gateOutside: { x: 2.2, z: 31.2, msg: 'Bước qua cổng vào sân trường…' },
  yardEntry: { x: 0, z: 10.8, msg: 'Đi theo lối đá vào lớp học…' },
  classroomDoor: { x: 0, z: 4.2, msg: 'Bước vào lớp học…' }
};

function enterSpot(id) {
  const step = ENTER_STEPS[id];
  if (!step || !walk.player) return false;
  closePanel(true);
  walk.target = { x: step.x, z: step.z };
  walk.near = null;
  walk.promptId = null;
  if (window.TD && typeof window.TD.toast === 'function') window.TD.toast(step.msg);
  updateWalkPrompt();
  return true;
}

function interact() {
  if (!walk.on) return;
  if (walk.activity) { standUp(); return; }
  if (!walk.near) return;
  const pt = walk.near;
  if (enterSpot(pt.id)) return;
  if (pt.act) { activateSpot(pt); return; }
  if (activeHotspot === pt.id) closePanel(false);
  else openPanel(pt.id);
}

function walkTap(clientX, clientY) {
  if (!walk.on || !walk.player || activeHotspot) return;
  if (walk.activity) return;
  const modal = $('#walkModal');
  if (modal && !modal.hidden) return;
  const id = pickAt(clientX, clientY);
  if (id) {
    const pt = walk.points.find((p) => p.id === id);
    if (pt) {
      walk.target = pt.stand ? { x: pt.stand.x, z: pt.stand.z } : { x: pt.x, z: pt.z };
      return;
    }
  }
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.ray.intersectPlane(floorPlane, tmpVec);
  if (!hit) return;
  const p = walk.player.position;
  const dx = tmpVec.x - p.x;
  const dz = tmpVec.z - p.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.4) return;
  const max = 22;
  const k = Math.min(1, max / d);
  walk.target = { x: p.x + dx * k, z: p.z + dz * k };
}

/* ---------------- presence ---------------- */
function setOnline(n, offline) {
  remote.online = n;
  remote.offline = !!offline;
  const C = window.TD && window.TD.Classroom;
  if (C && !offline && Number.isFinite(n) && n > 0) C.setCount(n);
  const btn = $('#classJoinBtn');
  if (btn) btn.classList.toggle('is-offline', !!offline);
}

function createRemotePlayer(id, name, x, z, ry) {
  const mesh = buildStudent({ robe: colorForId(id) });
  mesh.visible = true;
  mesh.position.set(x, 0, z);
  mesh.rotation.y = ry;
  const label = attachName(mesh, name);
  scene.add(mesh);
  return {
    id, name, mesh, parts: mesh.userData.parts, label,
    tx: x, tz: z, yaw: ry, phase: Math.random() * 6,
    moving: false, last: performance.now()
  };
}

function removeRemotePlayer(id) {
  const r = remote.players.get(id);
  if (!r) return;
  scene.remove(r.mesh);
  r.mesh.traverse((o) => {
    if (o.isMesh && o.geometry) o.geometry.dispose();
  });
  const own = r.mesh.userData.ownMats || [];
  for (let i = 0; i < own.length; i++) own[i].dispose();
  if (r.label) {
    if (r.label.material.map) r.label.material.map.dispose();
    r.label.material.dispose();
  }
  remote.players.delete(id);
  remote.lastSeen.delete(id);
}

function applyPresence(list, count) {
  const now = performance.now();
  const seen = new Set();
  for (let i = 0; i < list.length; i++) {
    const raw = list[i];
    if (!raw || typeof raw.id !== 'string' || raw.id === self.id) continue;
    if (typeof raw.x !== 'number' || typeof raw.z !== 'number') continue;
    if (!isFinite(raw.x) || !isFinite(raw.z)) continue;
    seen.add(raw.id);
    const name = cleanName(raw.name);
    let r = remote.players.get(raw.id);
    if (!r) {
      r = createRemotePlayer(raw.id, name, clamp(raw.x, -30, 40), clamp(raw.z, -20, 40), 0);
      remote.players.set(raw.id, r);
    }
    if (r.name !== name) { r.name = name; setLabelName(r.label, name); }
    r.tx = clamp(raw.x, -30, 40);
    r.tz = clamp(raw.z, -20, 40);
    r.yaw = typeof raw.ry === 'number' && isFinite(raw.ry) ? raw.ry : r.yaw;
    r.last = now;
    remote.lastSeen.set(raw.id, now);
    remote.online = Math.max(remote.online, 1);
  }
  Array.from(remote.players.keys()).forEach((id) => {
    if (!seen.has(id) && now - (remote.lastSeen.get(id) || 0) > 9000) removeRemotePlayer(id);
  });
  const total = Number.isFinite(count) ? count : seen.size + 1;
  setOnline(Math.max(1, total), false);
}

async function presenceTick(force) {
  if (!walk.on || document.hidden || !walk.player) return;
  const now = performance.now();
  if (remote.polling) return;
  if (!force) {
    if (now - remote.poll < 2400) return;
    if (remote.offline && now < remote.retryAt) return;
  }
  remote.poll = now;
  remote.polling = true;
  const p = walk.player;
  const payload = JSON.stringify({
    id: self.id,
    name: self.name || 'Học trò',
    x: Math.round(p.position.x * 100) / 100,
    z: Math.round(p.position.z * 100) / 100,
    ry: Math.round(p.rotation.y * 100) / 100
  });
  try {
    const res = await fetch('/functions/v1/app/presence', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      cache: 'no-store',
      body: payload
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (!data || !Array.isArray(data.players)) throw new Error('invalid payload');
    applyPresence(data.players, data.count);
  } catch (e) {
    remote.offline = true;
    remote.retryAt = performance.now() + 12000;
    setOnline(remote.online || 0, true);
  } finally {
    remote.polling = false;
  }
}

function updateRemotePlayers(dt, t) {
  remote.players.forEach((r) => {
    const dx = r.tx - r.mesh.position.x;
    const dz = r.tz - r.mesh.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 0.03) {
      const step = Math.min(dist, dt * Math.max(1.6, dist * 5));
      r.mesh.position.x += (dx / dist) * step;
      r.mesh.position.z += (dz / dist) * step;
      r.moving = dist > 0.14;
      r.phase += dt * (r.moving ? 7.2 : 0);
      const yaw = Math.atan2(dx, dz);
      let diff = yaw - r.mesh.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      r.mesh.rotation.y += diff * Math.min(1, dt * 8);
    } else {
      r.moving = false;
    }
    const gy = groundHeight(r.mesh.position.x, r.mesh.position.z);
    r.mesh.position.y += (gy - r.mesh.position.y) * Math.min(1, dt * 8);
    animateAvatar(r.parts, r.moving, r.phase, t);
    if (r.name !== cleanName(r.name)) r.name = cleanName(r.name);
  });
  if (walk.on) presenceTick(false);
}

function updateHud() {
  try {
    const P = window.TD && window.TD.Progress;
    if (!P) return;
    const s = P.get();
    const r = P.rank();
    const xp = $('#sceneXp');
    const streak = $('#sceneStreak');
    const rank = $('#sceneRank');
    if (xp) xp.textContent = (s.xp || 0).toLocaleString('vi-VN') + ' XP';
    if (streak) streak.textContent = '🔥 ' + ((s.streak && s.streak.n) || 0) + ' ngày';
    if (rank) rank.textContent = r.name;
  } catch (e) { /* progress is optional */ }
}

function bindUI() {
  scenePanel = $('#scenePanel');
  panelBody = $('#panelBody');
  scenePanel.inert = true;
  $('#panelClose').addEventListener('click', () => closePanel(false));

  const toggle = $('#toggleHints');
  toggle.setAttribute('aria-pressed', String(labelsOn));
  toggle.addEventListener('click', () => {
    labelsOn = !labelsOn;
    toggle.setAttribute('aria-pressed', String(labelsOn));
    if (!labelsOn) Object.values(labelEls).forEach((el) => el.classList.remove('is-visible'));
  });

  $('#resetCam').addEventListener('click', resetView);

  const walkBtn = $('#walkToggle');
  if (walkBtn) walkBtn.addEventListener('click', requestWalk);
  const walkExit = $('#walkExit');
  if (walkExit) walkExit.addEventListener('click', exitWalk);
  const walkRename = $('#walkRename');
  if (walkRename) walkRename.addEventListener('click', () => openWalkModal('rename'));
  const walkActionBtn = $('#walkAction');
  if (walkActionBtn) walkActionBtn.addEventListener('click', interact);
  const walkPromptBtn = $('#walkPrompt');
  if (walkPromptBtn) {
    walkPromptBtn.setAttribute('role', 'button');
    walkPromptBtn.setAttribute('tabindex', '0');
    walkPromptBtn.addEventListener('click', interact);
    walkPromptBtn.addEventListener('keydown', (e) => {
      if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); interact(); }
    });
  }
  const walkForm = $('#walkForm');
  if (walkForm) walkForm.addEventListener('submit', submitWalkName);
  const walkCancel = $('#walkCancel');
  if (walkCancel) {
    walkCancel.addEventListener('click', () => {
      if (walkModalMode === 'join') {
        try { sessionStorage.setItem('thaydo.join.dismissed', '1'); } catch (e) { /* ignore */ }
      }
      closeWalkModal();
    });
  }
  const walkModal = $('#walkModal');
  if (walkModal) walkModal.addEventListener('click', (e) => { if (e.target === walkModal) closeWalkModal(); });
  const walkNameInput = $('#walkName');
  if (walkNameInput) walkNameInput.addEventListener('input', () => walkNameInput.setCustomValidity(''));

  const C = window.TD && window.TD.Classroom;
  if (C) {
    C.onChange((snap) => {
      const wc = $('#walkCount');
      if (wc && snap.count != null) wc.textContent = String(snap.count);
    });
    const wc = $('#walkCount');
    if (wc && C.getCount() != null) wc.textContent = String(C.getCount());
  }
  if (window.TD) window.TD.openJoin = () => openWalkModal(walk.on ? 'rename' : 'join');

  const walkStickEl = $('#walkStick');
  const walkKnobEl = $('#walkStickKnob');
  if (walkStickEl) {
    const readStick = (e) => {
      const r = walkStickEl.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const maxR = r.width * 0.34;
      let dx = e.clientX - cx;
      let dy = e.clientY - cy;
      const d = Math.hypot(dx, dy);
      if (d > maxR) { dx = (dx / d) * maxR; dy = (dy / d) * maxR; }
      if (walkKnobEl) walkKnobEl.style.transform = 'translate(' + dx.toFixed(1) + 'px, ' + dy.toFixed(1) + 'px)';
      walk.stick.x = dx / maxR;
      walk.stick.y = -dy / maxR;
    };
    walkStickEl.addEventListener('pointerdown', (e) => {
      if (!walk.on) return;
      e.preventDefault();
      walk.stick.active = true;
      walk.stick.id = e.pointerId;
      walkStickEl.classList.add('is-active');
      try { walkStickEl.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      readStick(e);
    });
    walkStickEl.addEventListener('pointermove', (e) => {
      if (!walk.stick.active || e.pointerId !== walk.stick.id) return;
      e.preventDefault();
      readStick(e);
    });
    const endStick = (e) => {
      if (!walk.stick.active || (e && e.pointerId !== walk.stick.id)) return;
      walk.stick.active = false;
      walk.stick.id = null;
      walk.stick.x = walk.stick.y = 0;
      walkStickEl.classList.remove('is-active');
      resetStick();
    };
    walkStickEl.addEventListener('pointerup', endStick);
    walkStickEl.addEventListener('pointercancel', endStick);
    walkStickEl.addEventListener('lostpointercapture', endStick);
  }

  const MOVE_CODES = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight']);
  document.addEventListener('keydown', (e) => {
    const modal = $('#walkModal');
    if (e.key === 'Escape') {
      if (modal && !modal.hidden) { closeWalkModal(); return; }
      closePanel(false);
      return;
    }
    if (!walk.on) return;
    const tgt = e.target;
    if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.isContentEditable)) return;
    if (modal && !modal.hidden) return;
    if (e.code === 'KeyE') {
      if (!e.repeat) interact();
      e.preventDefault();
      return;
    }
    if (MOVE_CODES.has(e.code)) {
      walk.keys.add(e.code);
      e.preventDefault();
    }
  });
  document.addEventListener('keyup', (e) => {
    if (MOVE_CODES.has(e.code)) walk.keys.delete(e.code);
  });
  window.addEventListener('blur', () => {
    walk.keys.clear();
    walk.stick.active = false;
    walk.stick.x = walk.stick.y = 0;
    resetStick();
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) return;
    walk.keys.clear();
    walk.stick.active = false;
    walk.stick.x = walk.stick.y = 0;
    resetStick();
  });

  panelBody.addEventListener('click', (e) => {
    const chip = e.target.closest('.lv-chip');
    if (chip && chip.dataset.lv) {
      const lv = chip.dataset.lv;
      $$('.lv-chip', panelBody).forEach((b) => b.classList.toggle('is-on', b === chip));
      const label = $('#skillLevelLabel', panelBody);
      if (label) label.textContent = 'HSK ' + lv;
      $$('[data-skill]', panelBody).forEach((a) => {
        a.setAttribute('href', 'learn.html?level=' + lv + '&skill=' + a.dataset.skill);
      });
    }
  });

  document.addEventListener('xpchange', updateHud);
  document.addEventListener('progresschange', updateHud);

  window.addEventListener('resize', onResize);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize);
  if (window.ResizeObserver && renderer) {
    let pending = 0;
    const ro = new ResizeObserver(() => {
      if (pending) return;
      pending = requestAnimationFrame(() => { pending = 0; onResize(); });
    });
    ro.observe(renderer.domElement);
    window.__sceneResizeObserver = ro;
  }

  const canvas = renderer.domElement;
  canvas.addEventListener('pointerdown', (e) => {
    downInfo = { x: e.clientX, y: e.clientY, t: performance.now() };
  });
  canvas.addEventListener('pointerup', (e) => {
    const d = downInfo;
    downInfo = null;
    if (!d) return;
    const dist = Math.hypot(e.clientX - d.x, e.clientY - d.y);
    if (dist > 9 || performance.now() - d.t > 900) return;
    if (walk.on) { walkTap(e.clientX, e.clientY); return; }
    const id = pickAt(e.clientX, e.clientY);
    if (id) openPanel(id);
  });
  canvas.addEventListener('pointercancel', () => { downInfo = null; });

  if (window.matchMedia('(hover: hover)').matches) {
    canvas.addEventListener('pointermove', (e) => {
      if (walk.on) return;
      const now = performance.now();
      if (now - lastHoverCheck < 70) return;
      lastHoverCheck = now;
      setHover(pickAt(e.clientX, e.clientY));
    });
    canvas.addEventListener('pointerleave', () => setHover(null));
  }

  canvas.style.cursor = 'grab';
}

function pickAt(clientX, clientY) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(pickables, true);
  if (!hits.length) return null;
  let obj = hits[0].object;
  while (obj && !obj.userData.hotspot) obj = obj.parent;
  return obj ? obj.userData.hotspot : null;
}

function onResize() {
  if (!renderer || !camera) return;
  const { w, h } = viewSize();
  dprCap = Math.min(window.devicePixelRatio || 1, w < 820 ? 1.6 : 1.9);
  dprNow = Math.min(dprNow, dprCap);
  renderer.setPixelRatio(dprNow);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  if (walk.on) camera.fov = walkFov();
  else if (!activeHotspot) camera.fov = homeView().fov;
  camera.updateProjectionMatrix();
}

/* ---------------- animation ---------------- */
function easeInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.06);
  const t = clock.elapsedTime;

  perf.frames += 1;
  const nowMs = performance.now();
  if (!perf.last) perf.last = nowMs;
  if (nowMs - perf.last >= 1500) {
    const fps = (perf.frames * 1000) / (nowMs - perf.last);
    perf.frames = 0;
    perf.last = nowMs;
    let next = dprNow;
    if (fps < 48) next = Math.max(0.9, dprNow - 0.15);
    else if (fps > 57 && dprNow < dprCap) next = Math.min(dprCap, dprNow + 0.08);
    if (Math.abs(next - dprNow) > 0.04) {
      dprNow = next;
      renderer.setPixelRatio(dprNow);
    }
  }

  if (camTween) {
    camTween.t = Math.min(1, camTween.t + dt / camTween.dur);
    const k = easeInOut(camTween.t);
    camera.position.lerpVectors(camTween.p0, camTween.p1, k);
    controls.target.lerpVectors(camTween.t0, camTween.t1, k);
    if (camTween.t >= 1) {
      camTween = null;
      controls.enabled = true;
    }
  }
  controls.update();

  if (walk.on) updateWalk(dt, t);
  updateRemotePlayers(dt, t);

  if (animated.teacher) {
    animated.teacher.position.y = Math.sin(t * 0.85) * 0.012;
    if (animated.head) {
      animated.head.rotation.y = Math.sin(t * 0.33) * 0.075;
      animated.head.rotation.x = Math.sin(t * 0.51 + 1.4) * 0.022;
    }
  }
  animated.swings.forEach((s) => {
    s.g.rotation.x = Math.sin(t * 1.35 + s.phase) * 0.34;
  });
  animated.seesaws.forEach((s) => {
    s.g.rotation.z = Math.sin(t * 1.05 + s.phase) * 0.16;
  });
  if (animated.flags.length) {
    animated.flags.forEach((f) => {
      const attr = f.mesh.geometry.attributes.position;
      const base = f.base;
      for (let i = 0; i < attr.count; i++) {
        const bx = base[i * 3];
        const wave = (bx + 1.15) / 2.3;
        attr.array[i * 3 + 2] = Math.sin(bx * 3.1 + t * 2.6) * 0.11 * wave;
      }
      attr.needsUpdate = true;
    });
  }
  if (TX.water) {
    TX.water.offset.x = t * 0.008;
    TX.water.offset.y = Math.sin(t * 0.24) * 0.012;
  }
  animated.koi.forEach((k) => {
    k.a += dt * k.speed;
    k.g.position.set(
      k.cx + Math.cos(k.a) * k.r * 1.55,
      0.058,
      k.cz + Math.sin(k.a) * k.r * 0.8
    );
    k.g.rotation.y = -k.a - Math.PI / 2;
    k.g.rotation.z = Math.sin(t * 2.2 + k.a) * 0.08;
  });
  animated.petals.forEach((p) => {
    const m = p.mesh;
    m.position.y -= dt * p.fall;
    m.position.x = p.baseX + Math.sin(t * 0.5 + p.phase) * p.drift;
    m.position.z = p.baseZ + Math.cos(t * 0.36 + p.phase) * p.drift * 0.55;
    m.rotation.y += dt * 0.7;
    m.rotation.z += dt * 0.9;
    if (m.position.y < 0.06) m.position.y = 4.4 + (p.phase % 1.4);
  });
  animated.lanterns.forEach((l) => {
    const p = l.userData.phase || 0;
    l.rotation.z = Math.sin(t * 0.55 + p) * 0.035;
    l.rotation.x = Math.cos(t * 0.46 + p) * 0.02;
  });
  if (animated.lamp) {
    animated.lamp.intensity = 2.5 + Math.sin(t * 7.4) * 0.22 + Math.sin(t * 13.2) * 0.14;
  }
  if (animated.dust) {
    animated.dust.rotation.y = t * 0.008;
    animated.dust.position.y = Math.sin(t * 0.22) * 0.06;
  }

  scene.updateMatrixWorld();
  camera.updateMatrixWorld();
  renderer.render(scene, camera);
  perf.acc += dt;
  if (perf.acc >= 0.033) {
    perf.acc = 0;
    updateLabels();
  }
}

/* ---------------- boot ---------------- */
async function boot() {
  try {
    if (!hasWebGL()) {
      window.__sceneFallback('Trình duyệt chưa bật WebGL nên chưa mở được lớp học 3D. Bản phẳng vẫn đầy đủ bài học.');
      return;
    }
    await ensureFonts();
    setupRenderer();

    const [scrollTex, shojiTex] = await Promise.race([
      Promise.all([
        loadTexture('assets/scroll-art.jpg', 5000),
        loadTexture('assets/shoji-bamboo.jpg', 5000)
      ]),
      delay(5600).then(() => [null, null])
    ]);

    buildTextures();
    buildMaterials();
    buildScene(scrollTex, shojiTex);

    hoverBox = new THREE.Box3Helper(new THREE.Box3(), 0xe0b969);
    hoverBox.material.transparent = true;
    hoverBox.material.opacity = 0.55;
    hoverBox.material.depthTest = true;
    hoverBox.visible = false;
    scene.add(hoverBox);

    createHotspotLabels();
    loadSelf();
    bindUI();
    updateHud();

    renderer.render(scene, camera);
    window.__sceneReady = true;
    clearTimeout(window.__sceneTimer);
    clearTimeout(window.__sceneSlowTimer);
    const fallbackBox = $('#sceneFallback');
    if (fallbackBox) fallbackBox.hidden = true;
    const loaderBox = $('#sceneLoader');
    if (loaderBox) loaderBox.style.display = 'none';
    document.body.classList.add('scene-ready');
    animate();
  } catch (err) {
    console.error('[scene]', err);
    window.__sceneFallback('Không mở được lớp học 3D. ' + (err && err.message ? err.message : ''));
  }
}

boot();
