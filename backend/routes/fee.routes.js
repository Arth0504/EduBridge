const express = require('express');
const {
  createFeeStructure,
  getFeeStructures,
  getFeeStructureById,
  updateFeeStructureById
} = require('../controllers/feeStructure.controller');
const {
  assignStudentFee,
  getStudentFees,
  getStudentFeeById,
  updateStudentFeeById
} = require('../controllers/studentFee.controller');
const {
  recordCashPayment,
  initiateOnlinePayment,
  getFeePayments,
  getFeePaymentById
} = require('../controllers/feePayment.controller');
const { applyDiscount } = require('../controllers/feeDiscount.controller');
const { getFeeReceipts, getFeeReceiptById } = require('../controllers/feeReceipt.controller');
const { getFeeSummaryReport } = require('../controllers/feeReport.controller');

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

// 2. Student Fee Assignment Routes
router.get('/student-fees', tenantIsolation, getStudentFees);
router.get('/student-fees/:id', tenantIsolation, getStudentFeeById);
router.post(
  '/student-fees',
  authorizeRoles('super_admin', 'institution_admin'),
  tenantIsolation,
  assignStudentFee
);
router.patch(
  '/student-fees/:id',
  authorizeRoles('super_admin', 'institution_admin'),
  tenantIsolation,
  updateStudentFeeById
);

// 3. Payment Routes
router.get('/fee-payments', tenantIsolation, getFeePayments);
router.get('/fee-payments/:id', tenantIsolation, getFeePaymentById);
router.post(
  '/fee-payments/cash',
  authorizeRoles('super_admin', 'institution_admin'),
  tenantIsolation,
  recordCashPayment
);
router.post(
  '/fee-payments/online/initiate',
  authorizeRoles('super_admin', 'institution_admin', 'student', 'parent'),
  tenantIsolation,
  initiateOnlinePayment
);

// 4. Discount / Concession Routes
router.post(
  '/fee-discounts',
  authorizeRoles('super_admin', 'institution_admin'),
  tenantIsolation,
  applyDiscount
);

// 5. Receipt Routes
router.get('/fee-receipts', tenantIsolation, getFeeReceipts);
router.get('/fee-receipts/:id', tenantIsolation, getFeeReceiptById);

// 6. Report Routes
router.get('/fee-reports/summary', tenantIsolation, getFeeSummaryReport);

module.exports = router;
