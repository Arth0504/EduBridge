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

## 💳 Phase 8: Fees, Fee Structure & Fee Collection Management

EduBridge Phase 8 introduces a comprehensive multi-tenant fee management and payment collection engine supporting historical year-scoped billing, cash collection counters, online payment gateway abstractions, term installments, discount concessions, receipt generation, and role-scoped financial reporting.

### 🔑 Key Features
- **Historical Academic-Year Fee Data**: Fee structures, student balances, and payment logs remain permanently linked to their academic year. Modifying class assignments or future fee structures does not alter historical billing records.
- **Cash Payment Workflow**: Institution Admins record counter cash payments. Updates `paidAmount`, calculates `pendingAmount = max(0, totalAmount + lateFee - discountAmount - paidAmount)`, updates installment status, and auto-generates unique receipt numbers (`REC-YYYY-XXXXXX`).
- **Online Payment Provider Abstraction**: Payment model supports online gateway lifecycle (`pending`, `initiated`, `paid`, `failed`, `cancelled`, `refunded`). Initiates payment order abstraction (`orderId`, `paymentProvider`) ready for Razorpay/Stripe provider integration. Clients cannot fake successful payment completion without backend provider verification.
- **Installment & Discount Management**: Supports custom installment schedules and administrative fee concessions (fixed amount or percentage) with approval tracking.
- **Role-Based Access Control**:
  - **Super Admin**: System-wide governance visibility across institutions.
  - **Institution Admin**: Full fee structure creation, student assignment, cash collection, discounts, and receipts management.
  - **Teacher**: Restricted from financial billing and fee records (returns HTTP 403 Forbidden).
  - **Student**: View only their own fee statement, installment schedule, and receipts.
  - **Parent**: View fee statements and receipts strictly for linked children via `ParentChildLink`.
- **Web Dashboard (`FeeManagementPage.jsx`)**: Clean light Stitch-inspired interface with tabs for Fee Structures, Student Balances, Payment Transactions, Receipts, Concessions, and Summary Analytics Cards.
- **Mobile Integration (`FeeScreen.jsx`)**: Native Expo mobile screen for Student/Parent fee statements, installment tracking, online payment order initiation, and receipt viewing.
- **Audit Logging**: Logs fee structure creations, student assignments, discount concessions, cash collections, online order initiations, and receipt issuances.

---

## 📡 Phase 8 API Endpoints

- `POST /api/v1/fee-structures` - Create fee structure with components (Super Admin, Inst Admin)
- `GET /api/v1/fee-structures` - List fee structures with academic year / class filters
- `GET /api/v1/fee-structures/:id` - Get fee structure by ID
- `PATCH /api/v1/fee-structures/:id` - Update fee structure components or details
- `POST /api/v1/student-fees` - Assign fee structure & installments to student
- `GET /api/v1/student-fees` - Query student fee balances with role & tenant scope
- `GET /api/v1/student-fees/:id` - Get student fee balance details
- `PATCH /api/v1/student-fees/:id` - Update student fee (late fee / installments)
- `POST /api/v1/fee-payments/cash` - Record counter cash payment & auto-generate receipt
- `POST /api/v1/fee-payments/online/initiate` - Initiate online payment order abstraction
- `GET /api/v1/fee-payments` - List payment transactions history
- `GET /api/v1/fee-payments/:id` - Get payment transaction details by ID
- `POST /api/v1/fee-discounts` - Apply discount / concession to student fee balance
- `GET /api/v1/fee-receipts` - List fee receipts
- `GET /api/v1/fee-receipts/:id` - Get fee receipt details for printing
- `GET /api/v1/fee-reports/summary` - Aggregate financial collection metrics & summary dashboard

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
```
