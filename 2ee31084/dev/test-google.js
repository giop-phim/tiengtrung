(async () => {
  const url = 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=zh-CN&q=%E4%BD%A0%E5%A5%BD';
  const a = new Audio();
  const log = [];
  ['loadedmetadata', 'canplay', 'playing', 'ended', 'error'].forEach((t) => {
    a.addEventListener(t, () => log.push(t + (a.error ? ':' + a.error.code : '')));
  });
  a.src = url;
  a.play().then(() => log.push('play-resolved')).catch((e) => log.push('play-rejected:' + e.name));
  await new Promise((r) => setTimeout(r, 6000));
  return JSON.stringify({ log, paused: a.paused, err: a.error ? a.error.code : null, net: a.networkState });
})()
