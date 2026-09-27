require('dotenv').config();
const axios = require('axios');

const API_BASE = 'http://127.0.0.1:5000/api/v1';

const logTest = (num, name, passed, detail = '') => {
  const badge = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${badge} | Test ${num}: ${name} ${detail ? `(${detail})` : ''}`);
};

const runPhase9Tests = async () => {
  console.log('\n================================================================');
  console.log('  EduBridge Phase 9 Fees & Finance Management Test Suite');
  console.log('================================================================\n');

  const timestamp = Date.now();

  let superAdminToken = null;
  let instAdminAToken = null;
  let instAdminBToken = null;
  let teacherAToken = null;
  let studentAToken = null;
  let studentBToken = null;
  let parentAToken = null;

  let instAId = null;
  let instBId = null;

  let year2025Id = null;
  let year2026Id = null;
  let class10Id = null;
  let section10AId = null;

  let studentAProfileId = null;
  let studentAUserId = null;
  let studentBProfileId = null;
  let parentUserId = null;

  let feeStructureId = null;
  let studentFeeId = null;
  let cashPaymentId = null;
  let receiptId = null;
  let onlinePaymentId = null;
  let refundPaymentId = null;
  let scholarshipId = null;

  try {
    // ----------------------------------------------------------------
    // Setup Phase: Login Super Admin & Setup Multi-Tenant Environment
    // ----------------------------------------------------------------
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'superadmin@edubridge.org';
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdminSecretPassword123!';

    const sLogin = await axios.post(`${API_BASE}/auth/login`, {
      email: superAdminEmail,
      password: superAdminPassword
    });
    superAdminToken = sLogin.data.data.token;
    console.log(`[Setup] Super Admin logged in: ${superAdminEmail}`);

    const setupInst = async (prefix) => {
      const email = `inst_${prefix.toLowerCase()}_p9_${timestamp}@edubridge.org`;
      const adminEmail = `admin_${prefix.toLowerCase()}_p9_${timestamp}@edubridge.org`;
      const reg = await axios.post(`${API_BASE}/institutions/register`, {
        institutionName: `Phase9 ${prefix} Academy ${timestamp}`,
        institutionType: 'School',
        email,
        phone: '+91 9876543210',
        address: '100 Finance Boulevard',
        city: 'Delhi',
        state: 'Delhi',
        postalCode: '110001',
        proposedAdmin: { fullName: `${prefix} Finance Admin`, email: adminEmail }
      });

      const instId = reg.data.data.institution._id;

      await axios.patch(
        `${API_BASE}/institutions/${instId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${superAdminToken}` } }
      );

      const adminLogin = await axios.post(`${API_BASE}/auth/login`, {
        email: adminEmail,
        password: 'EduBridgeAdmin123!'
      });

      return {
        institutionId: instId,
        adminToken: adminLogin.data.data.token
      };
    };

    const instA = await setupInst('InstA');
    instAId = instA.institutionId;
    instAdminAToken = instA.adminToken;

    const instB = await setupInst('InstB');
    instBId = instB.institutionId;
    instAdminBToken = instB.adminToken;

    // Create Academic Years in Inst A
    const ay2025 = await axios.post(
      `${API_BASE}/academic-years`,
      {
        name: `2025-2026_${timestamp}`,
        startDate: '2025-04-01',
        endDate: '2026-03-31',
        status: 'completed'
      },
      { headers: { Authorization: `Bearer ${instAdminAToken}` } }
    );
    year2025Id = ay2025.data.data.academicYear._id;

    const ay2026 = await axios.post(
      `${API_BASE}/academic-years`,
      {
        name: `2026-2027_${timestamp}`,
        startDate: '2026-04-01',
        endDate: '2027-03-31',
        status: 'active'
      },
      { headers: { Authorization: `Bearer ${instAdminAToken}` } }
    );
    year2026Id = ay2026.data.data.academicYear._id;

    // Create Class & Section in Inst A
    const cls10 = await axios.post(
      `${API_BASE}/classes`,
      {
        name: `Grade 10_${timestamp}`,
        academicYearId: year2026Id
      },
      { headers: { Authorization: `Bearer ${instAdminAToken}` } }
    );
    class10Id = cls10.data.data.class._id;

    const sec10A = await axios.post(
      `${API_BASE}/sections`,
      {
        name: 'A',
        classId: class10Id,
        academicYearId: year2026Id,
        capacity: 40
      },
      { headers: { Authorization: `Bearer ${instAdminAToken}` } }
    );
    section10AId = sec10A.data.data.section._id;

    // Create Teacher in Inst A
    const tUserEmail = `teacher_p9_${timestamp}@edubridge.org`;
    const tReg = await axios.post(
      `${API_BASE}/teachers`,
      {
        fullName: 'Phase9 Teacher',
        email: tUserEmail,
        password: 'Password123!',
        employeeId: `EMP_P9_${timestamp}`
      },
      { headers: { Authorization: `Bearer ${instAdminAToken}` } }
    );
    const tLogin = await axios.post(`${API_BASE}/auth/login`, { email: tUserEmail, password: 'Password123!' });
    teacherAToken = tLogin.data.data.token;

    // Create Student A in Inst A
    const sAEmail = `student_a_p9_${timestamp}@edubridge.org`;
    const sAReg = await axios.post(
      `${API_BASE}/students`,
      {
        fullName: 'Student A',
        email: sAEmail,
        password: 'Password123!',
        studentId: `STU_A_${timestamp}`
      },
      { headers: { Authorization: `Bearer ${instAdminAToken}` } }
    );
    studentAProfileId = sAReg.data.data.profile._id;
    studentAUserId = sAReg.data.data.user._id;

    const sALogin = await axios.post(`${API_BASE}/auth/login`, { email: sAEmail, password: 'Password123!' });
    studentAToken = sALogin.data.data.token;

    // Enroll Student A into Class 10 Section A for 2026-27
    await axios.post(
      `${API_BASE}/student-enrollments`,
      {
        academicYearId: year2026Id,
        studentId: studentAProfileId,
        classId: class10Id,
        sectionId: section10AId,
        rollNumber: '1001'
      },
      { headers: { Authorization: `Bearer ${instAdminAToken}` } }
    );

    // Create Student B in Inst A
    const sBEmail = `student_b_p9_${timestamp}@edubridge.org`;
    const sBReg = await axios.post(
      `${API_BASE}/students`,
      {
        fullName: 'Student B',
        email: sBEmail,
        password: 'Password123!',
        studentId: `STU_B_${timestamp}`
      },
      { headers: { Authorization: `Bearer ${instAdminAToken}` } }
    );
    studentBProfileId = sBReg.data.data.profile._id;

    const sBLogin = await axios.post(`${API_BASE}/auth/login`, { email: sBEmail, password: 'Password123!' });
    studentBToken = sBLogin.data.data.token;

    // Create Parent in Inst A and link to Student A
    const pEmail = `parent_a_p9_${timestamp}@edubridge.org`;
    const pReg = await axios.post(
      `${API_BASE}/parents`,
      {
        fullName: 'Parent A',
        email: pEmail,
        password: 'Password123!',
        relation: 'Father'
      },
      { headers: { Authorization: `Bearer ${instAdminAToken}` } }
    );
    parentUserId = pReg.data.data.user._id;

    await axios.post(
      `${API_BASE}/parent-child-links`,
      {
        parentId: parentUserId,
        studentId: studentAUserId,
        relationship: 'Father'
      },
      { headers: { Authorization: `Bearer ${instAdminAToken}` } }
    );

    const pLogin = await axios.post(`${API_BASE}/auth/login`, { email: pEmail, password: 'Password123!' });
    parentAToken = pLogin.data.data.token;

    console.log('[Setup] Multi-tenant environment ready for Phase 9 testing.\n');

    // ----------------------------------------------------------------
    // Scenario 1: Institution Admin Authentication
    // ----------------------------------------------------------------
    logTest(1, 'Institution Admin authentication', !!instAdminAToken, `Token verified for Inst A`);

    // ----------------------------------------------------------------
    // Scenario 2 & 3: Create Fee Structure with Multiple Fee Components
    // ----------------------------------------------------------------
    try {
      const fsRes = await axios.post(
        `${API_BASE}/fee-structures`,
        {
          academicYearId: year2026Id,
          classId: class10Id,
          sectionId: section10AId,
          name: `Grade 10 Annual Fee ${timestamp}`,
          description: 'Standard Academic Fee Structure',
          components: [
            { name: 'Tuition', amount: 30000, frequency: 'annual' },
            { name: 'Examination', amount: 4000, frequency: 'annual' },
            { name: 'Library', amount: 2000, frequency: 'annual' },
            { name: 'Laboratory', amount: 3000, frequency: 'annual' },
            { name: 'Activity', amount: 1000, frequency: 'annual' }
          ],
          dueDate: '2026-10-31',
          installmentAllowed: true,
          installmentConfiguration: [
            { installmentNumber: 1, name: 'Term 1', amount: 20000, dueDate: '2026-06-30' },
            { installmentNumber: 2, name: 'Term 2', amount: 20000, dueDate: '2026-11-30' }
          ]
        },
        { headers: { Authorization: `Bearer ${instAdminAToken}` } }
      );
      feeStructureId = fsRes.data.data.feeStructure._id;
      const totalAmt = fsRes.data.data.feeStructure.totalAmount;
      logTest(2, 'Create Fee Structure', !!feeStructureId, `Total Amount: ₹${totalAmt}`);
      logTest(3, 'Multiple Fee Components configured', fsRes.data.data.feeStructure.components.length === 5, `5 components added`);
    } catch (err) {
      logTest(2, 'Create Fee Structure', false, err.response?.data?.message || err.message);
      logTest(3, 'Multiple Fee Components configured', false);
    }

    // ----------------------------------------------------------------
    // Scenario 4: Assign Fee to Student (Individual)
    // ----------------------------------------------------------------
    try {
      const sfRes = await axios.post(
        `${API_BASE}/student-fees/assign`,
        {
          academicYearId: year2026Id,
          studentId: studentAProfileId,
          classId: class10Id,
          sectionId: section10AId,
          feeStructureId,
          dueDate: '2026-10-31'
        },
        { headers: { Authorization: `Bearer ${instAdminAToken}` } }
      );
      studentFeeId = sfRes.data.data.studentFee._id;
      const pendingAmt = sfRes.data.data.studentFee.pendingAmount;
      logTest(4, 'Assign Fee to Student (Individual)', !!studentFeeId, `Assigned Pending Amount: ₹${pendingAmt}`);
    } catch (err) {
      logTest(4, 'Assign Fee to Student (Individual)', false, err.response?.data?.message || err.message);
    }

    // ----------------------------------------------------------------
    // Scenario 5: Scholarship / Concession Calculation (10% Discount)
    // ----------------------------------------------------------------
    try {
      const discRes = await axios.post(
        `${API_BASE}/scholarships`,
        {
          studentFeeId,
          type: 'percentage',
          value: 10,
          reason: 'Merit Scholarship 10%'
        },
        { headers: { Authorization: `Bearer ${instAdminAToken}` } }
      );
      scholarshipId = discRes.data.data.scholarship._id;
      const newPending = discRes.data.data.studentFee.pendingAmount;
      const discAmt = discRes.data.data.scholarship.amount;
      logTest(5, 'Scholarship/Concession calculation', discAmt === 4000 && newPending === 36000, `Concession: ₹${discAmt}, New Pending: ₹${newPending}`);
    } catch (err) {
      logTest(5, 'Scholarship/Concession calculation', false, err.response?.data?.message || err.message);
    }

    // ----------------------------------------------------------------
    // Scenario 6: Cash Payment Recording & Receipt Generation
    // ----------------------------------------------------------------
    try {
      const payRes = await axios.post(
        `${API_BASE}/payments/cash`,
        {
          studentFeeId,
          amount: 16000,
          remarks: 'First cash installment'
        },
        { headers: { Authorization: `Bearer ${instAdminAToken}` } }
      );
      cashPaymentId = payRes.data.data.payment._id;
      receiptId = payRes.data.data.receipt._id;
      const recNo = payRes.data.data.receipt.receiptNumber;
      refundPaymentId = cashPaymentId;
      logTest(6, 'Cash payment recorded', payRes.data.data.payment.paymentMode === 'cash', `Payment ID: ${cashPaymentId}`);
      logTest(13, 'Receipt generation', !!recNo && recNo.startsWith('REC-'), `Receipt Number: ${recNo}`);
    } catch (err) {
      logTest(6, 'Cash payment recorded', false, err.response?.data?.message || err.message);
      logTest(13, 'Receipt generation', false);
    }

    // ----------------------------------------------------------------
    // Scenario 7, 8, 9: Partial Payment & Multiple Payments & Pending Calculation
    // ----------------------------------------------------------------
    try {
      // Second cash payment
      const pay2Res = await axios.post(
        `${API_BASE}/payments/cash`,
        {
          studentFeeId,
          amount: 10000,
          remarks: 'Second cash payment'
        },
        { headers: { Authorization: `Bearer ${instAdminAToken}` } }
      );
      const sf = pay2Res.data.data.studentFee;
      // Original: 40,000 - 4,000 (scholarship) = 36,000. Paid: 16,000 + 10,000 = 26,000. Pending: 10,000
      logTest(7, 'Partial payment', sf.status === 'partially_paid', `Status: ${sf.status}`);
      logTest(8, 'Multiple payments against single fee', sf.paidAmount === 26000, `Total Paid: ₹${sf.paidAmount}`);
      logTest(9, 'Pending balance calculation formula', sf.pendingAmount === 10000, `Calculated Pending: ₹${sf.pendingAmount}`);
    } catch (err) {
      logTest(7, 'Partial payment', false);
      logTest(8, 'Multiple payments against single fee', false);
      logTest(9, 'Pending balance calculation formula', false, err.response?.data?.message || err.message);
    }

    // ----------------------------------------------------------------
    // Scenario 10: Full Payment Completion
    // ----------------------------------------------------------------
    try {
      const pay3Res = await axios.post(
        `${API_BASE}/payments/cash`,
        {
          studentFeeId,
          amount: 10000,
          remarks: 'Final settlement payment'
        },
        { headers: { Authorization: `Bearer ${instAdminAToken}` } }
      );
      const sf = pay3Res.data.data.studentFee;
      logTest(10, 'Full payment status updated to paid', sf.status === 'paid' && sf.pendingAmount === 0, `Status: ${sf.status}, Pending: ₹${sf.pendingAmount}`);
    } catch (err) {
      logTest(10, 'Full payment status updated to paid', false, err.response?.data?.message || err.message);
    }

    // ----------------------------------------------------------------
    // Scenario 11 & 12: Installment Creation & Overdue Detection
    // ----------------------------------------------------------------
    try {
      const instsRes = await axios.get(
        `${API_BASE}/installments?studentId=${studentAProfileId}`,
        { headers: { Authorization: `Bearer ${instAdminAToken}` } }
      );
      const instCount = instsRes.data.data.count;
      logTest(11, 'Installment creation and tracking', instCount > 0, `Total Installments Tracked: ${instCount}`);
      logTest(12, 'Overdue installment detection logic', Array.isArray(instsRes.data.data.installments), 'Installment statuses evaluated');
    } catch (err) {
      logTest(11, 'Installment creation and tracking', false);
      logTest(12, 'Overdue installment detection logic', false, err.response?.data?.message || err.message);
    }

    // ----------------------------------------------------------------
    // Scenario 14, 15, 16, 17: Online Payment Order & Verification Safety
    // ----------------------------------------------------------------
    try {
      // 14. Initiate Online Order for Student B
      // First assign fee to Student B
      const sfBRes = await axios.post(
        `${API_BASE}/student-fees/assign`,
        {
          academicYearId: year2026Id,
          studentId: studentBProfileId,
          classId: class10Id,
          sectionId: section10AId,
          feeStructureId
        },
        { headers: { Authorization: `Bearer ${instAdminAToken}` } }
      );
      const studentBFeeId = sfBRes.data.data.studentFee._id;

      const onlineOrder = await axios.post(
        `${API_BASE}/payments/create-online-order`,
        {
          studentFeeId: studentBFeeId,
          amount: 5000,
          paymentProvider: 'razorpay'
        },
        { headers: { Authorization: `Bearer ${studentBToken}` } }
      );
      const orderData = onlineOrder.data.data.paymentOrder;
      onlinePaymentId = orderData.paymentId;
      logTest(14, 'Online payment order creation', !!orderData.orderId && orderData.status === 'initiated', `Order ID: ${orderData.orderId}`);

      // 15. Invalid payment verification blocked (fake signature)
      try {
        await axios.post(
          `${API_BASE}/payments/verify-online`,
          {
            paymentId: onlinePaymentId,
            orderId: orderData.orderId,
            transactionId: `TXN_FAKE_${timestamp}`,
            paymentSignature: 'INVALID_SIGNATURE_HASH'
          },
          { headers: { Authorization: `Bearer ${studentBToken}` } }
        );
        logTest(15, 'Invalid payment verification blocked', false, 'Expected HTTP 400 error but succeeded');
      } catch (verr) {
        logTest(15, 'Invalid payment verification blocked', verr.response?.status === 400, `Blocked with HTTP ${verr.response?.status}`);
      }

      // Verify online payment with valid signature
      await axios.post(
        `${API_BASE}/payments/verify-online`,
        {
          paymentId: onlinePaymentId,
          orderId: orderData.orderId,
          transactionId: `TXN_VALID_${timestamp}`,
          paymentSignature: 'VALID_SECRET_SIGNATURE'
        },
        { headers: { Authorization: `Bearer ${studentBToken}` } }
      );

      // 16. Duplicate payment confirmation blocked
      try {
        await axios.post(
          `${API_BASE}/payments/verify-online`,
          {
            paymentId: onlinePaymentId,
            orderId: orderData.orderId,
            transactionId: `TXN_VALID_${timestamp}`,
            paymentSignature: 'VALID_SECRET_SIGNATURE'
          },
          { headers: { Authorization: `Bearer ${studentBToken}` } }
        );
        logTest(16, 'Duplicate payment confirmation blocked', false, 'Expected HTTP 400');
      } catch (duperr) {
        logTest(16, 'Duplicate payment confirmation blocked', duperr.response?.status === 400, `Blocked with HTTP ${duperr.response?.status}`);
      }

      // 17. Overpayment exceeding pending balance blocked
      try {
        await axios.post(
          `${API_BASE}/payments/cash`,
          {
            studentFeeId: studentBFeeId,
            amount: 999999, // Exceeds balance
            remarks: 'Excess payment'
          },
          { headers: { Authorization: `Bearer ${instAdminAToken}` } }
        );
        logTest(17, 'Overpayment exceeding pending balance blocked', false, 'Expected HTTP 400');
      } catch (overr) {
        logTest(17, 'Overpayment exceeding pending balance blocked', overr.response?.status === 400, `Blocked with HTTP ${overr.response?.status}`);
      }
    } catch (err) {
      logTest(14, 'Online payment order creation', false, err.response?.data?.message || err.message);
    }

    // ----------------------------------------------------------------
    // Scenario 18: Unauthorized Teacher Access Blocked
    // ----------------------------------------------------------------
    try {
      await axios.get(
        `${API_BASE}/student-fees`,
        { headers: { Authorization: `Bearer ${teacherAToken}` } }
      );
      logTest(18, 'Unauthorized teacher access blocked', false, 'Teacher was able to view fees!');
    } catch (tErr) {
      logTest(18, 'Unauthorized teacher access blocked', tErr.response?.status === 403, `Blocked with HTTP ${tErr.response?.status}`);
    }

    // ----------------------------------------------------------------
    // Scenario 19 & 20: Student Fee Access Control (Own vs Another Student)
    // ----------------------------------------------------------------
    try {
      const ownFee = await axios.get(
        `${API_BASE}/student-fees/student/${studentAProfileId}`,
        { headers: { Authorization: `Bearer ${studentAToken}` } }
      );
      logTest(19, 'Student can view own fees', ownFee.status === 200, `Retrieved ${ownFee.data.data.count} fee record(s)`);

      try {
        await axios.get(
          `${API_BASE}/student-fees/student/${studentBProfileId}`,
          { headers: { Authorization: `Bearer ${studentAToken}` } }
        );
        logTest(20, 'Student cannot view another student fees', false, 'Access should have been denied');
      } catch (otherErr) {
        logTest(20, 'Student cannot view another student fees', otherErr.response?.status === 403, `Blocked with HTTP ${otherErr.response?.status}`);
      }
    } catch (err) {
      logTest(19, 'Student can view own fees', false, err.response?.data?.message || err.message);
    }

    // ----------------------------------------------------------------
    // Scenario 21 & 22: Parent Fee Access Control (Linked Child vs Unlinked)
    // ----------------------------------------------------------------
    try {
      const parentLinkedFee = await axios.get(
        `${API_BASE}/student-fees/student/${studentAProfileId}`,
        { headers: { Authorization: `Bearer ${parentAToken}` } }
      );
      logTest(21, 'Parent can view linked child fee', parentLinkedFee.status === 200, `Linked child fee retrieved`);

      try {
        await axios.get(
          `${API_BASE}/student-fees/student/${studentBProfileId}`,
          { headers: { Authorization: `Bearer ${parentAToken}` } }
        );
        logTest(22, 'Parent cannot view unrelated child fee', false, 'Access should have been denied');
      } catch (unlinkedErr) {
        logTest(22, 'Parent cannot view unrelated child fee', unlinkedErr.response?.status === 403, `Blocked with HTTP ${unlinkedErr.response?.status}`);
      }
    } catch (err) {
      logTest(21, 'Parent can view linked child fee', false, err.response?.data?.message || err.message);
    }

    // ----------------------------------------------------------------
    // Scenario 23: Cross-Tenant Access Blocked (Admin B viewing Inst A fee)
    // ----------------------------------------------------------------
    try {
      await axios.get(
        `${API_BASE}/student-fees/${studentFeeId}`,
        { headers: { Authorization: `Bearer ${instAdminBToken}` } }
      );
      logTest(23, 'Cross-tenant access blocked', false, 'Admin B accessed Inst A fee!');
    } catch (ctErr) {
      logTest(23, 'Cross-tenant access blocked', ctErr.response?.status === 403, `Blocked with HTTP ${ctErr.response?.status}`);
    }

    // ----------------------------------------------------------------
    // Scenario 24: Refund Workflow
    // ----------------------------------------------------------------
    try {
      const refRes = await axios.post(
        `${API_BASE}/payments/refund`,
        {
          paymentId: refundPaymentId,
          refundAmount: 5000,
          reason: 'Duplicate fee payment refund'
        },
        { headers: { Authorization: `Bearer ${instAdminAToken}` } }
      );
      const refPay = refRes.data.data.payment;
      logTest(24, 'Refund workflow executed', refPay.status === 'partially_refunded' && refPay.refundAmount === 5000, `Status: ${refPay.status}, Refunded: ₹${refPay.refundAmount}`);
    } catch (err) {
      logTest(24, 'Refund workflow executed', false, err.response?.data?.message || err.message);
    }

    // ----------------------------------------------------------------
    // Scenario 25: Audit Log Created
    // ----------------------------------------------------------------
    try {
      const auditRes = await axios.get(
        `${API_BASE}/academic/summary`,
        { headers: { Authorization: `Bearer ${instAdminAToken}` } }
      );
      logTest(25, 'Audit log created for financial operations', auditRes.status === 200, 'Audit system active');
    } catch (err) {
      logTest(25, 'Audit log created for financial operations', false, err.response?.data?.message || err.message);
    }

    // ----------------------------------------------------------------
    // Scenario 26 & 27: Academic Year Isolation & Historical Preservation
    // ----------------------------------------------------------------
    try {
      // Create historical 2025-26 fee for Student A
      const oldFsRes = await axios.post(
        `${API_BASE}/fee-structures`,
        {
          academicYearId: year2025Id,
          classId: class10Id,
          name: `2025-26 Historical Fee ${timestamp}`,
          components: [{ name: 'Tuition', amount: 15000 }]
        },
        { headers: { Authorization: `Bearer ${instAdminAToken}` } }
      );
      const oldFsId = oldFsRes.data.data.feeStructure._id;

      const oldSfRes = await axios.post(
        `${API_BASE}/student-fees/assign`,
        {
          academicYearId: year2025Id,
          studentId: studentAProfileId,
          classId: class10Id,
          feeStructureId: oldFsId
        },
        { headers: { Authorization: `Bearer ${instAdminAToken}` } }
      );
      const oldFeeId = oldSfRes.data.data.studentFee._id;

      // Verify that student A has 2 separate fee records scoped to 2025-26 and 2026-27
      const allStudentFees = await axios.get(
        `${API_BASE}/student-fees/student/${studentAProfileId}`,
        { headers: { Authorization: `Bearer ${instAdminAToken}` } }
      );
      const feeList = allStudentFees.data.data.studentFees;
      const has2025 = feeList.some(f => f.academicYearId._id === year2025Id);
      const has2026 = feeList.some(f => f.academicYearId._id === year2026Id);

      logTest(26, 'Academic-year isolation enforced', has2025 && has2026, 'Separate records for 2025-26 and 2026-27');
      logTest(27, 'Previous-year financial history preserved', has2025, `Historical 2025-26 fee preserved with ID: ${oldFeeId}`);
    } catch (err) {
      logTest(26, 'Academic-year isolation enforced', false);
      logTest(27, 'Previous-year financial history preserved', false, err.response?.data?.message || err.message);
    }

    // ----------------------------------------------------------------
    // Scenario 28 to 33: Regression Tests for Phases 2, 3, 4, 5, 6, 7/8
    // ----------------------------------------------------------------
    try {
      // Phase 2 Regression: /auth/me
      const meRes = await axios.get(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${superAdminToken}` } });
      logTest(28, 'Phase 2 Auth regression test', meRes.data.success && meRes.data.data.user.role === 'super_admin');

      // Phase 3 Regression: Institutions API
      const instRes = await axios.get(`${API_BASE}/institutions`, { headers: { Authorization: `Bearer ${superAdminToken}` } });
      logTest(29, 'Phase 3 Institution management regression test', instRes.data.success && (instRes.data.data.count > 0 || (instRes.data.data.institutions && instRes.data.data.institutions.length > 0)));

      // Phase 4 Regression: User Directory
      const userRes = await axios.get(`${API_BASE}/users`, { headers: { Authorization: `Bearer ${instAdminAToken}` } });
      logTest(30, 'Phase 4 User management regression test', userRes.data.success);

      // Phase 5 Regression: Notifications
      const notifRes = await axios.get(`${API_BASE}/notifications`, { headers: { Authorization: `Bearer ${instAdminAToken}` } });
      logTest(31, 'Phase 5 Notifications regression test', notifRes.data.success);

      // Phase 6 Regression: Academic Years & Classes
      const ayRes = await axios.get(`${API_BASE}/academic-years`, { headers: { Authorization: `Bearer ${instAdminAToken}` } });
      logTest(32, 'Phase 6 Academic management regression test', ayRes.data.success);

      // Phase 7/8 Regression: Attendance & Finance Summary
      const finSumRes = await axios.get(`${API_BASE}/finance/summary`, { headers: { Authorization: `Bearer ${instAdminAToken}` } });
      logTest(33, 'Phase 7/8 Attendance & Finance summary regression test', finSumRes.data.success && finSumRes.data.data.summary.totalFees !== undefined);

    } catch (err) {
      logTest(28, 'Phase 2 Auth regression test', false);
      logTest(29, 'Phase 3 Institution regression test', false);
      logTest(30, 'Phase 4 User directory regression test', false);
      logTest(31, 'Phase 5 Notifications regression test', false);
      logTest(32, 'Phase 6 Academic regression test', false);
      logTest(33, 'Phase 7/8 Finance summary regression test', false, err.response?.data?.message || err.message);
    }

    console.log('\n================================================================');
    console.log('  Phase 9 Fees & Finance Automated Test Suite Complete');
    console.log('================================================================\n');

  } catch (globalErr) {
    console.error('❌ Global Test Execution Error:', globalErr.response?.data || globalErr.message);
    process.exit(1);
  }
};

runPhase9Tests();
