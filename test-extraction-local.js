/**
 * Local debugging script for testing extraction
 * Run with: node test-extraction-local.js
 */

const sampleText = `Revised   01/28/2025  Grade 11 Course Registration, Boca Raton Community High School, 2025 - 2026

Electives  Art  
____ 0101300 2-D Art 1  
____ 0101310 2-D Art 2  
____ 0108400 3-D Art 1  
____ 0108410 3-D Art 2

Mathematics
____ 1206310 Algebra I  
____ 1206320 Geometry  
____ 1206330 Algebra II

Science  
____ 2000310 Biology I  
____ 2003340 Chemistry I  
____ 2003380 Physics I

English Language Arts
____ 1001310 English I  
____ 1001320 English II  
____ 1001330 English III`;

async function testExtraction() {
  console.log('🔍 Testing extraction locally...\n');
  console.log('Sample text length:', sampleText.length, 'chars');
  console.log('Sample preview:', sampleText.substring(0, 200), '\n');

  // First, get available API keys
  console.log('📋 Fetching available API keys...');
  try {
    const keysResponse = await fetch('http://localhost:3000/api/v2/api-keys/available');
    const keysData = await keysResponse.json();
    
    console.log('Available keys:', keysData.keys?.length || 0);
    
    if (!keysData.keys || keysData.keys.length === 0) {
      console.error('❌ No API keys available!');
      console.log('Please add API keys first.');
      return;
    }

    const apiKeyId = keysData.keys[0]._id;
    console.log('Using API key:', keysData.keys[0].nickname);
    console.log('Requests remaining:', keysData.keys[0].rpd_remaining, '\n');

    // Now test extraction
    console.log('🚀 Calling /api/secure_extract...');
    const extractResponse = await fetch('http://localhost:3000/api/secure_extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: sampleText,
        apiKeyId: apiKeyId,
        filename: 'test.pdf'
      })
    });

    console.log('Response status:', extractResponse.status);
    const responseText = await extractResponse.text();
    console.log('Response text length:', responseText.length);
    console.log('Response preview:', responseText.substring(0, 500), '\n');

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('❌ Failed to parse response as JSON');
      console.error('Raw response:', responseText);
      return;
    }

    if (extractResponse.ok) {
      if (Array.isArray(data)) {
        console.log('✅ Success! Extracted', data.length, 'courses');
        if (data.length > 0) {
          console.log('\nFirst course:');
          console.log(JSON.stringify(data[0], null, 2));
        }
      } else if (data.error) {
        console.error('❌ Error response:', data.error);
        console.error('Message:', data.message);
        if (data.finishReason) console.error('Finish reason:', data.finishReason);
        if (data.blockReason) console.error('Block reason:', data.blockReason);
        if (data.fullResponse) {
          console.error('\nFull Gemini response:');
          console.error(JSON.stringify(data.fullResponse, null, 2));
        }
      }
    } else {
      console.error('❌ HTTP Error:', extractResponse.status);
      console.error('Error data:', JSON.stringify(data, null, 2));
    }

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.error(error.stack);
  }
}

// Wait a bit for dev server to start
setTimeout(() => {
  testExtraction();
}, 2000);
