const FullRefundPolicy = require('./FullRefundPolicy');
const PartialRefundPolicy = require('./PartialRefundPolicy');
const NoRefundPolicy = require('./NoRefundPolicy');

const HOURS_IN_A_WEEK = 168;
const HOURS_IN_A_DAY = 24;

/**
 * RefundPolicyFactory
 *
 * Factory Design Pattern. Creates the correct refund policy object from how
 * many hours remain before the event starts, so the caller never has to know
 * which concrete class it is getting.
 *
 *   more than 7 days out     FullRefundPolicy
 *   24 hours to 7 days       PartialRefundPolicy
 *   under 24 hours, or the
 *   event already started    NoRefundPolicy
 *
 * Adding a fourth rule means adding one class and one branch here. Nothing
 * else in the system changes.
 */
class RefundPolicyFactory {
    static getPolicy(hoursUntilEvent) {
        if (typeof hoursUntilEvent !== 'number' || Number.isNaN(hoursUntilEvent)) {
            throw new Error('hoursUntilEvent must be a number.');
        }

        if (hoursUntilEvent > HOURS_IN_A_WEEK) {
            return new FullRefundPolicy();
        } else if (hoursUntilEvent >= HOURS_IN_A_DAY) {
            return new PartialRefundPolicy();
        } else {
            return new NoRefundPolicy();
        }
    }
}

module.exports = RefundPolicyFactory;