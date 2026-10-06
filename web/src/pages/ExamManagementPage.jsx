import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FileText,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Plus,
  Search,
  Save,
  Award,
  Filter,
  RefreshCw,
  Eye,
  Check,
  Building,
  User,
  BookOpen
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'http://localhost:5000/api/v1';

export default function ExamManagementPage() {
  const { user, token } = useAuth();
  const role = (user?.role || '').toLowerCase();
  const isAdmin = role === 'super_admin' || role === 'institution_admin';
  const isTeacher = role === 'teacher';
  const isStudent = role === 'student';
  const isParent = role === 'parent';

  // Default tab based on role
  const [activeTab, setActiveTab] = useState(isStudent || isParent ? 'results' : 'examinations');

  // Loaders & Messages
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Master Dropdown Data
  const [academicYears, setAcademicYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [examinations, setExaminations] = useState([]);
  const [schedules, setSchedules] = useState([]);

  // Filter & Selection States
  const [selectedYearId, setSelectedYearId] = useState('');
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedScheduleId, setSelectedScheduleId] = useState('');

  // Form States for Creating Exam
  const [newExam, setNewExam] = useState({
    name: '',
    examType: 'unit_test',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    description: '',
    academicYearId: ''
  });

  // Form States for Creating Schedule
  const [newSchedule, setNewSchedule] = useState({
    examinationId: '',
    classId: '',
    sectionId: '',
    subjectId: '',
    examDate: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '12:00',
    maxMarks: 100,
    passingMarks: 40,
    roomNumber: ''
  });

  // Roster Marks Data: { studentId: { marksObtained: number, remarks: string, correctionReason: string } }
  const [roster, setRoster] = useState([]);
  const [marksMap, setMarksMap] = useState({});

  // Student Result View Data
  const [studentResult, setStudentResult] = useState(null);
  const [classResults, setClassResults] = useState([]);

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  // Fetch Master Data on Mount
  useEffect(() => {
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    try {
      setLoading(true);
      setError('');
      const [ayRes, clsRes, subRes] = await Promise.all([
        axios.get(`${API_BASE}/academic-years`, authHeaders).catch(() => ({ data: { data: [] } })),
        axios.get(`${API_BASE}/classes`, authHeaders).catch(() => ({ data: { data: [] } })),
        axios.get(`${API_BASE}/subjects`, authHeaders).catch(() => ({ data: { data: [] } }))
      ]);

      const aYears = ayRes.data.data || ayRes.data || [];
      const cList = clsRes.data.data || clsRes.data || [];
      const sList = subRes.data.data || subRes.data || [];

      setAcademicYears(aYears);
      setClasses(cList);
      setSubjects(sList);

      if (aYears.length > 0) {
        const activeAy = aYears.find((y) => y.isCurrent || y.status === 'active') || aYears[0];
        setSelectedYearId(activeAy._id);
        setNewExam((prev) => ({ ...prev, academicYearId: activeAy._id }));
      }

      await fetchExaminations();
    } catch (err) {
      setError('Failed to load master academic data.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Sections when Class changes
  useEffect(() => {
    if (selectedClassId) {
      axios
        .get(`${API_BASE}/sections?classId=${selectedClassId}`, authHeaders)
        .then((res) => setSections(res.data.data || res.data || []))
        .catch(() => setSections([]));
    } else {
      setSections([]);
    }
  }, [selectedClassId]);

  const fetchExaminations = async () => {
    try {
      const res = await axios.get(`${API_BASE}/examinations`, authHeaders);
      setExaminations(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch examinations.');
    }
  };

  const fetchSchedules = async (examId) => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/exam-schedules?examinationId=${examId}`, authHeaders);
      setSchedules(res.data.data || []);
    } catch (err) {
      setError('Failed to fetch exam schedules.');
    } finally {
      setLoading(false);
    }
  };

  // Create Examination
  const handleCreateExamination = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError('');
      setSuccessMsg('');

      const payload = { ...newExam, academicYearId: selectedYearId || newExam.academicYearId };
      await axios.post(`${API_BASE}/examinations`, payload, authHeaders);

      setSuccessMsg('Examination created successfully.');
      setNewExam({
        name: '',
        examType: 'unit_test',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        description: '',
        academicYearId: selectedYearId
      });
      fetchExaminations();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create examination.');
    } finally {
      setSubmitting(false);
    }
  };

  // Change Examination Status / Publish
  const handleUpdateStatus = async (examId, newStatus) => {
    try {
      setError('');
      setSuccessMsg('');
      if (newStatus === 'published') {
        await axios.post(`${API_BASE}/results/publish`, { examinationId: examId }, authHeaders);
        setSuccessMsg('Examination results published successfully!');
      } else {
        await axios.patch(`${API_BASE}/examinations/${examId}/status`, { status: newStatus }, authHeaders);
        setSuccessMsg(`Examination status updated to ${newStatus}.`);
      }
      fetchExaminations();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status.');
    }
  };

  // Create Exam Schedule
  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError('');
      setSuccessMsg('');

      await axios.post(`${API_BASE}/exam-schedules`, newSchedule, authHeaders);
      setSuccessMsg('Exam subject schedule created successfully.');
      setNewSchedule({
        examinationId: selectedExamId,
        classId: '',
        sectionId: '',
        subjectId: '',
        examDate: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '12:00',
        maxMarks: 100,
        passingMarks: 40,
        roomNumber: ''
      });
      if (selectedExamId) fetchSchedules(selectedExamId);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create schedule.');
    } finally {
      setSubmitting(false);
    }
  };

  // Load Marks Roster for Teacher/Admin
  const handleLoadRoster = async () => {
    if (!selectedExamId || !selectedScheduleId) {
      setError('Please select an Examination and a Scheduled Subject.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const targetSched = schedules.find((s) => s._id === selectedScheduleId);
      if (!targetSched) {
        setError('Selected schedule not found.');
        setLoading(false);
        return;
      }

      // Fetch enrolled students for class & section
      const enrollRes = await axios.get(
        `${API_BASE}/student-enrollments?classId=${targetSched.classId._id || targetSched.classId}&sectionId=${targetSched.sectionId._id || targetSched.sectionId}`,
        authHeaders
      );
      const studentEnrollments = enrollRes.data.data || [];

      // Fetch existing marks
      const marksRes = await axios.get(
        `${API_BASE}/exam-marks?examinationId=${selectedExamId}&examScheduleId=${selectedScheduleId}`,
        authHeaders
      );
      const existingMarks = marksRes.data.data || [];

      const initialMap = {};
      studentEnrollments.forEach((eItem) => {
        const stId = eItem.studentId?._id || eItem.studentId;
        const found = existingMarks.find((m) => (m.studentId?._id || m.studentId) === stId);
        initialMap[stId] = {
          marksObtained: found ? found.marksObtained : 0,
          remarks: found ? found.remarks : '',
          correctionReason: found ? found.correctionReason || '' : '',
          isPublished: found ? found.isPublished : false
        };
      });

      setRoster(studentEnrollments);
      setMarksMap(initialMap);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load student roster for marks entry.');
    } finally {
      setLoading(false);
    }
  };

  // Bulk Submit Marks
  const handleSaveBulkMarks = async () => {
    try {
      setSubmitting(true);
      setError('');
      setSuccessMsg('');

      const marksArray = Object.keys(marksMap).map((stId) => ({
        studentId: stId,
        marksObtained: Number(marksMap[stId].marksObtained),
        remarks: marksMap[stId].remarks,
        correctionReason: marksMap[stId].correctionReason
      }));

      const payload = {
        examinationId: selectedExamId,
        examScheduleId: selectedScheduleId,
        marks: marksArray
      };

      const res = await axios.post(`${API_BASE}/exam-marks/bulk`, payload, authHeaders);
      setSuccessMsg(res.data.message || 'Marks saved successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save marks.');
    } finally {
      setSubmitting(false);
    }
  };

  // Fetch Results for Student / Parent
  const handleFetchResults = async () => {
    try {
      setLoading(true);
      setError('');
      setStudentResult(null);

      if (isStudent) {
        // Fetch current user's profile to get profile ID
        const meRes = await axios.get(`${API_BASE}/students/me`, authHeaders).catch(() => null);
        const stProfileId = meRes?.data?.data?._id;
        if (stProfileId) {
          const res = await axios.get(`${API_BASE}/results/student/${stProfileId}`, authHeaders);
          setStudentResult(res.data.data);
        }
      } else if (isParent) {
        // Fetch parent children links
        const linkRes = await axios.get(`${API_BASE}/parent-child-links/my-children`, authHeaders).catch(() => ({ data: { data: [] } }));
        const children = linkRes.data.data || [];
        if (children.length > 0) {
          const childStId = children[0].studentId._id || children[0].studentId;
          const res = await axios.get(`${API_BASE}/results/student/${childStId}`, authHeaders);
          setStudentResult(res.data.data);
        }
      } else if (selectedExamId && selectedClassId) {
        const url = `${API_BASE}/results/class?examinationId=${selectedExamId}&classId=${selectedClassId}${selectedSectionId ? `&sectionId=${selectedSectionId}` : ''}`;
        const res = await axios.get(url, authHeaders);
        setClassResults(res.data.data || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch examination results.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', margin: 0 }}>Examination & Assessment Management</h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Multi-Tenant Academic Year Aware Examination, Scheduling, Marks Entry & Results Module
          </p>
        </div>
      </div>

      {/* Notifications / Feedback Banner */}
      {error && (
        <div style={{ backgroundColor: '#fef2f2', borderLeft: '4px solid #ef4444', padding: '0.75rem 1rem', borderRadius: '0.375rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#991b1b' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div style={{ backgroundColor: '#f0fdf4', borderLeft: '4px solid #22c55e', padding: '0.75rem 1rem', borderRadius: '0.375rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#166534' }}>
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Primary Navigation Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: '1.5rem', gap: '1rem' }}>
        {isAdmin && (
          <button
            onClick={() => setActiveTab('examinations')}
            style={{
              padding: '0.75rem 1rem',
              fontWeight: '600',
              fontSize: '0.875rem',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              borderBottom: activeTab === 'examinations' ? '2px solid #2563eb' : 'none',
              color: activeTab === 'examinations' ? '#2563eb' : '#4b5563'
            }}
          >
            Examinations & Configuration
          </button>
        )}

        {isAdmin && (
          <button
            onClick={() => setActiveTab('schedules')}
            style={{
              padding: '0.75rem 1rem',
              fontWeight: '600',
              fontSize: '0.875rem',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              borderBottom: activeTab === 'schedules' ? '2px solid #2563eb' : 'none',
              color: activeTab === 'schedules' ? '#2563eb' : '#4b5563'
            }}
          >
            Exam Schedules
          </button>
        )}

        {(isAdmin || isTeacher) && (
          <button
            onClick={() => setActiveTab('marks')}
            style={{
              padding: '0.75rem 1rem',
              fontWeight: '600',
              fontSize: '0.875rem',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              borderBottom: activeTab === 'marks' ? '2px solid #2563eb' : 'none',
              color: activeTab === 'marks' ? '#2563eb' : '#4b5563'
            }}
          >
            Marks Entry & Verification
          </button>
        )}

        <button
          onClick={() => {
            setActiveTab('results');
            handleFetchResults();
          }}
          style={{
            padding: '0.75rem 1rem',
            fontWeight: '600',
            fontSize: '0.875rem',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'results' ? '2px solid #2563eb' : 'none',
            color: activeTab === 'results' ? '#2563eb' : '#4b5563'
          }}
        >
          Results & Performance Reports
        </button>
      </div>

      {/* TAB 1: EXAMINATIONS MANAGEMENT */}
      {activeTab === 'examinations' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
          {/* Create Exam Form */}
          <div style={{ backgroundColor: '#ffffff', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', color: '#111827' }}>Create Examination</h2>
            <form onSubmit={handleCreateExamination} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>Academic Year</label>
                <select
                  value={selectedYearId}
                  onChange={(e) => setSelectedYearId(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
                  required
                >
                  <option value="">Select Academic Year</option>
                  {academicYears.map((ay) => (
                    <option key={ay._id} value={ay._id}>
                      {ay.year} ({ay.name || 'Academic Year'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>Exam Name</label>
                <input
                  type="text"
                  placeholder="e.g. Mid-Term Examination 2026"
                  value={newExam.name}
                  onChange={(e) => setNewExam({ ...newExam, name: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>Exam Type</label>
                <select
                  value={newExam.examType}
                  onChange={(e) => setNewExam({ ...newExam, examType: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
                >
                  <option value="unit_test">Unit Test</option>
                  <option value="class_test">Class Test</option>
                  <option value="mid_term">Mid Term</option>
                  <option value="prelim">Prelim</option>
                  <option value="semester_exam">Semester Exam</option>
                  <option value="final_exam">Final Exam</option>
                  <option value="practical_exam">Practical Exam</option>
                  <option value="internal_assessment">Internal Assessment</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>Start Date</label>
                  <input
                    type="date"
                    value={newExam.startDate}
                    onChange={(e) => setNewExam({ ...newExam, startDate: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>End Date</label>
                  <input
                    type="date"
                    value={newExam.endDate}
                    onChange={(e) => setNewExam({ ...newExam, endDate: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>Description</label>
                <textarea
                  rows="2"
                  value={newExam.description}
                  onChange={(e) => setNewExam({ ...newExam, description: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
                  placeholder="Instructions or notes for this exam..."
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: '0.625rem 1rem',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  fontWeight: '600',
                  borderRadius: '0.375rem',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <Plus size={18} />
                <span>{submitting ? 'Creating...' : 'Create Examination'}</span>
              </button>
            </form>
          </div>

          {/* Examinations List */}
          <div style={{ backgroundColor: '#ffffff', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', color: '#111827' }}>Existing Examinations</h2>
            {examinations.length === 0 ? (
              <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>No examinations defined yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {examinations.map((ex) => (
                  <div key={ex._id} style={{ padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '0.375rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '1rem', color: '#111827' }}>{ex.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                        Type: <span style={{ textTransform: 'uppercase', fontWeight: '500' }}>{ex.examType}</span> | Dates: {new Date(ex.startDate).toLocaleDateString()} - {new Date(ex.endDate).toLocaleDateString()}
                      </div>
                      <div style={{ marginTop: '0.5rem' }}>
                        <span style={{
                          fontSize: '0.75rem',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '9999px',
                          fontWeight: '600',
                          backgroundColor: ex.status === 'published' ? '#dcfce7' : ex.status === 'ongoing' ? '#fef9c3' : '#f3f4f6',
                          color: ex.status === 'published' ? '#166534' : ex.status === 'ongoing' ? '#854d0e' : '#374151'
                        }}>
                          {ex.status.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {ex.status !== 'published' && (
                        <button
                          onClick={() => handleUpdateStatus(ex._id, 'published')}
                          style={{
                            padding: '0.375rem 0.75rem',
                            backgroundColor: '#16a34a',
                            color: '#ffffff',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            borderRadius: '0.25rem',
                            border: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          Publish Results
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: EXAM SCHEDULES */}
      {activeTab === 'schedules' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
          {/* Create Schedule Form */}
          <div style={{ backgroundColor: '#ffffff', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', color: '#111827' }}>Schedule Subject Exam</h2>
            <form onSubmit={handleCreateSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>Select Examination</label>
                <select
                  value={newSchedule.examinationId}
                  onChange={(e) => {
                    setNewSchedule({ ...newSchedule, examinationId: e.target.value });
                    setSelectedExamId(e.target.value);
                    if (e.target.value) fetchSchedules(e.target.value);
                  }}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
                  required
                >
                  <option value="">Select Exam</option>
                  {examinations.map((ex) => (
                    <option key={ex._id} value={ex._id}>{ex.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>Class</label>
                <select
                  value={newSchedule.classId}
                  onChange={(e) => {
                    setNewSchedule({ ...newSchedule, classId: e.target.value });
                    setSelectedClassId(e.target.value);
                  }}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
                  required
                >
                  <option value="">Select Class</option>
                  {classes.map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>Section</label>
                <select
                  value={newSchedule.sectionId}
                  onChange={(e) => setNewSchedule({ ...newSchedule, sectionId: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
                  required
                >
                  <option value="">Select Section</option>
                  {sections.map((s) => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>Subject</label>
                <select
                  value={newSchedule.subjectId}
                  onChange={(e) => setNewSchedule({ ...newSchedule, subjectId: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
                  required
                >
                  <option value="">Select Subject</option>
                  {subjects.map((sub) => (
                    <option key={sub._id} value={sub._id}>{sub.name} ({sub.code})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>Max Marks</label>
                  <input
                    type="number"
                    value={newSchedule.maxMarks}
                    onChange={(e) => setNewSchedule({ ...newSchedule, maxMarks: Number(e.target.value) })}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>Passing Marks</label>
                  <input
                    type="number"
                    value={newSchedule.passingMarks}
                    onChange={(e) => setNewSchedule({ ...newSchedule, passingMarks: Number(e.target.value) })}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
                    min="0"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: '0.625rem 1rem',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  fontWeight: '600',
                  borderRadius: '0.375rem',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <Plus size={18} />
                <span>Add Subject Schedule</span>
              </button>
            </form>
          </div>

          {/* Schedules Table */}
          <div style={{ backgroundColor: '#ffffff', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', color: '#111827' }}>Scheduled Subjects</h2>
            {schedules.length === 0 ? (
              <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>No subjects scheduled for this examination yet.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ padding: '0.75rem' }}>Subject</th>
                    <th style={{ padding: '0.75rem' }}>Class / Section</th>
                    <th style={{ padding: '0.75rem' }}>Date & Time</th>
                    <th style={{ padding: '0.75rem' }}>Max / Pass</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((sc) => (
                    <tr key={sc._id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '0.75rem', fontWeight: '600' }}>{sc.subjectId?.name} ({sc.subjectId?.code})</td>
                      <td style={{ padding: '0.75rem' }}>{sc.classId?.name} - {sc.sectionId?.name}</td>
                      <td style={{ padding: '0.75rem' }}>{new Date(sc.examDate).toLocaleDateString()} ({sc.startTime} - {sc.endTime})</td>
                      <td style={{ padding: '0.75rem' }}>{sc.maxMarks} / {sc.passingMarks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: MARKS ENTRY */}
      {activeTab === 'marks' && (
        <div>
          {/* Controls Bar */}
          <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb', marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '1rem', alignItems: 'flex-end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>Examination</label>
              <select
                value={selectedExamId}
                onChange={(e) => {
                  setSelectedExamId(e.target.value);
                  fetchSchedules(e.target.value);
                }}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
              >
                <option value="">Select Exam</option>
                {examinations.map((ex) => (
                  <option key={ex._id} value={ex._id}>{ex.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>Scheduled Subject</label>
              <select
                value={selectedScheduleId}
                onChange={(e) => setSelectedScheduleId(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
              >
                <option value="">Select Scheduled Subject</option>
                {schedules.map((sc) => (
                  <option key={sc._id} value={sc._id}>
                    {sc.subjectId?.name} - {sc.classId?.name} ({sc.sectionId?.name})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleLoadRoster}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontWeight: '600',
                borderRadius: '0.375rem',
                border: 'none',
                cursor: 'pointer',
                height: '38px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Filter size={16} />
              <span>Load Roster</span>
            </button>
          </div>

          {/* Marks Entry Roster Table */}
          {roster.length > 0 && (
            <div style={{ backgroundColor: '#ffffff', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827' }}>Student Marks Roster ({roster.length} Students)</h2>
                <button
                  onClick={handleSaveBulkMarks}
                  disabled={submitting}
                  style={{
                    padding: '0.5rem 1.25rem',
                    backgroundColor: '#16a34a',
                    color: '#ffffff',
                    fontWeight: '600',
                    borderRadius: '0.375rem',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Save size={18} />
                  <span>{submitting ? 'Saving...' : 'Save All Marks'}</span>
                </button>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ padding: '0.75rem' }}>Student Name</th>
                    <th style={{ padding: '0.75rem' }}>Roll Number</th>
                    <th style={{ padding: '0.75rem' }}>Marks Obtained</th>
                    <th style={{ padding: '0.75rem' }}>Correction Reason (If Published)</th>
                    <th style={{ padding: '0.75rem' }}>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map((st) => {
                    const stId = st.studentId?._id || st.studentId;
                    const stData = marksMap[stId] || { marksObtained: 0, remarks: '', correctionReason: '' };

                    return (
                      <tr key={stId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '0.75rem', fontWeight: '500' }}>
                          {st.studentId?.firstName || st.firstName} {st.studentId?.lastName || st.lastName}
                        </td>
                        <td style={{ padding: '0.75rem' }}>{st.rollNumber || st.studentId?.rollNumber || 'N/A'}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <input
                            type="number"
                            min="0"
                            value={stData.marksObtained}
                            onChange={(e) => {
                              const val = e.target.value;
                              setMarksMap({
                                ...marksMap,
                                [stId]: { ...stData, marksObtained: val }
                              });
                            }}
                            style={{ width: '100px', padding: '0.375rem', borderRadius: '0.25rem', border: '1px solid #d1d5db' }}
                          />
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <input
                            type="text"
                            placeholder="Reason if modifying published mark"
                            value={stData.correctionReason || ''}
                            onChange={(e) => {
                              setMarksMap({
                                ...marksMap,
                                [stId]: { ...stData, correctionReason: e.target.value }
                              });
                            }}
                            style={{ width: '100%', padding: '0.375rem', borderRadius: '0.25rem', border: '1px solid #d1d5db' }}
                          />
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <input
                            type="text"
                            placeholder="Remarks"
                            value={stData.remarks || ''}
                            onChange={(e) => {
                              setMarksMap({
                                ...marksMap,
                                [stId]: { ...stData, remarks: e.target.value }
                              });
                            }}
                            style={{ width: '100%', padding: '0.375rem', borderRadius: '0.25rem', border: '1px solid #d1d5db' }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: RESULTS & PERFORMANCE REPORTS */}
      {activeTab === 'results' && (
        <div style={{ backgroundColor: '#ffffff', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', color: '#111827' }}>Examination Results & Performance Report</h2>

          {isStudent || isParent ? (
            studentResult ? (
              <div>
                <div style={{ padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '0.375rem', marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Total Obtained</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827' }}>{studentResult.summary?.totalObtained} / {studentResult.summary?.totalMax}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Percentage</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#2563eb' }}>{studentResult.summary?.percentage}%</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Grade</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#16a34a' }}>{studentResult.summary?.grade}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Overall Status</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '700', color: studentResult.summary?.overallResult === 'PASS' ? '#16a34a' : '#dc2626' }}>
                      {studentResult.summary?.overallResult}
                    </div>
                  </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '1px solid #e5e7eb' }}>
                      <th style={{ padding: '0.75rem' }}>Subject</th>
                      <th style={{ padding: '0.75rem' }}>Marks Obtained</th>
                      <th style={{ padding: '0.75rem' }}>Max Marks</th>
                      <th style={{ padding: '0.75rem' }}>Grade</th>
                      <th style={{ padding: '0.75rem' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentResult.subjectMarks?.map((m) => (
                      <tr key={m._id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '0.75rem', fontWeight: '600' }}>{m.subjectId?.name}</td>
                        <td style={{ padding: '0.75rem' }}>{m.marksObtained}</td>
                        <td style={{ padding: '0.75rem' }}>{m.maxMarks}</td>
                        <td style={{ padding: '0.75rem', fontWeight: '600' }}>{m.grade}</td>
                        <td style={{ padding: '0.75rem', fontWeight: '600', color: m.status === 'pass' ? '#16a34a' : '#dc2626', textTransform: 'uppercase' }}>
                          {m.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: '#6b7280' }}>No published examination results available yet.</p>
            )
          ) : (
            <div>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                <select
                  value={selectedExamId}
                  onChange={(e) => setSelectedExamId(e.target.value)}
                  style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
                >
                  <option value="">Select Exam</option>
                  {examinations.map((ex) => (
                    <option key={ex._id} value={ex._id}>{ex.name}</option>
                  ))}
                </select>

                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
                >
                  <option value="">Select Class</option>
                  {classes.map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>

                <button
                  onClick={handleFetchResults}
                  style={{ padding: '0.5rem 1rem', backgroundColor: '#2563eb', color: '#ffffff', fontWeight: '600', borderRadius: '0.375rem', border: 'none', cursor: 'pointer' }}
                >
                  View Class Results
                </button>
              </div>

              {classResults.length > 0 && (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                      <th style={{ padding: '0.75rem' }}>Rank</th>
                      <th style={{ padding: '0.75rem' }}>Student Name</th>
                      <th style={{ padding: '0.75rem' }}>Total Marks</th>
                      <th style={{ padding: '0.75rem' }}>Percentage</th>
                      <th style={{ padding: '0.75rem' }}>Grade</th>
                      <th style={{ padding: '0.75rem' }}>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classResults.map((resItem) => (
                      <tr key={resItem.student?._id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '0.75rem', fontWeight: '700' }}>#{resItem.summary?.rank}</td>
                        <td style={{ padding: '0.75rem', fontWeight: '500' }}>
                          {resItem.student?.firstName} {resItem.student?.lastName}
                        </td>
                        <td style={{ padding: '0.75rem' }}>{resItem.summary?.totalObtained} / {resItem.summary?.totalMax}</td>
                        <td style={{ padding: '0.75rem', fontWeight: '600' }}>{resItem.summary?.percentage}%</td>
                        <td style={{ padding: '0.75rem', fontWeight: '600' }}>{resItem.summary?.grade}</td>
                        <td style={{ padding: '0.75rem', fontWeight: '700', color: resItem.summary?.overallResult === 'PASS' ? '#16a34a' : '#dc2626' }}>
                          {resItem.summary?.overallResult}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
