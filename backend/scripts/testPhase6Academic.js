require('dotenv').config();
const axios = require('axios');

const API_BASE = 'http://127.0.0.1:5000/api/v1';

const logTest = (num, name, passed, detail = '') => {
  const badge = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${badge} | Test ${num}: ${name} ${detail ? `(${detail})` : ''}`);
};

const runPhase6Tests = async () => {
  console.log('\n================================================================');
  console.log('  EduBridge Phase 6 Academic Management Test Suite');
  console.log('================================================================\n');

  const timestamp = Date.now();

  let superAdminToken = null;
  let instAdminAToken = null;
  let instAdminBToken = null;
  let teacherAToken = null;
  let studentAToken = null;
  let parentAToken = null;

  let instAId = null;
  let instBId = null;

  let createdAcademicYearId = null;
  let createdClassId = null;
  let createdSectionId = null;
  let createdSubjectId = null;
  let createdTeacherProfileId = null;
  let createdTeacherUserId = null;
  let createdStudentProfileId = null;
  let createdStudentUserId = null;
  let createdParentUserId = null;
  let createdAssignmentId = null;
  let createdEnrollmentId = null;

  try {
    // ----------------------------------------------------------------
    // Setup Phase: Authenticate & Register Test Institutions & Users
    // ----------------------------------------------------------------

    // 1. Super Admin authentication
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'superadmin@edubridge.org';
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdminSecretPassword123!';

    try {
      const sLogin = await axios.post(`${API_BASE}/auth/login`, {
        email: superAdminEmail,
        password: superAdminPassword
      });
      superAdminToken = sLogin.data.data.token;
      logTest(1, 'Super Admin authentication', true, `Logged in as ${superAdminEmail}`);
    } catch (err) {
      logTest(1, 'Super Admin authentication', false, err.response?.data?.message || err.message);
      process.exit(1);
    }

    // Institution Setup Helper
    const setupInst = async (prefix) => {
      const email = `inst_${prefix.toLowerCase()}_p6_${timestamp}@edubridge.org`;
      const adminEmail = `admin_${prefix.toLowerCase()}_p6_${timestamp}@edubridge.org`;

      const reg = await axios.post(`${API_BASE}/institutions/register`, {
        institutionName: `Phase6 ${prefix} Academy ${timestamp}`,
        institutionType: 'College',
        email,
        phone: '+91 9876543210',
        address: 'Academic Way',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        proposedAdmin: { fullName: `${prefix} Academic Admin`, email: adminEmail }
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

      return { instId, adminToken: adminLogin.data.data.token };
    };

    const instA = await setupInst('InstA');
    instAId = instA.instId;
    instAdminAToken = instA.adminToken;

    const instB = await setupInst('InstB');
    instBId = instB.instId;
    instAdminBToken = instB.adminToken;

    // 2. Institution Admin authentication
    logTest(2, 'Institution Admin authentication', Boolean(instAdminAToken && instAdminBToken), `Inst A & B tokens active`);

    // Create Teacher, Student, Parent in Inst A
    const teacherRes = await axios.post(
      `${API_BASE}/teachers`,
      {
        fullName: 'Professor Academic Teacher',
        email: `teacher_p6_${timestamp}@edubridge.org`,
        password: 'Password123!',
        employeeId: `EMP6-${timestamp}`,
        qualification: 'Ph.D Math'
      },
      { headers: { Authorization: `Bearer ${instAdminAToken}` } }
    );
    createdTeacherProfileId = teacherRes.data.data.profile._id;
    createdTeacherUserId = teacherRes.data.data.user._id;

    const studentRes = await axios.post(
      `${API_BASE}/students`,
      {
        fullName: 'Academic Student',
        email: `student_p6_${timestamp}@edubridge.org`,
        password: 'Password123!',
        studentId: `STU6-${timestamp}`
      },
      { headers: { Authorization: `Bearer ${instAdminAToken}` } }
    );
    createdStudentProfileId = studentRes.data.data.profile._id;
    createdStudentUserId = studentRes.data.data.user._id;

    const parentRes = await axios.post(
      `${API_BASE}/parents`,
      {
        fullName: 'Academic Parent',
        email: `parent_p6_${timestamp}@edubridge.org`,
        password: 'Password123!',
        phone: '+91 9111122222'
      },
      { headers: { Authorization: `Bearer ${instAdminAToken}` } }
    );
    createdParentUserId = parentRes.data.data.user._id;

    // Link Parent and Student
    await axios.post(
      `${API_BASE}/parent-child-links`,
      {
        parentId: createdParentUserId,
        studentId: createdStudentUserId,
        relationship: 'father'
      },
      { headers: { Authorization: `Bearer ${instAdminAToken}` } }
    );

    // Login users
    const tLog = await axios.post(`${API_BASE}/auth/login`, { email: `teacher_p6_${timestamp}@edubridge.org`, password: 'Password123!' });
    teacherAToken = tLog.data.data.token;

    const sLog = await axios.post(`${API_BASE}/auth/login`, { email: `student_p6_${timestamp}@edubridge.org`, password: 'Password123!' });
    studentAToken = sLog.data.data.token;

    const pLog = await axios.post(`${API_BASE}/auth/login`, { email: `parent_p6_${timestamp}@edubridge.org`, password: 'Password123!' });
    parentAToken = pLog.data.data.token;

    // ----------------------------------------------------------------
    // Phase 6 Academic Operations Core Tests
    // ----------------------------------------------------------------

    // 3. Create academic year
    const yearName = `2026-27 Session ${timestamp}`;
    try {
      const res = await axios.post(
        `${API_BASE}/academic-years`,
        {
          name: yearName,
          startDate: '2026-06-01',
          endDate: '2027-05-31',
          status: 'upcoming'
        },
        { headers: { Authorization: `Bearer ${instAdminAToken}` } }
      );
      createdAcademicYearId = res.data.data.academicYear._id;
      logTest(3, 'Create academic year', res.data.success, `ID: ${createdAcademicYearId}`);
    } catch (err) {
      logTest(3, 'Create academic year', false, err.response?.data?.message || err.message);
    }

    // 4. Duplicate academic year protection
    try {
      await axios.post(
        `${API_BASE}/academic-years`,
        {
          name: yearName,
          startDate: '2026-06-01',
          endDate: '2027-05-31'
        },
        { headers: { Authorization: `Bearer ${instAdminAToken}` } }
      );
      logTest(4, 'Duplicate academic year protection', false, 'Should have failed with HTTP 400');
    } catch (err) {
      const blocked = err.response?.status === 400;
      logTest(4, 'Duplicate academic year protection', blocked, err.response?.data?.message);
    }

    // 5. Activate academic year
    try {
      const res = await axios.patch(
        `${API_BASE}/academic-years/${createdAcademicYearId}/activate`,
        {},
        { headers: { Authorization: `Bearer ${instAdminAToken}` } }
      );
      const isAct = res.data.data.academicYear.status === 'active';
      logTest(5, 'Activate academic year', isAct, `Status: ${res.data.data.academicYear.status}`);
    } catch (err) {
      logTest(5, 'Activate academic year', false, err.response?.data?.message || err.message);
    }

    // 6. Create class
    const className = `Grade 10 ${timestamp}`;
    try {
      const res = await axios.post(
        `${API_BASE}/classes`,
        {
          academicYearId: createdAcademicYearId,
          name: className,
          displayName: 'Grade 10 Standard',
          classOrder: 10
        },
        { headers: { Authorization: `Bearer ${instAdminAToken}` } }
      );
      createdClassId = res.data.data.class._id;
      logTest(6, 'Create class', res.data.success, `Class ID: ${createdClassId}`);
    } catch (err) {
      logTest(6, 'Create class', false, err.response?.data?.message || err.message);
    }

    // 7. Duplicate class protection
    try {
      await axios.post(
        `${API_BASE}/classes`,
        {
          academicYearId: createdAcademicYearId,
          name: className
        },
        { headers: { Authorization: `Bearer ${instAdminAToken}` } }
      );
      logTest(7, 'Duplicate class protection', false, 'Should have failed with HTTP 400');
    } catch (err) {
      const blocked = err.response?.status === 400;
      logTest(7, 'Duplicate class protection', blocked, err.response?.data?.message);
    }

    // 8. Create section
    try {
      const res = await axios.post(
        `${API_BASE}/sections`,
        {
          classId: createdClassId,
          academicYearId: createdAcademicYearId,
          name: 'A',
          capacity: 45,
          roomNumber: 'Room-101',
          classTeacherId: createdTeacherProfileId
        },
        { headers: { Authorization: `Bearer ${instAdminAToken}` } }
      );
      createdSectionId = res.data.data.section._id;
      logTest(8, 'Create section', res.data.success, `Section ID: ${createdSectionId}`);
    } catch (err) {
      logTest(8, 'Create section', false, err.response?.data?.message || err.message);
    }

    // 9. Duplicate section protection
    try {
      await axios.post(
        `${API_BASE}/sections`,
        {
          classId: createdClassId,
          academicYearId: createdAcademicYearId,
          name: 'A',
          capacity: 45
        },
        { headers: { Authorization: `Bearer ${instAdminAToken}` } }
      );
      logTest(9, 'Duplicate section protection', false, 'Should have failed with HTTP 400');
    } catch (err) {
      const blocked = err.response?.status === 400;
      logTest(9, 'Duplicate section protection', blocked, err.response?.data?.message);
    }

    // 10. Create subject
    const subjectCode = `MATH-${timestamp}`;
    try {
      const res = await axios.post(
        `${API_BASE}/subjects`,
        {
          academicYearId: createdAcademicYearId,
          name: 'Advanced Mathematics',
          subjectCode,
          subjectType: 'core',
          credits: 4
        },
        { headers: { Authorization: `Bearer ${instAdminAToken}` } }
      );
      createdSubjectId = res.data.data.subject._id;
      logTest(10, 'Create subject', res.data.success, `Subject Code: ${subjectCode}`);
    } catch (err) {
      logTest(10, 'Create subject', false, err.response?.data?.message || err.message);
    }

    // 11. Duplicate subject protection
    try {
      await axios.post(
        `${API_BASE}/subjects`,
        {
          academicYearId: createdAcademicYearId,
          name: 'Mathematics Duplicate',
          subjectCode // Duplicate code
        },
        { headers: { Authorization: `Bearer ${instAdminAToken}` } }
      );
      logTest(11, 'Duplicate subject protection', false, 'Should have failed with HTTP 400');
    } catch (err) {
      const blocked = err.response?.status === 400;
      logTest(11, 'Duplicate subject protection', blocked, err.response?.data?.message);
    }

    // 12. Assign teacher to subject/class
    try {
      const res = await axios.post(
        `${API_BASE}/teacher-subject-assignments`,
        {
          academicYearId: createdAcademicYearId,
          teacherId: createdTeacherProfileId,
          subjectId: createdSubjectId,
          classId: createdClassId,
          sectionId: createdSectionId
        },
        { headers: { Authorization: `Bearer ${instAdminAToken}` } }
      );
      createdAssignmentId = res.data.data.assignment._id;
      logTest(12, 'Assign teacher to subject/class', res.data.success, `Assignment ID: ${createdAssignmentId}`);
    } catch (err) {
      logTest(12, 'Assign teacher to subject/class', false, err.response?.data?.message || err.message);
    }

    // 13. Prevent duplicate teacher assignment
    try {
      await axios.post(
        `${API_BASE}/teacher-subject-assignments`,
        {
          academicYearId: createdAcademicYearId,
          teacherId: createdTeacherProfileId,
          subjectId: createdSubjectId,
          classId: createdClassId,
          sectionId: createdSectionId
        },
        { headers: { Authorization: `Bearer ${instAdminAToken}` } }
      );
      logTest(13, 'Prevent duplicate teacher assignment', false, 'Should have failed with HTTP 400');
    } catch (err) {
      const blocked = err.response?.status === 400;
      logTest(13, 'Prevent duplicate teacher assignment', blocked, err.response?.data?.message);
    }

    // 14. Enroll student
    try {
      const res = await axios.post(
        `${API_BASE}/student-enrollments`,
        {
          academicYearId: createdAcademicYearId,
          studentId: createdStudentProfileId,
          classId: createdClassId,
          sectionId: createdSectionId,
          rollNumber: '101',
          enrollmentStatus: 'active'
        },
        { headers: { Authorization: `Bearer ${instAdminAToken}` } }
      );
      createdEnrollmentId = res.data.data.enrollment._id;
      logTest(14, 'Enroll student', res.data.success, `Enrollment ID: ${createdEnrollmentId}`);
    } catch (err) {
      logTest(14, 'Enroll student', false, err.response?.data?.message || err.message);
    }

    // 15. Prevent duplicate active enrollment
    try {
      await axios.post(
        `${API_BASE}/student-enrollments`,
        {
          academicYearId: createdAcademicYearId,
          studentId: createdStudentProfileId,
          classId: createdClassId,
          sectionId: createdSectionId,
          rollNumber: '102',
          enrollmentStatus: 'active'
        },
        { headers: { Authorization: `Bearer ${instAdminAToken}` } }
      );
      logTest(15, 'Prevent duplicate active enrollment', false, 'Should have failed with HTTP 400');
    } catch (err) {
      const blocked = err.response?.status === 400;
      logTest(15, 'Prevent duplicate active enrollment', blocked, err.response?.data?.message);
    }

    // 16. Prevent cross-tenant academic access (Inst Admin B viewing Class A)
    try {
      await axios.get(`${API_BASE}/classes/${createdClassId}`, {
        headers: { Authorization: `Bearer ${instAdminBToken}` }
      });
      logTest(16, 'Prevent cross-tenant academic access', false, 'Should have failed with HTTP 403');
    } catch (err) {
      const blocked = err.response?.status === 403;
      logTest(16, 'Prevent cross-tenant academic access', blocked, err.response?.data?.message);
    }

    // 17. Teacher can view assigned academic data
    try {
      const res = await axios.get(`${API_BASE}/teacher-subject-assignments`, {
        headers: { Authorization: `Bearer ${teacherAToken}` }
      });
      const found = res.data.data.assignments.some(a => a._id === createdAssignmentId);
      logTest(17, 'Teacher can view assigned academic data', found, `Assignments retrieved: ${res.data.data.count}`);
    } catch (err) {
      logTest(17, 'Teacher can view assigned academic data', false, err.response?.data?.message || err.message);
    }

    // 18. Student can view own academic data
    try {
      const res = await axios.get(`${API_BASE}/student-enrollments`, {
        headers: { Authorization: `Bearer ${studentAToken}` }
      });
      const found = res.data.data.enrollments.some(e => e._id === createdEnrollmentId);
      logTest(18, 'Student can view own academic data', found, `Enrollments retrieved: ${res.data.data.count}`);
    } catch (err) {
      logTest(18, 'Student can view own academic data', false, err.response?.data?.message || err.message);
    }

    // 19. Parent can view linked child's academic data
    try {
      const res = await axios.get(`${API_BASE}/student-enrollments`, {
        headers: { Authorization: `Bearer ${parentAToken}` }
      });
      const found = res.data.data.enrollments.some(e => e._id === createdEnrollmentId);
      logTest(19, 'Parent can view linked child\'s academic data', found, `Linked child enrollments: ${res.data.data.count}`);
    } catch (err) {
      logTest(19, 'Parent can view linked child\'s academic data', false, err.response?.data?.message || err.message);
    }

    // 20. Parent cannot view unrelated student academic data
    try {
      // Create another student in Inst A unlinked
      const student2Res = await axios.post(
        `${API_BASE}/students`,
        {
          fullName: 'Unrelated Student',
          email: `unrelated_${timestamp}@edubridge.org`,
          password: 'Password123!',
          studentId: `UNR-${timestamp}`
        },
        { headers: { Authorization: `Bearer ${instAdminAToken}` } }
      );
      const student2ProfileId = student2Res.data.data.profile._id;

      await axios.get(`${API_BASE}/student-enrollments/student/${student2ProfileId}`, {
        headers: { Authorization: `Bearer ${parentAToken}` }
      });
      logTest(20, 'Parent cannot view unrelated student academic data', false, 'Should have failed with HTTP 403');
    } catch (err) {
      const blocked = err.response?.status === 403;
      logTest(20, 'Parent cannot view unrelated student academic data', blocked, err.response?.data?.message);
    }

    // 21. Institution Admin can manage academic structure
    try {
      const updateRes = await axios.patch(
        `${API_BASE}/classes/${createdClassId}`,
        { displayName: 'Grade 10 Updated' },
        { headers: { Authorization: `Bearer ${instAdminAToken}` } }
      );
      logTest(21, 'Institution Admin can manage academic structure', updateRes.data.success, 'Class updated successfully');
    } catch (err) {
      logTest(21, 'Institution Admin can manage academic structure', false, err.response?.data?.message || err.message);
    }

    // 22. Teacher cannot modify academic structure
    try {
      await axios.post(
        `${API_BASE}/classes`,
        { academicYearId: createdAcademicYearId, name: 'Hacked Class' },
        { headers: { Authorization: `Bearer ${teacherAToken}` } }
      );
      logTest(22, 'Teacher cannot modify academic structure', false, 'Should have failed with HTTP 403');
    } catch (err) {
      const blocked = err.response?.status === 403;
      logTest(22, 'Teacher cannot modify academic structure', blocked, err.response?.data?.message);
    }

    // 23. Student cannot modify academic structure
    try {
      await axios.post(
        `${API_BASE}/academic-years`,
        { name: 'Hacked Year', startDate: '2026-01-01', endDate: '2026-12-31' },
        { headers: { Authorization: `Bearer ${studentAToken}` } }
      );
      logTest(23, 'Student cannot modify academic structure', false, 'Should have failed with HTTP 403');
    } catch (err) {
      const blocked = err.response?.status === 403;
      logTest(23, 'Student cannot modify academic structure', blocked, err.response?.data?.message);
    }

    // 24. Parent cannot modify academic structure
    try {
      await axios.post(
        `${API_BASE}/subjects`,
        { academicYearId: createdAcademicYearId, name: 'Hacked Subject', subjectCode: 'HACK101' },
        { headers: { Authorization: `Bearer ${parentAToken}` } }
      );
      logTest(24, 'Parent cannot modify academic structure', false, 'Should have failed with HTTP 403');
    } catch (err) {
      const blocked = err.response?.status === 403;
      logTest(24, 'Parent cannot modify academic structure', blocked, err.response?.data?.message);
    }

    // 25. Audit logs generated
    try {
      const summaryRes = await axios.get(`${API_BASE}/academic/summary`, {
        headers: { Authorization: `Bearer ${instAdminAToken}` }
      });
      const hasAudits = summaryRes.data.data.summary.recentAcademicChanges.length > 0;
      logTest(25, 'Audit logs generated', hasAudits, `Recent audit entries: ${summaryRes.data.data.summary.recentAcademicChanges.length}`);
    } catch (err) {
      logTest(25, 'Audit logs generated', false, err.response?.data?.message || err.message);
    }

    // ----------------------------------------------------------------
    // Regression Tests (Phases 2, 3, 4, 5)
    // ----------------------------------------------------------------

    // 26. Phase 2 authentication regression
    try {
      const meRes = await axios.get(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${instAdminAToken}` }
      });
      logTest(26, 'Phase 2 authentication regression', meRes.data.success, `Auth me: ${meRes.data.data.user.email}`);
    } catch (err) {
      logTest(26, 'Phase 2 authentication regression', false, err.response?.data?.message || err.message);
    }

    // 27. Phase 3 institution regression
    try {
      const myInstRes = await axios.get(`${API_BASE}/institutions/my-institution`, {
        headers: { Authorization: `Bearer ${instAdminAToken}` }
      });
      logTest(27, 'Phase 3 institution regression', myInstRes.data.success, `Inst: ${myInstRes.data.data.institution.institutionName}`);
    } catch (err) {
      logTest(27, 'Phase 3 institution regression', false, err.response?.data?.message || err.message);
    }

    // 28. Phase 4 user management regression
    try {
      const usersRes = await axios.get(`${API_BASE}/users?limit=5`, {
        headers: { Authorization: `Bearer ${instAdminAToken}` }
      });
      logTest(28, 'Phase 4 user management regression', usersRes.data.success && usersRes.data.data.count > 0, `Users count: ${usersRes.data.data.count}`);
    } catch (err) {
      logTest(28, 'Phase 4 user management regression', false, err.response?.data?.message || err.message);
    }

    // 29. Phase 5 notification regression
    try {
      const notifRes = await axios.get(`${API_BASE}/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${studentAToken}` }
      });
      logTest(29, 'Phase 5 notification regression', notifRes.data.success, `Unread count endpoint responsive`);
    } catch (err) {
      logTest(29, 'Phase 5 notification regression', false, err.response?.data?.message || err.message);
    }

    console.log('\n================================================================');
    console.log('  Phase 6 Academic Management Test Suite Complete');
    console.log('================================================================\n');

  } catch (globalErr) {
    console.error('Fatal Test Suite Error:', globalErr.message);
  }
};

runPhase6Tests();
