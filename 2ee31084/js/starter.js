/* starter.js — content for the beginner page */
(function () {
  'use strict';
  const { $, Speech, escapeHtml, toast } = window.TD;

  const TONES = [
    { han: '妈', py: 'mā', name: 'Thanh 1 · ngang', num: '55', path: 'M6,9 L94,9', say: '妈' },
    { han: '麻', py: 'má', name: 'Thanh 2 · sắc', num: '35', path: 'M6,32 C40,30 70,18 94,6', say: '麻' },
    { han: '马', py: 'mǎ', name: 'Thanh 3 · hỏi', num: '214', path: 'M6,18 C30,36 55,34 70,22 C80,14 88,11 94,10', say: '马' },
    { han: '骂', py: 'mà', name: 'Thanh 4 · nặng', num: '51', path: 'M6,6 C40,12 70,24 94,34', say: '骂' },
    { han: '吗', py: 'ma', name: 'Thanh nhẹ', num: '·', path: 'M6,20 L94,20', say: '吗' }
  ];

  const INITIALS = [
    ['b', '八'], ['p', '怕'], ['m', '妈'], ['f', '发'], ['d', '大'], ['t', '他'],
    ['n', '你'], ['l', '了'], ['g', '哥'], ['k', '可'], ['h', '好'], ['j', '家'],
    ['q', '去'], ['x', '小'], ['zh', '知'], ['ch', '吃'], ['sh', '是'], ['r', '人'],
    ['z', '字'], ['c', '词'], ['s', '四']
  ];

  const FINALS = [
    ['a', '啊'], ['o', '哦'], ['e', '饿'], ['i', '一'], ['u', '五'], ['ü', '女'],
    ['ai', '爱'], ['ei', '北'], ['ao', '好'], ['ou', '手'], ['an', '安'], ['en', '人'],
    ['ang', '上'], ['eng', '冷'], ['ong', '中'], ['ia', '家'], ['ie', '谢'], ['iao', '小'],
    ['iu', '六'], ['ian', '天'], ['in', '心'], ['iang', '想'], ['ing', '听'], ['iong', '熊'],
    ['ua', '花'], ['uo', '说'], ['uai', '快'], ['ui', '水'], ['uan', '弯'], ['un', '轮'],
    ['uang', '床'], ['ueng', '翁'], ['üe', '学'], ['üan', '元'], ['ün', '云'], ['er', '二']
  ];

  const STROKES = [
    ['一', 'Hoành · ngang'], ['丨', 'Thụ · dọc'], ['丿', 'Phiệt · xiên trái'], ['丶', 'Điểm · chấm'],
    ['乙', 'Khuất · móc'], ['亅', 'Móc đứng'], ['㇀', 'Đề · nhấc'], ['㇏', 'Nại · xiên phải']
  ];

  const RADICALS = [
    ['人 亻', 'người'], ['口', 'miệng'], ['大', 'to'], ['女', 'nữ'], ['子', 'con'],
    ['山', 'núi'], ['水 氵', 'nước'], ['火 灬', 'lửa'], ['木', 'gỗ'], ['日', 'mặt trời'],
    ['月', 'trăng / tháng'], ['心 忄', 'tim'], ['手 扌', 'tay'], ['目', 'mắt'], ['土', 'đất'],
    ['金 钅', 'kim loại'], ['言 讠', 'lời nói'], ['艹', 'cỏ'], ['宀', 'mái nhà'], ['辶', 'bước đi']
  ];

  const PHRASES = [
    ['你好', 'nǐ hǎo', 'Xin chào'],
    ['谢谢', 'xièxie', 'Cảm ơn'],
    ['不客气', 'bú kèqi', 'Không có gì'],
    ['对不起', 'duìbuqǐ', 'Xin lỗi'],
    ['没关系', 'méi guānxi', 'Không sao'],
    ['再见', 'zàijiàn', 'Tạm biệt'],
    ['请', 'qǐng', 'Mời / xin'],
    ['你好吗？', 'nǐ hǎo ma', 'Bạn khỏe không?'],
    ['我很好', 'wǒ hěn hǎo', 'Tôi rất khỏe'],
    ['你叫什么名字？', 'nǐ jiào shénme míngzi', 'Bạn tên là gì?'],
    ['很高兴认识你', 'hěn gāoxìng rènshi nǐ', 'Rất vui được biết bạn'],
    ['早上好', 'zǎoshang hǎo', 'Chào buổi sáng'],
    ['晚安', "wǎn'ān", 'Chúc ngủ ngon'],
    ['多少钱？', 'duōshao qián', 'Bao nhiêu tiền?'],
    ['太贵了', 'tài guì le', 'Đắt quá'],
    ['我听不懂', 'wǒ tīng bu dǒng', 'Tôi không hiểu'],
    ['请再说一遍', 'qǐng zài shuō yí biàn', 'Xin nói lại lần nữa'],
    ['洗手间在哪里？', 'xǐshǒujiān zài nǎli', 'Nhà vệ sinh ở đâu?'],
    ['你几点下班？', 'nǐ jǐ diǎn xiàbān', 'Mấy giờ bạn tan làm?'],
    ['我爱你', 'wǒ ài nǐ', 'Tôi yêu bạn']
  ];

  function speak(text) {
    if (!Speech.supported) { toast('Trình duyệt không hỗ trợ đọc tiếng Trung.'); return; }
    Speech.speak(text, { rate: 0.85 });
  }

  function renderTones() {
    $('#toneGrid').innerHTML = TONES.map((t, i) =>
      '<div class="tone-card" data-say="' + escapeHtml(t.say) + '">' +
      '<div class="tc-han">' + t.han + '</div>' +
      '<div class="tc-name">' + escapeHtml(t.py) + '</div>' +
      '<div class="tc-num">' + t.num + '</div>' +
      '<svg viewBox="0 0 100 40" preserveAspectRatio="none"><path d="' + t.path + '"/></svg>' +
      '<div class="small muted" style="margin-top:6px;font-size:.68rem">' + escapeHtml(t.name) + '</div>' +
      '</div>').join('');
    $('#toneGrid').addEventListener('click', (e) => {
      const c = e.target.closest('.tone-card');
      if (c) speak(c.dataset.say);
    });
  }

  function renderChips(id, items, withHan) {
    $(id).innerHTML = items.map(([label, han]) =>
      '<button class="chip" data-say="' + escapeHtml(han) + '" title="Nghe mẫu: ' + escapeHtml(han) + '">' +
      (withHan ? escapeHtml(label) : escapeHtml(label)) +
      (withHan ? ' <span class="muted" style="opacity:.65">' + escapeHtml(han) + '</span>' : '') +
      '</button>').join('');
    $(id).addEventListener('click', (e) => {
      const c = e.target.closest('.chip');
      if (c) speak(c.dataset.say);
    });
  }

  function renderStrokes() {
    $('#strokeGrid').innerHTML = STROKES.map(([g, n]) =>
      '<div class="stroke-card"><div class="sc-glyph">' + g + '</div><div class="sc-name">' + escapeHtml(n) + '</div></div>'
    ).join('');
  }

  function renderRadicals() {
    $('#radicalGrid').innerHTML = RADICALS.map(([g, m]) =>
      '<span class="chip" style="cursor:default"><span class="han-clean" style="font-size:1rem">' + escapeHtml(g) + '</span> <span class="muted" style="font-size:.76rem">' + escapeHtml(m) + '</span></span>'
    ).join('');
  }

  function renderPhrases() {
    $('#phraseList').innerHTML = PHRASES.map(([cn, py, vi]) =>
      '<div class="phrase">' +
      '<div><div class="ph-cn">' + escapeHtml(cn) + '</div><div class="ph-py">' + escapeHtml(py) + '</div></div>' +
      '<div class="ph-vi">' + escapeHtml(vi) + '</div>' +
      '<div style="display:flex;gap:6px">' +
      '<button class="icon-btn" data-say="' + escapeHtml(cn) + '" title="Nghe">🔊</button>' +
      '<button class="icon-btn" data-say="' + escapeHtml(cn) + '" data-slow="1" title="Nghe chậm">🐢</button>' +
      '<a class="icon-btn" href="learn.html?level=1&skill=write&w=' + encodeURIComponent(cn.slice(0, 1)) + '" title="Luyện viết chữ đầu">Viết</a>' +
      '</div>' +
      '</div>').join('');
    $('#phraseList').addEventListener('click', (e) => {
      const b = e.target.closest('[data-say]');
      if (!b) return;
      Speech.speak(b.dataset.say, { rate: b.dataset.slow ? 0.55 : 0.85 });
    });
  }

  renderTones();
  renderChips('#initialGrid', INITIALS, true);
  renderChips('#finalGrid', FINALS, true);
  renderStrokes();
  renderRadicals();
  renderPhrases();
})();
