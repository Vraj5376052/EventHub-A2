const { expect } = require('chai');
const RefundPolicy = require('../patterns/RefundPolicy');
const FullRefundPolicy = require('../patterns/FullRefundPolicy');
const PartialRefundPolicy = require('../patterns/PartialRefundPolicy');
const NoRefundPolicy = require('../patterns/NoRefundPolicy');
const RefundPolicyFactory = require('../patterns/RefundPolicyFactory');

describe('RefundPolicyFactory selection (FR-03, US-1.3)', () => {
    it('gives a full refund more than 7 days before the event', () => {
        expect(RefundPolicyFactory.getPolicy(200)).to.be.instanceOf(FullRefundPolicy);
    });

    it('gives a partial refund at exactly 7 days, the boundary', () => {
        expect(RefundPolicyFactory.getPolicy(168)).to.be.instanceOf(PartialRefundPolicy);
    });

    it('gives a partial refund between 24 hours and 7 days', () => {
        expect(RefundPolicyFactory.getPolicy(100)).to.be.instanceOf(PartialRefundPolicy);
    });

    it('gives a partial refund at exactly 24 hours, the boundary', () => {
        expect(RefundPolicyFactory.getPolicy(24)).to.be.instanceOf(PartialRefundPolicy);
    });

    it('gives no refund under 24 hours', () => {
        expect(RefundPolicyFactory.getPolicy(23)).to.be.instanceOf(NoRefundPolicy);
    });

    it('gives no refund once the event has started', () => {
        expect(RefundPolicyFactory.getPolicy(-5)).to.be.instanceOf(NoRefundPolicy);
    });

    it('rejects a non-numeric input', () => {
        expect(() => RefundPolicyFactory.getPolicy('soon')).to.throw('must be a number');
    });
});

describe('Refund amounts (FR-03, US-1.3)', () => {
    it('full refund returns the whole amount', () => {
        expect(new FullRefundPolicy().calculate(120)).to.equal(120);
    });

    it('partial refund returns half', () => {
        expect(new PartialRefundPolicy().calculate(120)).to.equal(60);
    });

    it('no refund returns zero', () => {
        expect(new NoRefundPolicy().calculate(120)).to.equal(0);
    });

    it('rounds to two decimal places', () => {
        expect(new PartialRefundPolicy().calculate(33.33)).to.equal(16.67);
    });

    it('rejects a negative amount', () => {
        expect(() => new FullRefundPolicy().calculate(-1)).to.throw('zero or more');
    });

    it('the base class refuses to calculate on its own', () => {
        expect(() => new RefundPolicy().calculate(100)).to.throw('must implement calculate()');
    });
});