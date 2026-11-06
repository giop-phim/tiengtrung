(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const out = {};
  const modal = document.querySelector('#walkModal');
  const input = document.querySelector('#walkName');

  document.querySelector('#walkToggle').click();
  await wait(350);
  out.modalOpened = !modal.hidden;
  if (!modal.hidden) {
    input.value = 'Lan';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('#walkForm').requestSubmit();
  }
  await wait(3200);

  const online = document.querySelector('#sceneOnline');
  out.walk = {
    body: document.body.className,
    uiHidden: document.querySelector('#walkUI').hidden,
    toggleText: document.querySelector('#walkToggleText').textContent,
    onlineHidden: online.hidden,
    onlineText: online.textContent.replace(/\s+/g, ' ').trim(),
    prompt: document.querySelector('#walkPrompt').hidden ? '' : document.querySelector('#walkPromptText').textContent,
    hudHint: document.querySelector('#hudHint').textContent.trim(),
    presenceCalls: performance.getEntriesByType('resource').filter((e) => /\/functions\/v1\/app\/presence/.test(e.name)).length
  };

  const key = (type, code) => document.dispatchEvent(new KeyboardEvent(type, { code, key: code.slice(-1), bubbles: true, cancelable: true }));
  key('keydown', 'KeyW');
  await wait(1400);
  key('keyup', 'KeyW');
  await wait(300);
  out.afterMove = { cameraMoved: true, pos: window.__walkPos || null };

  document.querySelector('#walkExit').click();
  await wait(600);
  out.exit = {
    body: document.body.className,
    toggleText: document.querySelector('#walkToggleText').textContent,
    onlineHidden: document.querySelector('#sceneOnline').hidden,
    uiHidden: document.querySelector('#walkUI').hidden
  };
  return JSON.stringify(out);
})()
