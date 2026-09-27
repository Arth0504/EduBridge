const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { checkInstitutionActive } = require('../middleware/tenant.middleware');
const { getAcademicSummary } = require('../controllers/academicSummary.controller');

router.use(protect);
router.use(checkInstitutionActive);

router.get('/summary', getAcademicSummary);

module.exports = router;
