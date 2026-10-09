const AuditLog = require('../models/AuditLog');
const auditLogger = require('../patterns/AuditLogger');

/**
 * FR-10, NFR-04, US-4.3. Reading the audit trail.
 *
 * Read only by design. There is no handler here that writes, edits or deletes
 * an entry, because the trail is append only. Writing is done by the
 * AuditLogger singleton from inside whichever controller performed the action.
 *
 * The route is behind requireRole('admin'), so a customer or organiser calling
 * it is refused with 403 by the middleware before reaching this file.
 */

const getAuditLog = async (req, res) => {
    try {
        const filter = {};

        // Optional narrowing, so an investigation can look at one kind of
        // event without reading everything.
        if (req.query.action) {
            filter.action = req.query.action;
        }
        if (req.query.targetId) {
            filter.targetId = String(req.query.targetId);
        }

        const page = Math.max(1, Number(req.query.page) || 1);
        const perPage = Math.min(100, Math.max(1, Number(req.query.perPage) || 50));

        const [entries, total] = await Promise.all([
            AuditLog.find(filter)
                .sort({ createdAt: -1 })
                .skip((page - 1) * perPage)
                .limit(perPage),
            AuditLog.countDocuments(filter),
        ]);

        res.json({
            entries,
            total,
            page,
            perPage,
            // Surfaced so the admin page can show whether any writes have been
            // dropped. A rising failure count means the trail has gaps.
            logger: auditLogger.stats(),
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getAuditLog };
