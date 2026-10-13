const mongoose = require('mongoose');
const dotenv = require('dotenv');

const migrateReviewCustomerId = async (collection) => {
    const indexes = await collection.indexes();
    const legacyIndex = indexes.find((index) =>
        index.unique
        && Object.keys(index.key).length === 2
        && index.key.eventId === 1
        && index.key.reviewerId === 1
    );

    if (legacyIndex) {
        await collection.dropIndex(legacyIndex.name);
    }

    await collection.updateMany(
        { customerId: { $exists: false }, reviewerId: { $exists: true } },
        { $rename: { reviewerId: 'customerId' } }
    );
    await collection.updateMany(
        { customerId: { $exists: true }, reviewerId: { $exists: true } },
        { $unset: { reviewerId: '' } }
    );

    return collection.createIndex({ eventId: 1, customerId: 1 }, { unique: true });
};

const run = async () => {
    dotenv.config();
    if (!process.env.MONGO_URI) {
        throw new Error('MONGO_URI must be set to migrate review records.');
    }

    await mongoose.connect(process.env.MONGO_URI);
    try {
        const collection = mongoose.connection.collection('reviews');
        const indexName = await migrateReviewCustomerId(collection);
        console.log(`Review customerId migration complete; index ${indexName} is ready.`);
    } finally {
        await mongoose.disconnect();
    }
};

if (require.main === module) {
    run().catch((error) => {
        console.error('Review customerId migration failed:', error.message);
        process.exitCode = 1;
    });
}

module.exports = migrateReviewCustomerId;
