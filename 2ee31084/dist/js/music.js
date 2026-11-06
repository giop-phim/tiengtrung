/* ============================================================
   music.js — Nhạc nền Trung Hoa cho Thầy Đồ
   Nhạc CC BY-NC (Jamendo, lưu trữ trên archive.org)
   ============================================================ */
(function () {
  'use strict';

  const STORE = 'thaydo.music.v1';
  const AUDIO_BASE = 'https://archive.org/download/';

  const TRACKS = [
    {
      id: 'jamendo-429227',
      file: '01-1512256-AudioSphere-Chinese Beauty _60s_.mp3',
      title: 'Chinese Beauty',
      artist: 'AudioSphere',
      duration: 68
    },
    {
      id: 'jamendo-386560',
      file: '01-1764279-Carlos Carty-NATURE COLORS OF THE CHINA.mp3',
      title: 'Nature Colors of China',
      artist: 'Carlos Carty',
      duration: 198
    },
    {
      id: 'jamendo-471602',
      file: '01-1920191-ForestMusic-Chinese Music.mp3',
      title: 'Chinese Music',
      artist: 'ForestMusic',
      duration: 146
    },
    {
      id: 'jamendo-612050',
      file: '01-2270282-Music-Panda-The Eternal Flow.mp3',
      title: 'The Eternal Flow',
      artist: 'Music-Panda',
      duration: 122
    },
    {
      id: 'jamendo-607503',
      file: '01-2262547-Janevo-Wind Vibes _Chinese Chill Hop_.mp3',
      title: 'Wind Vibes · Chinese Chill Hop',
      artist: 'Janevo',
      duration: 118
    },
    {
      id: 'jamendo-475291',
      file: '01-1927225-wavetune-Bamboo Serenity.mp3',
      title: 'Bamboo Serenity',
      artist: 'wavetune',
      duration: 180
    },
    {
      id: 'jamendo-609736',
      file: '01-2267553-EdRecords-Dragon Flight.mp3',
      title: 'Dragon Flight',
      artist: 'EdRecords',
      duration: 115
    },
    {
      id: 'jamendo-349777',
      file: '01-1361209-Jazzaria-Peking Order.mp3',
      title: 'Peking Order',
      artist: 'Jazzaria',
      duration: 170
    },
    {
      id: 'jamendo-463013',
      file: '01-1902181-Sound Gallery by Dmitry Taras-Chinese New Year.mp3',
      title: 'Chinese New Year',
      artist: 'Sound Gallery · Dmitry Taras',
      duration: 144
    },
    {
      id: 'jamendo-609735',
      file: '01-2267558-EdRecords-Golden Garlands.mp3',
      title: 'Golden Garlands',
      artist: 'EdRecords',
      duration: 114
    }
  ];

  const $ = (sel) => document.querySelector(sel);
  const panel = $('#musicPanel');
  const btn = $('#musicBtn');
  if (!panel || !btn) return;

  const listEl = $('#musicList');
  const titleEl = $('#musicTitle');
  const artistEl = $('#musicArtist');
  const discEl = $('#musicDisc');
  const playEl = $('#musicPlay');
  const prevEl = $('#musicPrev');
  const nextEl = $('#musicNext');
  const seekEl = $('#musicSeek');
  const volEl = $('#musicVol');
  const timeEl = $('#musicTime');
  const durEl = $('#musicDur');
  const closeEl = $('#musicClose');

  const audio = new Audio();
  audio.preload = 'none';
  audio.playsInline = true;

  let index = 0;
  let volume = 0.55;
  let wantPlay = false;
  let seeking = false;
  let errorCount = 0;
  let hideTimer = 0;
  let lastVolume = volume;

  function loadStored() {
    try {
      const raw = localStorage.getItem(STORE);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (Number.isInteger(data.index) && data.index >= 0 && data.index < TRACKS.length) index = data.index;
      if (typeof data.volume === 'number' && data.volume >= 0 && data.volume <= 1) {
        volume = data.volume;
        lastVolume = volume || 0.55;
      }
      if (typeof data.wantPlay === 'boolean') wantPlay = data.wantPlay;
    } catch (e) { /* private mode */ }
  }

  function saveStored() {
    try {
      localStorage.setItem(STORE, JSON.stringify({ index, volume: lastVolume, wantPlay }));
    } catch (e) { /* private mode */ }
  }

  function srcOf(t) {
    return AUDIO_BASE + t.id + '/' + encodeURIComponent(t.file);
  }

  function fmt(sec) {
    if (!Number.isFinite(sec) || sec < 0) sec = 0;
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function updateNowPlaying() {
    const t = TRACKS[index];
    if (titleEl) titleEl.textContent = t.title;
    if (artistEl) artistEl.textContent = t.artist + ' · CC BY-NC';
    if (durEl) durEl.textContent = fmt(t.duration);
    if (seekEl) seekEl.value = '0';
    if (timeEl) timeEl.textContent = '0:00';
    Array.from(listEl.children).forEach((row, i) => {
      row.classList.toggle('is-on', i === index);
      row.setAttribute('aria-selected', i === index ? 'true' : 'false');
    });
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new window.MediaMetadata({
          title: t.title,
          artist: t.artist,
          album: 'Thầy Đồ · Nhạc Trung Hoa'
        });
      } catch (e) { /* older browser */ }
    }
  }

  function applyVolume() {
    audio.volume = Math.max(0, Math.min(1, volume));
    if (volEl) volEl.value = String(Math.round(volume * 100));
  }

  function setPlaying(on) {
    panel.classList.toggle('is-playing', !!on);
    discEl.classList.toggle('is-spinning', !!on);
    btn.classList.toggle('is-playing', !!on);
    playEl.setAttribute('aria-label', on ? 'Tạm dừng nhạc' : 'Phát nhạc');
    if ('mediaSession' in navigator) {
      try { navigator.mediaSession.playbackState = on ? 'playing' : 'paused'; } catch (e) { /* ignore */ }
    }
  }

  function play() {
    wantPlay = true;
    saveStored();
    if (!audio.src) {
      audio.src = srcOf(TRACKS[index]);
      audio.load();
    }
    const p = audio.play();
    if (p && p.catch) p.catch(() => {
      setPlaying(false);
      artistEl.textContent = 'Chưa phát được · thử lại hoặc chọn bài khác';
    });
  }

  function pause() {
    wantPlay = false;
    saveStored();
    audio.pause();
  }

  function select(i, autoplay) {
    index = (i + TRACKS.length) % TRACKS.length;
    audio.src = srcOf(TRACKS[index]);
    audio.load();
    updateNowPlaying();
    if (autoplay || wantPlay || !audio.paused) play();
    saveStored();
  }

  function next() {
    select(index + 1, true);
  }

  function prev() {
    if (audio.currentTime > 4) {
      audio.currentTime = 0;
      return;
    }
    select(index - 1, true);
  }

  function buildList() {
    const frag = document.createDocumentFragment();
    TRACKS.forEach((t, i) => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'music-row';
      row.setAttribute('role', 'option');
      row.setAttribute('aria-selected', 'false');
      row.innerHTML =
        '<span class="music-row-num">' + String(i + 1).padStart(2, '0') + '</span>' +
        '<span class="music-row-meta"><b></b><i></i></span>' +
        '<span class="music-row-dur">' + fmt(t.duration) + '</span>';
      row.querySelector('b').textContent = t.title;
      row.querySelector('i').textContent = t.artist;
      row.addEventListener('click', () => {
        if (i === index && !audio.paused) { pause(); return; }
        select(i, true);
      });
      frag.appendChild(row);
    });
    listEl.appendChild(frag);
  }

  function openPanel() {
    clearTimeout(hideTimer);
    panel.style.transition = 'none';
    panel.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    void panel.offsetWidth;
    panel.classList.add('is-open');
    setTimeout(() => { panel.style.transition = ''; }, 40);
    updateNowPlaying();
  }

  function closePanel() {
    panel.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => { panel.hidden = true; }, 240);
  }

  function togglePanel() {
    if (panel.hidden) openPanel();
    else closePanel();
  }

  loadStored();
  buildList();
  applyVolume();
  updateNowPlaying();

  btn.addEventListener('click', togglePanel);
  closeEl.addEventListener('click', closePanel);
  playEl.addEventListener('click', () => { if (audio.paused) play(); else pause(); });
  nextEl.addEventListener('click', next);
  prevEl.addEventListener('click', prev);

  volEl.addEventListener('input', () => {
    volume = Math.max(0, Math.min(1, Number(volEl.value) / 100));
    lastVolume = volume || lastVolume;
    applyVolume();
    saveStored();
  });

  seekEl.addEventListener('input', () => {
    seeking = true;
    const dur = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : TRACKS[index].duration;
    if (timeEl) timeEl.textContent = fmt((Number(seekEl.value) / 1000) * dur);
  });
  seekEl.addEventListener('change', () => {
    const dur = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : TRACKS[index].duration;
    if (Number.isFinite(dur) && dur > 0) {
      audio.currentTime = (Number(seekEl.value) / 1000) * dur;
    }
    seeking = false;
  });

  audio.addEventListener('loadedmetadata', () => {
    if (durEl) durEl.textContent = fmt(audio.duration || TRACKS[index].duration);
  });

  audio.addEventListener('timeupdate', () => {
    if (seeking) return;
    const dur = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : TRACKS[index].duration;
    if (seekEl && dur > 0) seekEl.value = String(Math.round((audio.currentTime / dur) * 1000));
    if (timeEl) timeEl.textContent = fmt(audio.currentTime);
  });

  audio.addEventListener('play', () => { errorCount = 0; setPlaying(true); });
  audio.addEventListener('pause', () => setPlaying(false));
  audio.addEventListener('ended', next);
  audio.addEventListener('error', () => {
    setPlaying(false);
    errorCount += 1;
    if (artistEl) artistEl.textContent = 'Không tải được bài này · đang thử bài khác…';
    if (errorCount <= TRACKS.length) {
      setTimeout(() => { if (wantPlay) next(); }, 1200);
    } else if (window.TD && typeof window.TD.toast === 'function') {
      window.TD.toast('Chưa tải được nhạc — kiểm tra kết nối mạng nhé.');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) closePanel();
  });

  // Tránh nhạc nền lấn át giọng thầy đọc.
  setInterval(() => {
    if (!audio.src || audio.paused) return;
    const duck = window.speechSynthesis && window.speechSynthesis.speaking;
    const target = duck ? volume * 0.2 : volume;
    if (Math.abs(audio.volume - target) > 0.01) audio.volume = Math.max(0, Math.min(1, target));
  }, 600);

  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.setActionHandler('play', play);
      navigator.mediaSession.setActionHandler('pause', pause);
      navigator.mediaSession.setActionHandler('nexttrack', next);
      navigator.mediaSession.setActionHandler('previoustrack', prev);
    } catch (e) { /* ignore */ }
  }

  // Trình duyệt chặn tự phát: chỉ phát sau thao tác đầu tiên của người dùng.
  if (wantPlay) {
    const unlock = () => {
      if (wantPlay && audio.paused) play();
    };
    document.addEventListener('pointerdown', unlock, { once: true, capture: true });
    document.addEventListener('keydown', unlock, { once: true, capture: true });
  }

  window.TD = window.TD || {};
  window.TD.Music = {
    open: openPanel,
    close: closePanel,
    play,
    pause,
    next,
    prev,
    state: () => ({
      index,
      title: TRACKS[index].title,
      playing: !audio.paused,
      time: audio.currentTime,
      duration: audio.duration,
      volume: audio.volume,
      src: audio.src
    }),
    get track() { return TRACKS[index]; }
  };
})();
