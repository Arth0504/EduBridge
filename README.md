# EduBridge – Multi-Institution Education Management Platform

EduBridge is an enterprise-ready, multi-institution education governance and learning platform designed to connect administrators, educators, students, and parents across schools and colleges seamlessly.

---

## 🌟 Architecture & Tech Stack

- **Mobile App (`mobile/`)**: React Native with **Expo** (compatible with **Expo Go** on physical smartphones without Android Studio).
- **Web Admin Dashboard (`web/`)**: React.js with **Vite** & React Router for administration and role management.
- **Backend API (`backend/`)**: **Node.js** + **Express.js** RESTful API with **Mongoose** (MongoDB).
- **Database (`MongoDB`)**: Multi-institution tenant isolation scheme utilizing `institutionId`.
- **Authentication**: JWT (JSON Web Tokens) & `bcryptjs` password hashing.
- **Privacy & Permissions**: Zero startup permission prompts. On-demand permission checking with `AsyncStorage` caching and graceful fallback to device settings (`Linking.openSettings()`).

---

## 📋 Phase 10: Attendance Management Module

EduBridge Phase 10 introduces a complete, production-ready Attendance Management module supporting daily student attendance, teacher bulk-marking workflows, student & parent history visibility, correction controls with required audit reasons, monthly/date-range reports, attendance percentage calculations, and multi-tenant isolation.

### 🔑 Key Features
- **Daily & Subject Attendance**: Supports marking attendance by date for section students with statuses (`present`, `absent`, `late`, `half_day`, `excused`, `leave`). Prevents marking attendance for future dates.
- **Teacher Section Authorization**: Teachers can mark attendance ONLY for sections/classes assigned to them via `TeacherSubjectAssignment` or `Section.classTeacherId`. Unassigned section marking attempts are blocked with HTTP 403 Forbidden.
- **Bulk Marking Workflow**: Teachers load section student rosters, toggle individual statuses (defaulting to Present), and submit bulk attendance records in a single optimized payload.
- **Attendance Correction & Finalization**: Updating finalized attendance records requires `correctionReason` and records `updatedBy` alongside audit log entries (`ATTENDANCE_CORRECTED`).
- **Student & Parent Visibility**: Students have read-only access to their own attendance. Parents can view attendance histories and summary percentages strictly for linked children (`ParentChildLink`).
- **Percentage Calculations**: Calculates total working days, present/absent/late/half-day counts, and exact attendance percentages `(present + late + half_day*0.5 + excused) / totalWorkingDays * 100`.
- **Clean Light Web UI (`web/src/pages/AttendanceManagementPage.jsx`)**: Neutral education dashboard design with cards, rosters, filters, correction modals, and report exports.
- **Mobile Integration (`mobile/src/screens/AttendanceScreen.jsx`)**: Mobile screen for Teachers to mark section attendance on-the-go and Students/Parents to view attendance status and monthly summaries without startup permission prompts.

---

## 📡 Phase 10 API Endpoints

- `POST /api/v1/attendance` - Mark single or bulk attendance (Admin, Teacher)
- `POST /api/v1/attendance/bulk` - Bulk mark section attendance roster (Admin, Teacher)
- `GET /api/v1/attendance` - Query attendance records with date/class/status filters
- `GET /api/v1/attendance/student/:studentId` - Student attendance history (Role & Parent-Link scoped)
- `GET /api/v1/attendance/class/:classId` & `/class/:classId/section/:sectionId` - Class/section attendance
- `GET /api/v1/attendance/date/:date` - Daily attendance records for a specific date
- `PATCH /api/v1/attendance/:id` - Correct attendance record (requires `correctionReason`)
- `DELETE /api/v1/attendance/:id` - Soft delete attendance record (Admin)
- `GET /api/v1/attendance/summary/student/:studentId` - Student attendance percentage & counts summary
- `GET /api/v1/attendance/summary/class/:classId` - Class-level attendance summary
- `GET /api/v1/attendance/reports` - Date-range / monthly attendance report

---

## 🧪 Running Automated Test Suites

Execute all phase test suites in `backend/`:

```bash
cd backend
node scripts/seedSuperAdmin.js
node scripts/testAuth.js
node scripts/testPhase3Institutions.js
node scripts/testPhase4Users.js
node scripts/testPhase5Notifications.js
node scripts/testPhase6Academic.js
node scripts/testPhase7Attendance.js
node scripts/testPhase8Fees.js
node scripts/testPhase9Finance.js
node scripts/testPhase10Attendance.js
```
