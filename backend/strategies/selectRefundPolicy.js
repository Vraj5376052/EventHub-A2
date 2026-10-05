const FullRefundPolicy = require('./FullRefundPolicy');
const PartialRefundPolicy = require('./PartialRefundPolicy');
const NoRefundPolicy = require('./NoRefundPolicy');

const HOURS_IN_A_WEEK = 168;
const HOURS_IN_A_DAY = 24;

/**
 * Picks the policy that applies, based on how long until the event starts.
 *
 * This is the only place in the system that knows the cut-offs. The
 * controller just asks for a policy and calls calculate() on whatever it
 * gets back, so adding a fourth rule later means adding a class and one
 * line here, and changing nothing else.
 *
 *   more than 7 days out     full refund
 *   24 hours to 7 days       half back
 *   under 24 hours, or the
 *   event already started    nothing
 */
const selectRefundPolicy = (hoursUntilEvent) => {
    if (typeof hoursUntilEvent !== 'number' || Number.isNaN(hoursUntilEvent)) {
        throw new Error('hoursUntilEvent must be a number.');
    }
    if (hoursUntilEvent > HOURS_IN_A_WEEK) {
        return new FullRefundPolicy();
    }
    if (hoursUntilEvent >= HOURS_IN_A_DAY) {
        return new PartialRefundPolicy();
    }
    return new NoRefundPolicy();
};

module.exports = selectRefundPolicy;