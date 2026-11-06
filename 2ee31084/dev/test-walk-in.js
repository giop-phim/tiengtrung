(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const modal = document.querySelector('#walkModal');
  if (!modal.hidden) {
    document.querySelector('#walkName').value = 'Lan';
    document.querySelector('#walkForm').requestSubmit();
  } else {
    document.querySelector('#walkToggle').click();
  }
  await wait(2500);
  return JSON.stringify({
    body: document.body.className,
    online: document.querySelector('#sceneOnline').textContent.replace(/\s+/g, ' ').trim()
  });
})()
