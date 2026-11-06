(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < 100 && !window.__sceneReady; i++) await wait(200);
  const out = { ready: !!window.__sceneReady };
  try {
    const r = await fetch('/functions/v1/app/presence/heartbeat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      cache: 'no-store',
      body: JSON.stringify({ id: 'e4f0c2b6-1a9d-4e71-8c2f-5a3b7d9e2f04', name: 'QA-check', walking: false })
    });
    out.hbStatus = r.status;
    out.hbBody = (await r.text()).slice(0, 200);
  } catch (e) { out.hbErr = String(e); }
  try {
    const r2 = await fetch('/functions/v1/app/stars', { credentials: 'same-origin', cache: 'no-store' });
    out.starsStatus = r2.status;
    out.starsBody = (await r2.text()).slice(0, 200);
  } catch (e) { out.starsErr = String(e); }
  try {
    const r3 = await fetch('/functions/v1/app/presence', { credentials: 'same-origin', cache: 'no-store' });
    out.presStatus = r3.status;
    out.presBody = (await r3.text()).slice(0, 200);
  } catch (e) { out.presErr = String(e); }
  return JSON.stringify(out);
})()
