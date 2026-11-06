(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const out = {};
  for (let i = 0; i < 50 && !document.getElementById('gamePad'); i++) await wait(200);
  await wait(800);
  const pad = document.getElementById('gamePad');
  out.hasPad = !!pad;
  const cv = pad ? pad.querySelector('canvas') || pad : null;
  out.canvasTag = cv ? cv.tagName : '';
  if (cv) {
    const rect = cv.getBoundingClientRect();
    const pt = (type, x, y) => cv.dispatchEvent(new PointerEvent(type, {
      bubbles: true, cancelable: true, view: window,
      pointerId: 1, pointerType: 'pen', isPrimary: true,
      clientX: rect.left + x, clientY: rect.top + y, buttons: 1, button: 0
    }));
    const strokes = [
      [[0.2, 0.2], [0.5, 0.2], [0.5, 0.5], [0.8, 0.5]],
      [[0.5, 0.1], [0.5, 0.9]],
      [[0.2, 0.8], [0.8, 0.8]]
    ];
    for (const s of strokes) {
      pt('pointerdown', s[0][0] * rect.width, s[0][1] * rect.height);
      for (let i = 1; i < s.length; i++) {
        pt('pointermove', s[i][0] * rect.width, s[i][1] * rect.height);
        await wait(40);
      }
      pt('pointerup', s[s.length - 1][0] * rect.width, s[s.length - 1][1] * rect.height);
      await wait(60);
    }
    const sub = document.getElementById('gSubmit');
    out.hasSubmit = !!sub;
    if (sub) {
      sub.click();
      await wait(1200);
      out.session = (document.getElementById('gSession') || {}).textContent;
      out.best = (document.getElementById('gBest') || {}).textContent;
      out.rank = (document.getElementById('scoreRank') || {}).textContent;
    }
  }
  const toast = document.getElementById('toast');
  out.toast = toast ? toast.textContent.trim().slice(0, 80) : '';
  return JSON.stringify(out);
})()
