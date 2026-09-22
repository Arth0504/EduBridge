require('dotenv').config();
const axios = require('axios');

const API_BASE = 'http://127.0.0.1:5000/api/v1';

const logTest = (num, name, passed, detail = '') => {
  const badge = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${badge} | Test ${num}: ${name} ${detail ? `(${detail})` : ''}`);
};

const runPhase4Tests = async () => {
  console.log('\n================================================================');
  console.log('  EduBridge Phase 4 User Management Automated Test Suite');
  console.log('================================================================\n');

  const timestamp = Date.now();
  let superAdminToken = null;
  let instAdminAToken = null;
  let instAdminBToken = null;
  let parentToken = null;
  let studentToken = null;

  let instAId = null;
  let instBId = null;

  let createdStudentId = null;
  let createdStudentUserId = null;
  let createdTeacherId = null;
  let createdParentId = null;
  let createdParentUserId = null;
  let createdLinkId = null;

  try {
    // 1. Login as Super Admin
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'superadmin@edubridge.org';
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdminSecretPassword123!';

    try {
      const sLogin = await axios.post(`${API_BASE}/auth/login`, {
        email: superAdminEmail,
        password: superAdminPassword
      });
      superAdminToken = sLogin.data.data.token;
      logTest(1, 'Super Admin Authentication', true, `Logged in as ${superAdminEmail}`);
    } catch (err) {
      console.error('❌ Setup Error: Could not login as Super Admin.', err.response?.data?.message || err.message);
      process.exit(1);
    }

    // 2. Setup Institution A and Institution B with Admins for tenant testing
    const setupInst = async (namePrefix) => {
      const email = `inst_${namePrefix}_${timestamp}@edubridge.org`;
      const adminEmail = `admin_${namePrefix}_${timestamp}@edubridge.org`;
      
      const reg = await axios.post(`${API_BASE}/institutions/register`, {
        institutionName: `${namePrefix} Academy ${timestamp}`,
        institutionType: 'School',
        email,
        phone: '+91 9876543210',
        address: 'Test Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        proposedAdmin: { fullName: `${namePrefix} Admin`, email: adminEmail }
      });
      const id = reg.data.data.institution._id;

      // Approve
      await axios.patch(`${API_BASE}/institutions/${id}/approve`, {}, {
        headers: { Authorization: `Bearer ${superAdminToken}` }
      });

      // Login Admin
      const login = await axios.post(`${API_BASE}/auth/login`, {
        email: adminEmail,
        password: 'EduBridgeAdmin123!'
      });

      return { id, token: login.data.data.token, adminEmail };
    };

    const instA = await setupInst('InstA');
    instAId = instA.id;
    instAdminAToken = instA.token;

    const instB = await setupInst('InstB');
    instBId = instB.id;
    instAdminBToken = instB.token;

    logTest(2, 'Setup Multi-Tenant Institutions A & B', Boolean(instAId && instBId), `A: ${instAId}, B: ${instBId}`);

    // Test 3: Creation of super_admin role via API is blocked
    try {
      await axios.post(
        `${API_BASE}/users`,
        {
          fullName: 'Hacker Admin',
          email: `hacker_${timestamp}@edubridge.org`,
          password: 'Password123!',
          role: 'super_admin'
        },
        { headers: { Authorization: `Bearer ${superAdminToken}` } }
      );
      logTest(3, 'Creation of super_admin role via API blocked', false, 'Should have failed with HTTP 400');
    } catch (err) {
      const blocked = err.response?.status === 400;
      logTest(3, 'Creation of super_admin role via API blocked', blocked, err.response?.data?.message);
    }

    // Test 4: Institution Admin A Creates Student
    const studentIdCode = `STU-${timestamp}`;
    const studentEmail = `student_a_${timestamp}@edubridge.org`;
    try {
      const res = await axios.post(
        `${API_BASE}/students`,
        {
          fullName: 'Alice Smith',
          email: studentEmail,
          password: 'Password123!',
          studentId: studentIdCode,
          dateOfBirth: '2010-05-15',
          gender: 'female',
          classId: 'Class 10',
          sectionId: 'A',
          rollNumber: '101'
        },
        { headers: { Authorization: `Bearer ${instAdminAToken}` } }
      );
      createdStudentId = res.data.data.profile._id;
      createdStudentUserId = res.data.data.user._id;
      const valid = res.data.success && res.data.data.profile.studentId === studentIdCode;
      logTest(4, 'Institution Admin Creates Student Profile', valid, `Student ID: ${studentIdCode}`);
    } catch (err) {
      logTest(4, 'Institution Admin Creates Student Profile', false, err.response?.data?.message || err.message);
    }

    // Test 5: Duplicate studentId in same institution rejected
    try {
      await axios.post(
        `${API_BASE}/students`,
        {
          fullName: 'Bob Smith',
          email: `student_b_dup_${timestamp}@edubridge.org`,
          password: 'Password123!',
          studentId: studentIdCode // Duplicate studentId
        },
        { headers: { Authorization: `Bearer ${instAdminAToken}` } }
      );
      logTest(5, 'Duplicate studentId rejected', false, 'Should have failed with HTTP 400');
    } catch (err) {
      const blocked = err.response?.status === 400;
      logTest(5, 'Duplicate studentId rejected', blocked, err.response?.data?.message);
    }

    // Test 6: Institution Admin A Creates Teacher
    const empIdCode = `EMP-${timestamp}`;
    const teacherEmail = `teacher_a_${timestamp}@edubridge.org`;
    try {
      const res = await axios.post(
        `${API_BASE}/teachers`,
        {
          fullName: 'Professor John Doe',
          email: teacherEmail,
          password: 'Password123!',
          employeeId: empIdCode,
          qualification: 'M.Sc Physics',
          department: 'Science',
          designation: 'Senior Teacher',
          subjectsTaught: ['Physics', 'Mathematics']
        },
        { headers: { Authorization: `Bearer ${instAdminAToken}` } }
      );
      createdTeacherId = res.data.data.profile._id;
      const valid = res.data.success && res.data.data.profile.employeeId === empIdCode;
      logTest(6, 'Institution Admin Creates Teacher Profile', valid, `Emp ID: ${empIdCode}`);
    } catch (err) {
      logTest(6, 'Institution Admin Creates Teacher Profile', false, err.response?.data?.message || err.message);
    }

    // Test 7: Duplicate employeeId in same institution rejected
    try {
      await axios.post(
        `${API_BASE}/teachers`,
        {
          fullName: 'Jane Doe',
          email: `teacher_dup_${timestamp}@edubridge.org`,
          password: 'Password123!',
          employeeId: empIdCode
        },
        { headers: { Authorization: `Bearer ${instAdminAToken}` } }
      );
      logTest(7, 'Duplicate employeeId rejected', false, 'Should have failed with HTTP 400');
    } catch (err) {
      const blocked = err.response?.status === 400;
      logTest(7, 'Duplicate employeeId rejected', blocked, err.response?.data?.message);
    }

    // Test 8: Institution Admin A Creates Parent
    const parentEmail = `parent_a_${timestamp}@edubridge.org`;
    try {
      const res = await axios.post(
        `${API_BASE}/parents`,
        {
          fullName: 'George Smith',
          email: parentEmail,
          password: 'Password123!',
          phone: '+91 9876500000',
          occupation: 'Engineer',
          address: '456 Parent Avenue',
          city: 'Mumbai'
        },
        { headers: { Authorization: `Bearer ${instAdminAToken}` } }
      );
      createdParentId = res.data.data.profile._id;
      createdParentUserId = res.data.data.user._id;
      logTest(8, 'Institution Admin Creates Parent Profile', res.data.success, `Parent User ID: ${createdParentUserId}`);
    } catch (err) {
      logTest(8, 'Institution Admin Creates Parent Profile', false, err.response?.data?.message || err.message);
    }

    // Test 9: Institution Admin Links Parent and Student
    try {
      const res = await axios.post(
        `${API_BASE}/parent-child-links`,
        {
          parentId: createdParentUserId,
          studentId: createdStudentUserId,
          relationship: 'father',
          isPrimaryContact: true
        },
        { headers: { Authorization: `Bearer ${instAdminAToken}` } }
      );
      createdLinkId = res.data.data.link._id;
      logTest(9, 'Link Parent and Student Successfully', res.data.success, `Link ID: ${createdLinkId}`);
    } catch (err) {
      logTest(9, 'Link Parent and Student Successfully', false, err.response?.data?.message || err.message);
    }

    // Test 10: Duplicate Parent-Student link rejected
    try {
      await axios.post(
        `${API_BASE}/parent-child-links`,
        {
          parentId: createdParentUserId,
          studentId: createdStudentUserId
        },
        { headers: { Authorization: `Bearer ${instAdminAToken}` } }
      );
      logTest(10, 'Duplicate Parent-Student link rejected', false, 'Should have failed with HTTP 400');
    } catch (err) {
      const blocked = err.response?.status === 400;
      logTest(10, 'Duplicate Parent-Student link rejected', blocked, err.response?.data?.message);
    }

    // Test 11: Tenant Isolation - Admin B cannot view Student of Institution A
    try {
      await axios.get(`${API_BASE}/students/${createdStudentId}`, {
        headers: { Authorization: `Bearer ${instAdminBToken}` }
      });
      logTest(11, 'Cross-Tenant Access Blocked (Admin B viewing Student A)', false, 'Should have failed with HTTP 403');
    } catch (err) {
      const blocked = err.response?.status === 403;
      logTest(11, 'Cross-Tenant Access Blocked (Admin B viewing Student A)', blocked, err.response?.data?.message);
    }

    // Login as Parent & Student
    try {
      const pLogin = await axios.post(`${API_BASE}/auth/login`, {
        email: parentEmail,
        password: 'Password123!'
      });
      parentToken = pLogin.data.data.token;

      const sLogin = await axios.post(`${API_BASE}/auth/login`, {
        email: studentEmail,
        password: 'Password123!'
      });
      studentToken = sLogin.data.data.token;
    } catch (err) {
      console.error('❌ Failed to login as Parent/Student:', err.message);
    }

    // Test 12: Parent can view their linked child profile
    try {
      const res = await axios.get(`${API_BASE}/students/${createdStudentId}`, {
        headers: { Authorization: `Bearer ${parentToken}` }
      });
      logTest(12, 'Parent Can Access Linked Child Profile', res.data.success, `Student: ${res.data.data.student.userId.fullName}`);
    } catch (err) {
      logTest(12, 'Parent Can Access Linked Child Profile', false, err.response?.data?.message || err.message);
    }

    // Test 13: Student can view their own profile
    try {
      const res = await axios.get(`${API_BASE}/students/${createdStudentId}`, {
        headers: { Authorization: `Bearer ${studentToken}` }
      });
      logTest(13, 'Student Can Access Own Profile', res.data.success, `Student: ${res.data.data.student.studentId}`);
    } catch (err) {
      logTest(13, 'Student Can Access Own Profile', false, err.response?.data?.message || err.message);
    }

    // Test 14: Student cannot list all users/students
    try {
      await axios.get(`${API_BASE}/users`, {
        headers: { Authorization: `Bearer ${studentToken}` }
      });
      logTest(14, 'Student Cannot List All Users', false, 'Should have failed with HTTP 403');
    } catch (err) {
      const blocked = err.response?.status === 403;
      logTest(14, 'Student Cannot List All Users', blocked, err.response?.data?.message);
    }

    // Test 15: Update Student Status (e.g. to suspended)
    try {
      const res = await axios.patch(
        `${API_BASE}/students/${createdStudentId}/status`,
        { status: 'suspended' },
        { headers: { Authorization: `Bearer ${instAdminAToken}` } }
      );
      const isSuspended = res.data.data.student.status === 'suspended';
      logTest(15, 'Update Student Status to Suspended', isSuspended, `Status: ${res.data.data.student.status}`);
    } catch (err) {
      logTest(15, 'Update Student Status to Suspended', false, err.response?.data?.message || err.message);
    }

    // Test 16: Suspended Student Login Blocked
    try {
      await axios.post(`${API_BASE}/auth/login`, {
        email: studentEmail,
        password: 'Password123!'
      });
      logTest(16, 'Suspended Student Login Blocked', false, 'Should have failed login');
    } catch (err) {
      const blocked = err.response?.status === 401 || err.response?.status === 403;
      logTest(16, 'Suspended Student Login Blocked', blocked, err.response?.data?.message);
    }

    // Test 17: Reactivate Student Status
    try {
      const res = await axios.patch(
        `${API_BASE}/students/${createdStudentId}/status`,
        { status: 'active' },
        { headers: { Authorization: `Bearer ${instAdminAToken}` } }
      );
      logTest(17, 'Reactivate Student Status', res.data.data.student.status === 'active', 'Reactivated successfully');
    } catch (err) {
      logTest(17, 'Reactivate Student Status', false, err.response?.data?.message || err.message);
    }

    // Test 18: Institution Admin list users with filters
    try {
      const res = await axios.get(`${API_BASE}/users?role=student`, {
        headers: { Authorization: `Bearer ${instAdminAToken}` }
      });
      logTest(18, 'List Users with Role Filter', res.data.success && res.data.data.count > 0, `Count: ${res.data.data.count}`);
    } catch (err) {
      logTest(18, 'List Users with Role Filter', false, err.response?.data?.message || err.message);
    }

    // Test 19: Soft Delete User (Preserves record with isActive: false)
    try {
      const tempUserEmail = `temp_del_${timestamp}@edubridge.org`;
      const tempUser = await axios.post(
        `${API_BASE}/users`,
        {
          fullName: 'Temp User To Delete',
          email: tempUserEmail,
          password: 'Password123!',
          role: 'teacher',
          employeeId: `DEL-${timestamp}`
        },
        { headers: { Authorization: `Bearer ${instAdminAToken}` } }
      );

      const tempUserId = tempUser.data.data.user._id;

      const delRes = await axios.delete(`${API_BASE}/users/${tempUserId}`, {
        headers: { Authorization: `Bearer ${instAdminAToken}` }
      });

      // Verify soft deletion
      const checkUser = await axios.get(`${API_BASE}/users/${tempUserId}`, {
        headers: { Authorization: `Bearer ${instAdminAToken}` }
      });

      const softDeleted = checkUser.data.data.user.isActive === false;
      logTest(19, 'Soft Deletion Preserves User Record with isActive: false', softDeleted, `isActive: ${checkUser.data.data.user.isActive}`);
    } catch (err) {
      logTest(19, 'Soft Deletion Preserves User Record with isActive: false', false, err.response?.data?.message || err.message);
    }

    // Test 20: Remove Parent-Child Link
    try {
      const delLink = await axios.delete(`${API_BASE}/parent-child-links/${createdLinkId}`, {
        headers: { Authorization: `Bearer ${instAdminAToken}` }
      });
      logTest(20, 'Remove Parent-Child Link', delLink.data.success, 'Link removed');
    } catch (err) {
      logTest(20, 'Remove Parent-Child Link', false, err.response?.data?.message || err.message);
    }

    // Test 21: Unlinked Parent Access Blocked
    try {
      await axios.get(`${API_BASE}/students/${createdStudentId}`, {
        headers: { Authorization: `Bearer ${parentToken}` }
      });
      logTest(21, 'Unlinked Parent Access Blocked', false, 'Should have failed with HTTP 403');
    } catch (err) {
      const blocked = err.response?.status === 403;
      logTest(21, 'Unlinked Parent Access Blocked', blocked, err.response?.data?.message);
    }

    // Test 22: Regression check for Phase 3 Institutions
    try {
      const instMe = await axios.get(`${API_BASE}/institutions/my-institution`, {
        headers: { Authorization: `Bearer ${instAdminAToken}` }
      });
      logTest(22, 'Phase 3 Institution System Intact (Regression Check)', instMe.data.success, `Inst Name: ${instMe.data.data.institution.institutionName}`);
    } catch (err) {
      logTest(22, 'Phase 3 Institution System Intact (Regression Check)', false, err.response?.data?.message || err.message);
    }

    console.log('\n================================================================');
    console.log('  Phase 4 User Management Test Suite Complete');
    console.log('================================================================\n');

  } catch (globalErr) {
    console.error('Fatal Test Suite Error:', globalErr.message);
  }
};

runPhase4Tests();
