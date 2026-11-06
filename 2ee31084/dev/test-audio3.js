(async () => {
  const Y = 'https://dict.youdao.com/dictvoice?audio=%E4%BD%A0%E5%A5%BD&type=2';
  const B = 'https://fanyi.baidu.com/gettts?lan=zh&text=%E4%BD%A0%E5%A5%BD&spd=3&source=web';
  const G = 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=zh-CN&q=%E4%BD%A0%E5%A5%BD';
  const out = {};

  function run(key, url, rate, rateAfter) {
    return new Promise((resolve) => {
      const a = new Audio();
      const log = [];
      ['loadedmetadata', 'canplay', 'playing', 'ended', 'error'].forEach((t) => {
        a.addEventListener(t, () => log.push(t + (a.error ? ':' + a.error.code : '')));
      });
      let settled = false;
      const finish = (r) => {
        if (settled) return;
        settled = true;
        resolve(Object.assign({ key, log }, r));
      };
      a.preload = 'auto';
      if (rate) a.playbackRate = rate;
      a.src = url;
      if (rateAfter) a.playbackRate = rateAfter;
      a.play().then(() => log.push('play-resolved')).catch((e) => log.push('play-rejected:' + e.name));
      setTimeout(() => finish({
        paused: a.paused,
        ct: Math.round(a.currentTime * 100) / 100,
        rs: a.readyState,
        dur: Number.isFinite(a.duration) ? Math.round(a.duration * 100) / 100 : null,
        err: a.error ? a.error.code : null,
        net: a.networkState
      }), 5000);
    });
  }

  out.youdaoRate1 = await run('youdaoRate1', Y, 1);
  out.youdaoRate09 = await run('youdaoRate09', Y, 0.9);
  out.baiduRate1 = await run('baiduRate1', B, 1);
  out.googleRate1 = await run('googleRate1', G, 1);
  out.speechModule = await new Promise((resolve) => {
    let done = false;
    TD.Speech.speak('你好', { rate: 1, onend: (ok) => { done = true; resolve({ ok }); } });
    setTimeout(() => { if (!done) resolve({ ok: 'timeout' }); }, 6000);
  });
  return JSON.stringify(out);
})()
