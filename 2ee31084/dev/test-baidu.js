(async () => {
  const url = 'https://fanyi.baidu.com/gettts?lan=zh&text=%E8%80%81%E5%B8%88%E5%A5%BD%EF%BC%81&spd=3&source=web';
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
