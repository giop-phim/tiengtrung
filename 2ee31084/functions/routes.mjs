// Public campus presence, live student count and popularity stars. No account
// is required: visitors identify with a random UUID kept in localStorage, so
// these routes only accept positions, a display name and a star, never
// ownership claims. Every presence read is scoped by recency.
export function application({ db, BackendError }) {
  const uuid = v => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
  const fail = (code, status) => { throw new BackendError(code, status); };
  const rows = result => { if (result.error) fail(result.error.code, result.error.status); return result.data || []; };
  const finite = v => typeof v === 'number' && Number.isFinite(v);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const RECENT_MS = 30000;
  const STALE_MS = 120000;

  let lastPrune = 0;

  async function input(request) {
    if (!request.headers.get('content-type')?.startsWith('application/json')) fail('invalid_input', 400);
    const reader = request.body?.getReader();
    if (!reader) fail('invalid_input', 400);
    let size = 0;
    const chunks = [];
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 4096) { await reader.cancel(); fail('payload_too_large', 413); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
    catch { fail('invalid_input', 400); }
  }

  function displayName(v) {
    if (typeof v !== 'string') return 'Học trò';
    const clean = v.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 24);
    return clean || 'Học trò';
  }

  async function pruneStale() {
    if (Date.now() - lastPrune < 30000) return;
    lastPrune = Date.now();
    try {
      const old = rows(await db.from('presence').select('id,updated_at').order('updated_at', { ascending: true }).limit(24));
      const cutoff = Date.now() - STALE_MS;
      const dead = old.filter(r => !Number.isFinite(Date.parse(r.updated_at)) || Date.parse(r.updated_at) < cutoff).slice(0, 12);
      if (!dead.length) return;
      await Promise.allSettled(dead.map(r => db.from('presence').delete().eq('id', r.id)));
    } catch (e) { /* cleanup is best effort */ }
  }

  async function recentVisitors() {
    const list = rows(await db.from('presence')
      .select('id,name,x,z,ry,walking,updated_at')
      .order('updated_at', { ascending: false })
      .limit(200));
    const cutoff = Date.now() - RECENT_MS;
    return list.filter(r => uuid(r.id) && Number.isFinite(Date.parse(r.updated_at)) && Date.parse(r.updated_at) > cutoff);
  }

  async function exists(id) {
    return rows(await db.from('presence').select('id').eq('id', id).limit(1)).length > 0;
  }

  async function touchPresence(id, name, walking) {
    const updated_at = new Date().toISOString();
    const patch = { name, walking, updated_at };
    if (await exists(id)) {
      rows(await db.from('presence').update(patch).eq('id', id));
      return;
    }
    try {
      rows(await db.from('presence').insert({ id, name, x: 0, z: 0, ry: 0, walking, updated_at }));
    } catch (e) {
      // A racing heartbeat may have inserted the same visitor id.
      rows(await db.from('presence').update(patch).eq('id', id));
    }
  }

  async function exactCount(table, column) {
    const result = await db.from(table).select(column, { count: 'exact' }).limit(1);
    if (result.error) fail(result.error.code, result.error.status);
    if (!Number.isSafeInteger(result.count)) fail('count_unavailable', 503);
    return result.count;
  }

  return async ctx => {
    const request = ctx.request;
    const pathname = new URL(request.url).pathname;
    const match = pathname.match(/^\/(?:functions\/v1\/)?(?:app|app-d[0-9a-f]{32})(\/.*)?$/);
    if (!match) fail('not_found', 404);
    const path = match[1] || '/';

    if (path === '/health' && request.method === 'GET') return Response.json({ ok: true });

    // Every visiting student joins the count, even when simply browsing.
    if (path === '/presence/heartbeat' && request.method === 'POST') {
      const body = await input(request);
      if (!uuid(body?.id)) fail('invalid_input', 400);
      const walking = body.walking === true;
      await touchPresence(body.id.toLowerCase(), displayName(body.name), walking);
      const recent = await recentVisitors();
      if (recent.length >= 60) await pruneStale();
      return Response.json({ ok: true, count: Math.max(1, recent.length) }, { headers: { 'cache-control': 'no-store' } });
    }

    if (path === '/presence' && request.method === 'POST') {
      const body = await input(request);
      if (!uuid(body?.id)) fail('invalid_input', 400);
      if (!finite(body.x) || !finite(body.z) || !finite(body.ry)) fail('invalid_input', 400);

      // Coordinates are stored as integer hundredths: the managed schema only
      // offers whole-number columns, and two decimals of a metre is plenty.
      const row = {
        id: body.id.toLowerCase(),
        name: displayName(body.name),
        x: Math.round(clamp(body.x, -40, 40) * 100),
        z: Math.round(clamp(body.z, -20, 45) * 100),
        ry: Math.round(clamp(body.ry, -Math.PI * 2, Math.PI * 2) * 100),
        walking: true,
        updated_at: new Date().toISOString()
      };

      const patch = { name: row.name, x: row.x, z: row.z, ry: row.ry, walking: true, updated_at: row.updated_at };
      if (await exists(row.id)) {
        rows(await db.from('presence').update(patch).eq('id', row.id));
      } else {
        try { rows(await db.from('presence').insert(row)); }
        catch (e) {
          // A racing first request may have inserted the same visitor id.
          rows(await db.from('presence').update(patch).eq('id', row.id));
        }
      }

      const recent = await recentVisitors();
      const players = recent
        .filter(r => r.walking === true && r.id !== row.id && finite(r.x) && finite(r.z))
        .slice(0, 40)
        .map(r => ({ id: r.id, name: displayName(r.name), x: r.x / 100, z: r.z / 100, ry: finite(r.ry) ? r.ry / 100 : 0 }));

      if (recent.length >= 60) await pruneStale();
      return Response.json({ ok: true, count: Math.max(1, recent.length), players }, { headers: { 'cache-control': 'no-store' } });
    }

    // Popularity: one star per visitor, the public total doubles as the rating.
    if (path === '/stars' && request.method === 'GET') {
      return Response.json({ ok: true, count: await exactCount('stars', 'visitor_id') }, { headers: { 'cache-control': 'no-store' } });
    }

    if (path === '/stars' && request.method === 'POST') {
      const body = await input(request);
      if (!uuid(body?.id)) fail('invalid_input', 400);
      const id = body.id.toLowerCase();
      const found = rows(await db.from('stars').select('visitor_id').eq('visitor_id', id).limit(1));
      if (!found.length) {
        try { rows(await db.from('stars').insert({ visitor_id: id, created_at: new Date().toISOString() })); }
        catch (e) { /* already starred: the total is unchanged */ }
      }
      const count = await exactCount('stars', 'visitor_id');
      return Response.json({ ok: true, count, starred: true }, { status: found.length ? 200 : 201, headers: { 'cache-control': 'no-store' } });
    }

    fail('not_found', 404);
  };
}
