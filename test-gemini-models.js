/**
 * Test which Gemini models are available
 * Run: node test-gemini-models.js
 */

async function testModels() {
  // Get an API key from the database
  const response = await fetch('http://localhost:3000/api/v2/api-keys/available');
  const data = await response.json();
  
  if (!data.data || data.data.length === 0) {
    console.error('❌ No API keys available. Run: curl -X POST http://localhost:3000/api/v2/admin/reset-quotas');
    return;
  }
  
  const apiKeyId = data.data[0]._id;
  console.log('Using API key:', data.data[0].nickname, '\n');
  
  // Get the actual key
  const keyResponse = await fetch('http://localhost:3000/api/v2/api-keys');
  const keyData = await keyResponse.json();
  const apiKey = keyData.keys?.find(k => k._id === apiKeyId)?.key;
  
  if (!apiKey) {
    console.error('❌ Could not get API key');
    return;
  }
  
  console.log('API Key found (first 10 chars):', apiKey.substring(0, 10) + '...\n');
  
  // Try different model names
  const modelsToTest = [
    'gemini-pro',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro-latest',
  ];
  
  console.log('Testing models with a simple prompt...\n');
  
  for (const model of modelsToTest) {
    console.log(`\n🧪 Testing: ${model}`);
    console.log('─'.repeat(50));
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: 'Say "hello"' }]
          }]
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        const content = result.candidates?.[0]?.content?.parts?.[0]?.text;
        console.log(`✅ Status: ${response.status} - WORKS!`);
        console.log(`   Response: ${content?.substring(0, 50)}`);
      } else {
        console.log(`❌ Status: ${response.status} - FAILED`);
        console.log(`   Error: ${result.error?.message?.substring(0, 100) || 'Unknown error'}`);
      }
    } catch (error) {
      console.log(`❌ Network error:`, error.message);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ Test complete!\n');
}

// Wait for server to be ready
setTimeout(() => {
  testModels().catch(console.error);
}, 2000);
