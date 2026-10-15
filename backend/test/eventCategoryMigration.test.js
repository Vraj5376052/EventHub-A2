process.env.NODE_ENV = 'test';

const { expect } = require('chai');
const sinon = require('sinon');
const migrateEventCategory = require('../scripts/migrateEventCategory');

describe('event category backfill (FR-04)', () => {
    afterEach(() => sinon.restore());

    it('targets only events with no category field', async () => {
        const updateMany = sinon.stub().resolves({ modifiedCount: 9 });

        const modified = await migrateEventCategory({ updateMany });

        expect(updateMany.firstCall.args[0]).to.deep.equal({
            category: { $exists: false },
        });
        expect(updateMany.firstCall.args[1]).to.deep.equal({
            $set: { category: 'other' },
        });
        expect(modified).to.equal(9);
    });

    it('is safe to run twice', async () => {
        // A migration nobody dares re-run is a migration nobody runs.
        let remaining = 9;
        const updateMany = sinon.stub().callsFake(() => {
            const modifiedCount = remaining;
            remaining = 0;
            return Promise.resolve({ modifiedCount });
        });

        expect(await migrateEventCategory({ updateMany })).to.equal(9);
        expect(await migrateEventCategory({ updateMany })).to.equal(0);
    });
});
