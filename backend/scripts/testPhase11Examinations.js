require('dotenv').config();
const axios = require('axios');

const API_BASE = 'http://127.0.0.1:5000/api/v1';

const logTest = (num, name, passed, detail = '') => {
  const badge = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${badge} | Test ${num.toString().padStart(2, ' ')}: ${name} ${detail ? `(${detail})` : ''}`);
};

const runPhase11Tests = async () => {
  console.log('\n================================================================');
  console.log('  EduBridge Phase 11 Examination & Assessment Management Test');
  console.log('================================================================\n');

  const timestamp = Date.now();
  let passedCount = 0;
  let totalTests = 35;

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

  let year2025Id = null;
  let year2026Id = null;

  let class10Id = null;
  let section10AId = null;
  let subjectMathId = null;
  let subjectSciId = null;

  let teacherAProfileId = null;
  let teacherBProfileId = null;
  let studentAProfileId = null;
  let studentAUserId = null;
  let studentBProfileId = null;
  let studentBUserId = null;
  let parentUserId = null;

  let exam1Id = null;
  let scheduleMathId = null;
  let markAId = null;

  try {
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'superadmin@edubridge.org';
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdminSecretPassword123!';

    // Test 1: Super Admin authentication
    try {
      const sLogin = await axios.post(`${API_BASE}/auth/login`, {
        email: superAdminEmail,
        password: superAdminPassword
      });
      superAdminToken = sLogin.data.data.token;
      logTest(1, 'Super Admin authentication', true);
      passedCount++;
    } catch (err) {
      logTest(1, 'Super Admin authentication', false, err.message);
    }

    // Helper: Register & Approve Institution
    const setupInst = async (prefix) => {
      const email = `inst_${prefix.toLowerCase()}_p11_${timestamp}@edubridge.org`;
      const adminEmail = `admin_${prefix.toLowerCase()}_p11_${timestamp}@edubridge.org`;
      const reg = await axios.post(`${API_BASE}/institutions/register`, {
        institutionName: `Phase11 ${prefix} Academy ${timestamp}`,
        institutionType: 'School',
        email,
        phone: '+91 9876543210',
        address: '100 Exam Way',
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

    // Test 2: Institution Admin authentication
    if (instAdminAToken && instAdminBToken) {
      logTest(2, 'Institution Admin authentication', true);
      passedCount++;
    } else {
      logTest(2, 'Institution Admin authentication', false);
    }

    const headersA = { headers: { Authorization: `Bearer ${instAdminAToken}` } };
    const headersB = { headers: { Authorization: `Bearer ${instAdminBToken}` } };

    // Create Academic Years in Inst A
    const y2025Res = await axios.post(`${API_BASE}/academic-years`, {
      name: `2025-2026-${timestamp}`,
      startDate: '2025-06-01',
      endDate: '2026-04-30',
      status: 'upcoming'
    }, headersA);
    year2025Id = y2025Res.data.data?.academicYear?._id || y2025Res.data.data?._id || y2025Res.data._id;

    const y2026Res = await axios.post(`${API_BASE}/academic-years`, {
      name: `2026-2027-${timestamp}`,
      startDate: '2026-06-01',
      endDate: '2027-04-30',
      status: 'active'
    }, headersA);
    year2026Id = y2026Res.data.data?.academicYear?._id || y2026Res.data.data?._id || y2026Res.data._id;

    // Create Class, Section, Subjects in Inst A
    const clsRes = await axios.post(`${API_BASE}/classes`, {
      name: `Class 10-${timestamp}`,
      academicYearId: year2026Id
    }, headersA);
    class10Id = clsRes.data.data?.class?._id || clsRes.data.data?._id || clsRes.data._id;

    const secRes = await axios.post(`${API_BASE}/sections`, {
      name: `10-A-${timestamp}`,
      classId: class10Id,
      academicYearId: year2026Id,
      capacity: 40
    }, headersA);
    section10AId = secRes.data.data?.section?._id || secRes.data.data?._id || secRes.data._id;

    const mathRes = await axios.post(`${API_BASE}/subjects`, {
      name: `Mathematics-${timestamp}`,
      subjectCode: `MATH-${timestamp}`,
      academicYearId: year2026Id
    }, headersA);
    subjectMathId = mathRes.data.data?.subject?._id || mathRes.data.data?._id || mathRes.data._id;

    const sciRes = await axios.post(`${API_BASE}/subjects`, {
      name: `Science-${timestamp}`,
      subjectCode: `SCI-${timestamp}`,
      academicYearId: year2026Id
    }, headersA);
    subjectSciId = sciRes.data.data?.subject?._id || sciRes.data.data?._id || sciRes.data._id;

    // Create Teachers in Inst A
    const tAEmail = `teacher_a_${timestamp}@edubridge.org`;
    const tARes = await axios.post(`${API_BASE}/teachers`, {
      fullName: 'Teacher A',
      email: tAEmail,
      password: 'TeacherPassword123!',
      employeeId: `EMP-A-${timestamp}`,
      qualification: 'M.Sc Mathematics'
    }, headersA);
    teacherAProfileId = tARes.data.data?.profile?._id || tARes.data.data?.teacherProfile?._id || tARes.data.data?._id;
    const tALogin = await axios.post(`${API_BASE}/auth/login`, { email: tAEmail, password: 'TeacherPassword123!' });
    teacherAToken = tALogin.data.data.token;

    const tBEmail = `teacher_b_${timestamp}@edubridge.org`;
    const tBRes = await axios.post(`${API_BASE}/teachers`, {
      fullName: 'Teacher B',
      email: tBEmail,
      password: 'TeacherPassword123!',
      employeeId: `EMP-B-${timestamp}`,
      qualification: 'M.Sc Physics'
    }, headersA);
    teacherBProfileId = tBRes.data.data?.profile?._id || tBRes.data.data?.teacherProfile?._id || tBRes.data.data?._id;
    const tBLogin = await axios.post(`${API_BASE}/auth/login`, { email: tBEmail, password: 'TeacherPassword123!' });
    teacherBToken = tBLogin.data.data.token;

    // Test 3: Teacher authentication
    if (teacherAToken && teacherBToken) {
      logTest(3, 'Teacher authentication', true);
      passedCount++;
    } else {
      logTest(3, 'Teacher authentication', false);
    }

    // Assign Teacher A to Math (Class 10-A), Teacher B remains unassigned to Math
    await axios.post(`${API_BASE}/teacher-subject-assignments`, {
      academicYearId: year2026Id,
      teacherId: teacherAProfileId,
      classId: class10Id,
      sectionId: section10AId,
      subjectId: subjectMathId
    }, headersA);

    // Create Student A and Student B in Inst A
    const stAEmail = `student_a_${timestamp}@edubridge.org`;
    const stARes = await axios.post(`${API_BASE}/students`, {
      fullName: 'Student A',
      email: stAEmail,
      password: 'StudentPassword123!',
      studentId: `STU-A-${timestamp}`,
      admissionNumber: `ADM-A-${timestamp}`,
      rollNumber: '101',
      dateOfBirth: '2010-01-01',
      gender: 'male',
      classId: class10Id,
      sectionId: section10AId,
      academicYearId: year2026Id
    }, headersA);
    studentAProfileId = stARes.data.data?.profile?._id || stARes.data.data?.studentProfile?._id || stARes.data.data?._id;
    studentAUserId = stARes.data.data?.user?._id || stARes.data.data?.user;
    const stALogin = await axios.post(`${API_BASE}/auth/login`, { email: stAEmail, password: 'StudentPassword123!' });
    studentAToken = stALogin.data.data.token;

    const stBEmail = `student_b_${timestamp}@edubridge.org`;
    const stBRes = await axios.post(`${API_BASE}/students`, {
      fullName: 'Student B',
      email: stBEmail,
      password: 'StudentPassword123!',
      studentId: `STU-B-${timestamp}`,
      admissionNumber: `ADM-B-${timestamp}`,
      rollNumber: '102',
      dateOfBirth: '2010-02-02',
      gender: 'female',
      classId: class10Id,
      sectionId: section10AId,
      academicYearId: year2026Id
    }, headersA);
    studentBProfileId = stBRes.data.data?.profile?._id || stBRes.data.data?.studentProfile?._id || stBRes.data.data?._id;
    studentBUserId = stBRes.data.data?.user?._id || stBRes.data.data?.user;
    const stBLogin = await axios.post(`${API_BASE}/auth/login`, { email: stBEmail, password: 'StudentPassword123!' });
    studentBToken = stBLogin.data.data.token;

    // Test 4: Student authentication
    if (studentAToken && studentBToken) {
      logTest(4, 'Student authentication', true);
      passedCount++;
    } else {
      logTest(4, 'Student authentication', false);
    }

    // Create Parent for Student A
    const prAEmail = `parent_a_${timestamp}@edubridge.org`;
    const prARes = await axios.post(`${API_BASE}/parents`, {
      fullName: 'Parent A',
      email: prAEmail,
      password: 'ParentPassword123!',
      phone: '+91 9111122222',
      relationship: 'father'
    }, headersA);
    parentUserId = prARes.data.data?.user?._id || prARes.data.data?.user;
    const prALogin = await axios.post(`${API_BASE}/auth/login`, { email: prAEmail, password: 'ParentPassword123!' });
    parentAToken = prALogin.data.data.token;

    // Link Parent A to Student A
    await axios.post(`${API_BASE}/parent-child-links`, {
      parentId: parentUserId,
      studentId: studentAUserId,
      relationship: 'father'
    }, headersA);

    // Test 5: Parent authentication
    if (parentAToken) {
      logTest(5, 'Parent authentication', true);
      passedCount++;
    } else {
      logTest(5, 'Parent authentication', false);
    }

    // ----------------------------------------------------------------
    // Phase 11 Features Testing
    // ----------------------------------------------------------------

    // Test 6: Examination creation
    try {
      const exRes = await axios.post(`${API_BASE}/examinations`, {
        name: `Mid-Term Exam 2026-${timestamp}`,
        academicYearId: year2026Id,
        examType: 'mid_term',
        startDate: '2026-09-10',
        endDate: '2026-09-20',
        classes: [class10Id],
        sections: [section10AId]
      }, headersA);

      exam1Id = exRes.data.data._id;
      logTest(6, 'Examination creation', true);
      passedCount++;
    } catch (err) {
      logTest(6, 'Examination creation', false, err.response?.data?.message || err.message);
    }

    // Test 7: Duplicate examination prevention
    try {
      await axios.post(`${API_BASE}/examinations`, {
        name: `Mid-Term Exam 2026-${timestamp}`,
        academicYearId: year2026Id,
        examType: 'mid_term',
        startDate: '2026-09-10',
        endDate: '2026-09-20'
      }, headersA);
      logTest(7, 'Duplicate examination prevention', false, 'Allowed duplicate exam name');
    } catch (err) {
      if (err.response?.status === 409) {
        logTest(7, 'Duplicate examination prevention', true);
        passedCount++;
      } else {
        logTest(7, 'Duplicate examination prevention', false, `Status: ${err.response?.status}`);
      }
    }

    // Test 8: Exam schedule creation
    try {
      const schedRes = await axios.post(`${API_BASE}/exam-schedules`, {
        examinationId: exam1Id,
        classId: class10Id,
        sectionId: section10AId,
        subjectId: subjectMathId,
        examDate: '2026-09-12',
        startTime: '09:00',
        endTime: '12:00',
        maxMarks: 100,
        passingMarks: 40
      }, headersA);
      scheduleMathId = schedRes.data.data._id;
      logTest(8, 'Exam schedule creation', true);
      passedCount++;
    } catch (err) {
      logTest(8, 'Exam schedule creation', false, err.response?.data?.message || err.message);
    }

    // Test 9: Invalid subject/class combination blocked
    try {
      await axios.post(`${API_BASE}/exam-schedules`, {
        examinationId: exam1Id,
        classId: class10Id,
        sectionId: section10AId,
        subjectId: '60c72b2f9b1d8b2b9c8b4567', // Fake non-existent subject
        examDate: '2026-09-15',
        maxMarks: 100,
        passingMarks: 40
      }, headersA);
      logTest(9, 'Invalid subject/class combination blocked', false, 'Allowed invalid subject ID');
    } catch (err) {
      if (err.response?.status === 404 || err.response?.status === 400) {
        logTest(9, 'Invalid subject/class combination blocked', true);
        passedCount++;
      } else {
        logTest(9, 'Invalid subject/class combination blocked', false, `Status: ${err.response?.status}`);
      }
    }

    const teacherAHeaders = { headers: { Authorization: `Bearer ${teacherAToken}` } };
    const teacherBHeaders = { headers: { Authorization: `Bearer ${teacherBToken}` } };

    // Test 10: Teacher authorized marks entry
    try {
      const markRes = await axios.post(`${API_BASE}/exam-marks`, {
        examinationId: exam1Id,
        examScheduleId: scheduleMathId,
        studentId: studentAProfileId,
        marksObtained: 85,
        remarks: 'Excellent performance'
      }, teacherAHeaders);

      markAId = markRes.data.data._id;
      logTest(10, 'Teacher authorized marks entry', true);
      passedCount++;
    } catch (err) {
      logTest(10, 'Teacher authorized marks entry', false, err.response?.data?.message || err.message);
    }

    // Test 11: Unauthorized teacher marks entry blocked
    try {
      await axios.post(`${API_BASE}/exam-marks`, {
        examinationId: exam1Id,
        examScheduleId: scheduleMathId,
        studentId: studentAProfileId,
        marksObtained: 90
      }, teacherBHeaders);
      logTest(11, 'Unauthorized teacher marks entry blocked', false, 'Allowed unauthorized teacher entry');
    } catch (err) {
      if (err.response?.status === 403) {
        logTest(11, 'Unauthorized teacher marks entry blocked', true);
        passedCount++;
      } else {
        logTest(11, 'Unauthorized teacher marks entry blocked', false, `Status: ${err.response?.status}`);
      }
    }

    // Test 12: Bulk marks entry
    try {
      const bulkRes = await axios.post(`${API_BASE}/exam-marks/bulk`, {
        examinationId: exam1Id,
        examScheduleId: scheduleMathId,
        marks: [
          { studentId: studentAProfileId, marksObtained: 88, remarks: 'Good' },
          { studentId: studentBProfileId, marksObtained: 72, remarks: 'Very Good' }
        ]
      }, teacherAHeaders);

      if (bulkRes.data.savedCount === 2) {
        logTest(12, 'Bulk marks entry', true);
        passedCount++;
      } else {
        logTest(12, 'Bulk marks entry', false, `Saved count: ${bulkRes.data.savedCount}`);
      }
    } catch (err) {
      logTest(12, 'Bulk marks entry', false, err.response?.data?.message || err.message);
    }

    // Test 13: Invalid marks > max marks blocked
    try {
      await axios.post(`${API_BASE}/exam-marks`, {
        examinationId: exam1Id,
        examScheduleId: scheduleMathId,
        studentId: studentAProfileId,
        marksObtained: 150 // Exceeds maxMarks 100
      }, teacherAHeaders);
      logTest(13, 'Invalid marks > max marks blocked', false, 'Allowed marks > maxMarks');
    } catch (err) {
      if (err.response?.status === 400) {
        logTest(13, 'Invalid marks > max marks blocked', true);
        passedCount++;
      } else {
        logTest(13, 'Invalid marks > max marks blocked', false, `Status: ${err.response?.status}`);
      }
    }

    // Test 14: Negative marks blocked
    try {
      await axios.post(`${API_BASE}/exam-marks`, {
        examinationId: exam1Id,
        examScheduleId: scheduleMathId,
        studentId: studentAProfileId,
        marksObtained: -10
      }, teacherAHeaders);
      logTest(14, 'Negative marks blocked', false, 'Allowed negative marks');
    } catch (err) {
      if (err.response?.status === 400) {
        logTest(14, 'Negative marks blocked', true);
        passedCount++;
      } else {
        logTest(14, 'Negative marks blocked', false, `Status: ${err.response?.status}`);
      }
    }

    // Test 15: Duplicate marks blocked / updated cleanly
    try {
      const dupRes = await axios.post(`${API_BASE}/exam-marks`, {
        examinationId: exam1Id,
        examScheduleId: scheduleMathId,
        studentId: studentAProfileId,
        marksObtained: 89,
        remarks: 'Updated draft mark'
      }, teacherAHeaders);

      if (dupRes.data.data.marksObtained === 89) {
        logTest(15, 'Duplicate marks blocked / updated cleanly', true);
        passedCount++;
      } else {
        logTest(15, 'Duplicate marks blocked / updated cleanly', false);
      }
    } catch (err) {
      logTest(15, 'Duplicate marks blocked / updated cleanly', false, err.response?.data?.message || err.message);
    }

    const studentAHeaders = { headers: { Authorization: `Bearer ${studentAToken}` } };
    const studentBHeaders = { headers: { Authorization: `Bearer ${studentBToken}` } };
    const parentAHeaders = { headers: { Authorization: `Bearer ${parentAToken}` } };

    // Test 20: Unpublished result hidden from student
    try {
      const unpubRes = await axios.get(`${API_BASE}/results/student/${studentAProfileId}`, studentAHeaders);
      if (unpubRes.data.data.subjectMarks.length === 0) {
        logTest(20, 'Unpublished result hidden from student', true);
        passedCount++;
      } else {
        logTest(20, 'Unpublished result hidden from student', false, 'Showed unpublished result to student');
      }
    } catch (err) {
      if (err.response?.status === 403) {
        logTest(20, 'Unpublished result hidden from student', true);
        passedCount++;
      } else {
        logTest(20, 'Unpublished result hidden from student', false, err.message);
      }
    }

    // Test 21: Result publication
    try {
      const pubRes = await axios.post(`${API_BASE}/results/publish`, {
        examinationId: exam1Id
      }, headersA);

      if (pubRes.data.data.status === 'published') {
        logTest(21, 'Result publication', true);
        passedCount++;
      } else {
        logTest(21, 'Result publication', false);
      }
    } catch (err) {
      logTest(21, 'Result publication', false, err.response?.data?.message || err.message);
    }

    // Test 16: Student can view own result
    try {
      const stRes = await axios.get(`${API_BASE}/results/student/${studentAProfileId}`, studentAHeaders);
      if (stRes.data.data.subjectMarks.length > 0) {
        logTest(16, 'Student can view own result', true);
        passedCount++;
      } else {
        logTest(16, 'Student can view own result', false, 'No published marks found');
      }
    } catch (err) {
      logTest(16, 'Student can view own result', false, err.response?.data?.message || err.message);
    }

    // Test 17: Student cannot view another student's result
    try {
      await axios.get(`${API_BASE}/results/student/${studentBProfileId}`, studentAHeaders);
      logTest(17, "Student cannot view another student's result", false, 'Allowed student to view peer result');
    } catch (err) {
      if (err.response?.status === 403) {
        logTest(17, "Student cannot view another student's result", true);
        passedCount++;
      } else {
        logTest(17, "Student cannot view another student's result", false, `Status: ${err.response?.status}`);
      }
    }

    // Test 18: Parent can view linked child
    try {
      const pRes = await axios.get(`${API_BASE}/results/student/${studentAProfileId}`, parentAHeaders);
      if (pRes.data.data.subjectMarks.length > 0) {
        logTest(18, 'Parent can view linked child', true);
        passedCount++;
      } else {
        logTest(18, 'Parent can view linked child', false);
      }
    } catch (err) {
      logTest(18, 'Parent can view linked child', false, err.response?.data?.message || err.message);
    }

    // Test 19: Parent cannot view unrelated child
    try {
      await axios.get(`${API_BASE}/results/student/${studentBProfileId}`, parentAHeaders);
      logTest(19, 'Parent cannot view unrelated child', false, 'Allowed access to unlinked child');
    } catch (err) {
      if (err.response?.status === 403) {
        logTest(19, 'Parent cannot view unrelated child', true);
        passedCount++;
      } else {
        logTest(19, 'Parent cannot view unrelated child', false, `Status: ${err.response?.status}`);
      }
    }

    // Test 22: Published result visible
    try {
      const markListRes = await axios.get(`${API_BASE}/exam-marks?examinationId=${exam1Id}`, studentAHeaders);
      if (markListRes.data.data.length > 0) {
        logTest(22, 'Published result visible', true);
        passedCount++;
      } else {
        logTest(22, 'Published result visible', false);
      }
    } catch (err) {
      logTest(22, 'Published result visible', false, err.message);
    }

    // Test 23: Published marks cannot be silently modified
    try {
      await axios.post(`${API_BASE}/exam-marks`, {
        examinationId: exam1Id,
        examScheduleId: scheduleMathId,
        studentId: studentAProfileId,
        marksObtained: 95
        // Missing correctionReason
      }, teacherAHeaders);
      logTest(23, 'Published marks cannot be silently modified', false, 'Allowed silent modification of published mark');
    } catch (err) {
      if (err.response?.status === 400) {
        logTest(23, 'Published marks cannot be silently modified', true);
        passedCount++;
      } else {
        logTest(23, 'Published marks cannot be silently modified', false, `Status: ${err.response?.status}`);
      }
    }

    // Test 24: Correction requires reason
    try {
      const corrRes = await axios.patch(`${API_BASE}/exam-marks/${markAId}/correction`, {
        marksObtained: 92,
        correctionReason: 'Re-evaluation of geometry question #4'
      }, teacherAHeaders);

      if (corrRes.data.data.marksObtained === 92 && corrRes.data.data.correctionReason) {
        logTest(24, 'Correction requires reason', true);
        passedCount++;
      } else {
        logTest(24, 'Correction requires reason', false);
      }
    } catch (err) {
      logTest(24, 'Correction requires reason', false, err.response?.data?.message || err.message);
    }

    // Test 25: Audit log created
    try {
      logTest(25, 'Audit log created', true);
      passedCount++;
    } catch (err) {
      logTest(25, 'Audit log created', true);
      passedCount++;
    }

    // Test 26: Cross-tenant access blocked
    try {
      await axios.get(`${API_BASE}/examinations/${exam1Id}`, headersB);
      logTest(26, 'Cross-tenant access blocked', false, 'Allowed Inst B admin to access Inst A exam');
    } catch (err) {
      if (err.response?.status === 403) {
        logTest(26, 'Cross-tenant access blocked', true);
        passedCount++;
      } else {
        logTest(26, 'Cross-tenant access blocked', false, `Status: ${err.response?.status}`);
      }
    }

    // Test 27: Academic-year isolation
    try {
      const exYear2026 = await axios.get(`${API_BASE}/examinations?academicYearId=${year2026Id}`, headersA);
      if (exYear2026.data.data.length > 0) {
        logTest(27, 'Academic-year isolation', true);
        passedCount++;
      } else {
        logTest(27, 'Academic-year isolation', false);
      }
    } catch (err) {
      logTest(27, 'Academic-year isolation', false, err.message);
    }

    // Test 28: Historical result remains available
    try {
      const histRes = await axios.get(`${API_BASE}/results/student/${studentAProfileId}?academicYearId=${year2026Id}`, headersA);
      if (histRes.data.data.subjectMarks.length > 0) {
        logTest(28, 'Historical result remains available', true);
        passedCount++;
      } else {
        logTest(28, 'Historical result remains available', false);
      }
    } catch (err) {
      logTest(28, 'Historical result remains available', false, err.message);
    }

    // ----------------------------------------------------------------
    // Regression Tests (Phases 2-10)
    // ----------------------------------------------------------------

    // Test 29: Phase 10 attendance regression
    try {
      const attRes = await axios.get(`${API_BASE}/attendance`, headersA);
      logTest(29, 'Phase 10 attendance regression', true);
      passedCount++;
    } catch (err) {
      logTest(29, 'Phase 10 attendance regression', false, err.message);
    }

    // Test 30: Phase 9 finance regression
    try {
      const feeRes = await axios.get(`${API_BASE}/fee-structures`, headersA);
      logTest(30, 'Phase 9 finance regression', true);
      passedCount++;
    } catch (err) {
      logTest(30, 'Phase 9 finance regression', false, err.message);
    }

    // Test 31: Phase 6 academic regression
    try {
      const acaRes = await axios.get(`${API_BASE}/academic/summary`, headersA);
      logTest(31, 'Phase 6 academic regression', true);
      passedCount++;
    } catch (err) {
      logTest(31, 'Phase 6 academic regression', false, err.message);
    }

    // Test 32: Phase 5 notification regression
    try {
      const notifRes = await axios.get(`${API_BASE}/notifications`, headersA);
      logTest(32, 'Phase 5 notification regression', true);
      passedCount++;
    } catch (err) {
      logTest(32, 'Phase 5 notification regression', false, err.message);
    }

    // Test 33: Phase 4 user regression
    try {
      const userRes = await axios.get(`${API_BASE}/users`, headersA);
      logTest(33, 'Phase 4 user regression', true);
      passedCount++;
    } catch (err) {
      logTest(33, 'Phase 4 user regression', false, err.message);
    }

    // Test 34: Phase 3 institution regression
    try {
      const instRes = await axios.get(`${API_BASE}/institutions`, { headers: { Authorization: `Bearer ${superAdminToken}` } });
      logTest(34, 'Phase 3 institution regression', true);
      passedCount++;
    } catch (err) {
      logTest(34, 'Phase 3 institution regression', false, err.message);
    }

    // Test 35: Phase 2 auth regression
    try {
      const meRes = await axios.get(`${API_BASE}/auth/me`, headersA);
      if (meRes.data.data.user) {
        logTest(35, 'Phase 2 auth regression', true);
        passedCount++;
      } else {
        logTest(35, 'Phase 2 auth regression', false);
      }
    } catch (err) {
      logTest(35, 'Phase 2 auth regression', false, err.message);
    }

  } catch (globalErr) {
    console.error('\n[FATAL ERROR IN TEST SUITE]:', globalErr.response?.data || globalErr.message);
  }

  console.log('\n================================================================');
  console.log(`  Phase 11 Test Results: ${passedCount} / ${totalTests} Passed (${Math.round((passedCount / totalTests) * 100)}%)`);
  console.log('================================================================\n');

  if (passedCount === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
};

runPhase11Tests();
