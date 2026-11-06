(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const out = {};
  for (let i = 0; i < 40 && !document.getElementById('classJoinBtn'); i++) await wait(250);
  const btn = document.getElementById('classJoinBtn');
  out.hasJoin = !!btn;
  if (btn) {
    btn.click();
    await wait(300);
    const modal = document.getElementById('classJoinModal');
    out.modalOpen = modal ? modal.classList.contains('open') : null;
    const input = document.getElementById('classJoinName');
    if (input) {
      input.value = 'QA9';
      document.getElementById('classJoinForm').requestSubmit();
      await wait(600);
      out.modalClosed = modal ? !modal.classList.contains('open') : null;
      const nameNodes = document.querySelectorAll('[data-player-name]');
      out.nameShown = nameNodes.length ? (nameNodes[0].textContent || '') : '';
    }
  }
  return JSON.stringify(out);
})()
