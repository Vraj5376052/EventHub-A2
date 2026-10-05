const RefundPolicy = require('./RefundPolicy');

/**
 * Cancelled well ahead of time, so the organiser can still resell the tickets.
 * The customer gets full refund back.
 */
class FullRefundPolicy extends RefundPolicy {
    get name() {
        return 'Full refund';
    }

    calculate(amountPaid) {
        this.assertValidAmount(amountPaid);
        return this.round(amountPaid);
    }
}

module.exports = FullRefundPolicy;