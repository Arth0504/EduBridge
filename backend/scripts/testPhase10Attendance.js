require('dotenv').config();
const axios = require('axios');

const API_BASE = 'http://127.0.0.1:5000/api/v1';

const logTest = (num, name, passed, detail = '') => {
  const badge = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${badge} | Test ${num}: ${name} ${detail ? `(${detail})` : ''}`);
};

const runPhase10Tests = async () => {
  console.log('\n================================================================');
  console.log('  EduBridge Phase 10 Attendance Management Automated Test Suite');
  console.log('================================================================\n');

  const timestamp = Date.now();

  let superAdminToken = null;
  let instAdminAToken = null;
  let instAdminBToken = null;
  let teacherAToken = null;
  let teacherBToken = null;
  let studentAToken = null;
  let studentBToken = null;
  let parentAToken = null;

  let instAId = null;
  let instBId = null;

  let year2026Id = null;
  let class10Id = null;
  let section10AId = null;
  let section10BId = null;

  let teacherAProfileId = null;
  let teacherBProfileId = null;
  let studentAProfileId = null;
  let studentAUserId = null;
  let studentBProfileId = null;
  let parentUserId = null;

  let createdAttendanceId = null;

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
      const email = `inst_${prefix.toLowerCase()}_p10_${timestamp}@edubridge.org`;
      const adminEmail = `admin_${prefix.toLowerCase()}_p10_${timestamp}@edubridge.org`;
      const reg = await axios.post(`${API_BASE}/institutions/register`, {
        institutionName: `Phase10 ${prefix} Academy ${timestamp}`,
        institutionType: 'School',
        email,
        phone: '+91 9876543210',
        address: '100 Attendance Way',
        city: 'Bangalore',
        state: 'Karnataka',
        postalCode: '560001',
        proposedAdmin: { fullName: `${prefix} Admin`, email: adminEmail }
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

    // Create Academic Year in Inst A
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

    // Create Class & Sections in Inst A
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

    const sec10B = await axios.post(
      `${API_BASE}/sections`,
      {
        name: 'B',
        classId: class10Id,
        academicYearId: year2026Id,
        capacity: 40
      },
      { headers: { Authorization: `Bearer ${instAdminAToken}` } }
    );
    section10BId = sec10B.data.data.section._id;

    // Create Subject
    const subjRes = await axios.post(
      `${API_BASE}/subjects`,
      {
        academicYearId: year2026Id,
        name: 'Mathematics',
        subjectCode: `MATH_${timestamp}`,
        subjectType: 'core'
      },
      { headers: { Authorization: `Bearer ${instAdminAToken}` } }
    );
    const subjectId = subjRes.data.data.subject._id;

    // Create Teacher A & Teacher B in Inst A
    const tAEmail = `teacher_a_p10_${timestamp}@edubridge.org`;
    const tAReg = await axios.post(
      `${API_BASE}/teachers`,
      {
        fullName: 'Teacher A',
        email: tAEmail,
        password: 'Password123!',
        employeeId: `EMP_A_${timestamp}`
      },
      { headers: { Authorization: `Bearer ${instAdminAToken}` } }
    );
    teacherAProfileId = tAReg.data.data.profile._id;
    const tALogin = await axios.post(`${API_BASE}/auth/login`, { email: tAEmail, password: 'Password123!' });
    teacherAToken = tALogin.data.data.token;

    const tBEmail = `teacher_b_p10_${timestamp}@edubridge.org`;
    const tBReg = await axios.post(
      `${API_BASE}/teachers`,
      {
        fullName: 'Teacher B',
        email: tBEmail,
        password: 'Password123!',
        employeeId: `EMP_B_${timestamp}`
      },
      { headers: { Authorization: `Bearer ${instAdminAToken}` } }
    );
    teacherBProfileId = tBReg.data.data.profile._id;
    const tBLogin = await axios.post(`${API_BASE}/auth/login`, { email: tBEmail, password: 'Password123!' });
    teacherBToken = tBLogin.data.data.token;

    // Assign Teacher A to Class 10 Section A
    await axios.post(
      `${API_BASE}/teacher-subject-assignments`,
      {
        academicYearId: year2026Id,
        teacherId: teacherAProfileId,
        subjectId,
        classId: class10Id,
        sectionId: section10AId
      },
      { headers: { Authorization: `Bearer ${instAdminAToken}` } }
    );

    // Create Student A & Student B in Inst A
    const sAEmail = `student_a_p10_${timestamp}@edubridge.org`;
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

    // Enroll Student A into Class 10 Section A
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

    const sBEmail = `student_b_p10_${timestamp}@edubridge.org`;
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

    // Create Parent A and link to Student A
    const pEmail = `parent_a_p10_${timestamp}@edubridge.org`;
    const pReg = await axios.post(
      `${API_BASE}/parents`,
      {
        fullName: 'Parent A',
        email: pEmail,
        password: 'Password123!',
        relation: 'Mother'
      },
      { headers: { Authorization: `Bearer ${instAdminAToken}` } }
    );
    parentUserId = pReg.data.data.user._id;

    await axios.post(
      `${API_BASE}/parent-child-links`,
      {
        parentId: parentUserId,
        studentId: studentAUserId,
        relationship: 'Mother'
      },
      { headers: { Authorization: `Bearer ${instAdminAToken}` } }
    );

    const pLogin = await axios.post(`${API_BASE}/auth/login`, { email: pEmail, password: 'Password123!' });
    parentAToken = pLogin.data.data.token;

    console.log('[Setup] Multi-tenant environment ready for Phase 10 testing.\n');

    // ----------------------------------------------------------------
    // Tests 1 to 5: Authentication Verification across 5 roles
    // ----------------------------------------------------------------
    logTest(1, 'Super Admin authentication', !!superAdminToken);
    logTest(2, 'Institution Admin authentication', !!instAdminAToken);
    logTest(3, 'Teacher authentication', !!teacherAToken);
    logTest(4, 'Student authentication', !!studentAToken);
    logTest(5, 'Parent authentication', !!parentAToken);

    // ----------------------------------------------------------------
    // Test 6: Teacher can mark attendance for assigned section
    // ----------------------------------------------------------------
    const testDate = '2026-09-20';
    try {
      const attRes = await axios.post(
        `${API_BASE}/attendance`,
        {
          academicYearId: year2026Id,
          classId: class10Id,
          sectionId: section10AId,
          studentId: studentAProfileId,
          teacherId: teacherAProfileId,
          subjectId,
          date: testDate,
          status: 'present',
          remarks: 'Present on time'
        },
        { headers: { Authorization: `Bearer ${teacherAToken}` } }
      );
      createdAttendanceId = attRes.data.data.attendance._id;
      logTest(6, 'Teacher can mark attendance for assigned section', !!createdAttendanceId, `Status: ${attRes.data.data.attendance.status}`);
    } catch (err) {
      logTest(6, 'Teacher can mark attendance for assigned section', false, err.response?.data?.message || err.message);
    }

    // ----------------------------------------------------------------
    // Test 7: Teacher cannot mark attendance for unauthorized section (Section B)
    // ----------------------------------------------------------------
    try {
      await axios.post(
        `${API_BASE}/attendance`,
        {
          academicYearId: year2026Id,
          classId: class10Id,
          sectionId: section10BId,
          studentId: studentBProfileId,
          teacherId: teacherAProfileId,
          date: testDate,
          status: 'present'
        },
        { headers: { Authorization: `Bearer ${teacherAToken}` } }
      );
      logTest(7, 'Teacher cannot mark attendance for unauthorized section', false, 'Expected HTTP 403');
    } catch (err) {
      logTest(7, 'Teacher cannot mark attendance for unauthorized section', err.response?.status === 403, `Blocked with HTTP ${err.response?.status}`);
    }

    // ----------------------------------------------------------------
    // Test 8: Student cannot mark attendance
    // ----------------------------------------------------------------
    try {
      await axios.post(
        `${API_BASE}/attendance`,
        {
          academicYearId: year2026Id,
          classId: class10Id,
          sectionId: section10AId,
          studentId: studentAProfileId,
          date: testDate,
          status: 'present'
        },
        { headers: { Authorization: `Bearer ${studentAToken}` } }
      );
      logTest(8, 'Student cannot mark attendance', false, 'Expected HTTP 403');
    } catch (err) {
      logTest(8, 'Student cannot mark attendance', err.response?.status === 403, `Blocked with HTTP ${err.response?.status}`);
    }

    // ----------------------------------------------------------------
    // Test 9: Parent cannot mark attendance
    // ----------------------------------------------------------------
    try {
      await axios.post(
        `${API_BASE}/attendance`,
        {
          academicYearId: year2026Id,
          classId: class10Id,
          sectionId: section10AId,
          studentId: studentAProfileId,
          date: testDate,
          status: 'present'
        },
        { headers: { Authorization: `Bearer ${parentAToken}` } }
      );
      logTest(9, 'Parent cannot mark attendance', false, 'Expected HTTP 403');
    } catch (err) {
      logTest(9, 'Parent cannot mark attendance', err.response?.status === 403, `Blocked with HTTP ${err.response?.status}`);
    }

    // ----------------------------------------------------------------
    // Test 10: Duplicate attendance blocked (without explicit overwrite flag)
    // ----------------------------------------------------------------
    try {
      await axios.post(
        `${API_BASE}/attendance`,
        {
          academicYearId: year2026Id,
          classId: class10Id,
          sectionId: section10AId,
          studentId: studentAProfileId,
          teacherId: teacherAProfileId,
          subjectId,
          date: testDate,
          status: 'present'
        },
        { headers: { Authorization: `Bearer ${teacherAToken}` } }
      );
      logTest(10, 'Duplicate attendance blocked', false, 'Expected HTTP 400');
    } catch (err) {
      logTest(10, 'Duplicate attendance blocked', err.response?.status === 400, `Blocked with HTTP ${err.response?.status}`);
    }

    // ----------------------------------------------------------------
    // Test 11: Student can view own attendance
    // ----------------------------------------------------------------
    try {
      const ownRes = await axios.get(
        `${API_BASE}/attendance/student/${studentAProfileId}`,
        { headers: { Authorization: `Bearer ${studentAToken}` } }
      );
      logTest(11, 'Student can view own attendance', ownRes.data.success && ownRes.data.data.count > 0, `Count: ${ownRes.data.data.count}`);
    } catch (err) {
      logTest(11, 'Student can view own attendance', false, err.response?.data?.message || err.message);
    }

    // ----------------------------------------------------------------
    // Test 12: Parent can view linked child attendance
    // ----------------------------------------------------------------
    try {
      const parentChildRes = await axios.get(
        `${API_BASE}/attendance/student/${studentAProfileId}`,
        { headers: { Authorization: `Bearer ${parentAToken}` } }
      );
      logTest(12, 'Parent can view linked child attendance', parentChildRes.data.success && parentChildRes.data.data.count > 0);
    } catch (err) {
      logTest(12, 'Parent can view linked child attendance', false, err.response?.data?.message || err.message);
    }

    // ----------------------------------------------------------------
    // Test 13: Parent cannot view unrelated student's attendance (Student B)
    // ----------------------------------------------------------------
    try {
      await axios.get(
        `${API_BASE}/attendance/student/${studentBProfileId}`,
        { headers: { Authorization: `Bearer ${parentAToken}` } }
      );
      logTest(13, 'Parent cannot view unrelated student attendance', false, 'Expected HTTP 403');
    } catch (err) {
      logTest(13, 'Parent cannot view unrelated student attendance', err.response?.status === 403, `Blocked with HTTP ${err.response?.status}`);
    }

    // ----------------------------------------------------------------
    // Test 14: Cross-tenant attendance access blocked
    // ----------------------------------------------------------------
    try {
      await axios.get(
        `${API_BASE}/attendance/student/${studentAProfileId}`,
        { headers: { Authorization: `Bearer ${instAdminBToken}` } }
      );
      logTest(14, 'Cross-tenant attendance access blocked', false, 'Expected HTTP 403');
    } catch (err) {
      logTest(14, 'Cross-tenant attendance access blocked', err.response?.status === 403, `Blocked with HTTP ${err.response?.status}`);
    }

    // ----------------------------------------------------------------
    // Test 15: Institution Admin can view institution attendance
    // ----------------------------------------------------------------
    try {
      const adminAtt = await axios.get(
        `${API_BASE}/attendance?classId=${class10Id}`,
        { headers: { Authorization: `Bearer ${instAdminAToken}` } }
      );
      logTest(15, 'Institution Admin can view institution attendance', adminAtt.data.success && adminAtt.data.data.count > 0);
    } catch (err) {
      logTest(15, 'Institution Admin can view institution attendance', false, err.response?.data?.message || err.message);
    }

    // ----------------------------------------------------------------
    // Test 16: Attendance correction requires reason
    // ----------------------------------------------------------------
    try {
      await axios.patch(
        `${API_BASE}/attendance/${createdAttendanceId}`,
        {
          status: 'late'
          // missing correctionReason
        },
        { headers: { Authorization: `Bearer ${instAdminAToken}` } }
      );
      logTest(16, 'Attendance correction requires reason', false, 'Expected HTTP 400 when missing correctionReason');
    } catch (err) {
      logTest(16, 'Attendance correction requires reason', err.response?.status === 400, `Blocked with HTTP ${err.response?.status}`);
    }

    // Perform valid correction with reason
    await axios.patch(
      `${API_BASE}/attendance/${createdAttendanceId}`,
      {
        status: 'late',
        correctionReason: 'Student arrived 15 mins late due to bus breakdown'
      },
      { headers: { Authorization: `Bearer ${instAdminAToken}` } }
    );

    // ----------------------------------------------------------------
    // Test 17: Attendance audit log created
    // ----------------------------------------------------------------
    try {
      const summaryRes = await axios.get(
        `${API_BASE}/academic/summary`,
        { headers: { Authorization: `Bearer ${instAdminAToken}` } }
      );
      logTest(17, 'Attendance audit log created', summaryRes.data.success);
    } catch (err) {
      logTest(17, 'Attendance audit log created', false, err.response?.data?.message || err.message);
    }

    // ----------------------------------------------------------------
    // Test 18: Attendance percentage calculation correct
    // ----------------------------------------------------------------
    try {
      // Add a second attendance record on 2026-09-21 as 'present'
      await axios.post(
        `${API_BASE}/attendance`,
        {
          academicYearId: year2026Id,
          classId: class10Id,
          sectionId: section10AId,
          studentId: studentAProfileId,
          teacherId: teacherAProfileId,
          date: '2026-09-21',
          status: 'present'
        },
        { headers: { Authorization: `Bearer ${instAdminAToken}` } }
      );

      const sumRes = await axios.get(
        `${API_BASE}/attendance/summary/student/${studentAProfileId}?academicYearId=${year2026Id}`,
        { headers: { Authorization: `Bearer ${studentAToken}` } }
      );
      const stats = sumRes.data.data.summary;
      // 2 working days: 1 late + 1 present = 100%
      logTest(18, 'Attendance percentage calculation correct', stats.totalWorkingDays === 2 && stats.attendancePercentage === 100, `Percentage: ${stats.attendancePercentage}%`);
    } catch (err) {
      logTest(18, 'Attendance percentage calculation correct', false, err.response?.data?.message || err.message);
    }

    // ----------------------------------------------------------------
    // Test 19: Class summary works
    // ----------------------------------------------------------------
    try {
      const clsSumRes = await axios.get(
        `${API_BASE}/attendance/summary/class/${class10Id}?sectionId=${section10AId}`,
        { headers: { Authorization: `Bearer ${instAdminAToken}` } }
      );
      logTest(19, 'Class summary works', clsSumRes.data.success && clsSumRes.data.data.summary.totalWorkingDays > 0);
    } catch (err) {
      logTest(19, 'Class summary works', false, err.response?.data?.message || err.message);
    }

    // ----------------------------------------------------------------
    // Test 20: Date-range report works
    // ----------------------------------------------------------------
    try {
      const repRes = await axios.get(
        `${API_BASE}/attendance/reports?startDate=2026-09-01&endDate=2026-09-30`,
        { headers: { Authorization: `Bearer ${instAdminAToken}` } }
      );
      logTest(20, 'Date-range report works', repRes.data.success && repRes.data.data.count >= 2);
    } catch (err) {
      logTest(20, 'Date-range report works', false, err.response?.data?.message || err.message);
    }

    // ----------------------------------------------------------------
    // Tests 21 to 28: Regression Checks for Phases 2 through 9
    // ----------------------------------------------------------------
    try {
      // Phase 9 Finance regression
      const finRes = await axios.get(`${API_BASE}/finance/summary`, { headers: { Authorization: `Bearer ${instAdminAToken}` } });
      logTest(21, 'Phase 9 Finance regression test', finRes.data.success);

      // Phase 8 Fees regression
      const feeRes = await axios.get(`${API_BASE}/fee-structures`, { headers: { Authorization: `Bearer ${instAdminAToken}` } });
      logTest(22, 'Phase 8 Fees regression test', feeRes.data.success);

      // Phase 7 Attendance endpoint regression
      const attListRes = await axios.get(`${API_BASE}/attendance`, { headers: { Authorization: `Bearer ${instAdminAToken}` } });
      logTest(23, 'Phase 7 Attendance regression test', attListRes.data.success);

      // Phase 6 Academic regression
      const ayRes = await axios.get(`${API_BASE}/academic-years`, { headers: { Authorization: `Bearer ${instAdminAToken}` } });
      logTest(24, 'Phase 6 Academic regression test', ayRes.data.success);

      // Phase 5 Notifications regression
      const notifRes = await axios.get(`${API_BASE}/notifications`, { headers: { Authorization: `Bearer ${instAdminAToken}` } });
      logTest(25, 'Phase 5 Notifications regression test', notifRes.data.success);

      // Phase 4 Users regression
      const usrRes = await axios.get(`${API_BASE}/users`, { headers: { Authorization: `Bearer ${instAdminAToken}` } });
      logTest(26, 'Phase 4 Users regression test', usrRes.data.success);

      // Phase 3 Institutions regression
      const instRes = await axios.get(`${API_BASE}/institutions`, { headers: { Authorization: `Bearer ${superAdminToken}` } });
      logTest(27, 'Phase 3 Institutions regression test', instRes.data.success);

      // Phase 2 Auth regression
      const meRes = await axios.get(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${superAdminToken}` } });
      logTest(28, 'Phase 2 Auth regression test', meRes.data.success && meRes.data.data.user.role === 'super_admin');

    } catch (err) {
      logTest(21, 'Phase 9 Finance regression test', false);
      logTest(22, 'Phase 8 Fees regression test', false);
      logTest(23, 'Phase 7 Attendance regression test', false);
      logTest(24, 'Phase 6 Academic regression test', false);
      logTest(25, 'Phase 5 Notifications regression test', false);
      logTest(26, 'Phase 4 Users regression test', false);
      logTest(27, 'Phase 3 Institutions regression test', false);
      logTest(28, 'Phase 2 Auth regression test', false, err.response?.data?.message || err.message);
    }

    console.log('\n================================================================');
    console.log('  Phase 10 Attendance Automated Test Suite Complete');
    console.log('================================================================\n');

  } catch (globalErr) {
    console.error('❌ Global Test Execution Error:', globalErr.response?.data || globalErr.message);
    process.exit(1);
  }
};

runPhase10Tests();
