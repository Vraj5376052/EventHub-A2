const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Events created before FR-04 introduced the category field have no such key.
// A Mongoose default only applies when a document is created, it does not
// backfill, and { category: 'general' } does not match a document where the
// key is absent. Without this the category filter returns nothing for every
// value, including 'general'. Same shape as migrateReviewCustomerId.
const migrateEventCategory = async (collection) => {
    const result = await collection.updateMany(
        { category: { $exists: false } },
        { $set: { category: 'general' } }
    );

    return result.modifiedCount;
};

const run = async () => {
    dotenv.config();
    if (!process.env.MONGO_URI) {
        throw new Error('MONGO_URI must be set to migrate event records.');
    }

    await mongoose.connect(process.env.MONGO_URI);
    try {
        const collection = mongoose.connection.collection('events');
        const modified = await migrateEventCategory(collection);
        console.log(`Event category migration complete; ${modified} event(s) backfilled to "general".`);
    } finally {
        await mongoose.disconnect();
    }
};

if (require.main === module) {
    run().catch((error) => {
        console.error('Event category migration failed:', error.message);
        process.exitCode = 1;
    });
}

module.exports = migrateEventCategory;
