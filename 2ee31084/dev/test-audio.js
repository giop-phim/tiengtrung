(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const out = { fetch: {}, media: {} };

  async function probe(url, key) {
    try {
      const r = await fetch(url);
      const b = await r.arrayBuffer();
      out.fetch[key] = { status: r.status, type: r.headers.get('content-type'), bytes: b.byteLength, cors: r.type };
    } catch (e) {
      out.fetch[key] = { error: String(e) };
    }
  }
  await probe('https://dict.youdao.com/dictvoice?audio=%E4%BD%A0%E5%A5%BD&type=2', 'youdao');
  await probe('https://fanyi.baidu.com/gettts?lan=zh&text=%E4%BD%A0%E5%A5%BD&spd=3&source=web', 'baidu');
  await probe('https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=zh-CN&q=%E4%BD%A0%E5%A5%BD', 'google');

  function wavUrl() {
    const rate = 8000, n = 1600;
    const buf = new ArrayBuffer(44 + n * 2);
    const v = new DataView(buf);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    w(36, 'data'); v.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.sin((i / rate) * 2 * Math.PI * 440) * 12000, true);
    return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
  }

  async function playProbe(url, key) {
    return new Promise((resolve) => {
      const a = new Audio();
      const log = [];
      const finish = (r) => resolve(Object.assign({ key, log }, r));
      ['loadedmetadata', 'canplay', 'playing', 'ended', 'error'].forEach((t) => a.addEventListener(t, () => {
        log.push(t + (a.error ? ':' + a.error.code : ''));
      }));
      setTimeout(() => finish({ timeout: true, paused: a.paused, ct: a.currentTime, rs: a.readyState, err: a.error ? a.error.code : null }), 4000);
      a.onended = () => finish({ played: true });
      a.src = url;
      a.play().then(() => log.push('play-resolved')).catch((e) => { log.push('play-rejected:' + e.name); });
    });
  }

  out.media.wav = await playProbe(wavUrl(), 'wav');
  out.media.youdao = await playProbe('https://dict.youdao.com/dictvoice?audio=%E4%BD%A0%E5%A5%BD&type=2', 'youdao');
  out.media.remoteMp3 = await playProbe('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', 'remoteMp3');
  out.codecs = {
    mp3: new Audio().canPlayType('audio/mpeg'),
    wav: new Audio().canPlayType('audio/wav')
  };
  return JSON.stringify(out);
})()
