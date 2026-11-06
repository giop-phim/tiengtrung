(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < 60 && !window.__sceneReady; i++) await wait(250);
  const started = !!window.__sceneReady;
  localStorage.removeItem('thaydo.player.v2');
  const join = document.getElementById('classJoinBtn');
  if (join) join.click();
  await wait(400);
  const modal = document.getElementById('walkModal');
  const modalOpen = modal && !modal.hidden;
  const title = modalOpen ? document.getElementById('walkTitle').textContent : '';
  let submitted = false;
  if (modalOpen) {
    document.getElementById('walkName').value = 'QA2';
    document.getElementById('walkForm').requestSubmit();
    submitted = true;
  }
  await wait(1600);
  return JSON.stringify({
    started,
    modalOpen,
    title,
    submitted,
    walking: document.body.classList.contains('walking'),
    walkUIHidden: document.getElementById('walkUI').hidden,
    prompt: document.getElementById('walkPrompt').hidden ? '' : document.getElementById('walkPrompt').textContent.trim(),
    fallback: (() => { const f = document.getElementById('sceneFallback'); return f ? !f.hidden : null; })()
  });
})()
