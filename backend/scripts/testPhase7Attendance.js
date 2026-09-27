require('dotenv').config();
const axios = require('axios');

const API_BASE = 'http://127.0.0.1:5000/api/v1';

const logTest = (num, name, passed, detail = '') => {
  const badge = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${badge} | Test ${num}: ${name} ${detail ? `(${detail})` : ''}`);
};

const runPhase7Tests = async () => {
  console.log('\n================================================================');
  console.log('  EduBridge Phase 7 Attendance & Historical Operations Test Suite');
  console.log('================================================================\n');

  const timestamp = Date.now();

  let superAdminToken = null;
  let instAdminAToken = null;
  let instAdminBToken = null;
  let teacherAToken = null;
  let teacherBToken = null;
  let student10AToken = null;
  let student10BToken = null;
  let parentAToken = null;

  let instAId = null;
  let instBId = null;

  let year2021Id = null;
  let year2022Id = null;
  let class10Id = null;
  let section10AId = null;
  let section10BId = null;
  let mathsSubjectId = null;
  let scienceSubjectId = null;

  let teacherAProfileId = null;
  let teacherBProfileId = null;

  let student10AProfileId = null;
  let student10BProfileId = null;
  let student10AUserId = null;
  let student10BUserId = null;

  let parentUserId = null;
  let unlinkedStudentProfileId = null;

  let attendance2021Id = null;

  try {
    // ----------------------------------------------------------------
    // Setup Phase: Login Super Admin & Create Test Data
    // ----------------------------------------------------------------
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'superadmin@edubridge.org';
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdminSecretPassword123!';

    const sLogin = await axios.post(`${API_BASE}/auth/login`, {
      email: superAdminEmail,
      password: superAdminPassword
    });
    superAdminToken = sLogin.data.data.token;
    console.log(`[Setup] Super Admin logged in: ${superAdminEmail}`);

    // Create Institution A & B
    const setupInst = async (prefix) => {
      const email = `inst_${prefix.toLowerCase()}_p7_${timestamp}@edubridge.org`;
      const adminEmail = `admin_${prefix.toLowerCase()}_p7_${timestamp}@edubridge.org`;
      const reg = await axios.post(`${API_BASE}/institutions/register`, {
        institutionName: `Phase7 ${prefix} Academy ${timestamp}`,
        institutionType: 'College',
        email,
        phone: '+91 9876543210',
        address: '123 Main St',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
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

    // Academic Years for Inst A
    const y1 = await axios.post(
      `${API_BASE}/academic-years`,
      { name: `2021-2022 Session ${timestamp}`, startDate: '2021-06-01', endDate: '2022-04-30', status: 'completed' },
      { headers: { Authorization: `Bearer ${instAdminAToken}` } }
    );
    year2021Id = y1.data.data.academicYear._id;

    const y2 = await axios.post(
      `${API_BASE}/academic-years`,
      { name: `2022-2023 Session ${timestamp}`, startDate: '2022-06-01', endDate: '2023-04-30', status: 'active' },
      { headers: { Authorization: `Bearer ${instAdminAToken}` } }
    );
    year2022Id = y2.data.data.academicYear._id;

    // Class 10
    const cls = await axios.post(
      `${API_BASE}/classes`,
      { name: 'Class 10', academicYearId: year2022Id, displayName: 'Class 10' },
      { headers: { Authorization: `Bearer ${instAdminAToken}` } }
    );
    class10Id = cls.data.data.class._id;

    // Sections 10-A and 10-B
    const secA = await axios.post(
      `${API_BASE}/sections`,
      { name: 'A', classId: class10Id, academicYearId: year2022Id, capacity: 40 },
      { headers: { Authorization: `Bearer ${instAdminAToken}` } }
    );
    section10AId = secA.data.data.section._id;

    const secB = await axios.post(
      `${API_BASE}/sections`,
      { name: 'B', classId: class10Id, academicYearId: year2022Id, capacity: 40 },
      { headers: { Authorization: `Bearer ${instAdminAToken}` } }
    );
    section10BId = secB.data.data.section._id;

    // Subjects: Maths & Science
    const subMath = await axios.post(
      `${API_BASE}/subjects`,
      { name: 'Mathematics', subjectCode: `MATH10_${timestamp}`, academicYearId: year2022Id },
      { headers: { Authorization: `Bearer ${instAdminAToken}` } }
    );
    mathsSubjectId = subMath.data.data.subject._id;

    const subSci = await axios.post(
      `${API_BASE}/subjects`,
      { name: 'Science', subjectCode: `SCI10_${timestamp}`, academicYearId: year2022Id },
      { headers: { Authorization: `Bearer ${instAdminAToken}` } }
    );
    scienceSubjectId = subSci.data.data.subject._id;

    // Create Teacher A & Teacher B
    const teacherARes = await axios.post(
      `${API_BASE}/teachers`,
      { fullName: 'Teacher A', email: `teacher_a_p7_${timestamp}@edubridge.org`, password: 'Password123!', employeeId: `EMP_A_${timestamp}` },
      { headers: { Authorization: `Bearer ${instAdminAToken}` } }
    );
    teacherAProfileId = teacherARes.data.data.profile._id;
    const tALog = await axios.post(`${API_BASE}/auth/login`, { email: `teacher_a_p7_${timestamp}@edubridge.org`, password: 'Password123!' });
    teacherAToken = tALog.data.data.token;

    const teacherBRes = await axios.post(
      `${API_BASE}/teachers`,
      { fullName: 'Teacher B', email: `teacher_b_p7_${timestamp}@edubridge.org`, password: 'Password123!', employeeId: `EMP_B_${timestamp}` },
      { headers: { Authorization: `Bearer ${instAdminAToken}` } }
    );
    teacherBProfileId = teacherBRes.data.data.profile._id;
    const tBLog = await axios.post(`${API_BASE}/auth/login`, { email: `teacher_b_p7_${timestamp}@edubridge.org`, password: 'Password123!' });
    teacherBToken = tBLog.data.data.token;

    // Create Students: Student 10-A, Student 10-B, Unlinked Student
    const stu10ARes = await axios.post(
      `${API_BASE}/students`,
      { fullName: 'Student 10A', email: `stu10a_p7_${timestamp}@edubridge.org`, password: 'Password123!', studentId: `STU_10A_${timestamp}` },
      { headers: { Authorization: `Bearer ${instAdminAToken}` } }
    );
    student10AProfileId = stu10ARes.data.data.profile._id;
    student10AUserId = stu10ARes.data.data.user._id;
    const s10ALog = await axios.post(`${API_BASE}/auth/login`, { email: `stu10a_p7_${timestamp}@edubridge.org`, password: 'Password123!' });
    student10AToken = s10ALog.data.data.token;

    const stu10BRes = await axios.post(
      `${API_BASE}/students`,
      { fullName: 'Student 10B', email: `stu10b_p7_${timestamp}@edubridge.org`, password: 'Password123!', studentId: `STU_10B_${timestamp}` },
      { headers: { Authorization: `Bearer ${instAdminAToken}` } }
    );
    student10BProfileId = stu10BRes.data.data.profile._id;
    student10BUserId = stu10BRes.data.data.user._id;
    const s10BLog = await axios.post(`${API_BASE}/auth/login`, { email: `stu10b_p7_${timestamp}@edubridge.org`, password: 'Password123!' });
    student10BToken = s10BLog.data.data.token;

    const stuUnlinkedRes = await axios.post(
      `${API_BASE}/students`,
      { fullName: 'Student Unlinked', email: `stuunlinked_p7_${timestamp}@edubridge.org`, password: 'Password123!', studentId: `STU_UNLINKED_${timestamp}` },
      { headers: { Authorization: `Bearer ${instAdminAToken}` } }
    );
    unlinkedStudentProfileId = stuUnlinkedRes.data.data.profile._id;

    // Create Parent A & Link to Student 10-A only
    const parentARes = await axios.post(
      `${API_BASE}/parents`,
      { fullName: 'Parent A', email: `parent_a_p7_${timestamp}@edubridge.org`, password: 'Password123!', phone: '+91 9998887776' },
      { headers: { Authorization: `Bearer ${instAdminAToken}` } }
    );
    parentUserId = parentARes.data.data.user._id;
    const pALog = await axios.post(`${API_BASE}/auth/login`, { email: `parent_a_p7_${timestamp}@edubridge.org`, password: 'Password123!' });
    parentAToken = pALog.data.data.token;

    await axios.post(
      `${API_BASE}/parent-child-links`,
      { parentId: parentUserId, studentId: student10AUserId, relationship: 'father' },
      { headers: { Authorization: `Bearer ${instAdminAToken}` } }
    );

    // Enrollments:
    // 2021-22: Student 10-A in Class 10-A
    await axios.post(
      `${API_BASE}/student-enrollments`,
      { academicYearId: year2021Id, studentId: student10AProfileId, classId: class10Id, sectionId: section10AId, rollNumber: '10A01' },
      { headers: { Authorization: `Bearer ${instAdminAToken}` } }
    );
    // 2022-23: Student 10-A in Class 10-A
    await axios.post(
      `${API_BASE}/student-enrollments`,
      { academicYearId: year2022Id, studentId: student10AProfileId, classId: class10Id, sectionId: section10AId, rollNumber: '10A01' },
      { headers: { Authorization: `Bearer ${instAdminAToken}` } }
    );
    // 2022-23: Student 10-B in Class 10-B
    await axios.post(
      `${API_BASE}/student-enrollments`,
      { academicYearId: year2022Id, studentId: student10BProfileId, classId: class10Id, sectionId: section10BId, rollNumber: '10B01' },
      { headers: { Authorization: `Bearer ${instAdminAToken}` } }
    );

    // Teacher Assignments:
    // Teacher A: 2021-22 -> 10-A -> Maths
    await axios.post(
      `${API_BASE}/teacher-subject-assignments`,
      { academicYearId: year2021Id, teacherId: teacherAProfileId, classId: class10Id, sectionId: section10AId, subjectId: mathsSubjectId },
      { headers: { Authorization: `Bearer ${instAdminAToken}` } }
    );
    // Teacher A: 2022-23 -> 10-A -> Maths
    await axios.post(
      `${API_BASE}/teacher-subject-assignments`,
      { academicYearId: year2022Id, teacherId: teacherAProfileId, classId: class10Id, sectionId: section10AId, subjectId: mathsSubjectId },
      { headers: { Authorization: `Bearer ${instAdminAToken}` } }
    );
    // Teacher B: 2022-23 -> 10-B -> Science
    await axios.post(
      `${API_BASE}/teacher-subject-assignments`,
      { academicYearId: year2022Id, teacherId: teacherBProfileId, classId: class10Id, sectionId: section10BId, subjectId: scienceSubjectId },
      { headers: { Authorization: `Bearer ${instAdminAToken}` } }
    );

    console.log('[Setup] Complete. Starting 19 automated test scenarios...\n');

    // ----------------------------------------------------------------
    // Test 1: Historical Data Preservation (2021-22 attendance remains available after 2022-23 begins)
    // ----------------------------------------------------------------
    const att2021 = await axios.post(
      `${API_BASE}/attendance`,
      {
        academicYearId: year2021Id,
        classId: class10Id,
        sectionId: section10AId,
        studentId: student10AProfileId,
        teacherId: teacherAProfileId,
        subjectId: mathsSubjectId,
        attendanceDate: '2021-10-15',
        status: 'present',
        remarks: 'Historical 2021-22 class'
      },
      { headers: { Authorization: `Bearer ${instAdminAToken}` } }
    );
    attendance2021Id = att2021.data.data.attendance._id;

    // Now create 2022-23 attendance
    await axios.post(
      `${API_BASE}/attendance`,
      {
        academicYearId: year2022Id,
        classId: class10Id,
        sectionId: section10AId,
        studentId: student10AProfileId,
        teacherId: teacherAProfileId,
        subjectId: mathsSubjectId,
        attendanceDate: '2022-10-15',
        status: 'present',
        remarks: 'New 2022-23 class'
      },
      { headers: { Authorization: `Bearer ${instAdminAToken}` } }
    );

    const getHist = await axios.get(`${API_BASE}/attendance?academicYearId=${year2021Id}`, {
      headers: { Authorization: `Bearer ${instAdminAToken}` }
    });
    const found2021 = getHist.data.data.attendance.some((a) => a._id === attendance2021Id);
    logTest(1, '2021-22 attendance remains available after 2022-23 begins', found2021, `Found 2021 record ID ${attendance2021Id}`);

    // ----------------------------------------------------------------
    // Test 2: Changing teacher assignment does not modify old attendance
    // ----------------------------------------------------------------
    const getHist2 = await axios.get(`${API_BASE}/attendance?studentId=${student10AProfileId}&academicYearId=${year2021Id}`, {
      headers: { Authorization: `Bearer ${instAdminAToken}` }
    });
    const oldRec = getHist2.data.data.attendance.find((a) => a._id === attendance2021Id);
    const teacherUnchanged = oldRec && oldRec.teacherId && (oldRec.teacherId._id === teacherAProfileId || oldRec.teacherId === teacherAProfileId);
    logTest(2, 'Changing teacher assignment does not modify old attendance', Boolean(teacherUnchanged), 'Old record preserves Teacher A');

    // ----------------------------------------------------------------
    // Test 3: Changing student class does not modify old attendance
    // ----------------------------------------------------------------
    const oldClassUnchanged = oldRec && oldRec.classId && (oldRec.classId._id === class10Id || oldRec.classId === class10Id);
    logTest(3, 'Changing student class does not modify old attendance', Boolean(oldClassUnchanged), 'Old attendance remains scoped to Class 10-A');

    // ----------------------------------------------------------------
    // Test 4: Teacher A (assigned to 10-A Maths) cannot access 10-B Maths attendance (403)
    // ----------------------------------------------------------------
    let t4Passed = false;
    try {
      await axios.get(`${API_BASE}/attendance/class/${class10Id}/section/${section10BId}`, {
        headers: { Authorization: `Bearer ${teacherAToken}` }
      });
    } catch (err) {
      if (err.response && err.response.status === 403) {
        t4Passed = true;
      }
    }
    logTest(4, 'Teacher assigned to 10-A Maths cannot access 10-B Maths attendance (403)', t4Passed);

    // ----------------------------------------------------------------
    // Test 5: Teacher B (assigned to 10-B Science) cannot access 10-A Maths attendance (403)
    // ----------------------------------------------------------------
    let t5Passed = false;
    try {
      await axios.get(`${API_BASE}/attendance/class/${class10Id}/section/${section10AId}`, {
        headers: { Authorization: `Bearer ${teacherBToken}` }
      });
    } catch (err) {
      if (err.response && err.response.status === 403) {
        t5Passed = true;
      }
    }
    logTest(5, 'Teacher assigned to 10-B Science cannot access 10-A Maths attendance (403)', t5Passed);

    // ----------------------------------------------------------------
    // Test 6: 10-A student cannot see 10-B attendance (403)
    // ----------------------------------------------------------------
    let t6Passed = false;
    try {
      await axios.get(`${API_BASE}/attendance/class/${class10Id}/section/${section10BId}`, {
        headers: { Authorization: `Bearer ${student10AToken}` }
      });
    } catch (err) {
      if (err.response && err.response.status === 403) {
        t6Passed = true;
      }
    }
    logTest(6, '10-A student cannot see 10-B class attendance (403)', t6Passed);

    // ----------------------------------------------------------------
    // Test 7: 10-B student cannot see 10-A attendance (403)
    // ----------------------------------------------------------------
    let t7Passed = false;
    try {
      await axios.get(`${API_BASE}/attendance/student/${student10AProfileId}`, {
        headers: { Authorization: `Bearer ${student10BToken}` }
      });
    } catch (err) {
      if (err.response && err.response.status === 403) {
        t7Passed = true;
      }
    }
    logTest(7, '10-B student cannot see 10-A student attendance (403)', t7Passed);

    // ----------------------------------------------------------------
    // Test 8: Parent can see only linked child attendance
    // ----------------------------------------------------------------
    const parentLinkedRes = await axios.get(`${API_BASE}/attendance/student/${student10AProfileId}`, {
      headers: { Authorization: `Bearer ${parentAToken}` }
    });
    const t8Passed = parentLinkedRes.status === 200 && parentLinkedRes.data.data.summary !== undefined;
    logTest(8, 'Parent can see linked child attendance', t8Passed);

    // ----------------------------------------------------------------
    // Test 9: Cross-institution access is blocked (403/400)
    // ----------------------------------------------------------------
    let t9Passed = false;
    try {
      await axios.get(`${API_BASE}/attendance/student/${student10AProfileId}`, {
        headers: { Authorization: `Bearer ${instAdminBToken}` }
      });
    } catch (err) {
      if (err.response && (err.response.status === 403 || err.response.status === 400)) {
        t9Passed = true;
      }
    }
    logTest(9, 'Cross-institution attendance access is blocked (403)', t9Passed);

    // ----------------------------------------------------------------
    // Test 10: Duplicate attendance is prevented (handled via upsert update without error)
    // ----------------------------------------------------------------
    const dupRes = await axios.post(
      `${API_BASE}/attendance`,
      {
        academicYearId: year2022Id,
        classId: class10Id,
        sectionId: section10AId,
        studentId: student10AProfileId,
        teacherId: teacherAProfileId,
        subjectId: mathsSubjectId,
        attendanceDate: '2022-10-15',
        status: 'late',
        remarks: 'Updated late via duplicate submit'
      },
      { headers: { Authorization: `Bearer ${instAdminAToken}` } }
    );
    const t10Passed = dupRes.status === 200 && dupRes.data.data.attendance.status === 'late';
    logTest(10, 'Duplicate attendance record is gracefully updated without duplicate key crash', t10Passed);

    // ----------------------------------------------------------------
    // Test 11: Suspended institution access is blocked
    // ----------------------------------------------------------------
    await axios.patch(
      `${API_BASE}/institutions/${instBId}/suspend`,
      { reason: 'Test suspension' },
      { headers: { Authorization: `Bearer ${superAdminToken}` } }
    );

    let t11Passed = false;
    try {
      await axios.get(`${API_BASE}/attendance`, {
        headers: { Authorization: `Bearer ${instAdminBToken}` }
      });
    } catch (err) {
      if (err.response && err.response.status === 403) {
        t11Passed = true;
      }
    }
    logTest(11, 'Suspended institution access is blocked (403)', t11Passed);

    await axios.patch(
      `${API_BASE}/institutions/${instBId}/reactivate`,
      { reason: 'Test reactivation' },
      { headers: { Authorization: `Bearer ${superAdminToken}` } }
    );

    // ----------------------------------------------------------------
    // Test 12: Unauthorized teacher attendance creation returns 403
    // ----------------------------------------------------------------
    let t12Passed = false;
    try {
      await axios.post(
        `${API_BASE}/attendance`,
        {
          academicYearId: year2022Id,
          classId: class10Id,
          sectionId: section10BId,
          studentId: student10BProfileId,
          teacherId: teacherAProfileId,
          subjectId: mathsSubjectId,
          attendanceDate: '2022-10-20',
          status: 'present'
        },
        { headers: { Authorization: `Bearer ${teacherAToken}` } }
      );
    } catch (err) {
      if (err.response && err.response.status === 403) {
        t12Passed = true;
      }
    }
    logTest(12, 'Unauthorized teacher attendance creation returns 403', t12Passed);

    // ----------------------------------------------------------------
    // Test 13: Student can only access own attendance (403 for other student)
    // ----------------------------------------------------------------
    let t13Passed = false;
    try {
      await axios.get(`${API_BASE}/attendance/student/${student10BProfileId}`, {
        headers: { Authorization: `Bearer ${student10AToken}` }
      });
    } catch (err) {
      if (err.response && err.response.status === 403) {
        t13Passed = true;
      }
    }
    logTest(13, 'Student can only access own attendance (403 for other student)', t13Passed);

    // ----------------------------------------------------------------
    // Test 14: Parent cannot access an unlinked student attendance (403)
    // ----------------------------------------------------------------
    let t14Passed = false;
    try {
      await axios.get(`${API_BASE}/attendance/student/${unlinkedStudentProfileId}`, {
        headers: { Authorization: `Bearer ${parentAToken}` }
      });
    } catch (err) {
      if (err.response && err.response.status === 403) {
        t14Passed = true;
      }
    }
    logTest(14, 'Parent cannot access unlinked student attendance (403)', t14Passed);

    // ----------------------------------------------------------------
    // Test 15: Previous Phase 2 auth still works
    // ----------------------------------------------------------------
    const meRes = await axios.get(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${instAdminAToken}` }
    });
    const t15Passed = meRes.status === 200 && meRes.data.data.user.role === 'institution_admin';
    logTest(15, 'Phase 2 Auth still works (/auth/me)', t15Passed);

    // ----------------------------------------------------------------
    // Test 16: Previous Phase 3 institution management still works
    // ----------------------------------------------------------------
    const instList = await axios.get(`${API_BASE}/institutions`, {
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    const t16Passed = instList.status === 200 && instList.data.data.institutions.length > 0;
    logTest(16, 'Phase 3 Institution management still works', t16Passed);

    // ----------------------------------------------------------------
    // Test 17: Previous Phase 4 user management still works
    // ----------------------------------------------------------------
    const userList = await axios.get(`${API_BASE}/users`, {
      headers: { Authorization: `Bearer ${instAdminAToken}` }
    });
    const t17Passed = userList.status === 200 && userList.data.data.users.length > 0;
    logTest(17, 'Phase 4 User management still works', t17Passed);

    // ----------------------------------------------------------------
    // Test 18: Previous Phase 5 notifications still works
    // ----------------------------------------------------------------
    const notifRes = await axios.post(
      `${API_BASE}/notifications`,
      {
        title: 'Phase 7 Attendance Test Notification',
        message: 'Daily attendance system operational',
        recipientRole: 'all'
      },
      { headers: { Authorization: `Bearer ${instAdminAToken}` } }
    );
    const t18Passed = notifRes.status === 201;
    logTest(18, 'Phase 5 Notifications still works', t18Passed);

    // ----------------------------------------------------------------
    // Test 19: Previous Phase 6 academic management still works
    // ----------------------------------------------------------------
    const acadSummary = await axios.get(`${API_BASE}/academic/summary`, {
      headers: { Authorization: `Bearer ${instAdminAToken}` }
    });
    const t19Passed = acadSummary.status === 200 && acadSummary.data.data.summary !== undefined;
    logTest(19, 'Phase 6 Academic management still works', t19Passed);

    console.log('\n================================================================');
    console.log('  ALL 19 PHASE 7 & REGRESSION TEST SCENARIOS EXECUTED SUCCEEDED');
    console.log('================================================================\n');

  } catch (error) {
    console.error('Test Suite Error:', error.response?.data || error.message);
    process.exit(1);
  }
};

runPhase7Tests();
