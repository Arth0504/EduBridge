require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');
const dns = require('dns');

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (err) {}

const API_BASE = 'http://127.0.0.1:5000/api/v1';

const logTest = (num, name, passed, detail = '') => {
  const badge = passed ? ' PASS' : ' FAIL';
  console.log(`${badge} | Test ${num.toString().padStart(2, ' ')}: ${name} ${detail ? `(${detail})` : ''}`);
};

const runPhase11TimetableTests = async () => {
  console.log('\n================================================================');
  console.log('  EduBridge Phase 11 Timetable & Scheduling Management Test');
  console.log('================================================================\n');

  const timestamp = Date.now();
  let passedCount = 0;
  const totalTests = 25;

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
  let section10BId = null;

  let subjectMathId = null;
  let subjectSciId = null;

  let teacherAProfileId = null;
  let teacherAUserId = null;
  let teacherBProfileId = null;
  let teacherBUserId = null;

  let studentAProfileId = null;
  let studentAUserId = null;
  let studentBProfileId = null;
  let studentBUserId = null;

  let parentUserId = null;

  let roomId101 = null;
  let timeSlotP1 = null;
  let timeSlotP2 = null;

  let timetableEntry1Id = null;

  try {
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'superadmin@edubridge.org';
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdminSecretPassword123!';

    // 1. Super Admin authentication
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
      const email = `inst_${prefix.toLowerCase()}_p11tt_${timestamp}@edubridge.org`;
      const adminEmail = `admin_${prefix.toLowerCase()}_p11tt_${timestamp}@edubridge.org`;
      const reg = await axios.post(`${API_BASE}/institutions/register`, {
        institutionName: `Phase11 Timetable ${prefix} ${timestamp}`,
        institutionType: 'School',
        email,
        phone: '+91 9876543210',
        address: '100 Schedule St',
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

    // 2. Institution Admin authentication
    if (instAdminAToken && instAdminBToken) {
      logTest(2, 'Institution Admin authentication', true);
      passedCount++;
    } else {
      logTest(2, 'Institution Admin authentication', false);
    }

    const headersA = { headers: { Authorization: `Bearer ${instAdminAToken}` } };
    const headersB = { headers: { Authorization: `Bearer ${instAdminBToken}` } };

    // Setup Academic Years for Institution A (Historical 2025-26 & Current 2026-27)
    const ay2025 = await axios.post(
      `${API_BASE}/academic-years`,
      { name: `2025-2026-${timestamp}`, startDate: '2025-06-01', endDate: '2026-05-31', status: 'completed' },
      headersA
    );
    year2025Id = ay2025.data.data?.academicYear?._id || ay2025.data.academicYear?._id || ay2025.data.data?._id || ay2025.data._id;

    const ay2026 = await axios.post(
      `${API_BASE}/academic-years`,
      { name: `2026-2027-${timestamp}`, startDate: '2026-06-01', endDate: '2027-05-31', status: 'active' },
      headersA
    );
    year2026Id = ay2026.data.data?.academicYear?._id || ay2026.data.academicYear?._id || ay2026.data.data?._id || ay2026.data._id;

    // Setup Class & Sections
    const cls10 = await axios.post(`${API_BASE}/classes`, { name: `Class 10-${timestamp}`, code: 'C10', academicYearId: year2026Id }, headersA);
    class10Id = cls10.data.data?.class?._id || cls10.data.class?._id || cls10.data.data?._id || cls10.data._id;

    const sec10A = await axios.post(`${API_BASE}/sections`, { classId: class10Id, name: `Section A-${timestamp}`, code: '10A', academicYearId: year2026Id, capacity: 40 }, headersA);
    section10AId = sec10A.data.data?.section?._id || sec10A.data.section?._id || sec10A.data.data?._id || sec10A.data._id;

    const sec10B = await axios.post(`${API_BASE}/sections`, { classId: class10Id, name: `Section B-${timestamp}`, code: '10B', academicYearId: year2026Id, capacity: 40 }, headersA);
    section10BId = sec10B.data.data?.section?._id || sec10B.data.section?._id || sec10B.data.data?._id || sec10B.data._id;

    // Setup Subjects
    const subMath = await axios.post(`${API_BASE}/subjects`, { name: `Mathematics-${timestamp}`, subjectCode: `MATH-${timestamp}`, subjectType: 'core', credits: 4, academicYearId: year2026Id }, headersA);
    subjectMathId = subMath.data.data?.subject?._id || subMath.data.subject?._id || subMath.data.data?._id || subMath.data._id;


    const subSci = await axios.post(`${API_BASE}/subjects`, { name: `Science-${timestamp}`, subjectCode: `SCI-${timestamp}`, subjectType: 'practical', credits: 4, academicYearId: year2026Id }, headersA);
    subjectSciId = subSci.data.data?.subject?._id || subSci.data.subject?._id || subSci.data.data?._id || subSci.data._id;


    // Create Teachers in Inst A
    const tAEmail = `teacher_a_${timestamp}@edubridge.org`;
    const tARes = await axios.post(`${API_BASE}/teachers`, {
      fullName: 'Teacher Alpha',
      email: tAEmail,
      password: 'TeacherPassword123!',
      employeeId: `EMP-A-${timestamp}`,
      qualification: 'M.Sc Mathematics'
    }, headersA);
    teacherAProfileId = tARes.data.data?.profile?._id || tARes.data.data?.teacherProfile?._id || tARes.data.data?._id;
    teacherAUserId = tARes.data.data?.user?._id || tARes.data.data?.user;
    const tALogin = await axios.post(`${API_BASE}/auth/login`, { email: tAEmail, password: 'TeacherPassword123!' });
    teacherAToken = tALogin.data.data.token;

    const tBEmail = `teacher_b_${timestamp}@edubridge.org`;
    const tBRes = await axios.post(`${API_BASE}/teachers`, {
      fullName: 'Teacher Beta',
      email: tBEmail,
      password: 'TeacherPassword123!',
      employeeId: `EMP-B-${timestamp}`,
      qualification: 'M.Sc Science'
    }, headersA);
    teacherBProfileId = tBRes.data.data?.profile?._id || tBRes.data.data?.teacherProfile?._id || tBRes.data.data?._id;
    teacherBUserId = tBRes.data.data?.user?._id || tBRes.data.data?.user;
    const tBLogin = await axios.post(`${API_BASE}/auth/login`, { email: tBEmail, password: 'TeacherPassword123!' });
    teacherBToken = tBLogin.data.data.token;

    // Create Students in Inst A
    const stAEmail = `student_a_${timestamp}@edubridge.org`;
    const stARes = await axios.post(`${API_BASE}/students`, {
      fullName: 'Student Alice',
      email: stAEmail,
      password: 'StudentPassword123!',
      studentId: `STU-A-${timestamp}`,
      admissionNumber: `ADM-A-${timestamp}`,
      rollNumber: '101',
      dateOfBirth: '2010-01-01',
      gender: 'female',
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
      fullName: 'Student Bob',
      email: stBEmail,
      password: 'StudentPassword123!',
      studentId: `STU-B-${timestamp}`,
      admissionNumber: `ADM-B-${timestamp}`,
      rollNumber: '102',
      dateOfBirth: '2010-02-02',
      gender: 'male',
      classId: class10Id,
      sectionId: section10BId,
      academicYearId: year2026Id
    }, headersA);
    studentBProfileId = stBRes.data.data?.profile?._id || stBRes.data.data?.studentProfile?._id || stBRes.data.data?._id;
    studentBUserId = stBRes.data.data?.user?._id || stBRes.data.data?.user;
    const stBLogin = await axios.post(`${API_BASE}/auth/login`, { email: stBEmail, password: 'StudentPassword123!' });
    studentBToken = stBLogin.data.data.token;

    // Enroll Students
    await axios.post(`${API_BASE}/student-enrollments`, {
      academicYearId: year2026Id,
      studentId: studentAProfileId,
      classId: class10Id,
      sectionId: section10AId,
      rollNumber: '10A01'
    }, headersA);

    await axios.post(`${API_BASE}/student-enrollments`, {
      academicYearId: year2026Id,
      studentId: studentBProfileId,
      classId: class10Id,
      sectionId: section10BId,
      rollNumber: '10B01'
    }, headersA);

    // Create Parent and Link to Student Alice
    const prAEmail = `parent_a_${timestamp}@edubridge.org`;
    const prARes = await axios.post(`${API_BASE}/parents`, {
      fullName: 'Parent Persona',
      email: prAEmail,
      password: 'ParentPassword123!',
      phone: '+91 9111122222',
      relationship: 'father'
    }, headersA);
    parentUserId = prARes.data.data?.user?._id || prARes.data.data?.user;
    const prALogin = await axios.post(`${API_BASE}/auth/login`, { email: prAEmail, password: 'ParentPassword123!' });
    parentAToken = prALogin.data.data.token;

    await axios.post(`${API_BASE}/parent-child-links`, {
      parentId: parentUserId,
      studentId: studentAUserId,
      relationship: 'father'
    }, headersA);


    // Assign Teacher A -> 10-A Math & 10-B Science in 2026-27
    await axios.post(`${API_BASE}/teacher-subject-assignments`, {
      academicYearId: year2026Id,
      teacherId: teacherAProfileId,
      subjectId: subjectMathId,
      classId: class10Id,
      sectionId: section10AId
    }, headersA);

    await axios.post(`${API_BASE}/teacher-subject-assignments`, {
      academicYearId: year2026Id,
      teacherId: teacherAProfileId,
      subjectId: subjectSciId,
      classId: class10Id,
      sectionId: section10BId
    }, headersA);

    // 4. Create time slot
    try {
      const slotRes = await axios.post(`${API_BASE}/time-slots`, {
        academicYearId: year2026Id,
        periodNumber: 1,
        periodName: 'Period 1',
        startTime: '08:00',
        endTime: '08:45',
        type: 'lecture'
      }, headersA);

      timeSlotP1 = slotRes.data.data.timeSlot;

      await axios.post(`${API_BASE}/time-slots`, {
        academicYearId: year2026Id,
        periodNumber: 2,
        periodName: 'Period 2',
        startTime: '08:45',
        endTime: '09:30',
        type: 'lecture'
      }, headersA);

      logTest(4, 'Create time slot', true);
      passedCount++;
    } catch (err) {
      logTest(4, 'Create time slot', false, err.response?.data?.message || err.message);
    }

    // Create Room
    const roomRes = await axios.post(`${API_BASE}/rooms`, {
      roomNumber: '101',
      name: 'Classroom 101',
      roomType: 'classroom',
      capacity: 40
    }, headersA);
    roomId101 = roomRes.data.data.room._id;

    // 5. Valid teacher assignment in timetable
    try {
      const ttRes = await axios.post(`${API_BASE}/timetables`, {
        academicYearId: year2026Id,
        classId: class10Id,
        sectionId: section10AId,
        subjectId: subjectMathId,
        teacherId: teacherAProfileId,
        dayOfWeek: 'Monday',
        periodNumber: 1,
        startTime: '08:00',
        endTime: '08:45',
        roomId: roomId101,
        roomName: 'Classroom 101'
      }, headersA);

      timetableEntry1Id = ttRes.data.data.timetable._id;
      logTest(5, 'Valid teacher assignment', true);
      passedCount++;
    } catch (err) {
      logTest(5, 'Valid teacher assignment', false, err.response?.data?.message || err.message);
    }

    // 3. Create timetable test
    if (timetableEntry1Id) {
      logTest(3, 'Create timetable', true);
      passedCount++;
    } else {
      logTest(3, 'Create timetable', false);
    }

    // 6. Invalid teacher assignment rejected
    try {
      await axios.post(`${API_BASE}/timetables`, {
        academicYearId: year2026Id,
        classId: class10Id,
        sectionId: section10AId,
        subjectId: subjectMathId,
        teacherId: teacherBProfileId, // Teacher B has NO assignment for 10-A Math!
        dayOfWeek: 'Tuesday',
        periodNumber: 1,
        startTime: '08:00',
        endTime: '08:45'
      }, headersA);
      logTest(6, 'Invalid teacher assignment rejected', false, 'Allowed unauthorized teacher assignment');
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.message?.includes('Teacher Authorization Error')) {
        logTest(6, 'Invalid teacher assignment rejected', true);
        passedCount++;
      } else {
        logTest(6, 'Invalid teacher assignment rejected', false, err.response?.data?.message || err.message);
      }
    }

    // 7. Section conflict rejected
    try {
      await axios.post(`${API_BASE}/timetables`, {
        academicYearId: year2026Id,
        classId: class10Id,
        sectionId: section10AId, // 10-A already has Math on Monday Period 1!
        subjectId: subjectMathId,
        teacherId: teacherAProfileId,
        dayOfWeek: 'Monday',
        periodNumber: 1,
        startTime: '08:00',
        endTime: '08:45'
      }, headersA);
      logTest(7, 'Section conflict rejected', false, 'Allowed duplicate period for section');
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.message?.includes('Section Conflict')) {
        logTest(7, 'Section conflict rejected', true);
        passedCount++;
      } else {
        logTest(7, 'Section conflict rejected', false, err.response?.data?.message || err.message);
      }
    }

    // 8. Teacher conflict rejected
    try {
      await axios.post(`${API_BASE}/timetables`, {
        academicYearId: year2026Id,
        classId: class10Id,
        sectionId: section10BId, // 10-B Science on Monday Period 1 with Teacher A (who is already teaching 10-A Math!)
        subjectId: subjectSciId,
        teacherId: teacherAProfileId,
        dayOfWeek: 'Monday',
        periodNumber: 1,
        startTime: '08:00',
        endTime: '08:45'
      }, headersA);
      logTest(8, 'Teacher conflict rejected', false, 'Allowed double-booking teacher');
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.message?.includes('Teacher Conflict')) {
        logTest(8, 'Teacher conflict rejected', true);
        passedCount++;
      } else {
        logTest(8, 'Teacher conflict rejected', false, err.response?.data?.message || err.message);
      }
    }

    // 9. Room conflict rejected
    // Assign Teacher A to 10-B Science on Monday Period 2 in Room 101 first
    await axios.post(`${API_BASE}/timetables`, {
      academicYearId: year2026Id,
      classId: class10Id,
      sectionId: section10BId,
      subjectId: subjectSciId,
      teacherId: teacherAProfileId,
      dayOfWeek: 'Monday',
      periodNumber: 2,
      startTime: '08:45',
      endTime: '09:30',
      roomId: roomId101,
      roomName: 'Classroom 101'
    }, headersA);

    try {
      // Assign Teacher B to 10-A Math on Monday Period 2 in Room 101
      // First assign Teacher B to 10-A Math in TeacherSubjectAssignment
      await axios.post(`${API_BASE}/teacher-subject-assignments`, {
        academicYearId: year2026Id,
        teacherId: teacherBProfileId,
        subjectId: subjectMathId,
        classId: class10Id,
        sectionId: section10AId
      }, headersA);

      await axios.post(`${API_BASE}/timetables`, {
        academicYearId: year2026Id,
        classId: class10Id,
        sectionId: section10AId,
        subjectId: subjectMathId,
        teacherId: teacherBProfileId,
        dayOfWeek: 'Monday',
        periodNumber: 2,
        startTime: '08:45',
        endTime: '09:30',
        roomId: roomId101, // Room 101 is already taken by 10-B on Monday Period 2!
        roomName: 'Classroom 101'
      }, headersA);

      logTest(9, 'Room conflict rejected', false, 'Allowed double-booking room');
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.message?.includes('Room Conflict')) {
        logTest(9, 'Room conflict rejected', true);
        passedCount++;
      } else {
        logTest(9, 'Room conflict rejected', false, err.response?.data?.message || err.message);
      }
    }

    // 10. Student sees only own section timetable
    try {
      const headersStA = { headers: { Authorization: `Bearer ${studentAToken}` } };
      const stRes = await axios.get(`${API_BASE}/timetables`, headersStA);
      const list = stRes.data.data.timetables;
      const all10A = list.every((t) => (t.sectionId?._id || t.sectionId).toString() === section10AId.toString());

      if (list.length > 0 && all10A) {
        logTest(10, 'Student sees only own section timetable', true);
        passedCount++;
      } else {
        logTest(10, 'Student sees only own section timetable', false, 'Exposed other sections');
      }
    } catch (err) {
      logTest(10, 'Student sees only own section timetable', false, err.message);
    }

    // 11. Student cannot access another section
    try {
      const headersStA = { headers: { Authorization: `Bearer ${studentAToken}` } };
      await axios.get(`${API_BASE}/timetables/section/${section10BId}`, headersStA);
      logTest(11, 'Student cannot access another section', false, 'Allowed student to access section 10B');
    } catch (err) {
      if (err.response?.status === 403) {
        logTest(11, 'Student cannot access another section', true);
        passedCount++;
      } else {
        logTest(11, 'Student cannot access another section', false, err.message);
      }
    }

    // 12. Teacher sees only own timetable
    try {
      const headersTA = { headers: { Authorization: `Bearer ${teacherAToken}` } };
      const tRes = await axios.get(`${API_BASE}/timetables`, headersTA);
      const list = tRes.data.data.timetables;
      const allMine = list.every((t) => (t.teacherId?._id || t.teacherId).toString() === teacherAProfileId.toString());

      if (list.length > 0 && allMine) {
        logTest(12, 'Teacher sees only own timetable', true);
        passedCount++;
      } else {
        logTest(12, 'Teacher sees only own timetable', false, 'Exposed other teachers');
      }
    } catch (err) {
      logTest(12, 'Teacher sees only own timetable', false, err.message);
    }

    // 13. Parent sees only linked child's timetable
    try {
      const headersPrA = { headers: { Authorization: `Bearer ${parentAToken}` } };
      const prRes = await axios.get(`${API_BASE}/timetables/parent/${parentUserId}`, headersPrA);
      const childList = prRes.data.data.childTimetables;

      if (childList.length > 0 && childList[0].student?._id.toString() === studentAProfileId.toString()) {
        logTest(13, "Parent sees only linked child's timetable", true);
        passedCount++;
      } else {
        logTest(13, "Parent sees only linked child's timetable", false);
      }
    } catch (err) {
      logTest(13, "Parent sees only linked child's timetable", false, err.message);
    }

    // 14. Unlinked child access blocked
    try {
      const headersPrA = { headers: { Authorization: `Bearer ${parentAToken}` } };
      await axios.get(`${API_BASE}/timetables/student/${studentBProfileId}`, headersPrA);
      logTest(14, 'Unlinked child access blocked', false, 'Allowed parent to access unlinked student B');
    } catch (err) {
      if (err.response?.status === 403) {
        logTest(14, 'Unlinked child access blocked', true);
        passedCount++;
      } else {
        logTest(14, 'Unlinked child access blocked', false, err.message);
      }
    }

    // 15. Cross-tenant access blocked
    try {
      await axios.get(`${API_BASE}/timetables/${timetableEntry1Id}`, headersB);
      logTest(15, 'Cross-tenant access blocked', false, 'Institution B accessed Institution A timetable');
    } catch (err) {
      if (err.response?.status === 403) {
        logTest(15, 'Cross-tenant access blocked', true);
        passedCount++;
      } else {
        logTest(15, 'Cross-tenant access blocked', false, err.message);
      }
    }

    // 16. Institution Admin can manage own institution
    try {
      const patchRes = await axios.patch(
        `${API_BASE}/timetables/${timetableEntry1Id}`,
        { roomName: 'Renovated Room 101' },
        headersA
      );
      if (patchRes.status === 200) {
        logTest(16, 'Institution Admin can manage own institution', true);
        passedCount++;
      } else {
        logTest(16, 'Institution Admin can manage own institution', false);
      }
    } catch (err) {
      logTest(16, 'Institution Admin can manage own institution', false, err.message);
    }

    // 17. Teacher cannot modify timetable
    try {
      const headersTA = { headers: { Authorization: `Bearer ${teacherAToken}` } };
      await axios.post(`${API_BASE}/timetables`, {
        academicYearId: year2026Id,
        classId: class10Id,
        sectionId: section10AId,
        subjectId: subjectMathId,
        teacherId: teacherAProfileId,
        dayOfWeek: 'Tuesday',
        periodNumber: 3,
        startTime: '09:30',
        endTime: '10:15'
      }, headersTA);
      logTest(17, 'Teacher cannot modify timetable', false, 'Allowed teacher to create timetable entry');
    } catch (err) {
      if (err.response?.status === 403) {
        logTest(17, 'Teacher cannot modify timetable', true);
        passedCount++;
      } else {
        logTest(17, 'Teacher cannot modify timetable', false, err.message);
      }
    }

    // 18. Student cannot modify timetable
    try {
      const headersStA = { headers: { Authorization: `Bearer ${studentAToken}` } };
      await axios.delete(`${API_BASE}/timetables/${timetableEntry1Id}`, headersStA);
      logTest(18, 'Student cannot modify timetable', false, 'Allowed student to delete timetable entry');
    } catch (err) {
      if (err.response?.status === 403) {
        logTest(18, 'Student cannot modify timetable', true);
        passedCount++;
      } else {
        logTest(18, 'Student cannot modify timetable', false, err.message);
      }
    }

    // 19. Previous academic year data preserved
    // Create assignment in 2025-26 AY
    await axios.post(`${API_BASE}/teacher-subject-assignments`, {
      academicYearId: year2025Id,
      teacherId: teacherAProfileId,
      subjectId: subjectMathId,
      classId: class10Id,
      sectionId: section10AId
    }, headersA);

    const oldAYEntry = await axios.post(`${API_BASE}/timetables`, {
      academicYearId: year2025Id,
      classId: class10Id,
      sectionId: section10AId,
      subjectId: subjectMathId,
      teacherId: teacherAProfileId,
      dayOfWeek: 'Friday',
      periodNumber: 1,
      startTime: '08:00',
      endTime: '08:45'
    }, headersA);

    const oldEntryId = oldAYEntry.data.data.timetable._id;
    if (oldEntryId && timetableEntry1Id) {
      logTest(19, 'Previous academic year data preserved', true);
      passedCount++;
    } else {
      logTest(19, 'Previous academic year data preserved', false);
    }

    // 20. Current academic year filtering works
    try {
      const yearFilteredRes = await axios.get(`${API_BASE}/timetables?academicYearId=${year2026Id}`, headersA);
      const list = yearFilteredRes.data.data.timetables;
      const allCurrentYear = list.every((t) => (t.academicYearId?._id || t.academicYearId).toString() === year2026Id.toString());

      if (list.length > 0 && allCurrentYear) {
        logTest(20, 'Current academic year filtering works', true);
        passedCount++;
      } else {
        logTest(20, 'Current academic year filtering works', false);
      }
    } catch (err) {
      logTest(20, 'Current academic year filtering works', false, err.message);
    }

    // 21. Soft delete works
    try {
      await axios.delete(`${API_BASE}/timetables/${oldEntryId}`, headersA);
      const checkRes = await axios.get(`${API_BASE}/timetables?academicYearId=${year2025Id}`, headersA);
      const activeList = checkRes.data.data.timetables;
      const existsInActive = activeList.some((t) => t._id.toString() === oldEntryId.toString());

      if (!existsInActive) {
        logTest(21, 'Soft delete works', true);
        passedCount++;
      } else {
        logTest(21, 'Soft delete works', false, 'Deleted entry still returned in active list');
      }
    } catch (err) {
      logTest(21, 'Soft delete works', false, err.message);
    }

    // 22. Audit log created
    try {
      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/edubridge', {
          dbName: 'EduBridge',
          serverSelectionTimeoutMS: 5000
        });
      }
      const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', new mongoose.Schema({}, { strict: false }));
      const logs = await AuditLog.find({ action: { $in: ['TIMETABLE_CREATED', 'TIME_SLOT_CREATED', 'ROOM_CREATED'] } });

      if (logs.length >= 3) {
        logTest(22, 'Audit log created', true);
        passedCount++;
      } else {
        logTest(22, 'Audit log created', false, `Found only ${logs.length} audit logs`);
      }
    } catch (err) {
      logTest(22, 'Audit log created', false, err.message);
    }

    // 23. Phase 10 regression test (Examinations / Marks)
    try {
      const exRes = await axios.get(`${API_BASE}/examinations`, headersA);
      if (exRes.status === 200) {
        logTest(23, 'Phase 10 regression test', true);
        passedCount++;
      } else {
        logTest(23, 'Phase 10 regression test', false);
      }
    } catch (err) {
      logTest(23, 'Phase 10 regression test', false, err.message);
    }

    // 24. Phase 9 regression test (Finance / Fees)
    try {
      const feeRes = await axios.get(`${API_BASE}/fee-structures`, headersA);
      if (feeRes.status === 200) {
        logTest(24, 'Phase 9 regression test', true);
        passedCount++;
      } else {
        logTest(24, 'Phase 9 regression test', false);
      }
    } catch (err) {
      logTest(24, 'Phase 9 regression test', false, err.message);
    }

    // 25. Phase 6 regression test (Academic Management)
    try {
      const acRes = await axios.get(`${API_BASE}/classes`, headersA);
      if (acRes.status === 200) {
        logTest(25, 'Phase 6 regression test', true);
        passedCount++;
      } else {
        logTest(25, 'Phase 6 regression test', false);
      }
    } catch (err) {
      logTest(25, 'Phase 6 regression test', false, err.message);
    }

    console.log('\n================================================================');
    console.log(`  Test Execution Summary: ${passedCount} / ${totalTests} PASSED (${Math.round((passedCount / totalTests) * 100)}%)`);
    console.log('================================================================\n');

    if (passedCount === totalTests) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (globalErr) {
    console.error('Global Error in test script:', globalErr.message);
    if (globalErr.response?.data) {
      console.error('Response Data:', JSON.stringify(globalErr.response.data, null, 2));
    }
    console.error(globalErr.stack);
    process.exit(1);
  }
};

runPhase11TimetableTests();

