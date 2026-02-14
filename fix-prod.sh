#!/bin/bash
# Fix Production API Key Quotas
# This script connects directly to your production MongoDB Atlas and fixes the quota issue

set -e

echo "🔹 MongoDB Atlas Direct Fix"
echo "================================"
echo ""
echo "This script will:"
echo "1. Update all API keys from 28800/28800 to 20/20"
echo "2. Reset used_today to 0 for a clean slate"
echo "3. Verify the changes"
echo ""

# You need to provide your MongoDB Atlas connection string
# Format: mongodb+srv://username:password@cluster.mongodb.net/database_name

read -p "Enter your MongoDB Atlas connection string: " MONGODB_URI

if [ -z "$MONGODB_URI" ]; then
  echo "❌ No connection string provided"
  exit 1
fi

export MONGODB_URI="$MONGODB_URI"

node << 'EOF'
const { MongoClient } = require('mongodb');

async function fixProduction() {
  const uri = process.env.MONGODB_URI;
  
  console.log('\n🔍 Connecting to MongoDB Atlas...');
  const client = new MongoClient(uri, { 
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000 
  });

  try {
    await client.connect();
    console.log('✅ Connected successfully\n');

    const db = client.db();
    const collection = db.collection('gemini_api_keys');

    // Diagnose
    console.log('📋 Diagnosing API keys...\n');
    const allKeys = await collection
      .find({ is_deleted: false })
      .project({
        nickname: 1,
        'quota.daily_limit': 1,
        'quota.used_today': 1,
      })
      .toArray();

    console.log(`Found ${allKeys.length} active keys\n`);

    const wrongLimit = allKeys.filter(k => k.quota?.daily_limit !== 20);
    
    if (wrongLimit.length === 0) {
      console.log('✅ All keys already have correct limit (20/20)');
      await client.close();
      return;
    }

    console.log(`⚠️ Found ${wrongLimit.length} keys with incorrect limits:\n`);
    wrongLimit.forEach(k => {
      console.log(`   ${k.nickname}: 0/${k.quota?.daily_limit} → should be 0/20`);
    });

    // Fix
    console.log('\n🔧 Fixing quotas...\n');
    
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const result = await collection.updateMany(
      {
        is_deleted: false,
        'quota.daily_limit': { $ne: 20 }
      },
      {
        $set: {
          'quota.daily_limit': 20,
          'quota.reset_at': tomorrow,
          'quota.used_today': 0,
          last_modified_at: now
        }
      }
    );

    console.log(`   Updated: ${result.modifiedCount} keys`);

    // Verify
    console.log('\n✔️ Verifying fix...\n');
    const verify = await collection
      .find({ is_deleted: false })
      .project({
        nickname: 1,
        'quota.daily_limit': 1,
        'quota.used_today': 1,
      })
      .toArray();

    const stillWrong = verify.filter(k => k.quota?.daily_limit !== 20);

    if (stillWrong.length === 0) {
      console.log('✅ All API keys fixed successfully!\n');
      console.log('Updated keys:');
      verify.forEach(k => {
        console.log(`   ${k.nickname}: ${k.quota?.used_today}/20`);
      });
      console.log('\n✅ Fix complete! You can refresh the analytics page now.\n');
    } else {
      console.log(`❌ ${stillWrong.length} keys still incorrect:`);
      stillWrong.forEach(k => {
        console.log(`   ${k.nickname}: ${k.quota?.used_today}/${k.quota?.daily_limit}`);
      });
    }

    await client.close();
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.message.includes('ENOENT')) {
      console.log('\nTroubleshooting:');
      console.log('- Make sure your connection string is correct');
      console.log('- Ensure IP whitelist includes your current IP in Atlas');
      console.log('- Check username and password are correct');
    }
    process.exit(1);
  }
}

fixProduction().catch(console.error);
EOF
