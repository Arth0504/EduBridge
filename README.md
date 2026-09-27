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

## 📢 Phase 7: Attendance, Daily Academic Operations & Historical Data Management

EduBridge Phase 7 introduces a multi-tenant attendance and historical academic operations module with query-level section + subject isolation, academic-year scoping, bulk attendance submission, parent/student self-service attendance stats, and audit logging.

### 🔑 Key Features
- **Historical Academic Preservation**: Academic data is strictly year-scoped. Historical attendance records remain immutable even if teacher assignments, subjects, or student class enrollments change in subsequent years.
- **Strict Section & Subject Isolation**: Backend query-level tenant and assignment scope enforcement prevents unauthorized cross-section or cross-subject leaks (returning HTTP 403 Forbidden).
- **Daily & Bulk Attendance Workflow**: Interactive single and bulk attendance marking (`present`, `absent`, `late`, `leave`) with full student roster validation before saving.
- **Role-Based Attendance Access**:
  - **Super Admin**: System-wide governance across institutions.
  - **Institution Admin**: Institution-wide attendance management, summary analytics, and audit tracking.
  - **Teacher**: Restricted strictly to authorized class/section/subject assignments for the specific academic year.
  - **Student**: View only their own attendance history and attendance percentage metrics.
  - **Parent**: View attendance exclusively for explicitly linked children via `ParentChildLink`.
- **Web Dashboard (`AttendanceManagementPage.jsx`)**: Clean neutral EduBridge interface featuring academic year/class/section/subject selectors, student roster sheet with quick action controls, live metrics, and date-range report exports.
- **Mobile Integration (`AttendanceScreen.jsx`)**: Expo mobile screens for Teachers (class marking), Students/Parents (summary metrics & history logs), and Admins with zero startup permission popups.
- **Audit Logging**: Comprehensive logging for attendance creation, updates, bulk submissions, deletions, and unauthorized access attempts.

---

## 📡 Phase 7 API Endpoints

- `POST /api/v1/attendance` - Create / update single attendance record (Super Admin, Inst Admin, Teacher)
- `POST /api/v1/attendance/bulk` - Submit bulk attendance for class/section (Super Admin, Inst Admin, Teacher)
- `GET /api/v1/attendance` - Query attendance records with filters & pagination (All Roles with scope enforcement)
- `GET /api/v1/attendance/summary` - Aggregate attendance statistics & percentages
- `GET /api/v1/attendance/student/:studentId` - Retrieve student-specific attendance history & summary stats
- `GET /api/v1/attendance/class/:classId/section/:sectionId` - Retrieve class section attendance list
- `PATCH /api/v1/attendance/:id` - Update single attendance record by ID
- `DELETE /api/v1/attendance/:id` - Delete attendance record by ID

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
```
