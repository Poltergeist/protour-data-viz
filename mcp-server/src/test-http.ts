/**
 * MCP-over-HTTP smoke test. Assumes server is running at http://localhost:3000.
 * Run: npm run dev (in another terminal) && npm run test:http
 */

const BASE_URL = process.env.MCP_BASE ?? 'http://localhost:3000';

function parseSSE(text: string): any {
  if (!text.includes('event: message')) return null;
  const dataLine = text.split('\n').find((line) => line.startsWith('data: '));
  if (!dataLine) return null;
  return JSON.parse(dataLine.substring(6));
}

async function rpc(method: string, params?: any) {
  const res = await fetch(`${BASE_URL}/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, ...(params ? { params } : {}) }),
  });
  const text = await res.text();
  const parsed = parseSSE(text);
  if (!parsed) throw new Error(`Unexpected response: ${text.slice(0, 200)}`);
  return parsed;
}

(async () => {
  console.log('MCP-over-HTTP smoke test\n');

  // Health
  const health = await fetch(`${BASE_URL}/health`).then((r) => r.json());
  if (health.status !== 'ok') throw new Error('health failed');
  console.log(`PASS health (${health.service} v${health.version})`);

  // tools/list
  const toolsResp = await rpc('tools/list');
  const tools = toolsResp.result?.tools ?? [];
  console.log(`PASS tools/list (${tools.length} tools: ${tools.map((t: any) => t.name).join(', ')})`);

  // list_tournaments
  const listResp = await rpc('tools/call', { name: 'list_tournaments', arguments: {} });
  const listText = listResp.result?.content?.[0]?.text;
  const list = JSON.parse(listText);
  if (!Array.isArray(list) || list.length === 0) throw new Error('list_tournaments empty');
  console.log(`PASS list_tournaments (${list.length} tournaments)`);

  const firstId = list[0].id;

  // get_tournament_info with required tournament_id
  const infoResp = await rpc('tools/call', {
    name: 'get_tournament_info',
    arguments: { tournament_id: firstId },
  });
  const infoText = infoResp.result?.content?.[0]?.text;
  const info = JSON.parse(infoText);
  if (info.tournamentId !== firstId) throw new Error('get_tournament_info wrong id');
  console.log(`PASS get_tournament_info (${info.name})`);

  // query_stats with required tournament_id
  const statsResp = await rpc('tools/call', {
    name: 'query_stats',
    arguments: { tournament_id: firstId },
  });
  const statsText = statsResp.result?.content?.[0]?.text;
  const stats = JSON.parse(statsText);
  if (!stats.archetypes) throw new Error('query_stats missing archetypes');
  console.log(`PASS query_stats (${Object.keys(stats.archetypes).length} archetypes)`);

  // Validation: missing tournament_id should error
  const missingResp = await rpc('tools/call', {
    name: 'query_stats',
    arguments: {},
  });
  const missingText = missingResp.result?.content?.[0]?.text;
  const missingResult = JSON.parse(missingText);
  if (!missingResult.error) throw new Error('query_stats without tournament_id should error');
  console.log(`PASS query_stats without tournament_id rejected`);

  console.log('\nAll MCP/HTTP checks passed.');
})();
