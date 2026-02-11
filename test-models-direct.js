/**
 * Direct test of Gemini models - paste your API key below
 * Run: node test-models-direct.js
 */

// PASTE YOUR GEMINI API KEY HERE:
const API_KEY = 'AIzaSyBmpu3EEGThCVVb1RKTIpahoMNxCpIGD5o'; // Replace with actual key

const modelsToTest = [
  'gemini-pro',
  'gemini-1.5-pro', 
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-pro-latest',
  'gemini-flash-1.5',
];

async function testModels() {
  console.log('🧪 Testing Gemini models...\n');
  console.log('API Key:', API_KEY.substring(0, 15) + '...\n');
  
  for (const model of modelsToTest) {
    console.log(`\nTesting: ${model}`);
    console.log('─'.repeat(60));
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: 'Return this JSON: [{"test": "hello"}]' }]
          }],
          generationConfig: {
            temperature: 0.1
          }
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        const content = result.candidates?.[0]?.content?.parts?.[0]?.text;
        console.log(`✅ Status: ${response.status} - SUCCESS!`);
        console.log(`   Response: ${content?.substring(0, 100)}`);
        console.log(`   Finish reason: ${result.candidates?.[0]?.finishReason}`);
      } else {
        console.log(`❌ Status: ${response.status} - FAILED`);
        const errorMsg = result.error?.message || JSON.stringify(result).substring(0, 150);
        console.log(`   Error: ${errorMsg}`);
      }
    } catch (error) {
      console.log(`❌ Network error: ${error.message}`);
    }
    
    // Wait a bit between requests
    await new Promise(r => setTimeout(r, 1000));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Test complete!\n');
}

testModels().catch(console.error);
