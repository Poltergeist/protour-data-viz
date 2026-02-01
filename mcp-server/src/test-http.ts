/**
 * Test HTTP server and MCP endpoint
 */

console.log('🧪 Testing Phase 4: HTTP Server & MCP Endpoint\n');

const BASE_URL = 'http://localhost:3000';

async function testHealthEndpoint() {
  console.log('1️⃣  Testing health endpoint...');
  try {
    const response = await fetch(`${BASE_URL}/health`);
    const data = await response.json();
    
    if (data.status === 'ok') {
      console.log(`   ✅ Health check passed`);
      console.log(`      Service: ${data.service}`);
      console.log(`      Version: ${data.version}`);
      return true;
    } else {
      console.log('   ❌ Health check failed');
      return false;
    }
  } catch (error) {
    console.log('   ❌ Server not running');
    console.log(`   💡 Start server with: npm run dev`);
    return false;
  }
}

async function testMcpListTools() {
  console.log('\n2️⃣  Testing MCP tools/list...');
  try {
    const response = await fetch(`${BASE_URL}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
      }),
    });

    const text = await response.text();
    
    // Parse SSE format
    if (text.includes('event: message')) {
      const dataLine = text.split('\n').find(line => line.startsWith('data: '));
      if (dataLine) {
        const data = JSON.parse(dataLine.substring(6));
        const tools = data.result?.tools || [];
        console.log(`   ✅ MCP endpoint working`);
        console.log(`   ✅ ${tools.length} tools registered:`);
        tools.forEach((tool: any) => {
          console.log(`      - ${tool.name}`);
        });
        return true;
      }
    }
    
    console.log('   ❌ Unexpected response format');
    return false;
  } catch (error) {
    console.log('   ❌ MCP request failed:', error);
    return false;
  }
}

async function testMcpCallTool() {
  console.log('\n3️⃣  Testing MCP tools/call (get_tournament_info)...');
  try {
    const response = await fetch(`${BASE_URL}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'get_tournament_info',
          arguments: {},
        },
      }),
    });

    const text = await response.text();
    
    if (text.includes('event: message')) {
      const dataLine = text.split('\n').find(line => line.startsWith('data: '));
      if (dataLine) {
        const data = JSON.parse(dataLine.substring(6));
        const content = data.result?.content?.[0]?.text;
        if (content) {
          const info = JSON.parse(content);
          console.log(`   ✅ Tool execution successful`);
          console.log(`      Tournament: ${info.name}`);
          console.log(`      Players: ${info.stats.totalPlayers}`);
          console.log(`      Archetypes: ${info.stats.totalArchetypes}`);
          return true;
        }
      }
    }
    
    console.log('   ❌ Tool execution failed');
    return false;
  } catch (error) {
    console.log('   ❌ Tool call failed:', error);
    return false;
  }
}

// Run tests
async function main() {
  const health = await testHealthEndpoint();
  if (!health) {
    process.exit(1);
  }
  
  const listTools = await testMcpListTools();
  const callTool = await testMcpCallTool();
  
  if (listTools && callTool) {
    console.log('\n🎉 Phase 4 tests complete! HTTP MCP server is working!');
  } else {
    console.log('\n❌ Some tests failed');
    process.exit(1);
  }
}

main().catch(console.error);
