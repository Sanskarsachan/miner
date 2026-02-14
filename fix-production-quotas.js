/**
 * Direct MongoDB Fix Script
 * Run this directly against your production MongoDB Atlas
 * 
 * Usage: 
 * node fix-production-quotas.js
 * 
 * Make sure MONGODB_URI is set to your Atlas connection string
 */

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function fixQuotas() {
  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    console.error('❌ MONGODB_URI environment variable not set');
    process.exit(1);
  }

  console.log('🔍 Connecting to MongoDB...');
  console.log('URI:', mongoUri.replace(/password:[^@]*/, 'password:***'));

  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db();
    const collection = db.collection('gemini_api_keys');

    // Step 1: Diagnose
    console.log('\n📋 Step 1: Diagnosing API keys...\n');
    const allKeys = await collection
      .find({ is_deleted: false })
      .project({
        nickname: 1,
        'quota.daily_limit': 1,
        'quota.used_today': 1,
      })
      .toArray();

    console.log(`Found ${allKeys.length} active keys\n`);

    const keysWithWrongLimit = allKeys.filter(
      (k) => k.quota?.daily_limit !== 20
    );

    if (keysWithWrongLimit.length === 0) {
      console.log('✅ All keys already have correct limit (20/20)');
      return;
    }

    console.log(`⚠️  Found ${keysWithWrongLimit.length} keys with incorrect limits:\n`);
    keysWithWrongLimit.forEach((k) => {
      console.log(
        `   ${k.nickname}: ${k.quota?.used_today}/${k.quota?.daily_limit} (should be /20)`
      );
    });

    // Step 2: Fix
    console.log('\n🔧 Step 2: Fixing API key quotas...\n');

    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    for (const key of allKeys) {
      if (key.quota?.daily_limit !== 20) {
        try {
          await collection.updateOne(
            { _id: key._id },
            {
              $set: {
                'quota.daily_limit': 20,
                'quota.reset_at': tomorrow,
                last_modified_at: now,
              },
            }
          );
          console.log(
            `   ✅ ${key.nickname}: ${key.quota?.daily_limit} -> 20`
          );
        } catch (err) {
          console.log(`   ❌ ${key.nickname}: Failed - ${err.message}`);
        }
      }
    }

    // Step 3: Verify
    console.log('\n✔️  Step 3: Verifying fix...\n');
    const verifyKeys = await collection
      .find({ is_deleted: false })
      .project({
        nickname: 1,
        'quota.daily_limit': 1,
        'quota.used_today': 1,
      })
      .toArray();

    const stillWrong = verifyKeys.filter(
      (k) => k.quota?.daily_limit !== 20
    );

    if (stillWrong.length === 0) {
      console.log('✅ All API keys successfully fixed to 20/20!\n');
      verifyKeys.forEach((k) => {
        console.log(
          `   ${k.nickname}: ${k.quota?.used_today}/${k.quota?.daily_limit}`
        );
      });
    } else {
      console.log(
        `❌ ${stillWrong.length} keys still have incorrect limits:\n`
      );
      stillWrong.forEach((k) => {
        console.log(
          `   ${k.nickname}: ${k.quota?.used_today}/${k.quota?.daily_limit}`
        );
      });
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

fixQuotas().catch(console.error);
