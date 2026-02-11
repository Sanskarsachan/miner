/**
 * Seed API Keys to Local MongoDB
 * Run this after installing MongoDB locally
 */

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/course_harvester_v2';

async function seedApiKeys() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    const apiKeysCollection = db.collection('gemini_api_keys');
    
    // Check if API keys already exist
    const existingCount = await apiKeysCollection.countDocuments();
    if (existingCount > 0) {
      console.log(`✅ Database already has ${existingCount} API key(s)`);
      console.log('\nTo view existing keys, run: node check-keys.js');
      return;
    }
    
    // Sample API keys (replace with your real Gemini API keys)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const sampleKeys = [
      {
        _id: new ObjectId(),
        nickname: 'API1001',
        key: 'AIzaSyBmpu3EEGThCVVb1RKTIpahoMNxCpIGD5o',
        provider: 'gemini',
        created_at: new Date(),
        updated_at: new Date(),
        is_active: true,
        is_deleted: false,
        quota: {
          daily_limit: 20,
          used_today: 0,
          reset_at: tomorrow,
        },
        usage: {
          total_requests: 0,
          total_tokens_used: 0,
          estimated_cost_cents: 0,
        },
        daily_usage: [],
      },
      {
        _id: new ObjectId(),
        nickname: 'API1002',
        key: 'AIzaSyCalCi-sd7CARrp-msZ8tJkNNxkawad4BI',
        provider: 'gemini',
        created_at: new Date(),
        updated_at: new Date(),
        is_active: true,
        is_deleted: false,
        quota: {
          daily_limit: 20,
          used_today: 0,
          reset_at: tomorrow,
        },
        usage: {
          total_requests: 0,
          total_tokens_used: 0,
          estimated_cost_cents: 0,
        },
        daily_usage: [],
      },
      {
        _id: new ObjectId(),
        nickname: 'API1003',
        key: 'AIzaSyASgyn9KJezJzu0rXTRIUgvsC2ZDhekAfY',
        provider: 'gemini',
        created_at: new Date(),
        updated_at: new Date(),
        is_active: true,
        is_deleted: false,
        quota: {
          daily_limit: 20,
          used_today: 0,
          reset_at: tomorrow,
        },
        usage: {
          total_requests: 0,
          total_tokens_used: 0,
          estimated_cost_cents: 0,
        },
        daily_usage: [],
      },
      {
        _id: new ObjectId(),
        nickname: 'API1004',
        key: 'AIzaSyCkqmf5dSNjKSDT-HSN7HOX1dzIZMsi-Ss',
        provider: 'gemini',
        created_at: new Date(),
        updated_at: new Date(),
        is_active: true,
        is_deleted: false,
        quota: {
          daily_limit: 20,
          used_today: 0,
          reset_at: tomorrow,
        },
        usage: {
          total_requests: 0,
          total_tokens_used: 0,
          estimated_cost_cents: 0,
        },
        daily_usage: [],
      },
      {
        _id: new ObjectId(),
        nickname: 'API1005',
        key: 'AIzaSyCt6x6AVDgR9UNcGeEPEEK1ONrpy97-2lU',
        provider: 'gemini',
        created_at: new Date(),
        updated_at: new Date(),
        is_active: true,
        is_deleted: false,
        quota: {
          daily_limit: 20,
          used_today: 0,
          reset_at: tomorrow,
        },
        usage: {
          total_requests: 0,
          total_tokens_used: 0,
          estimated_cost_cents: 0,
        },
        daily_usage: [],
      },
      {
        _id: new ObjectId(),
        nickname: 'API1006',
        key: 'AIzaSyCW5q4rbTdWyoeOo55WMO1EZYCs_GVjQ3I',
        provider: 'gemini',
        created_at: new Date(),
        updated_at: new Date(),
        is_active: true,
        is_deleted: false,
        quota: {
          daily_limit: 20,
          used_today: 0,
          reset_at: tomorrow,
        },
        usage: {
          total_requests: 0,
          total_tokens_used: 0,
          estimated_cost_cents: 0,
        },
        daily_usage: [],
      },
      {
        _id: new ObjectId(),
        nickname: 'API1007',
        key: 'AIzaSyBpYSmgh17uqMoDC1-mCrTE089DFPpMKxs',
        provider: 'gemini',
        created_at: new Date(),
        updated_at: new Date(),
        is_active: true,
        is_deleted: false,
        quota: {
          daily_limit: 20,
          used_today: 0,
          reset_at: tomorrow,
        },
        usage: {
          total_requests: 0,
          total_tokens_used: 0,
          estimated_cost_cents: 0,
        },
        daily_usage: [],
      },
      {
        _id: new ObjectId(),
        nickname: 'API1008',
        key: 'AIzaSyBz-zSoTt7WRTEPAho6LjdAdB_wnkEyuL0',
        provider: 'gemini',
        created_at: new Date(),
        updated_at: new Date(),
        is_active: true,
        is_deleted: false,
        quota: {
          daily_limit: 20,
          used_today: 0,
          reset_at: tomorrow,
        },
        usage: {
          total_requests: 0,
          total_tokens_used: 0,
          estimated_cost_cents: 0,
        },
        daily_usage: [],
      },
      {
        _id: new ObjectId(),
        nickname: 'API1009',
        key: 'AIzaSyCcLNeLF5xQDxBDMUz-yxQ4piTlEzydzpQ',
        provider: 'gemini',
        created_at: new Date(),
        updated_at: new Date(),
        is_active: true,
        is_deleted: false,
        quota: {
          daily_limit: 20,
          used_today: 0,
          reset_at: tomorrow,
        },
        usage: {
          total_requests: 0,
          total_tokens_used: 0,
          estimated_cost_cents: 0,
        },
        daily_usage: [],
      },
      {
        _id: new ObjectId(),
        nickname: 'API1010',
        key: 'AIzaSyDc63aN3RQr983kFJaJ1GkXk0rAUnjIkD4',
        provider: 'gemini',
        created_at: new Date(),
        updated_at: new Date(),
        is_active: true,
        is_deleted: false,
        quota: {
          daily_limit: 20,
          used_today: 0,
          reset_at: tomorrow,
        },
        usage: {
          total_requests: 0,
          total_tokens_used: 0,
          estimated_cost_cents: 0,
        },
        daily_usage: [],
      },
      {
        _id: new ObjectId(),
        nickname: 'API1011',
        key: 'AIzaSyDDsl79dTxAm4rdLpImeGyUMZKA0y0MqyU',
        provider: 'gemini',
        created_at: new Date(),
        updated_at: new Date(),
        is_active: true,
        is_deleted: false,
        quota: {
          daily_limit: 20,
          used_today: 0,
          reset_at: tomorrow,
        },
        usage: {
          total_requests: 0,
          total_tokens_used: 0,
          estimated_cost_cents: 0,
        },
        daily_usage: [],
      },
      {
        _id: new ObjectId(),
        nickname: 'API1012',
        key: 'AIzaSyAGAHQv_yf-89lhjjPCy7eISTgdCMZZw24',
        provider: 'gemini',
        created_at: new Date(),
        updated_at: new Date(),
        is_active: true,
        is_deleted: false,
        quota: {
          daily_limit: 20,
          used_today: 0,
          reset_at: tomorrow,
        },
        usage: {
          total_requests: 0,
          total_tokens_used: 0,
          estimated_cost_cents: 0,
        },
        daily_usage: [],
      },
      {
        _id: new ObjectId(),
        nickname: 'API1013',
        key: 'AIzaSyAe2n3CHFvtemI0GEXcGacqSgusZOtE1Ic',
        provider: 'gemini',
        created_at: new Date(),
        updated_at: new Date(),
        is_active: true,
        is_deleted: false,
        quota: {
          daily_limit: 20,
          used_today: 0,
          reset_at: tomorrow,
        },
        usage: {
          total_requests: 0,
          total_tokens_used: 0,
          estimated_cost_cents: 0,
        },
        daily_usage: [],
      },
      {
        _id: new ObjectId(),
        nickname: 'API1014',
        key: 'AIzaSyBEeyIN_F6t6OwQEI1po5WJOkl38Iy5SIg',
        provider: 'gemini',
        created_at: new Date(),
        updated_at: new Date(),
        is_active: true,
        is_deleted: false,
        quota: {
          daily_limit: 20,
          used_today: 0,
          reset_at: tomorrow,
        },
        usage: {
          total_requests: 0,
          total_tokens_used: 0,
          estimated_cost_cents: 0,
        },
        daily_usage: [],
      },
      {
        _id: new ObjectId(),
        nickname: 'API1015',
        key: 'AIzaSyCIahvw2VKNzT0sVD5p8IfPoxDyexWVqQs',
        provider: 'gemini',
        created_at: new Date(),
        updated_at: new Date(),
        is_active: true,
        is_deleted: false,
        quota: {
          daily_limit: 20,
          used_today: 0,
          reset_at: tomorrow,
        },
        usage: {
          total_requests: 0,
          total_tokens_used: 0,
          estimated_cost_cents: 0,
        },
        daily_usage: [],
      },
      {
        _id: new ObjectId(),
        nickname: 'API1016',
        key: 'AIzaSyABpfxQvk6T5UAAYipPt5yZnjPhNuUmW1E',
        provider: 'gemini',
        created_at: new Date(),
        updated_at: new Date(),
        is_active: true,
        is_deleted: false,
        quota: {
          daily_limit: 20,
          used_today: 0,
          reset_at: tomorrow,
        },
        usage: {
          total_requests: 0,
          total_tokens_used: 0,
          estimated_cost_cents: 0,
        },
        daily_usage: [],
      },
      {
        _id: new ObjectId(),
        nickname: 'API1017',
        key: 'AIzaSyAkjxr47xnst5F0YiSJG0drVbo6pumTNVA',
        provider: 'gemini',
        created_at: new Date(),
        updated_at: new Date(),
        is_active: true,
        is_deleted: false,
        quota: {
          daily_limit: 20,
          used_today: 0,
          reset_at: tomorrow,
        },
        usage: {
          total_requests: 0,
          total_tokens_used: 0,
          estimated_cost_cents: 0,
        },
        daily_usage: [],
      },
      {
        _id: new ObjectId(),
        nickname: 'API1018',
        key: 'AIzaSyBBOuAQSAZgntm5cKmMQTCqOqsvAu_7uO4',
        provider: 'gemini',
        created_at: new Date(),
        updated_at: new Date(),
        is_active: true,
        is_deleted: false,
        quota: {
          daily_limit: 20,
          used_today: 0,
          reset_at: tomorrow,
        },
        usage: {
          total_requests: 0,
          total_tokens_used: 0,
          estimated_cost_cents: 0,
        },
        daily_usage: [],
      },
      {
        _id: new ObjectId(),
        nickname: 'API1019',
        key: 'AIzaSyBan1bNZMoUhLYQgepkMfF9oP1xraaBZ7U',
        provider: 'gemini',
        created_at: new Date(),
        updated_at: new Date(),
        is_active: true,
        is_deleted: false,
        quota: {
          daily_limit: 20,
          used_today: 0,
          reset_at: tomorrow,
        },
        usage: {
          total_requests: 0,
          total_tokens_used: 0,
          estimated_cost_cents: 0,
        },
        daily_usage: [],
      },
    ];
    
    console.log('\n⚠️  IMPORTANT: Add your real Gemini API keys!');
    console.log('1. Get API key from: https://aistudio.google.com/apikey');
    console.log('2. Edit this file: seed-api-keys.js');
    console.log('3. Replace "YOUR_GEMINI_API_KEY_HERE" with your actual key');
    console.log('4. Run: node seed-api-keys.js');
    console.log('\nFor now, inserting placeholder keys...\n');
    
    const result = await apiKeysCollection.insertMany(sampleKeys);
    console.log(`✅ Inserted ${result.insertedCount} API key(s)`);
    
    console.log('\n📝 Next steps:');
    console.log('1. Edit seed-api-keys.js and add your real Gemini API key');
    console.log('2. Delete placeholder: mongosh course_harvester_v2 --eval "db.api_keys.deleteMany({})"');
    console.log('3. Re-run: node seed-api-keys.js');
    console.log('4. Or add keys through the UI at /tokens page');
    
  } catch (error) {
    console.error('❌ Error seeding API keys:', error);
  } finally {
    await client.close();
  }
}

seedApiKeys();
