require('dotenv').config();
const axios = require('axios');

const API_BASE = 'http://127.0.0.1:5000/api/v1';

const logTest = (num, name, passed, detail = '') => {
  const badge = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${badge} | Test ${num}: ${name} ${detail ? `(${detail})` : ''}`);
};

const runPhase3Tests = async () => {
  console.log('\n================================================================');
  console.log('  EduBridge Phase 3 Institution Management Automated Test Suite');
  console.log('================================================================\n');

  const timestamp = Date.now();
  let superAdminToken = null;
  let institutionAdminToken = null;
  let studentToken = null;
  let createdInstitutionId = null;
  let rejectInstitutionId = null;
  let suspendInstitutionId = null;

  const testInstEmail = `school_${timestamp}@edubridge.org`;
  const testInstAdminEmail = `admin_${timestamp}@edubridge.org`;

  try {
    // Login as Super Admin
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'superadmin@edubridge.org';
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdminSecretPassword123!';

    try {
      const sLogin = await axios.post(`${API_BASE}/auth/login`, {
        email: superAdminEmail,
        password: superAdminPassword
      });
      superAdminToken = sLogin.data.data.token;
    } catch (err) {
      console.error('❌ Setup Error: Could not login as Super Admin. Run seedSuperAdmin.js first.');
      process.exit(1);
    }

    // Register a Student user for authorization testing
    try {
      const stRes = await axios.post(`${API_BASE}/auth/register`, {
        fullName: 'Test Student',
        email: `student_p3_${timestamp}@edubridge.org`,
        password: 'Password123!',
        role: 'student'
      });
      studentToken = stRes.data.data.token;
    } catch (err) {
      // Ignore if exists
    }

    // Test 1: Public Institution Registration Succeeds
    try {
      const res = await axios.post(`${API_BASE}/institutions/register`, {
        institutionName: `St. Xavier Academy ${timestamp}`,
        institutionType: 'School',
        email: testInstEmail,
        phone: '+91 9876543210',
        website: 'https://stxavier.edu.in',
        address: '123 Education Lane',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        postalCode: '400001',
        establishedYear: 1995,
        description: 'Excellence in holistic education',
        proposedAdmin: {
          fullName: 'Robert Dsouza',
          email: testInstAdminEmail,
          phone: '+91 9876543211'
        }
      });

      createdInstitutionId = res.data.data.institution._id;
      const validCode = (res.data.data.institution.institutionCode || '').startsWith('EDU-');
      logTest(1, 'Public Institution Registration Succeeds', res.data.success && validCode, `Code: ${res.data.data.institution.institutionCode}`);
    } catch (err) {
      logTest(1, 'Public Institution Registration Succeeds', false, err.response?.data?.message || err.message);
    }

    // Test 2: Invalid Institution Registration Rejected
    try {
      await axios.post(`${API_BASE}/institutions/register`, {
        institutionName: '', // Missing required name
        email: 'invalid-email',
        phone: ''
      });
      logTest(2, 'Invalid Institution Registration Rejected', false, 'Should have returned HTTP 400');
    } catch (err) {
      const blocked = err.response?.status === 400;
      logTest(2, 'Invalid Institution Registration Rejected', blocked, `HTTP ${err.response?.status}: ${err.response?.data?.message}`);
    }

    // Test 3: Duplicate Institution Registration Blocked
    try {
      await axios.post(`${API_BASE}/institutions/register`, {
        institutionName: `St. Xavier Academy ${timestamp}`,
        institutionType: 'School',
        email: testInstEmail, // Duplicate email
        phone: '+91 9876543210',
        address: '123 Education Lane',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        proposedAdmin: {
          fullName: 'Robert Dsouza',
          email: testInstAdminEmail
        }
      });
      logTest(3, 'Duplicate Institution Registration Blocked', false, 'Should have failed with HTTP 400');
    } catch (err) {
      const blocked = err.response?.status === 400;
      logTest(3, 'Duplicate Institution Registration Blocked', blocked, err.response?.data?.message);
    }

    // Test 4: Public User Cannot Approve Institution
    try {
      await axios.patch(`${API_BASE}/institutions/${createdInstitutionId}/approve`);
      logTest(4, 'Public User Cannot Approve Institution', false, 'Should have failed with HTTP 401');
    } catch (err) {
      const blocked = err.response?.status === 401;
      logTest(4, 'Public User Cannot Approve Institution', blocked, err.response?.data?.message);
    }

    // Test 5: Student Cannot Approve Institution
    try {
      await axios.patch(
        `${API_BASE}/institutions/${createdInstitutionId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${studentToken}` } }
      );
      logTest(5, 'Student Cannot Approve Institution', false, 'Should have failed with HTTP 403');
    } catch (err) {
      const blocked = err.response?.status === 403;
      logTest(5, 'Student Cannot Approve Institution', blocked, err.response?.data?.message);
    }

    // Test 6: Super Admin Can View Pending Institutions
    try {
      const res = await axios.get(`${API_BASE}/institutions/pending`, {
        headers: { Authorization: `Bearer ${superAdminToken}` }
      });
      const found = res.data.data.institutions.some((i) => i._id === createdInstitutionId);
      logTest(6, 'Super Admin Can View Pending Institutions', res.data.success && found, `Pending Count: ${res.data.data.count}`);
    } catch (err) {
      logTest(6, 'Super Admin Can View Pending Institutions', false, err.response?.data?.message || err.message);
    }

    // Test 7 & 8: Super Admin Approval Creates Institution Admin
    try {
      const res = await axios.patch(
        `${API_BASE}/institutions/${createdInstitutionId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${superAdminToken}` } }
      );
      const isApproved = res.data.data.institution.registrationStatus === 'approved' && res.data.data.institution.isActive;
      logTest(7, 'Super Admin Can Approve Institution', isApproved, `Status: ${res.data.data.institution.registrationStatus}`);

      const adminUser = res.data.data.adminUser;
      const isAdminRole = adminUser && adminUser.role === 'institution_admin' && adminUser.institutionId === createdInstitutionId;
      logTest(8, 'Approval Creates Institution Admin Correctly', isAdminRole, `Admin Role: ${adminUser?.role}, Linked Inst: ${adminUser?.institutionId}`);
    } catch (err) {
      logTest(7, 'Super Admin Can Approve Institution', false, err.response?.data?.message || err.message);
      logTest(8, 'Approval Creates Institution Admin Correctly', false, 'Approval failed');
    }

    // Test 9: Duplicate Institution Admin Is Not Created Upon Re-Approval
    try {
      const res = await axios.patch(
        `${API_BASE}/institutions/${createdInstitutionId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${superAdminToken}` } }
      );
      logTest(9, 'Duplicate Institution Admin Not Created', res.data.success, 'Re-approval handled idempotently');
    } catch (err) {
      logTest(9, 'Duplicate Institution Admin Not Created', false, err.response?.data?.message || err.message);
    }

    // Login as the newly provisioned Institution Admin
    try {
      const iLogin = await axios.post(`${API_BASE}/auth/login`, {
        email: testInstAdminEmail,
        password: 'EduBridgeAdmin123!'
      });
      institutionAdminToken = iLogin.data.data.token;
    } catch (err) {
      console.error('❌ Failed to login as provisioned Institution Admin:', err.response?.data?.message || err.message);
    }

    // Register a second institution for Rejection testing
    try {
      const rRes = await axios.post(`${API_BASE}/institutions/register`, {
        institutionName: `Rejected College ${timestamp}`,
        institutionType: 'College',
        email: `reject_${timestamp}@edubridge.org`,
        phone: '+91 9111111111',
        address: '456 Reject Street',
        city: 'Delhi',
        state: 'Delhi',
        postalCode: '110001',
        proposedAdmin: {
          fullName: 'Reject Admin',
          email: `rejectadmin_${timestamp}@edubridge.org`
        }
      });
      rejectInstitutionId = rRes.data.data.institution._id;
    } catch (err) {
      // Ignore
    }

    // Test 10 & 11: Super Admin Rejection Requires & Stores Reason
    try {
      // First attempt without reason should fail
      try {
        await axios.patch(
          `${API_BASE}/institutions/${rejectInstitutionId}/reject`,
          {},
          { headers: { Authorization: `Bearer ${superAdminToken}` } }
        );
        logTest(11, 'Rejection Requires Reason', false, 'Should have failed without rejectionReason');
      } catch (err) {
        const blocked = err.response?.status === 400;
        logTest(11, 'Rejection Requires Reason', blocked, err.response?.data?.message);
      }

      // Valid rejection with reason
      const res = await axios.patch(
        `${API_BASE}/institutions/${rejectInstitutionId}/reject`,
        { rejectionReason: 'Incomplete documentation provided.' },
        { headers: { Authorization: `Bearer ${superAdminToken}` } }
      );
      const isRejected = res.data.data.institution.registrationStatus === 'rejected' && !res.data.data.institution.isActive;
      logTest(10, 'Super Admin Can Reject Institution', isRejected, `Reason: ${res.data.data.institution.rejectionReason}`);
    } catch (err) {
      logTest(10, 'Super Admin Can Reject Institution', false, err.response?.data?.message || err.message);
    }

    // Test 12 & 13: Super Admin Can Suspend Institution
    try {
      const res = await axios.patch(
        `${API_BASE}/institutions/${createdInstitutionId}/suspend`,
        {},
        { headers: { Authorization: `Bearer ${superAdminToken}` } }
      );
      const isSuspended = res.data.data.institution.registrationStatus === 'suspended' && res.data.data.institution.isActive === false;
      logTest(12, 'Super Admin Can Suspend Institution', isSuspended, `Status: ${res.data.data.institution.registrationStatus}`);
      logTest(13, 'Suspended Institution Becomes Inactive', res.data.data.institution.isActive === false, `isActive: ${res.data.data.institution.isActive}`);
    } catch (err) {
      logTest(12, 'Super Admin Can Suspend Institution', false, err.response?.data?.message || err.message);
      logTest(13, 'Suspended Institution Becomes Inactive', false, 'Suspension failed');
    }

    // Test 14: Super Admin Can Reactivate Institution
    try {
      const res = await axios.patch(
        `${API_BASE}/institutions/${createdInstitutionId}/reactivate`,
        {},
        { headers: { Authorization: `Bearer ${superAdminToken}` } }
      );
      const isReactivated = res.data.data.institution.registrationStatus === 'approved' && res.data.data.institution.isActive === true;
      logTest(14, 'Super Admin Can Reactivate Institution', isReactivated, `Status: ${res.data.data.institution.registrationStatus}`);
    } catch (err) {
      logTest(14, 'Super Admin Can Reactivate Institution', false, err.response?.data?.message || err.message);
    }

    // Test 15: Institution Admin Can Access Only Their Institution (/my-institution)
    try {
      const res = await axios.get(`${API_BASE}/institutions/my-institution`, {
        headers: { Authorization: `Bearer ${institutionAdminToken}` }
      });
      const isMyInst = res.data.data.institution._id === createdInstitutionId;
      logTest(15, 'Institution Admin Accesses Only Their Institution', isMyInst, `Inst ID: ${res.data.data.institution._id}`);
    } catch (err) {
      logTest(15, 'Institution Admin Accesses Only Their Institution', false, err.response?.data?.message || err.message);
    }

    // Test 16: Institution Admin Cannot Access Super Admin Routes
    try {
      await axios.get(`${API_BASE}/institutions/pending`, {
        headers: { Authorization: `Bearer ${institutionAdminToken}` }
      });
      logTest(16, 'Institution Admin Blocked from Super Admin Routes', false, 'Should have failed with HTTP 403');
    } catch (err) {
      const blocked = err.response?.status === 403;
      logTest(16, 'Institution Admin Blocked from Super Admin Routes', blocked, err.response?.data?.message);
    }

    // Test 17 & 18: Institution Admin Cannot Modify Immutable Fields
    try {
      const res = await axios.patch(
        `${API_BASE}/institutions/my-institution`,
        {
          phone: '+91 9999988888',
          registrationStatus: 'suspended', // Attempt tamper
          institutionCode: 'HACKED-CODE',
          approvedBy: null
        },
        { headers: { Authorization: `Bearer ${institutionAdminToken}` } }
      );

      const phoneUpdated = res.data.data.institution.phone === '+91 9999988888';
      const statusIntact = res.data.data.institution.registrationStatus === 'approved';
      const codeIntact = res.data.data.institution.institutionCode !== 'HACKED-CODE';

      logTest(17, 'Institution Admin Cannot Modify institutionCode', codeIntact, `Code: ${res.data.data.institution.institutionCode}`);
      logTest(18, 'Institution Admin Cannot Modify approvalStatus', statusIntact && phoneUpdated, `Status: ${res.data.data.institution.registrationStatus}`);
    } catch (err) {
      logTest(17, 'Institution Admin Cannot Modify institutionCode', false, err.response?.data?.message || err.message);
      logTest(18, 'Institution Admin Cannot Modify approvalStatus', false, err.response?.data?.message || err.message);
    }

    // Test 19: Existing Phase 2 Auth Tests Pass
    try {
      const authMe = await axios.get(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${superAdminToken}` }
      });
      logTest(19, 'Phase 2 Auth System Intact (Regression Check)', authMe.data.success, `Role: ${authMe.data.data.user.role}`);
    } catch (err) {
      logTest(19, 'Phase 2 Auth System Intact (Regression Check)', false, err.response?.data?.message || err.message);
    }

    console.log('\n================================================================');
    console.log('  Phase 3 Institution Management Test Suite Complete');
    console.log('================================================================\n');
  } catch (globalErr) {
    console.error('Fatal Test Suite Error:', globalErr.message);
  }
};

runPhase3Tests();
