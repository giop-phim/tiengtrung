(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const btn = document.querySelector('.hotspot[data-hotspot="teacher"]');
  if (!btn) return JSON.stringify({ error: 'no teacher hotspot' });
  btn.click();
  await wait(500);

  const status = document.querySelector('#teacherStatus');
  const lines = Array.from(document.querySelectorAll('.teacher-line'));

  const NativeAudio = window.Audio;
  window.__audios = [];
  window.__audioEvents = [];
  window.Audio = function (...args) {
    const el = new NativeAudio(...args);
    window.__audios.push(el);
    ['playing', 'loadedmetadata', 'canplay', 'ended', 'stalled', 'error'].forEach((t) => {
      el.addEventListener(t, () => {
        window.__audioEvents.push({
          type: t,
          src: String(el.src).slice(0, 80),
          code: el.error ? el.error.code : null,
          readyState: el.readyState,
          duration: Number.isFinite(el.duration) ? Math.round(el.duration * 100) / 100 : null
        });
      });
    });
    return el;
  };
  window.Audio.prototype = NativeAudio.prototype;

  if (lines[0]) lines[0].click();
  await wait(3000);

  const res = performance.getEntriesByType('resource')
    .map((e) => ({ name: e.name, size: e.transferSize, dur: Math.round(e.duration) }))
    .filter((e) => /dictvoice|gettts|translate_tts/.test(e.name));

  const panel = document.querySelector('.scene-panel');
  const pbody = document.querySelector('#panelBody');
  return JSON.stringify({
    status: status ? status.textContent : null,
    stillPlaying: lines[0] ? lines[0].classList.contains('is-playing') : null,
    audioCount: window.__audios.length,
    events: window.__audioEvents,
    ttsRequests: res,
    panel: panel ? {
      cls: panel.className,
      left: Math.round(panel.getBoundingClientRect().left),
      width: Math.round(panel.getBoundingClientRect().width),
      lines: pbody ? pbody.querySelectorAll('.teacher-line').length : 0,
      overflow: pbody ? pbody.scrollHeight - pbody.clientHeight : 0
    } : null
  });
})()
