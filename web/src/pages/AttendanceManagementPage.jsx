import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  UserCheck,
  Users,
  Search,
  Save,
  Filter,
  RefreshCw,
  AlertCircle,
  FileSpreadsheet,
  Check,
  User,
  ShieldAlert,
  ChevronRight,
  TrendingUp,
  Award
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'http://localhost:5000/api/v1';

export default function AttendanceManagementPage() {
  const { user, token } = useAuth();
  const role = (user?.role || '').toLowerCase();
  const isAdmin = role === 'super_admin' || role === 'institution_admin';
  const isTeacher = role === 'teacher';
  const isStudent = role === 'student';
  const isParent = role === 'parent';

  // Active View Tab: 'marking', 'reports', 'my_attendance'
  const [activeTab, setActiveTab] = useState(isStudent || isParent ? 'my_attendance' : 'marking');

  // Load States
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Dropdown Master Data
  const [academicYears, setAcademicYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teacherAssignments, setTeacherAssignments] = useState([]);
  const [teacherProfile, setTeacherProfile] = useState(null);

  // Selector Values for Attendance Marking
  const [selectedYearId, setSelectedYearId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState(''); // optional for daily
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Student Roster & Attendance Map: { studentId: { status: 'present'|'absent'|'late'|'leave', remarks: '' } }
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});

  // Reports / History Data State
  const [historyRecords, setHistoryRecords] = useState([]);
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
  const [reportStatusFilter, setReportStatusFilter] = useState('');
  const [reportSearchQuery, setReportSearchQuery] = useState('');

  // Student/Parent View State
  const [myAttendanceData, setMyAttendanceData] = useState(null);
  const [myLinkedChildren, setMyLinkedChildren] = useState([]);
  const [selectedChildStudentId, setSelectedChildStudentId] = useState('');

  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  // Flash message helper
  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Initial Data Fetching
  useEffect(() => {
    if (!token) return;
    fetchInitialMetaData();
    if (isParent) {
      fetchLinkedChildren();
    }
  }, [token]);

  // Fetch initial master dropdowns
  const fetchInitialMetaData = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch Academic Years
      const yearRes = await axios.get(`${API_BASE}/academic-years`, { headers: authHeaders });
      const years = yearRes.data?.data?.academicYears || [];
      setAcademicYears(years);
      const activeYear = years.find((y) => y.status === 'active') || years[0];
      if (activeYear) {
        setSelectedYearId(activeYear._id);
      }

      if (isAdmin) {
        // Fetch all classes & subjects for institution
        const [clsRes, subRes] = await Promise.all([
          axios.get(`${API_BASE}/classes`, { headers: authHeaders }),
          axios.get(`${API_BASE}/subjects`, { headers: authHeaders })
        ]);
        setClasses(clsRes.data?.data?.classes || []);
        setSubjects(subRes.data?.data?.subjects || []);
      } else if (isTeacher) {
        // Fetch teacher assignments to scope dropdowns strictly
        const assignRes = await axios.get(`${API_BASE}/teacher-subject-assignments`, { headers: authHeaders });
        const assigns = assignRes.data?.data?.assignments || [];
        setTeacherAssignments(assigns);

        // Extract unique classes & subjects authorized for teacher
        const teacherClassesMap = {};
        assigns.forEach((a) => {
          if (a.classId) teacherClassesMap[a.classId._id || a.classId] = a.classId;
        });
        setClasses(Object.values(teacherClassesMap));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load initial metadata.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch linked children for Parent
  const fetchLinkedChildren = async () => {
    try {
      const res = await axios.get(`${API_BASE}/parent-child-links`, { headers: authHeaders });
      const links = res.data?.data?.links || [];
      const children = links.map((l) => l.studentId);
      setMyLinkedChildren(children);
      if (children.length > 0) {
        setSelectedChildStudentId(children[0]._id || children[0]);
      }
    } catch (err) {
      console.error('Failed to fetch parent child links', err);
    }
  };

  // Handle Class change -> load available sections
  useEffect(() => {
    if (!selectedClassId || !token) {
      setSections([]);
      return;
    }

    const fetchSections = async () => {
      try {
        if (isAdmin) {
          const res = await axios.get(`${API_BASE}/sections?classId=${selectedClassId}`, { headers: authHeaders });
          setSections(res.data?.data?.sections || []);
        } else if (isTeacher) {
          // Filter section options to teacher's authorized assignments for selected class
          const filteredSecs = teacherAssignments
            .filter((a) => (a.classId._id || a.classId) === selectedClassId)
            .map((a) => a.sectionId);
          // Deduplicate
          const uniqueSecs = Array.from(new Set(filteredSecs.map((s) => s._id || s)))
            .map((id) => filteredSecs.find((s) => (s._id || s) === id));
          setSections(uniqueSecs);

          // Also update subject dropdown for teacher
          const filteredSubjs = teacherAssignments
            .filter((a) => (a.classId._id || a.classId) === selectedClassId)
            .map((a) => a.subjectId);
          const uniqueSubjs = Array.from(new Set(filteredSubjs.map((s) => s._id || s)))
            .map((id) => filteredSubjs.find((s) => (s._id || s) === id));
          setSubjects(uniqueSubjs);
        }
      } catch (err) {
        console.error('Failed to load sections', err);
      }
    };

    fetchSections();
  }, [selectedClassId, teacherAssignments]);

  // Load Enrolled Students & Existing Attendance whenever Scope or Date changes
  useEffect(() => {
    if (!selectedYearId || !selectedClassId || !selectedSectionId || !token) return;
    loadRosterAndAttendance();
  }, [selectedYearId, selectedClassId, selectedSectionId, selectedSubjectId, selectedDate, token]);

  const loadRosterAndAttendance = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch Enrolled Students for this Year + Class + Section
      const enrollRes = await axios.get(
        `${API_BASE}/student-enrollments?academicYearId=${selectedYearId}&classId=${selectedClassId}&sectionId=${selectedSectionId}`,
        { headers: authHeaders }
      );
      const enrollments = enrollRes.data?.data?.enrollments || [];
      const students = enrollments.map((e) => ({
        enrollmentId: e._id,
        rollNumber: e.rollNumber,
        studentProfileId: e.studentId._id || e.studentId,
        studentIdCode: e.studentId.studentId,
        fullName: e.studentId.userId?.fullName || 'Student',
        email: e.studentId.userId?.email || ''
      }));
      setEnrolledStudents(students);

      // 2. Fetch Existing Attendance for Date + Scope
      let attUrl = `${API_BASE}/attendance?academicYearId=${selectedYearId}&classId=${selectedClassId}&sectionId=${selectedSectionId}&attendanceDate=${selectedDate}`;
      if (selectedSubjectId) {
        attUrl += `&subjectId=${selectedSubjectId}`;
      }
      const attRes = await axios.get(attUrl, { headers: authHeaders });
      const existingRecords = attRes.data?.data?.attendance || [];

      // Map existing records by student profile ID
      const initialMap = {};
      students.forEach((s) => {
        const rec = existingRecords.find((r) => {
          const rStuId = r.studentId._id || r.studentId;
          return rStuId.toString() === s.studentProfileId.toString();
        });
        initialMap[s.studentProfileId] = {
          status: rec ? rec.status : 'present', // Default to present for quick marking
          remarks: rec ? rec.remarks : '',
          recordId: rec ? rec._id : null
        };
      });
      setAttendanceMap(initialMap);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load roster and attendance.');
    } finally {
      setLoading(false);
    }
  };

  // Update Status in local state for student
  const handleStatusChange = (studentProfileId, newStatus) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentProfileId]: {
        ...prev[studentProfileId],
        status: newStatus
      }
    }));
  };

  // Update Remarks in local state
  const handleRemarksChange = (studentProfileId, text) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentProfileId]: {
        ...prev[studentProfileId],
        remarks: text
      }
    }));
  };

  // Quick Action Buttons
  const markAllStatus = (targetStatus) => {
    setAttendanceMap((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((id) => {
        updated[id] = { ...updated[id], status: targetStatus };
      });
      return updated;
    });
  };

  // Save Attendance to Backend (Bulk Submit)
  const handleSaveAttendance = async () => {
    if (enrolledStudents.length === 0) {
      setError('No students enrolled in the selected class and section.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // Find logged-in user's teacher profile ID if teacher
      let teacherProfileId = null;
      if (isTeacher) {
        const teacherProfRes = await axios.get(`${API_BASE}/teachers`, { headers: authHeaders });
        const myProf = teacherProfRes.data?.data?.teachers?.find(
          (t) => t.userId?._id === user._id || t.userId === user._id
        );
        if (myProf) teacherProfileId = myProf._id;
      } else {
        // Admin or super admin select first active teacher or pass teacherId
        const teachersRes = await axios.get(`${API_BASE}/teachers`, { headers: authHeaders });
        const tList = teachersRes.data?.data?.teachers || [];
        if (tList.length > 0) teacherProfileId = tList[0]._id;
      }

      if (!teacherProfileId) {
        setError('Teacher profile reference missing. Contact system administrator.');
        setSubmitting(false);
        return;
      }

      const records = enrolledStudents.map((s) => ({
        studentId: s.studentProfileId,
        status: attendanceMap[s.studentProfileId]?.status || 'present',
        remarks: attendanceMap[s.studentProfileId]?.remarks || ''
      }));

      const payload = {
        academicYearId: selectedYearId,
        classId: selectedClassId,
        sectionId: selectedSectionId,
        teacherId: teacherProfileId,
        subjectId: selectedSubjectId || undefined,
        attendanceDate: selectedDate,
        records
      };

      await axios.post(`${API_BASE}/attendance/bulk`, payload, { headers: authHeaders });
      showSuccess(`Attendance successfully saved for ${records.length} students!`);
      loadRosterAndAttendance();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit attendance.');
    } finally {
      setSubmitting(false);
    }
  };

  // Fetch Attendance Reports / History
  const fetchReports = async () => {
    setLoading(true);
    setError('');
    try {
      let queryUrl = `${API_BASE}/attendance?`;
      if (selectedYearId) queryUrl += `academicYearId=${selectedYearId}&`;
      if (selectedClassId) queryUrl += `classId=${selectedClassId}&`;
      if (selectedSectionId) queryUrl += `sectionId=${selectedSectionId}&`;
      if (selectedSubjectId) queryUrl += `subjectId=${selectedSubjectId}&`;
      if (reportStartDate) queryUrl += `startDate=${reportStartDate}&`;
      if (reportEndDate) queryUrl += `endDate=${reportEndDate}&`;
      if (reportStatusFilter) queryUrl += `status=${reportStatusFilter}&`;

      const res = await axios.get(queryUrl, { headers: authHeaders });
      setHistoryRecords(res.data?.data?.attendance || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch attendance reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'reports') {
      fetchReports();
    }
  }, [activeTab]);

  // Load My Attendance for Student or Parent
  const fetchMyStudentAttendance = async (studentIdToFetch) => {
    setLoading(true);
    setError('');
    try {
      let targetId = studentIdToFetch;
      if (!targetId && isStudent) {
        // Fetch logged in student's profile ID
        const profRes = await axios.get(`${API_BASE}/students/me`, { headers: authHeaders }).catch(() => null);
        if (profRes?.data?.data?.student) {
          targetId = profRes.data.data.student._id;
        } else {
          // Alternative fallback lookup
          const allStus = await axios.get(`${API_BASE}/students`, { headers: authHeaders });
          const me = allStus.data?.data?.students?.find((s) => (s.userId?._id || s.userId) === user._id);
          if (me) targetId = me._id;
        }
      }

      if (!targetId) {
        setLoading(false);
        return;
      }

      const res = await axios.get(`${API_BASE}/attendance/student/${targetId}`, { headers: authHeaders });
      setMyAttendanceData(res.data?.data || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load student attendance.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'my_attendance') {
      if (isStudent) {
        fetchMyStudentAttendance();
      } else if (isParent && selectedChildStudentId) {
        fetchMyStudentAttendance(selectedChildStudentId._id || selectedChildStudentId);
      }
    }
  }, [activeTab, selectedChildStudentId]);

  // Calculate live summary metrics for marking view
  const markingStats = useMemo(() => {
    const total = enrolledStudents.length;
    let present = 0, absent = 0, late = 0, leave = 0;
    Object.values(attendanceMap).forEach((val) => {
      if (val.status === 'present') present++;
      else if (val.status === 'absent') absent++;
      else if (val.status === 'late') late++;
      else if (val.status === 'leave') leave++;
    });
    const attended = present + late;
    const pct = total > 0 ? Math.round((attended / total) * 100) : 0;
    return { total, present, absent, late, leave, attended, pct };
  }, [enrolledStudents, attendanceMap]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-800">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <UserCheck className="w-7 h-7 text-emerald-600" />
            Attendance & Academic Operations
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Historical year-scoped daily attendance management, role-based security & attendance analytics.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-lg text-sm font-semibold">
          {!isStudent && !isParent && (
            <>
              <button
                onClick={() => setActiveTab('marking')}
                className={`px-4 py-2 rounded-md transition-all ${
                  activeTab === 'marking'
                    ? 'bg-white text-emerald-700 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Mark Daily Attendance
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={`px-4 py-2 rounded-md transition-all ${
                  activeTab === 'reports'
                    ? 'bg-white text-emerald-700 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Reports & Audit Logs
              </button>
            </>
          )}
          {(isStudent || isParent) && (
            <button
              onClick={() => setActiveTab('my_attendance')}
              className="px-4 py-2 rounded-md bg-white text-emerald-700 shadow-sm font-bold"
            >
              My Attendance Summary
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg flex items-center gap-2 text-sm font-medium">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* TAB 1: ATTENDANCE MARKING DASHBOARD */}
      {activeTab === 'marking' && (
        <div className="space-y-6">
          {/* Selector Controls Toolbar */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Academic Year Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Academic Year
              </label>
              <select
                value={selectedYearId}
                onChange={(e) => setSelectedYearId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="">Select Year...</option>
                {academicYears.map((y) => (
                  <option key={y._id} value={y._id}>
                    {y.name} {y.status === 'active' ? '(Current)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Class Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Class
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => {
                  setSelectedClassId(e.target.value);
                  setSelectedSectionId('');
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="">Select Class...</option>
                {classes.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name || c.className}
                  </option>
                ))}
              </select>
            </div>

            {/* Section Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Section
              </label>
              <select
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                disabled={!selectedClassId}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-slate-100"
              >
                <option value="">Select Section...</option>
                {sections.map((s) => (
                  <option key={s._id} value={s._id}>
                    Section {s.name || s.sectionName}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject Selector (Optional for Daily) */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Subject (Optional)
              </label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="">All / Daily General</option>
                {subjects.map((sub) => (
                  <option key={sub._id} value={sub._id}>
                    {sub.name || sub.subjectName} ({sub.subjectCode})
                  </option>
                ))}
              </select>
            </div>

            {/* Attendance Date Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Attendance Summary Cards */}
          {selectedClassId && selectedSectionId && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                <p className="text-xs font-medium text-slate-500 uppercase">Total Enrolled</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{markingStats.total}</p>
              </div>

              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 shadow-sm text-center">
                <p className="text-xs font-medium text-emerald-600 uppercase">Present</p>
                <p className="text-2xl font-bold text-emerald-700 mt-1">{markingStats.present}</p>
              </div>

              <div className="bg-rose-50 p-4 rounded-xl border border-rose-200 shadow-sm text-center">
                <p className="text-xs font-medium text-rose-600 uppercase">Absent</p>
                <p className="text-2xl font-bold text-rose-700 mt-1">{markingStats.absent}</p>
              </div>

              <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 shadow-sm text-center">
                <p className="text-xs font-medium text-amber-600 uppercase">Late</p>
                <p className="text-2xl font-bold text-amber-700 mt-1">{markingStats.late}</p>
              </div>

              <div className="bg-sky-50 p-4 rounded-xl border border-sky-200 shadow-sm text-center">
                <p className="text-xs font-medium text-sky-600 uppercase">On Leave</p>
                <p className="text-2xl font-bold text-sky-700 mt-1">{markingStats.leave}</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                <p className="text-xs font-medium text-slate-500 uppercase">Percentage</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{markingStats.pct}%</p>
              </div>
            </div>
          )}

          {/* Student Roster Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-slate-600" />
                <h2 className="font-semibold text-slate-800 text-sm">
                  Student Attendance Sheet ({enrolledStudents.length} Students)
                </h2>
              </div>

              {selectedClassId && selectedSectionId && enrolledStudents.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium mr-1">Quick Mark:</span>
                  <button
                    type="button"
                    onClick={() => markAllStatus('present')}
                    className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded hover:bg-emerald-200 text-xs font-medium"
                  >
                    All Present
                  </button>
                  <button
                    type="button"
                    onClick={() => markAllStatus('absent')}
                    className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded hover:bg-rose-200 text-xs font-medium"
                  >
                    All Absent
                  </button>
                  <button
                    type="button"
                    onClick={() => markAllStatus('late')}
                    className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded hover:bg-amber-200 text-xs font-medium"
                  >
                    All Late
                  </button>
                  <button
                    type="button"
                    onClick={() => markAllStatus('leave')}
                    className="px-2.5 py-1 bg-sky-100 text-sky-800 rounded hover:bg-sky-200 text-xs font-medium"
                  >
                    All Leave
                  </button>
                </div>
              )}
            </div>

            {!selectedClassId || !selectedSectionId ? (
              <div className="p-12 text-center text-slate-500 space-y-2">
                <Filter className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="font-medium text-slate-700">Please select Academic Year, Class, and Section above.</p>
                <p className="text-xs">Roster will automatically populate based on historical academic enrollment.</p>
              </div>
            ) : loading ? (
              <div className="p-12 text-center text-slate-500 flex items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
                <span>Loading student enrollment roster & attendance...</span>
              </div>
            ) : enrolledStudents.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <p className="font-semibold text-slate-700">No active student enrollments found for this scope.</p>
                <p className="text-xs mt-1 text-slate-400">Ensure student academic enrollment records exist for this class/section.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-100/70 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                      <th className="py-3 px-4">Roll No</th>
                      <th className="py-3 px-4">Student ID</th>
                      <th className="py-3 px-4">Student Name</th>
                      <th className="py-3 px-4 text-center">Status Control</th>
                      <th className="py-3 px-4">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {enrolledStudents.map((stu) => {
                      const curStatus = attendanceMap[stu.studentProfileId]?.status || 'present';
                      const curRemarks = attendanceMap[stu.studentProfileId]?.remarks || '';

                      return (
                        <tr key={stu.studentProfileId} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                            {stu.rollNumber || '-'}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-500 text-xs">
                            {stu.studentIdCode}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-slate-900">
                            {stu.fullName}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex justify-center items-center gap-1">
                              {/* Present Button */}
                              <button
                                type="button"
                                onClick={() => handleStatusChange(stu.studentProfileId, 'present')}
                                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
                                  curStatus === 'present'
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                                }`}
                              >
                                <CheckCircle className="w-3.5 h-3.5" /> Present
                              </button>

                              {/* Absent Button */}
                              <button
                                type="button"
                                onClick={() => handleStatusChange(stu.studentProfileId, 'absent')}
                                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
                                  curStatus === 'absent'
                                    ? 'bg-rose-600 text-white shadow-sm'
                                    : 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-700'
                                }`}
                              >
                                <XCircle className="w-3.5 h-3.5" /> Absent
                              </button>

                              {/* Late Button */}
                              <button
                                type="button"
                                onClick={() => handleStatusChange(stu.studentProfileId, 'late')}
                                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
                                  curStatus === 'late'
                                    ? 'bg-amber-600 text-white shadow-sm'
                                    : 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-700'
                                }`}
                              >
                                <Clock className="w-3.5 h-3.5" /> Late
                              </button>

                              {/* Leave Button */}
                              <button
                                type="button"
                                onClick={() => handleStatusChange(stu.studentProfileId, 'leave')}
                                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
                                  curStatus === 'leave'
                                    ? 'bg-sky-600 text-white shadow-sm'
                                    : 'bg-slate-100 text-slate-600 hover:bg-sky-50 hover:text-sky-700'
                                }`}
                              >
                                Leave
                              </button>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <input
                              type="text"
                              placeholder="Optional remarks..."
                              value={curRemarks}
                              onChange={(e) => handleRemarksChange(stu.studentProfileId, e.target.value)}
                              className="w-full px-2.5 py-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Bottom Submit Action */}
            {selectedClassId && selectedSectionId && enrolledStudents.length > 0 && (
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveAttendance}
                  disabled={submitting}
                  className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold text-sm flex items-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Saving Attendance...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" /> Submit Class Attendance
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: REPORTS & HISTORY */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* Report Filters */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Start Date</label>
              <input
                type="date"
                value={reportStartDate}
                onChange={(e) => setReportStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">End Date</label>
              <input
                type="date"
                value={reportEndDate}
                onChange={(e) => setReportEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Status Filter</label>
              <select
                value={reportStatusFilter}
                onChange={(e) => setReportStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="">All Statuses</option>
                <option value="present">Present Only</option>
                <option value="absent">Absent Only</option>
                <option value="late">Late Only</option>
                <option value="leave">Leave Only</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={fetchReports}
                className="w-full px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors font-medium text-sm flex items-center justify-center gap-2"
              >
                <Filter className="w-4 h-4" /> Apply Filter
              </button>
            </div>
          </div>

          {/* History Records Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-semibold text-slate-800 text-sm">Attendance Records ({historyRecords.length})</h3>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-500 flex items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
                <span>Loading report history...</span>
              </div>
            ) : historyRecords.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <p>No historical attendance records matching selected criteria.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Class / Section</th>
                      <th className="py-3 px-4">Subject</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {historyRecords.map((r) => (
                      <tr key={r._id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono text-xs">
                          {new Date(r.attendanceDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 font-medium">
                          {r.studentId?.userId?.fullName || 'Student'}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600">
                          {r.classId?.className || r.classId?.name || 'Class'} - {r.sectionId?.sectionName || r.sectionId?.name || 'Sec'}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500">
                          {r.subjectId ? (r.subjectId.subjectName || r.subjectId.name) : 'General Daily'}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                              r.status === 'present'
                                ? 'bg-emerald-100 text-emerald-800'
                                : r.status === 'absent'
                                ? 'bg-rose-100 text-rose-800'
                                : r.status === 'late'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-sky-100 text-sky-800'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500">
                          {r.remarks || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: STUDENT / PARENT ATTENDANCE SUMMARY VIEW */}
      {activeTab === 'my_attendance' && (
        <div className="space-y-6">
          {/* Parent Child Switcher */}
          {isParent && myLinkedChildren.length > 0 && (
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-600">Select Child:</span>
              <select
                value={selectedChildStudentId}
                onChange={(e) => setSelectedChildStudentId(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-emerald-500"
              >
                {myLinkedChildren.map((c) => (
                  <option key={c._id || c} value={c._id || c}>
                    {c.userId?.fullName || 'Child'} ({c.studentId || 'Student'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {loading ? (
            <div className="p-12 bg-white rounded-xl text-center text-slate-500 flex items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
              <span>Fetching personal attendance records...</span>
            </div>
          ) : !myAttendanceData ? (
            <div className="p-12 bg-white rounded-xl text-center text-slate-500">
              <p>No personal attendance summary records found.</p>
            </div>
          ) : (
            <>
              {/* Personal Summary Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                  <p className="text-xs font-medium text-slate-500 uppercase">Working Days</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{myAttendanceData.summary.totalWorkingDays}</p>
                </div>
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 text-center">
                  <p className="text-xs font-medium text-emerald-600 uppercase">Present</p>
                  <p className="text-2xl font-bold text-emerald-700 mt-1">{myAttendanceData.summary.present}</p>
                </div>
                <div className="bg-rose-50 p-4 rounded-xl border border-rose-200 text-center">
                  <p className="text-xs font-medium text-rose-600 uppercase">Absent</p>
                  <p className="text-2xl font-bold text-rose-700 mt-1">{myAttendanceData.summary.absent}</p>
                </div>
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-center">
                  <p className="text-xs font-medium text-amber-600 uppercase">Late</p>
                  <p className="text-2xl font-bold text-amber-700 mt-1">{myAttendanceData.summary.late}</p>
                </div>
                <div className="bg-sky-50 p-4 rounded-xl border border-sky-200 text-center">
                  <p className="text-xs font-medium text-sky-600 uppercase">Leave</p>
                  <p className="text-2xl font-bold text-sky-700 mt-1">{myAttendanceData.summary.leave}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                  <p className="text-xs font-medium text-slate-500 uppercase">Overall %</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">{myAttendanceData.summary.attendancePercentage}%</p>
                </div>
              </div>

              {/* Attendance Log Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200">
                  <h3 className="font-semibold text-slate-800 text-sm">Attendance History Log</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-slate-100 text-xs font-semibold text-slate-600 uppercase">
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Class / Section</th>
                        <th className="py-3 px-4">Subject</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {myAttendanceData.attendance.map((rec) => (
                        <tr key={rec._id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-mono text-xs">
                            {new Date(rec.attendanceDate).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600">
                            {rec.classId?.className || rec.classId?.name || 'Class'} - {rec.sectionId?.sectionName || rec.sectionId?.name || 'Sec'}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-500">
                            {rec.subjectId ? (rec.subjectId.subjectName || rec.subjectId.name) : 'General Daily'}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                                rec.status === 'present'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : rec.status === 'absent'
                                  ? 'bg-rose-100 text-rose-800'
                                  : rec.status === 'late'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-sky-100 text-sky-800'
                              }`}
                            >
                              {rec.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-500">
                            {rec.remarks || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
