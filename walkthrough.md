# EduBridge Phase 10 — Attendance Management Walkthrough

This document outlines the architecture, database models, API endpoints, role & security rules, bulk marking workflow, correction controls, reporting, web/mobile integrations, and test verification results for Phase 10 Attendance Management.

---

## 🏗️ 1. Architecture & Design Principles

1. **Multi-Tenant & Academic-Year Isolation**: Every `Attendance` record contains `institutionId`, `academicYearId`, `classId`, `sectionId`, and `studentId`. Cross-tenant queries are blocked.
2. **Teacher Authorization Enforcement**: Teachers can mark attendance ONLY for sections assigned to them via `TeacherSubjectAssignment` or `Section.classTeacherId`. Attempts to mark attendance for unauthorized sections return HTTP 403.
3. **Correction Control & Audit Trail**: Finalized attendance records cannot be modified silently. Any `PATCH` request requires `correctionReason` and logs an `ATTENDANCE_CORRECTED` audit event.
4. **Duplicate Prevention**: Compound index `{ institutionId: 1, academicYearId: 1, studentId: 1, date: 1, subjectId: 1 }` prevents duplicate attendance entries for the same student on the same date.
5. **Role-Based Access Control (RBAC)**:
   - `super_admin`: Global governance visibility across institutions.
   - `institution_admin`: Full management of institution attendance, corrections, and reports.
   - `teacher`: Mark and view attendance for assigned classes/sections.
   - `student`: Read-only, view ONLY own attendance history & percentage.
   - `parent`: Read-only, view ONLY linked children's attendance history via `ParentChildLink`.

---

## 🗄️ 2. Database Models

- **`Attendance`**: Represents daily or subject attendance (`institutionId`, `academicYearId`, `classId`, `sectionId`, `studentId`, `date`, `status` [`present`, `absent`, `late`, `half_day`, `excused`, `leave`], `remarks`, `markedBy`, `markedByRole`, `updatedBy`, `correctionReason`, `isDeleted`).

---

## 📡 3. API Endpoints

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/attendance` | Admin/Teacher | Mark single or bulk attendance |
| `POST` | `/api/v1/attendance/bulk` | Admin/Teacher | Bulk mark section roster attendance |
| `GET` | `/api/v1/attendance` | Authenticated | List attendance records with filters |
| `GET` | `/api/v1/attendance/student/:studentId` | Authenticated | Student attendance history (RBAC scoped) |
| `GET` | `/api/v1/attendance/class/:classId` | Admin/Teacher | Class/section attendance |
| `GET` | `/api/v1/attendance/date/:date` | Authenticated | Daily attendance for specific date |
| `PATCH` | `/api/v1/attendance/:id` | Admin/Teacher | Correct attendance record (requires `correctionReason`) |
| `DELETE` | `/api/v1/attendance/:id` | Admin | Soft delete attendance record |
| `GET` | `/api/v1/attendance/summary/student/:studentId` | Authenticated | Student percentage & counts summary |
| `GET` | `/api/v1/attendance/summary/class/:classId` | Admin/Teacher | Class-level attendance summary |
| `GET` | `/api/v1/attendance/reports` | Admin/Teacher | Date-range / monthly attendance report |

---

## 💻 4. Web UI Features (`web/src/pages/AttendanceManagementPage.jsx`)

- **Design Aesthetic**: Clean light neutral EduBridge dashboard UI with white cards (`#ffffff`), light gray background (`#f8fafc`), slate typography, and clean borders (`#e2e8f0`).
- **Sidebar Integration**: Clickable "Attendance" navigation link.
- **Teacher Marking Interface**: Roster view with single-click status toggles (Present, Absent, Late, Half Day, Excused) and bulk save action.
- **Admin Correction & Reports**: Filterable attendance grid with correction modal requiring reason input, attendance percentage calculations, and date-range reporting.
- **Parent & Student Views**: Personal attendance metrics and monthly calendar views.

---

## 📱 5. Mobile Features (`mobile/src/screens/AttendanceScreen.jsx`)

- **Teacher View**: Roster selection by assigned class/section/date, status toggles, and save action.
- **Student View**: My attendance history, attendance percentage badge, and monthly breakdown.
- **Parent View**: Linked child selector, child attendance percentage, and status log.
- **Zero Permission Prompts**: On-demand permissions with graceful settings fallbacks.

---

## 🧪 6. Test Suite & Verification Results

### Backend Automated Test Suite (`node scripts/testPhase10Attendance.js`)
- **Total Scenarios**: 28
- **Result**: **100% PASS (28 / 28 passed)**
- Scenarios tested:
  1. Super Admin Authentication
  2. Institution Admin Authentication
  3. Teacher Authentication
  4. Student Authentication
  5. Parent Authentication
  6. Teacher Can Mark Attendance for Assigned Section
  7. Teacher Cannot Mark Attendance for Unauthorized Section (HTTP 403)
  8. Student Cannot Mark Attendance (HTTP 403)
  9. Parent Cannot Mark Attendance (HTTP 403)
  10. Duplicate Attendance Blocked (HTTP 400)
  11. Student Can View Own Attendance
  12. Parent Can View Linked Child's Attendance
  13. Parent Cannot View Unrelated Student's Attendance (HTTP 403)
  14. Cross-Tenant Attendance Access Blocked (HTTP 403)
  15. Institution Admin Can View Institution Attendance
  16. Attendance Correction Requires Reason (HTTP 400)
  17. Attendance Audit Log Created
  18. Attendance Percentage Calculation Correct (100%)
  19. Class Summary Works
  20. Date-Range Report Works
  21. Phase 9 Finance Regression Pass
  22. Phase 8 Fees Regression Pass
  23. Phase 7 Attendance Regression Pass
  24. Phase 6 Academic Regression Pass
  25. Phase 5 Notifications Regression Pass
  26. Phase 4 Users Regression Pass
  27. Phase 3 Institutions Regression Pass
  28. Phase 2 Auth Regression Pass

### Web Build (`npx vite build`)
- Result: **Successful Build in 3.38 seconds** (0 errors).

### Mobile Validation (`npx expo config --type public`)
- Result: **Valid Expo Config (Expo SDK 51.0.0, zero errors)**.
