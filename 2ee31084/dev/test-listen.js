(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  let quiz = null;
  for (let i = 0; i < 40 && !quiz; i++) {
    quiz = document.querySelector('.quiz');
    if (!quiz) await wait(250);
  }
  if (!quiz) return JSON.stringify({ error: 'no quiz', body: document.body.className });

  const btn = Array.from(document.querySelectorAll('.icon-btn')).find((b) => b.textContent.includes('Nghe từ'));
  const before = performance.getEntriesByType('resource').filter((e) => /translate_tts|gettts/.test(e.name)).length;
  if (btn) btn.click();
  await wait(3000);

  const reqs = performance.getEntriesByType('resource')
    .filter((e) => /translate_tts|gettts/.test(e.name))
    .map((e) => e.name);
  const toastEl = document.querySelector('.toast');
  return JSON.stringify({
    hasButton: !!btn,
    playClass: btn ? btn.classList.contains('playing') : null,
    before,
    requests: reqs,
    toast: toastEl ? toastEl.textContent : null,
    hint: document.querySelector('#listenHint') ? document.querySelector('#listenHint').textContent : null
  });
})()
