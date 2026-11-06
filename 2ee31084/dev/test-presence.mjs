// Local check for functions/routes.mjs presence logic (in-memory DB only).
import { application } from '../functions/routes.mjs';

class BackendError extends Error { constructor(code, status) { super(code); this.code = code; this.status = status; } }

function fakeDb() {
  const store = new Map();
  return { store, from() {
    let mode = 'read', values, filters = [], count = 1000, order;
    const q = {
      select() { return q; },
      eq(k, v) { filters.push([k, v]); return q; },
      order(k, o = {}) { order = [k, o.ascending !== false]; return q; },
      limit(n) { count = n; return q; },
      insert(row) { mode = 'insert'; values = row; return q; },
      update(row) { mode = 'update'; values = row; return q; },
      delete() { mode = 'delete'; return q; },
      then(res, rej) {
        return Promise.resolve().then(() => {
          const all = [...store.values()];
          if (mode === 'insert') {
            if (store.has(values.id)) throw new BackendError('duplicate_key', 409);
            store.set(values.id, { ...values });
            return { data: [{ ...values }], error: null };
          }
          let rows = all.filter(r => filters.every(([k, v]) => r[k] === v));
          if (mode === 'update') { rows.forEach(r => Object.assign(r, values)); return { data: rows.map(r => ({ ...r })), error: null }; }
          if (mode === 'delete') { rows.forEach(r => store.delete(r.id)); return { data: [], error: null }; }
          if (order) rows = [...rows].sort((a, b) => (a[order[0]] < b[order[0]] ? -1 : a[order[0]] > b[order[0]] ? 1 : 0) * (order[1] ? 1 : -1));
          return { data: rows.slice(0, count).map(r => ({ ...r })), error: null };
        }).then(res, rej);
      }
    };
    return q;
  } };
}

const db = fakeDb();
const handle = application({ db, BackendError });
const origin = 'https://site.example/functions/v1/app';
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const post = (body) => handle({ request: new Request(origin + '/presence', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body)
}) });

console.log('health', (await handle({ request: new Request(origin + '/health') })).status);

let res = await post({ id: A, name: 'Lan', x: 1.234, z: -2.5, ry: 0.5 });
let data = await res.json();
console.log('A first', res.status, 'sees', data.players.length);

res = await post({ id: B, name: 'Minh', x: 3, z: 4, ry: 0 });
data = await res.json();
console.log('B sees', JSON.stringify(data.players));

res = await post({ id: A, name: 'Lan', x: 5.678, z: 6, ry: 1 });
data = await res.json();
console.log('A again sees', JSON.stringify(data.players));

console.log('stored', JSON.stringify([...db.store.values()]));

const bad = await post({ id: 'nope', x: 0, z: 0, ry: 0 });
console.log('bad id', bad.status, await bad.text());

const stale = [...db.store.values()][0];
stale.updated_at = new Date(Date.now() - 60000).toISOString();
const after = await post({ id: A, name: 'Lan', x: 0, z: 0, ry: 0 });
console.log('stale filtered', (await after.json()).players);
