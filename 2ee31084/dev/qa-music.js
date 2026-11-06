(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const out = {};
  const btn = document.getElementById('musicBtn');
  out.hasMusicBtn = !!btn;
  if (btn) {
    btn.click();
    await wait(500);
    const panel = document.getElementById('musicPanel');
    out.panelOpen = panel ? !panel.hidden : null;
    const play = document.getElementById('musicPlay');
    out.hasPlay = !!play;
    if (play) {
      play.click();
      await wait(3000);
      out.playing = !document.getElementById('musicPanel').hidden;
      out.state = (document.getElementById('musicState') || {}).textContent || '';
    }
  }
  return JSON.stringify(out);
})()
