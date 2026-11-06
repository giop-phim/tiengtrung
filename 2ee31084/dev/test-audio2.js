(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const U = {
    baiduPunct: 'https://fanyi.baidu.com/gettts?lan=zh&text=%E8%80%81%E5%B8%88%E5%A5%BD%EF%BC%81&spd=3&source=web',
    googlePunct: 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=zh-CN&q=%E8%80%81%E5%B8%88%E5%A5%BD%EF%BC%81',
    youdaoPlain: 'https://dict.youdao.com/dictvoice?audio=%E8%80%81%E5%B8%88%E5%A5%BD&type=2',
    baiduPlain: 'https://fanyi.baidu.com/gettts?lan=zh&text=%E8%80%81%E5%B8%88%E5%A5%BD&spd=3&source=web'
  };
  const out = {};

  function run(key, url, rate) {
    return new Promise((resolve) => {
      const a = new Audio();
      const log = [];
      ['loadedmetadata', 'canplay', 'playing', 'ended', 'error', 'stalled', 'suspend'].forEach((t) => {
        a.addEventListener(t, () => log.push(t + (a.error ? ':' + a.error.code : '')));
      });
      let settled = false;
      const finish = (r) => { if (settled) return; settled = true; resolve(Object.assign({ key, log }, r)); };
      a.preload = 'auto';
      a.playbackRate = rate;
      a.src = url;
      a.play().then(() => log.push('play-resolved')).catch((e) => log.push('play-rejected:' + e.name));
      setTimeout(() => finish({ paused: a.paused, ct: Math.round(a.currentTime * 100) / 100, rs: a.readyState, dur: Number.isFinite(a.duration) ? Math.round(a.duration * 100) / 100 : null, err: a.error ? a.error.code : null, net: a.networkState }), 5000);
    });
  }

  out.baiduPunct = await run('baiduPunct', U.baiduPunct, 0.9);
  out.googlePunct = await run('googlePunct', U.googlePunct, 0.9);
  out.youdaoPlain = await run('youdaoPlain', U.youdaoPlain, 0.9);
  out.baiduPlain = await run('baiduPlain', U.baiduPlain, 0.9);
  return JSON.stringify(out);
})()
