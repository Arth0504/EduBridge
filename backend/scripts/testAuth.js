require('dotenv').config();
const axios = require('axios');

const API_BASE = 'http://127.0.0.1:5000/api/v1/auth';


const logTest = (name, passed, detail = '') => {
  const badge = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${badge} | ${name} ${detail ? `(${detail})` : ''}`);
};

const runAuthTests = async () => {
  console.log('\n==================================================');
  console.log('  EduBridge Phase 2 Authentication & RBAC Test Suite');
  console.log('==================================================\n');

  let studentToken = null;
  let superAdminToken = null;
  const timestamp = Date.now();
  const testStudentEmail = `student_${timestamp}@edubridge.org`;
  const testParentEmail = `parent_${timestamp}@edubridge.org`;


  try {
    // Test 1: Public Registration - Student Allowed
    try {
      const res = await axios.post(`${API_BASE}/register`, {
        fullName: 'Test Student User',
        email: testStudentEmail,
        password: 'Password123!',
        role: 'student'
      });
      studentToken = res.data.data.token;
      logTest('1. Public Registration (Student)', res.data.success, `User ID: ${res.data.data.user._id}`);
    } catch (err) {
      logTest('1. Public Registration (Student)', false, err.response?.data?.message || err.message);
    }

    // Test 2: Public Registration - Parent Allowed
    try {
      const res = await axios.post(`${API_BASE}/register`, {
        fullName: 'Test Parent User',
        email: testParentEmail,
        password: 'Password123!',
        role: 'parent'
      });
      logTest('2. Public Registration (Parent)', res.data.success, `Role: ${res.data.data.user.role}`);
    } catch (err) {
      logTest('2. Public Registration (Parent)', false, err.response?.data?.message || err.message);
    }

    // Test 3: Public Registration - Super Admin Blocked
    try {
      await axios.post(`${API_BASE}/register`, {
        fullName: 'Hacker User',
        email: `hacker_${timestamp}@edubridge.test`,
        password: 'Password123!',
        role: 'super_admin'
      });
      logTest('3. Block Super Admin Public Registration', false, 'Should have failed with 400');
    } catch (err) {
      const blocked = err.response?.status === 400;
      logTest('3. Block Super Admin Public Registration', blocked, `HTTP ${err.response?.status}: ${err.response?.data?.message}`);
    }

    // Test 4: Public Registration - Institution Admin Blocked
    try {
      await axios.post(`${API_BASE}/register`, {
        fullName: 'Fake Admin User',
        email: `fakeadmin_${timestamp}@edubridge.test`,
        password: 'Password123!',
        role: 'institution_admin'
      });
      logTest('4. Block Institution Admin Public Registration', false, 'Should have failed with 400');
    } catch (err) {
      const blocked = err.response?.status === 400;
      logTest('4. Block Institution Admin Public Registration', blocked, `HTTP ${err.response?.status}: ${err.response?.data?.message}`);
    }

    // Test 5: Duplicate Email Registration Blocked
    try {
      await axios.post(`${API_BASE}/register`, {
        fullName: 'Duplicate User',
        email: testStudentEmail,
        password: 'Password123!',
        role: 'student'
      });
      logTest('5. Duplicate Email Blocked', false, 'Should have failed with 400');
    } catch (err) {
      const blocked = err.response?.status === 400;
      logTest('5. Duplicate Email Blocked', blocked, err.response?.data?.message);
    }

    // Test 6: Valid Login (Student)
    try {
      const res = await axios.post(`${API_BASE}/login`, {
        email: testStudentEmail,
        password: 'Password123!'
      });
      studentToken = res.data.data.token;
      logTest('6. Valid Student Login', res.data.success, `Role: ${res.data.data.user.role}`);
    } catch (err) {
      logTest('6. Valid Student Login', false, err.response?.data?.message || err.message);
    }

    // Test 7: Invalid Login (Wrong Password)
    try {
      await axios.post(`${API_BASE}/login`, {
        email: testStudentEmail,
        password: 'WrongPassword999!'
      });
      logTest('7. Invalid Password Blocked', false, 'Should have failed with 401');
    } catch (err) {
      const blocked = err.response?.status === 401;
      logTest('7. Invalid Password Blocked', blocked, err.response?.data?.message);
    }

    // Test 8: Protected Route Without Token
    try {
      await axios.get(`${API_BASE}/me`);
      logTest('8. Protected Route Without Token', false, 'Should have failed with 401');
    } catch (err) {
      const blocked = err.response?.status === 401;
      logTest('8. Protected Route Without Token', blocked, err.response?.data?.message);
    }

    // Test 9: Protected Route With Valid Student Token
    try {
      const res = await axios.get(`${API_BASE}/me`, {
        headers: { Authorization: `Bearer ${studentToken}` }
      });
      logTest('9. Protected Profile (/me)', res.data.success, `Email: ${res.data.data.user.email}`);
    } catch (err) {
      logTest('9. Protected Profile (/me)', false, err.response?.data?.message || err.message);
    }

    // Test 10: Super Admin Seed Account Login
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'superadmin@edubridge.org';
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdminSecretPassword123!';
    try {
      const res = await axios.post(`${API_BASE}/login`, {
        email: superAdminEmail,
        password: superAdminPassword
      });
      superAdminToken = res.data.data.token;
      logTest('10. Super Admin Seed Account Login', res.data.success, `Role: ${res.data.data.user.role}`);
    } catch (err) {
      logTest('10. Super Admin Seed Account Login', false, 'Ensure seedSuperAdmin.js script has been run first.');
    }

    // Test 11: Protected Test Route Verification
    try {
      const res = await axios.get(`${API_BASE}/protected-test`, {
        headers: { Authorization: `Bearer ${studentToken}` }
      });
      logTest('11. Protected Test Route', res.data.success, `Institution Context: ${res.data.data.institutionContext}`);
    } catch (err) {
      logTest('11. Protected Test Route', false, err.response?.data?.message || err.message);
    }

    console.log('\n==================================================');
    console.log('  Auth & RBAC Test Suite Execution Complete');
    console.log('==================================================\n');
  } catch (globalErr) {
    console.error('Fatal Test Suite Error:', globalErr.message);
  }
};

runAuthTests();
