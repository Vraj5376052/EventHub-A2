/**
 * RefundPolicy
 *
 * The Strategy interface. Every refund rule in the system is a subclass of
 * this, and the cancellation controller works against this type only, so it
 * never needs to know which rule it is holding.
 *
 * Subclasses must provide:
 *   name        a label stored on the booking and shown to the customer
 *   calculate() the refund amount for a given ticket total
 */
class RefundPolicy {
    /** Human readable name of the policy. Subclasses must override. */
    get name() {
        throw new Error('A refund policy must provide a name.');
    }

    /**
     * Work out the refund for this booking.
     * Subclasses must override. The base class deliberately refuses to guess.
     */
    calculate(amountPaid) {
        throw new Error('A refund policy must implement calculate().');
    }

    /** Shared guard so every policy rejects nonsense input the same way. */
    assertValidAmount(amountPaid) {
        if (typeof amountPaid !== 'number' || Number.isNaN(amountPaid) || amountPaid < 0) {
            throw new Error('amountPaid must be a number of zero or more.');
        }
    }

    /** Money to two decimal places, so we never store 23.999999999. */
    round(value) {
        return Math.round(value * 100) / 100;
    }
}

module.exports = RefundPolicy;
