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

## 📁 Project Folder Structure

```text
EduBridge/
│
├── mobile/                      # React Native Expo Mobile App
│   ├── App.js                   # Navigation entry point
│   ├── app.json                 # Expo configuration
│   ├── package.json             # Mobile dependencies
│   └── src/
│       ├── screens/             # Welcome, Login, Register, PermissionDemo
│       └── utils/
│           └── permissionHandler.js # On-demand permission management
│
├── web/                         # React.js Vite Web Admin Console
│   ├── index.html               # Web HTML entry
│   ├── vite.config.js           # Vite dev server configuration
│   ├── package.json             # Web dependencies
│   └── src/
│       ├── App.jsx              # Main router
│       ├── components/          # Header, Sidebar navigation
│       └── pages/               # Overview, Institutions, Users, Roles
│
├── backend/                     # Node.js + Express.js API Engine
│   ├── server.js                # Server entry point
│   ├── package.json             # Backend dependencies
│   ├── .env.example             # Template environment variables
│   ├── config/                  # Database connection (db.js)
│   ├── controllers/             # Health check and API controllers
│   ├── middleware/              # Error handling & institution context
│   ├── models/                  # Institution & User schemas
│   ├── routes/                  # API routes (/api/health)
│   └── utils/                   # Logger utility
│
├── .gitignore                   # Master gitignore configuration
└── README.md                    # Project documentation
```

---

## 🚀 Quick Start Guide

### 1. Backend Server Setup
Navigate into the backend directory and start the development server:

```bash
cd backend
npm install
npm run dev
```

The backend server will run on `http://localhost:5000`. You can test health status at:
`http://localhost:5000/api/health`

### 2. Web Administration Dashboard
Navigate into the web directory and start the Vite development server:

```bash
cd web
npm install
npm run dev
```

Open your browser at `http://localhost:3000` to access the EduBridge Admin Console.

### 3. Mobile App Execution via Expo Go
No Android Studio or emulator required! Test directly on your physical smartphone:

1. Install **Expo Go** from Google Play Store (Android) or Apple App Store (iOS).
2. Start the Expo development server:

```bash
cd mobile
npm install
npx expo start
```

3. Scan the generated QR code using your phone's camera (iOS) or inside the Expo Go app (Android).

---

## 🛡️ Permission Handling Policy

EduBridge strictly enforces a non-intrusive permission model:
1. **Zero Boot Prompts**: The app never asks for permissions when opened.
2. **On-Demand**: Camera, Location, or Notification permissions are requested only when a user taps a feature requiring them (e.g. ID Badge scanner).
3. **Status Check & Cache**: Checks status using Expo modules and caches state in `AsyncStorage`.
4. **Permanent Denial Recovery**: If a user blocks a permission, EduBridge displays a clear explanation with a button to open device settings directly (`Linking.openSettings()`).

---

## 🍃 MongoDB Atlas Setup Instructions

EduBridge is configured to connect directly to your cloud **MongoDB Atlas** cluster targeting the `EduBridge` database.

1. **Obtain Connection String**:
   - Log into your [MongoDB Atlas Dashboard](https://cloud.mongodb.com/).
   - Click **Connect** on your target cluster -> **Drivers** (Node.js).
   - Copy the connection string format:
     `mongodb+srv://<username>:<password>@cluster0.mongodb.net/EduBridge?retryWrites=true&w=majority`

2. **Configure IP Access List**:
   - In MongoDB Atlas, navigate to **Network Access**.
   - Ensure your IP address (or `0.0.0.0/0` for development) is added to the IP Access List.

3. **Set Environment Variable**:
   - Update `backend/.env` with your actual Atlas connection string:
     ```env
     MONGODB_URI=mongodb+srv://yourUsername:yourPassword@cluster0.mongodb.net/EduBridge?retryWrites=true&w=majority
     ```

---

## 🔧 Environment Variables

Copy `backend/.env.example` to `backend/.env` and update the parameters:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/EduBridge?retryWrites=true&w=majority
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d
CORS_ORIGIN=*
```

