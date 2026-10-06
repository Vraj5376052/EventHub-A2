const RefundPolicy = require('./RefundPolicy');

/**
 * Too late to resell the seats. The booking can still be cancelled so the
 * seats return to the pool, but nothing is refunded.
 */
class NoRefundPolicy extends RefundPolicy {
    get name() {
        return 'No refund';
    }

    calculate(amountPaid) {
        this.assertValidAmount(amountPaid);
        return 0;
    }
}

module.exports = NoRefundPolicy;