// One-off fix script.
// Run with: node scripts/drop_stale_invoice_index.js
// Drops the stale camelCase "invoiceNumber_1" unique index left over
// from before the schema was renamed to snake_case (invoice_number).

require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  const uri = "mongodb://interiorfirm:interiorfirm2026@ac-abl4ihf-shard-00-00.2bnfo69.mongodb.net:27017,ac-abl4ihf-shard-00-01.2bnfo69.mongodb.net:27017,ac-abl4ihf-shard-00-02.2bnfo69.mongodb.net:27017/?ssl=true&replicaSet=atlas-6xvmau-shard-0&authSource=admin&appName=interiorfirm";
  if (!uri) {
    console.error('MONGO_URI not found in .env');
    process.exit(1);
  } 

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const collection = db.collection('invoices');

  const indexes = await collection.indexes();
  console.log('Current indexes on invoices collection:');
  indexes.forEach((idx) => console.log(' -', idx.name, JSON.stringify(idx.key)));

  // Any stale index that is NOT the legit "_id_" or the current
  // snake_case "invoice_number_1" index gets dropped. This covers
  // "invoiceNumber_1", "invoiceNumber_1_1", and any other leftover
  // camelCase/typo indexes from earlier schema iterations.
  const KEEP = new Set(['_id_', 'invoice_number_1']);
  const staleIndexes = indexes.filter((idx) => !KEEP.has(idx.name));

  if (staleIndexes.length === 0) {
    console.log('\nNo stale indexes found. Nothing to drop.');
  } else {
    for (const idx of staleIndexes) {
      await collection.dropIndex(idx.name);
      console.log(`\n✅ Dropped stale index "${idx.name}".`);
    }
  }

  // Sanity check: also clean up any existing invoice docs that have a
  // leftover camelCase "invoiceNumber" or "invoiceNumber_1" field, since
  // the unique index may have allowed at most one such doc through already.
  for (const field of ['invoiceNumber', 'invoiceNumber_1']) {
    const dirty = await collection.countDocuments({ [field]: { $exists: true } });
    if (dirty > 0) {
      console.log(`\nFound ${dirty} document(s) with a leftover "${field}" field. Unsetting it...`);
      await collection.updateMany({ [field]: { $exists: true } }, { $unset: { [field]: '' } });
      console.log(`✅ Cleaned up leftover field "${field}".`);
    }
  }

  console.log('\nFinal indexes:');
  const finalIndexes = await collection.indexes();
  finalIndexes.forEach((idx) => console.log(' -', idx.name, JSON.stringify(idx.key)));

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});