/**
 * Reset API key quotas in local database
 * This resets all keys to have 0 used_today
 */

async function resetQuotas() {
  console.log('Calling reset API...');
  
  try {
    const response = await fetch('http://localhost:3000/api/v2/api-keys', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'reset_all_quotas'
      })
    });
    
    const data = await response.json();
    console.log('Response:', data);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

setTimeout(resetQuotas, 1000);
