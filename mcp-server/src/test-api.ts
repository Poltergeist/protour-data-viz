/**
 * REST API smoke test. Assumes server is running at http://localhost:3000.
 * Run: npm run dev (in another terminal) && npm run test:api
 */

const BASE = process.env.API_BASE ?? 'http://localhost:3000/api';

async function check(name: string, url: string, validate: (json: any) => string | null) {
  try {
    const res = await fetch(url);
    const body = await res.json();
    if (!res.ok) {
      console.error(`FAIL ${name}: ${res.status} ${JSON.stringify(body)}`);
      process.exit(1);
    }
    const err = validate(body);
    if (err) {
      console.error(`FAIL ${name}: ${err}`);
      process.exit(1);
    }
    console.log(`PASS ${name}`);
  } catch (e) {
    console.error(`FAIL ${name}: ${(e as Error).message}`);
    process.exit(1);
  }
}

(async () => {
  await check('list tournaments', `${BASE}/tournaments`, (b) => (Array.isArray(b.data) && b.data.length > 0 ? null : 'expected non-empty data array'));

  // Pull first tournament from list
  const list = await fetch(`${BASE}/tournaments`).then((r) => r.json());
  const firstId = list.data[0].id as string;
  console.log(`Testing against tournament ${firstId}`);

  await check('tournament metadata', `${BASE}/tournaments/${firstId}`, (b) => (b.data?.tournamentId === firstId ? null : 'wrong id'));
  await check('matches', `${BASE}/tournaments/${firstId}/matches?limit=5`, (b) => (Array.isArray(b.data) ? null : 'expected array'));
  await check('matches by round', `${BASE}/tournaments/${firstId}/matches?round=4&limit=3`, (b) => (Array.isArray(b.data) ? null : 'expected array'));
  await check('decks', `${BASE}/tournaments/${firstId}/decks?limit=5`, (b) => (Array.isArray(b.data) ? null : 'expected array'));
  await check('stats', `${BASE}/tournaments/${firstId}/stats`, (b) => (b.data?.archetypes ? null : 'expected archetypes'));
  await check('archetypes', `${BASE}/tournaments/${firstId}/archetypes`, (b) => (Array.isArray(b.data) ? null : 'expected array'));

  // Edge: unknown tournament should 404
  const res = await fetch(`${BASE}/tournaments/999999/matches`);
  if (res.status !== 404) {
    console.error(`FAIL unknown-tournament: expected 404, got ${res.status}`);
    process.exit(1);
  }
  console.log('PASS unknown-tournament returns 404');

  console.log('\nAll REST API checks passed.');
})();
