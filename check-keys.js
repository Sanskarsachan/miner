/**
 * Check API keys in local database
 */
const { MongoClient } = require('mongodb');

async function checkKeys() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/course_harvester');
  
  try {
    await client.connect();
    const db = client.db();
    const keys = await db.collection('gemini_api_keys').find({}).toArray();
    
    console.log('Total keys in database:', keys.length);
    console.log('\n');
    
    keys.forEach((key, i) => {
      console.log(`Key ${i + 1}: ${key.nickname}`);
      console.log('  Active:', key.is_active);
      console.log('  Deleted:', key.is_deleted);
      console.log('  Daily limit:', key.quota?.daily_limit);
      console.log('  Used today:', key.quota?.used_today);
      console.log('  Remaining:', (key.quota?.daily_limit || 0) - (key.quota?.used_today || 0));
      console.log('  Reset at:', key.quota?.reset_at);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkKeys();
