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

## 📢 Phase 5: Communication & Notification Management

EduBridge Phase 5 introduces a multi-tenant Communication & Announcement Management system with strict tenant isolation, role-based audience targeting, read/unread status tracking, scheduled/expired message handling, and audit logging.

### 🔑 Key Features
- **Tenant Isolation**: Institution Admins can target only their institution's members. Super Admin can broadcast globally or per institution.
- **Target Audience Scoping**: Broadcasts can target `all`, `students`, `teachers`, `parents`, or `specific_users`.
- **Read & Unread Tracking**: Prevents duplicate read records using a unique compound index (`notificationId` + `userId`).
- **Scheduling & Expiration**: Messages can be scheduled for future release or set with an expiration date.
- **Web Dashboard & Header Center**: Clean education management UI for announcement creation, filtering, editing, and deletion, plus a top navbar bell dropdown with live unread badge count.
- **Mobile Integration**: Expo mobile notification feed and detail screens with zero automatic permission popups on startup.
- **Audit Logging**: Logs creation, update, publication, scheduling, and deactivation events.

---

## 📡 Phase 5 API Endpoints

- `POST /api/v1/notifications` - Create announcement (Super Admin / Institution Admin)
- `GET /api/v1/notifications` - List visible notifications for authenticated user
- `GET /api/v1/notifications/unread-count` - Get unread count for badge
- `GET /api/v1/notifications/:id` - View notification details (with RBAC / tenant check)
- `PATCH /api/v1/notifications/:id/read` - Mark single notification as read
- `PATCH /api/v1/notifications/read-all` - Mark all visible notifications as read
- `PATCH /api/v1/notifications/:id` - Update / publish notification
- `DELETE /api/v1/notifications/:id` - Soft-delete / deactivate notification

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
```
