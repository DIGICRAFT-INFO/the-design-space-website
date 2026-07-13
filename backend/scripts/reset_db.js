/**
 * DB Reset Script
 * - Drops ALL collections
 * - Creates a fresh Manager account
 * 
 * Run: node scripts/reset_db.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI;

const NEW_USER = {
  email: 'thedesignspace@gmail.com',
  password: 'thedesignspace@2026',
  full_name: 'The Design Space',
  role: 'manager',
  is_active: true,
};

async function resetDB() {
  console.log('\n🔌 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected:', mongoose.connection.host);

  const db = mongoose.connection.db;

  // 1. Drop all collections
  const collections = await db.listCollections().toArray();
  if (collections.length === 0) {
    console.log('ℹ️  No collections to drop.');
  } else {
    console.log(`\n🗑️  Dropping ${collections.length} collection(s)...`);
    for (const col of collections) {
      await db.dropCollection(col.name);
      console.log(`   ✓ Dropped: ${col.name}`);
    }
  }

  // 2. Create fresh manager user
  console.log('\n👤 Creating fresh manager account...');
  const { v4: uuidv4 } = require('uuid');
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(NEW_USER.password, salt);

  const usersCollection = db.collection('users');
  await usersCollection.insertOne({
    _id: uuidv4(),
    email: NEW_USER.email,
    full_name: NEW_USER.full_name,
    password: hashedPassword,
    role: NEW_USER.role,
    phone: '',
    profile_image: null,
    is_active: NEW_USER.is_active,
    is_staff: false,
    created_at: new Date(),
    updated_at: new Date(),
  });

  console.log('✅ Manager account created:');
  console.log('   Email   :', NEW_USER.email);
  console.log('   Password:', NEW_USER.password);
  console.log('   Role    :', NEW_USER.role);
  console.log('   Active  : true');

  // 3. Verify the user was inserted
  const user = await usersCollection.findOne({ email: NEW_USER.email });
  const passwordOk = await bcrypt.compare(NEW_USER.password, user.password);
  console.log('\n🔐 Password verification:', passwordOk ? '✅ PASS' : '❌ FAIL');

  await mongoose.disconnect();
  console.log('\n🎉 DB reset complete. You can now login.\n');
}

resetDB().catch((err) => {
  console.error('❌ Reset failed:', err.message);
  process.exit(1);
});
