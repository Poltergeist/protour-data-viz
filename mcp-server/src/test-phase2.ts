/**
 * Test file to verify data loading and validation
 */

import { loadAllData, getAvailableFiles } from './data-loader.js';
import { validateQuery, matchQuerySchema } from './validation.js';

console.log('🧪 Testing Phase 2: Data Loading & Schema\n');

// Test 1: List available files
console.log('✅ Available data files:');
getAvailableFiles().forEach(file => console.log(`   - ${file}`));

// Test 2: Load all data
try {
  console.log('\n📂 Loading tournament data...');
  const data = loadAllData();
  
  console.log(`✅ Matches loaded: ${Object.keys(data.matches).length} rounds`);
  console.log(`✅ Decklists loaded: ${data.decklists.length} decks`);
  console.log(`✅ Player-deck mappings: ${Object.keys(data.playerDecks).length} players`);
  console.log(`✅ Archetype stats: ${Object.keys(data.stats.archetypes).length} archetypes`);
} catch (error) {
  console.error('❌ Failed to load data:', error);
  process.exit(1);
}

// Test 3: Validate query parameters
try {
  console.log('\n🔒 Testing input validation...');
  
  // Valid query
  const validQuery = validateQuery(matchQuerySchema, { round: 5, limit: 50 });
  console.log('✅ Valid query accepted:', validQuery);
  
  // Test invalid round
  try {
    validateQuery(matchQuerySchema, { round: 999 });
    console.error('❌ Should have rejected invalid round');
  } catch (error) {
    console.log('✅ Invalid round rejected:', (error as Error).message);
  }
  
  // Test invalid characters
  try {
    validateQuery(matchQuerySchema, { player: '<script>alert("xss")</script>' });
    console.error('❌ Should have rejected malicious input');
  } catch (error) {
    console.log('✅ Malicious input rejected:', (error as Error).message);
  }
  
} catch (error) {
  console.error('❌ Validation test failed:', error);
  process.exit(1);
}

console.log('\n🎉 Phase 2 tests complete!');
