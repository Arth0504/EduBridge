const express = require('express');
const {
  createFeeStructure,
  getFeeStructures,
  getFeeStructureById,
  updateFeeStructureById,
  activateFeeStructure,
  deactivateFeeStructure
} = require('../controllers/feeStructure.controller');
const {
  assignStudentFee,
  bulkAssignStudentFees,
  getStudentFees,
  getStudentFeesByStudentId,
  getStudentFeeById,
  updateStudentFeeById
} = require('../controllers/studentFee.controller');
const {
  recordCashPayment,
  initiateOnlinePayment,
  verifyOnlinePayment,
  refundPayment,
  getFeePayments,
  getFeePaymentById
} = require('../controllers/feePayment.controller');
const {
  applyDiscount,
  getScholarships,
  updateScholarshipById
} = require('../controllers/feeDiscount.controller');
const { getFeeReceipts, getFeeReceiptById } = require('../controllers/feeReceipt.controller');
const { getFeeSummaryReport } = require('../controllers/feeReport.controller');
const { getInstallments } = require('../controllers/installment.controller');

const { protect, authorizeRoles, tenantIsolation } = require('../middleware/auth.middleware');
const { checkInstitutionActive } = require('../middleware/tenant.middleware');

const router = express.Router();

// Protect all routes with auth check & active institution check
router.use(protect, checkInstitutionActive);

// 1. Fee Structure Routes
router.get('/fee-structures', tenantIsolation, getFeeStructures);
router.get('/fee-structures/:id', tenantIsolation, getFeeStructureById);
router.post(
  '/fee-structures',
  authorizeRoles('super_admin', 'institution_admin'),
  tenantIsolation,
  createFeeStructure
);
router.patch(
  '/fee-structures/:id',
  authorizeRoles('super_admin', 'institution_admin'),
  tenantIsolation,
  updateFeeStructureById
);
router.patch(
  '/fee-structures/:id/activate',
  authorizeRoles('super_admin', 'institution_admin'),
  tenantIsolation,
  activateFeeStructure
);
router.patch(
  '/fee-structures/:id/deactivate',
  authorizeRoles('super_admin', 'institution_admin'),
  tenantIsolation,
  deactivateFeeStructure
);

// 2. Student Fee Assignment Routes
router.get('/student-fees', tenantIsolation, getStudentFees);
router.get('/student-fees/student/:studentId', tenantIsolation, getStudentFeesByStudentId);
router.get('/student-fees/:id', tenantIsolation, getStudentFeeById);
router.post(
  '/student-fees',
  authorizeRoles('super_admin', 'institution_admin'),
  tenantIsolation,
  assignStudentFee
);
router.post(
  '/student-fees/assign',
  authorizeRoles('super_admin', 'institution_admin'),
  tenantIsolation,
  assignStudentFee
);
router.post(
  '/student-fees/bulk-assign',
  authorizeRoles('super_admin', 'institution_admin'),
  tenantIsolation,
  bulkAssignStudentFees
);
router.patch(
  '/student-fees/:id',
  authorizeRoles('super_admin', 'institution_admin'),
  tenantIsolation,
  updateStudentFeeById
);

// 3. Payment Routes (support /payments and /fee-payments)
router.get(['/fee-payments', '/payments'], tenantIsolation, getFeePayments);
router.get(['/fee-payments/:id', '/payments/:id'], tenantIsolation, getFeePaymentById);

router.post(
  ['/fee-payments/cash', '/payments/cash'],
  authorizeRoles('super_admin', 'institution_admin'),
  tenantIsolation,
  recordCashPayment
);
router.post(
  ['/fee-payments/online/initiate', '/payments/create-online-order'],
  authorizeRoles('super_admin', 'institution_admin', 'student', 'parent'),
  tenantIsolation,
  initiateOnlinePayment
);
router.post(
  ['/fee-payments/online/verify', '/payments/verify-online'],
  authorizeRoles('super_admin', 'institution_admin', 'student', 'parent'),
  tenantIsolation,
  verifyOnlinePayment
);
router.post(
  ['/fee-payments/refund', '/payments/refund', '/payments/:id/refund'],
  authorizeRoles('super_admin', 'institution_admin'),
  tenantIsolation,
  (req, res, next) => {
    if (req.params.id && !req.body.paymentId) req.body.paymentId = req.params.id;
    return refundPayment(req, res, next);
  }
);

// 4. Installments Route
router.get('/installments', tenantIsolation, getInstallments);

// 5. Discount / Scholarship Routes
router.get('/scholarships', tenantIsolation, getScholarships);
router.post(
  ['/scholarships', '/fee-discounts'],
  authorizeRoles('super_admin', 'institution_admin'),
  tenantIsolation,
  applyDiscount
);
router.patch(
  '/scholarships/:id',
  authorizeRoles('super_admin', 'institution_admin'),
  tenantIsolation,
  updateScholarshipById
);

// 6. Receipt Routes
router.get('/fee-receipts', tenantIsolation, getFeeReceipts);
router.get('/fee-receipts/:id', tenantIsolation, getFeeReceiptById);

// 7. Finance Report & Summary Routes
router.get(['/fee-reports/summary', '/finance/summary'], tenantIsolation, getFeeSummaryReport);

module.exports = router;
