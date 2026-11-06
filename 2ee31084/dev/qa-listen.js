(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const out = {};
  for (let i = 0; i < 50 && !document.querySelector('.worditem'); i++) await wait(200);
  const item = document.querySelector('.worditem');
  out.items = document.querySelectorAll('.worditem').length;
  if (item) {
    item.click();
    await wait(600);
    const b = document.getElementById('sp') ? null : document.querySelector('.audio-row .icon-btn');
    if (b) {
      b.click();
      await wait(2500);
      const playing = document.querySelector('.icon-btn.playing');
      out.clicked = b.textContent.trim();
      out.stillPlaying = !!playing;
    } else out.noButton = true;
  }
  const toast = document.getElementById('toast');
  out.toast = toast ? toast.textContent.trim().slice(0, 80) : '';
  out.voices = (window.speechSynthesis && speechSynthesis.getVoices().length) || 0;
  return JSON.stringify(out);
})()
