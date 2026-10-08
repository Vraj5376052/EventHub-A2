const express = require('express');
const { getAuditLog } = require('../controllers/auditController');
const { protect, requireRole } = require('../middleware/authMiddleware');
const router = express.Router();

// Read only, admin only. There is deliberately no POST, PATCH or DELETE on
// this router: the audit trail is append only and is written by the
// AuditLogger singleton, never over HTTP.
router.get('/audit', protect, requireRole('admin'), getAuditLog);

module.exports = router;
