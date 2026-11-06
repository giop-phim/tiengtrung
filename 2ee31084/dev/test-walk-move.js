(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const modal = document.querySelector('#walkModal');
  if (!modal.hidden) {
    document.querySelector('#walkName').value = 'Lan';
    document.querySelector('#walkForm').requestSubmit();
  } else {
    document.querySelector('#walkToggle').click();
  }
  await wait(1800);
  const key = (type, code) => document.dispatchEvent(new KeyboardEvent(type, { code, key: 'w', bubbles: true, cancelable: true }));
  key('keydown', 'KeyW');
  await wait(1500);
  key('keyup', 'KeyW');
  await wait(400);
  return JSON.stringify({ body: document.body.className, near: document.querySelector('#walkPrompt').hidden ? '' : document.querySelector('#walkPromptText').textContent });
})()
