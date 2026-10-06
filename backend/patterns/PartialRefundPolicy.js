const RefundPolicy = require('./RefundPolicy');

/**
 * Close enough to the event that reselling the seats is uncertain, so the
 * cost is shared. 50% (Half) money is refunded back.
 */
class PartialRefundPolicy extends RefundPolicy {
    static RATE = 0.5;

    get name() {
        return 'Partial refund, 50 percent';
    }

    calculate(amountPaid) {
        this.assertValidAmount(amountPaid);
        return this.round(amountPaid * PartialRefundPolicy.RATE);
    }
}

module.exports = PartialRefundPolicy;