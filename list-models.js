/**
 * List available Gemini models
 * Run: node list-models.js
 */

const API_KEY = 'AIzaSyBmpu3EEGThCVVb1RKTIpahoMNxCpIGD5o';

async function listModels() {
  console.log('📋 Fetching available models from Gemini API...\n');
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
  
  try {
    const response = await fetch(url);
    const result = await response.json();
    
    if (!response.ok) {
      console.error('❌ Error:', result.error?.message || result);
      return;
    }
    
    console.log(`✅ Found ${result.models?.length || 0} models:\n`);
    
    if (result.models) {
      result.models.forEach((model, i) => {
        console.log(`${i + 1}. ${model.name}`);
        console.log(`   Display Name: ${model.displayName}`);
        console.log(`   Description: ${model.description?.substring(0, 80)}`);
        console.log(`   Supported methods: ${model.supportedGenerationMethods?.join(', ')}`);
        console.log('');
      });
      
      console.log('─'.repeat(60));
      console.log('\n✅ Models that support generateContent:');
      const generateContentModels = result.models.filter(m => 
        m.supportedGenerationMethods?.includes('generateContent')
      );
      generateContentModels.forEach(m => {
        console.log(`   • ${m.name.replace('models/', '')}`);
      });
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

listModels();
