(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < 60 && !window.__sceneReady; i++) await wait(200);
  if (!document.body.classList.contains('walking')) {
    document.getElementById('walkToggle').click();
    await wait(300);
    const modal = document.getElementById('walkModal');
    if (modal && !modal.hidden) {
      document.getElementById('walkName').value = 'QA';
      document.getElementById('walkForm').requestSubmit();
      await wait(1200);
    }
  }
  const key = (type, code, keyName) => document.dispatchEvent(new KeyboardEvent(type, { code, key: keyName, bubbles: true }));
  key('keydown', 'ShiftLeft', 'Shift');
  const iv = setInterval(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', key: 'w', bubbles: true }));
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'ShiftLeft', key: 'Shift', bubbles: true }));
  }, 200);
  await wait(12000);
  clearInterval(iv);
  key('keyup', 'KeyW', 'w');
  key('keyup', 'ShiftLeft', 'Shift');
  await wait(800);
  return JSON.stringify({
    walking: document.body.classList.contains('walking'),
    prompt: document.getElementById('walkPrompt').hidden ? '' : document.getElementById('walkPrompt').textContent.trim(),
    action: document.getElementById('walkAction').textContent.replace(/\s+/g, ' ').trim(),
    dialogCount: (document.getElementById('walkModal') || {}).hidden
  });
})()
