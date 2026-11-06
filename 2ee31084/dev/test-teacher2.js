(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const out = {};
  const hotspot = document.querySelector('.hotspot[data-hotspot="teacher"]');
  const panel = document.querySelector('.scene-panel');
  const body = document.querySelector('#panelBody');
  hotspot.click();
  await wait(400);

  const ask = body.querySelector('#teacherAsk');
  ask.click();
  await wait(600);
  out.asked = {
    status: body.querySelector('#teacherStatus').textContent,
    statusLive: body.querySelector('#teacherStatus').classList.contains('is-live'),
    audios: document.querySelectorAll('audio').length
  };
  const playingNow = Array.from(document.querySelectorAll('audio')).filter((a) => !a.paused).length;

  panel.querySelector('#panelClose').click();
  await wait(400);
  out.afterClose = {
    open: panel.classList.contains('open'),
    audioStillPlaying: Array.from(document.querySelectorAll('audio')).filter((a) => !a.paused).length,
    hadPlaying: playingNow
  };

  hotspot.click();
  await wait(300);
  const mic = body.querySelector('#teacherMic');
  mic.click();
  await wait(900);
  out.mic = { status: body.querySelector('#teacherStatus').textContent, disabled: mic.disabled };
  out.panelRect = (() => {
    const r = panel.getBoundingClientRect();
    return { left: Math.round(r.left), width: Math.round(r.width), scroll: body.scrollHeight - body.clientHeight };
  })();
  return JSON.stringify(out);
})()
