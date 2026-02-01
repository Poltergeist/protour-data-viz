/**
 * Test REST API endpoints
 */

console.log('🧪 Testing REST API Endpoints\n');

const BASE_URL = 'http://localhost:3000/api';

async function testEndpoint(name: string, url: string, expectedKeys: string[] = []) {
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log(`   ✅ ${name}`);
      
      // Check for expected keys
      if (expectedKeys.length > 0) {
        const hasKeys = expectedKeys.every(key => key in data);
        if (hasKeys) {
          console.log(`      Response structure valid`);
        }
      }
      
      return true;
    } else {
      console.log(`   ❌ ${name} - ${data.error || 'Failed'}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ ${name} - ${error}`);
    return false;
  }
}

async function main() {
  console.log('1️⃣  Testing GET /api/matches\n');
  
  await testEndpoint('All matches (limited)', `${BASE_URL}/matches?limit=5`, ['count', 'data']);
  await testEndpoint('Round 5 matches', `${BASE_URL}/matches?round=5&limit=5`, ['count', 'data']);
  await testEndpoint('Player matches', `${BASE_URL}/matches?player=Gabriel&limit=3`, ['count', 'data']);
  await testEndpoint('Archetype matches', `${BASE_URL}/matches?archetype=Izzet&limit=5`, ['count', 'data']);
  
  console.log('\n2️⃣  Testing GET /api/decks\n');
  
  await testEndpoint('All decks (limited)', `${BASE_URL}/decks?limit=5`, ['count', 'data']);
  await testEndpoint('Decks by archetype', `${BASE_URL}/decks?archetype=Izzet&limit=3`, ['count', 'data']);
  await testEndpoint('Deck by player', `${BASE_URL}/decks?player=Gabriel%20Nicholas`, ['count', 'data']);
  
  console.log('\n3️⃣  Testing GET /api/stats\n');
  
  await testEndpoint('All stats', `${BASE_URL}/stats`, ['data']);
  await testEndpoint('Specific archetype stats', `${BASE_URL}/stats?archetype=Azorius%20Control`, ['data']);
  
  console.log('\n4️⃣  Testing GET /api/players/:player/deck\n');
  
  await testEndpoint('Player deck (Gabriel Nicholas)', `${BASE_URL}/players/Gabriel%20Nicholas/deck`, ['data']);
  
  console.log('\n5️⃣  Testing GET /api/archetypes\n');
  
  const response = await fetch(`${BASE_URL}/archetypes`);
  const data = await response.json();
  if (response.ok && data.success) {
    console.log(`   ✅ List archetypes`);
    console.log(`      Total archetypes: ${data.count}`);
    console.log(`      Sample: ${data.data.slice(0, 3).map((a: any) => a.name).join(', ')}`);
  }
  
  console.log('\n6️⃣  Testing GET /api/tournament\n');
  
  const tourResponse = await fetch(`${BASE_URL}/tournament`);
  const tourData = await tourResponse.json();
  if (tourResponse.ok && tourData.success) {
    console.log(`   ✅ Tournament info`);
    console.log(`      Name: ${tourData.data.name}`);
    console.log(`      Players: ${tourData.data.stats.totalPlayers}`);
    console.log(`      Archetypes: ${tourData.data.stats.totalArchetypes}`);
  }
  
  console.log('\n7️⃣  Testing error handling\n');
  
  // Test invalid round
  const invalidRound = await fetch(`${BASE_URL}/matches?round=999`);
  const invalidData = await invalidRound.json();
  if (!invalidData.success && invalidData.error) {
    console.log(`   ✅ Invalid round rejected: ${invalidData.error}`);
  }
  
  // Test player not found
  const notFound = await fetch(`${BASE_URL}/players/NonExistentPlayer123/deck`);
  if (notFound.status === 404) {
    console.log(`   ✅ 404 for non-existent player`);
  }
  
  console.log('\n🎉 REST API tests complete!');
}

main().catch(console.error);
