import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Calendar,
  BookOpen,
  Layers,
  FileText,
  UserCheck,
  UserPlus,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  RefreshCw,
  Info,
  Check,
  Award,
  Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'http://localhost:5000/api/v1';

export default function AcademicManagementPage() {
  const { user, token } = useAuth();
  const role = (user?.role || '').toLowerCase();
  const isAdmin = role === 'super_admin' || role === 'institution_admin';

  const [activeTab, setActiveTab] = useState('years'); // 'years', 'classes', 'subjects', 'assignments', 'enrollments'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Data State
  const [academicYears, setAcademicYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teacherAssignments, setTeacherAssignments] = useState([]);
  const [studentEnrollments, setStudentEnrollments] = useState([]);
  const [teachersList, setTeachersList] = useState([]);
  const [studentsList, setStudentsList] = useState([]);

  // Active Year Selection Filter for views
  const [selectedYearId, setSelectedYearId] = useState('');

  // Search Query
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState(''); // 'create_year', 'create_class', 'create_section', 'create_subject', 'create_assignment', 'create_enrollment'

  // Forms
  const [yearForm, setYearForm] = useState({ name: '', startDate: '', endDate: '', status: 'upcoming' });
  const [classForm, setClassForm] = useState({ academicYearId: '', name: '', displayName: '', description: '', classOrder: 0 });
  const [sectionForm, setSectionForm] = useState({ classId: '', academicYearId: '', name: '', capacity: 40, roomNumber: '', classTeacherId: '' });
  const [subjectForm, setSubjectForm] = useState({ academicYearId: '', name: '', subjectCode: '', subjectType: 'core', credits: 3, description: '' });
  const [assignmentForm, setAssignmentForm] = useState({ academicYearId: '', teacherId: '', subjectId: '', classId: '', sectionId: '' });
  const [enrollmentForm, setEnrollmentForm] = useState({ academicYearId: '', studentId: '', classId: '', sectionId: '', rollNumber: '', enrollmentStatus: 'active' });

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  // Fetch Core Data
  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch Academic Years
      const yearsRes = await axios.get(`${API_BASE}/academic-years`, authHeaders);
      const yrs = yearsRes.data.data.academicYears || [];
      setAcademicYears(yrs);

      const activeYr = yrs.find(y => y.status === 'active') || yrs[0];
      const curYearId = selectedYearId || (activeYr ? activeYr._id : '');
      if (!selectedYearId && curYearId) setSelectedYearId(curYearId);

      // 2. Fetch Classes
      const classesRes = await axios.get(`${API_BASE}/classes`, authHeaders);
      setClasses(classesRes.data.data.classes || []);

      // 3. Fetch Sections
      const sectionsRes = await axios.get(`${API_BASE}/sections`, authHeaders);
      setSections(sectionsRes.data.data.sections || []);

      // 4. Fetch Subjects
      const subjectsRes = await axios.get(`${API_BASE}/subjects`, authHeaders);
      setSubjects(subjectsRes.data.data.subjects || []);

      // 5. Fetch Teacher Assignments
      const assignRes = await axios.get(`${API_BASE}/teacher-subject-assignments`, authHeaders);
      setTeacherAssignments(assignRes.data.data.assignments || []);

      // 6. Fetch Student Enrollments
      const enrollRes = await axios.get(`${API_BASE}/student-enrollments`, authHeaders);
      setStudentEnrollments(enrollRes.data.data.enrollments || []);

      // 7. Fetch Teachers & Students for select options if Admin
      if (isAdmin) {
        const teachersRes = await axios.get(`${API_BASE}/teachers?limit=100`, authHeaders);
        setTeachersList(teachersRes.data.data.teachers || []);

        const studentsRes = await axios.get(`${API_BASE}/students?limit=100`, authHeaders);
        setStudentsList(studentsRes.data.data.students || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load academic data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  // Form Submission Handlers
  const handleCreateYear = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/academic-years`, yearForm, authHeaders);
      setSuccessMsg('Academic Year created successfully!');
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create academic year.');
    }
  };

  const handleActivateYear = async (id) => {
    try {
      await axios.patch(`${API_BASE}/academic-years/${id}/activate`, {}, authHeaders);
      setSuccessMsg('Academic year set to active.');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to activate academic year.');
    }
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/classes`, classForm, authHeaders);
      setSuccessMsg('Class created successfully!');
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create class.');
    }
  };

  const handleCreateSection = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/sections`, sectionForm, authHeaders);
      setSuccessMsg('Section created successfully!');
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create section.');
    }
  };

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/subjects`, subjectForm, authHeaders);
      setSuccessMsg('Subject created successfully!');
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create subject.');
    }
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/teacher-subject-assignments`, assignmentForm, authHeaders);
      setSuccessMsg('Teacher assignment saved successfully!');
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign teacher.');
    }
  };

  const handleCreateEnrollment = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/student-enrollments`, enrollmentForm, authHeaders);
      setSuccessMsg('Student enrolled successfully!');
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to enroll student.');
    }
  };

  const openModal = (type) => {
    setModalType(type);
    const yrId = selectedYearId || (academicYears[0]?._id || '');
    if (type === 'create_class') setClassForm({ ...classForm, academicYearId: yrId });
    if (type === 'create_section') setSectionForm({ ...sectionForm, academicYearId: yrId });
    if (type === 'create_subject') setSubjectForm({ ...subjectForm, academicYearId: yrId });
    if (type === 'create_assignment') setAssignmentForm({ ...assignmentForm, academicYearId: yrId });
    if (type === 'create_enrollment') setEnrollmentForm({ ...enrollmentForm, academicYearId: yrId });
    setIsModalOpen(true);
  };

  return (
    <div style={{ padding: '28px', backgroundColor: '#f8fafc', minHeight: 'calc(100vh - 64px)', color: '#0f172a' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Academic Operations & Governance
          </h1>
          <p style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '4px' }}>
            Manage academic sessions, grades, section capacities, subjects, teacher allocations, and student enrollments.
          </p>
        </div>

        {/* Action Buttons for Admins */}
        {isAdmin && (
          <div style={{ display: 'flex', gap: '10px' }}>
            {activeTab === 'years' && (
              <button onClick={() => openModal('create_year')} style={styles.primaryBtn}>
                <Plus size={16} /> New Academic Year
              </button>
            )}
            {activeTab === 'classes' && (
              <>
                <button onClick={() => openModal('create_class')} style={styles.primaryBtn}>
                  <Plus size={16} /> Add Class / Grade
                </button>
                <button onClick={() => openModal('create_section')} style={styles.secondaryBtn}>
                  <Plus size={16} /> Add Section
                </button>
              </>
            )}
            {activeTab === 'subjects' && (
              <button onClick={() => openModal('create_subject')} style={styles.primaryBtn}>
                <Plus size={16} /> Add Subject
              </button>
            )}
            {activeTab === 'assignments' && (
              <button onClick={() => openModal('create_assignment')} style={styles.primaryBtn}>
                <UserCheck size={16} /> Assign Teacher to Subject
              </button>
            )}
            {activeTab === 'enrollments' && (
              <button onClick={() => openModal('create_enrollment')} style={styles.primaryBtn}>
                <UserPlus size={16} /> Enroll Student to Class
              </button>
            )}
          </div>
        )}
      </div>

      {/* Alert Banners */}
      {successMsg !== '' && (
        <div style={{ backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #86efac', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', fontWeight: 600 }}>
          {successMsg}
        </div>
      )}
      {error !== '' && (
        <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', fontWeight: 600 }}>
          {error}
        </div>
      )}

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e2e8f0', marginBottom: '24px' }}>
        <button
          onClick={() => setActiveTab('years')}
          style={{ ...styles.tabBtn, borderBottom: activeTab === 'years' ? '3px solid #4f46e5' : '3px solid transparent', color: activeTab === 'years' ? '#4f46e5' : '#64748b' }}
        >
          <Calendar size={18} /> Academic Years
        </button>

        <button
          onClick={() => setActiveTab('classes')}
          style={{ ...styles.tabBtn, borderBottom: activeTab === 'classes' ? '3px solid #4f46e5' : '3px solid transparent', color: activeTab === 'classes' ? '#4f46e5' : '#64748b' }}
        >
          <Layers size={18} /> Classes & Sections
        </button>

        <button
          onClick={() => setActiveTab('subjects')}
          style={{ ...styles.tabBtn, borderBottom: activeTab === 'subjects' ? '3px solid #4f46e5' : '3px solid transparent', color: activeTab === 'subjects' ? '#4f46e5' : '#64748b' }}
        >
          <BookOpen size={18} /> Subjects
        </button>

        <button
          onClick={() => setActiveTab('assignments')}
          style={{ ...styles.tabBtn, borderBottom: activeTab === 'assignments' ? '3px solid #4f46e5' : '3px solid transparent', color: activeTab === 'assignments' ? '#4f46e5' : '#64748b' }}
        >
          <UserCheck size={18} /> Teacher Allocations
        </button>

        <button
          onClick={() => setActiveTab('enrollments')}
          style={{ ...styles.tabBtn, borderBottom: activeTab === 'enrollments' ? '3px solid #4f46e5' : '3px solid transparent', color: activeTab === 'enrollments' ? '#4f46e5' : '#64748b' }}
        >
          <UserPlus size={18} /> Student Enrollments
        </button>
      </div>

      {/* TAB 1: ACADEMIC YEARS */}
      {activeTab === 'years' && (
        <div style={styles.cardContainer}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>Academic Sessions</h3>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Total Years: {academicYears.length}</span>
          </div>

          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={styles.th}>Session Name</th>
                <th style={styles.th}>Start Date</th>
                <th style={styles.th}>End Date</th>
                <th style={styles.th}>Status</th>
                {isAdmin && <th style={styles.th}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {academicYears.map(yr => (
                <tr key={yr._id} style={styles.tr}>
                  <td style={{ ...styles.td, fontWeight: 700 }}>{yr.name}</td>
                  <td style={styles.td}>{new Date(yr.startDate).toLocaleDateString()}</td>
                  <td style={styles.td}>{new Date(yr.endDate).toLocaleDateString()}</td>
                  <td style={styles.td}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      backgroundColor: yr.status === 'active' ? '#dcfce7' : yr.status === 'upcoming' ? '#e0f2fe' : '#f1f5f9',
                      color: yr.status === 'active' ? '#166534' : yr.status === 'upcoming' ? '#075985' : '#475569'
                    }}>
                      {yr.status.toUpperCase()}
                    </span>
                  </td>
                  {isAdmin && (
                    <td style={styles.td}>
                      {yr.status !== 'active' && (
                        <button
                          onClick={() => handleActivateYear(yr._id)}
                          style={{ backgroundColor: '#e0e7ff', color: '#4338ca', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Set Active
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: CLASSES & SECTIONS */}
      {activeTab === 'classes' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          
          {/* Classes Column */}
          <div style={styles.cardContainer}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 16px 0', color: '#0f172a' }}>Classes & Grades</h3>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>Class Name</th>
                  <th style={styles.th}>Academic Year</th>
                  <th style={styles.th}>Order</th>
                </tr>
              </thead>
              <tbody>
                {classes.map(c => (
                  <tr key={c._id} style={styles.tr}>
                    <td style={{ ...styles.td, fontWeight: 700 }}>{c.name}</td>
                    <td style={styles.td}>{c.academicYearId?.name || 'N/A'}</td>
                    <td style={styles.td}>{c.classOrder}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Sections Column */}
          <div style={styles.cardContainer}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 16px 0', color: '#0f172a' }}>Sections / Divisions</h3>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>Class</th>
                  <th style={styles.th}>Section</th>
                  <th style={styles.th}>Room</th>
                  <th style={styles.th}>Capacity</th>
                </tr>
              </thead>
              <tbody>
                {sections.map(s => (
                  <tr key={s._id} style={styles.tr}>
                    <td style={styles.td}>{s.classId?.name || 'N/A'}</td>
                    <td style={{ ...styles.td, fontWeight: 700 }}>Section {s.name}</td>
                    <td style={styles.td}>{s.roomNumber || 'Unassigned'}</td>
                    <td style={styles.td}>{s.capacity} seats</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* TAB 3: SUBJECTS */}
      {activeTab === 'subjects' && (
        <div style={styles.cardContainer}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 16px 0', color: '#0f172a' }}>Curriculum & Subjects</h3>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={styles.th}>Code</th>
                <th style={styles.th}>Subject Name</th>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>Credits</th>
                <th style={styles.th}>Academic Year</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map(s => (
                <tr key={s._id} style={styles.tr}>
                  <td style={{ ...styles.td, fontWeight: 700, color: '#4f46e5' }}>{s.subjectCode}</td>
                  <td style={{ ...styles.td, fontWeight: 600 }}>{s.name}</td>
                  <td style={styles.td}>
                    <span style={{ padding: '3px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#f1f5f9', color: '#334155', textTransform: 'uppercase' }}>
                      {s.subjectType}
                    </span>
                  </td>
                  <td style={styles.td}>{s.credits}</td>
                  <td style={styles.td}>{s.academicYearId?.name || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4: TEACHER ALLOCATIONS */}
      {activeTab === 'assignments' && (
        <div style={styles.cardContainer}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 16px 0', color: '#0f172a' }}>Teacher Subject Allocations</h3>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={styles.th}>Teacher</th>
                <th style={styles.th}>Subject</th>
                <th style={styles.th}>Class</th>
                <th style={styles.th}>Section</th>
                <th style={styles.th}>Academic Session</th>
              </tr>
            </thead>
            <tbody>
              {teacherAssignments.map(ta => (
                <tr key={ta._id} style={styles.tr}>
                  <td style={{ ...styles.td, fontWeight: 700 }}>{ta.teacherId?.userId?.fullName || 'Teacher'}</td>
                  <td style={styles.td}>{ta.subjectId?.name} ({ta.subjectId?.subjectCode})</td>
                  <td style={styles.td}>{ta.classId?.name}</td>
                  <td style={styles.td}>Section {ta.sectionId?.name}</td>
                  <td style={styles.td}>{ta.academicYearId?.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 5: STUDENT ENROLLMENTS */}
      {activeTab === 'enrollments' && (
        <div style={styles.cardContainer}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 16px 0', color: '#0f172a' }}>Student Class Enrollments</h3>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={styles.th}>Roll No</th>
                <th style={styles.th}>Student Name</th>
                <th style={styles.th}>Class</th>
                <th style={styles.th}>Section</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Academic Year</th>
              </tr>
            </thead>
            <tbody>
              {studentEnrollments.map(se => (
                <tr key={se._id} style={styles.tr}>
                  <td style={{ ...styles.td, fontWeight: 700, color: '#4f46e5' }}>{se.rollNumber || 'N/A'}</td>
                  <td style={{ ...styles.td, fontWeight: 600 }}>{se.studentId?.userId?.fullName || 'Student'}</td>
                  <td style={styles.td}>{se.classId?.name}</td>
                  <td style={styles.td}>Section {se.sectionId?.name}</td>
                  <td style={styles.td}>
                    <span style={{ padding: '3px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#dcfce7', color: '#166534', textTransform: 'capitalize' }}>
                      {se.enrollmentStatus}
                    </span>
                  </td>
                  <td style={styles.td}>{se.academicYearId?.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODALS */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', width: '100%', maxWidth: '520px', padding: '28px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {modalType === 'create_year' && 'Create Academic Year'}
                {modalType === 'create_class' && 'Add Class / Grade'}
                {modalType === 'create_section' && 'Add Section / Division'}
                {modalType === 'create_subject' && 'Add Subject'}
                {modalType === 'create_assignment' && 'Assign Teacher to Subject'}
                {modalType === 'create_enrollment' && 'Enroll Student'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <XCircle size={22} />
              </button>
            </div>

            {/* FORM: YEAR */}
            {modalType === 'create_year' && (
              <form onSubmit={handleCreateYear} style={styles.formStack}>
                <div>
                  <label style={styles.label}>Session Name (e.g. 2026-27) *</label>
                  <input type="text" required value={yearForm.name} onChange={(e) => setYearForm({ ...yearForm, name: e.target.value })} style={styles.input} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={styles.label}>Start Date *</label>
                    <input type="date" required value={yearForm.startDate} onChange={(e) => setYearForm({ ...yearForm, startDate: e.target.value })} style={styles.input} />
                  </div>
                  <div>
                    <label style={styles.label}>End Date *</label>
                    <input type="date" required value={yearForm.endDate} onChange={(e) => setYearForm({ ...yearForm, endDate: e.target.value })} style={styles.input} />
                  </div>
                </div>
                <div>
                  <label style={styles.label}>Status</label>
                  <select value={yearForm.status} onChange={(e) => setYearForm({ ...yearForm, status: e.target.value })} style={styles.input}>
                    <option value="upcoming">Upcoming</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <button type="submit" style={styles.primaryBtn}>Save Academic Year</button>
              </form>
            )}

            {/* FORM: CLASS */}
            {modalType === 'create_class' && (
              <form onSubmit={handleCreateClass} style={styles.formStack}>
                <div>
                  <label style={styles.label}>Class Name (e.g. Grade 10) *</label>
                  <input type="text" required value={classForm.name} onChange={(e) => setClassForm({ ...classForm, name: e.target.value })} style={styles.input} />
                </div>
                <div>
                  <label style={styles.label}>Academic Session *</label>
                  <select required value={classForm.academicYearId} onChange={(e) => setClassForm({ ...classForm, academicYearId: e.target.value })} style={styles.input}>
                    <option value="">Select Academic Year</option>
                    {academicYears.map(y => <option key={y._id} value={y._id}>{y.name}</option>)}
                  </select>
                </div>
                <button type="submit" style={styles.primaryBtn}>Save Class</button>
              </form>
            )}

            {/* FORM: SECTION */}
            {modalType === 'create_section' && (
              <form onSubmit={handleCreateSection} style={styles.formStack}>
                <div>
                  <label style={styles.label}>Select Class *</label>
                  <select required value={sectionForm.classId} onChange={(e) => setSectionForm({ ...sectionForm, classId: e.target.value })} style={styles.input}>
                    <option value="">Select Class</option>
                    {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={styles.label}>Section Name (e.g. A, B, C) *</label>
                  <input type="text" required value={sectionForm.name} onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })} style={styles.input} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={styles.label}>Room Number</label>
                    <input type="text" value={sectionForm.roomNumber} onChange={(e) => setSectionForm({ ...sectionForm, roomNumber: e.target.value })} style={styles.input} />
                  </div>
                  <div>
                    <label style={styles.label}>Capacity</label>
                    <input type="number" required value={sectionForm.capacity} onChange={(e) => setSectionForm({ ...sectionForm, capacity: e.target.value })} style={styles.input} />
                  </div>
                </div>
                <button type="submit" style={styles.primaryBtn}>Save Section</button>
              </form>
            )}

            {/* FORM: SUBJECT */}
            {modalType === 'create_subject' && (
              <form onSubmit={handleCreateSubject} style={styles.formStack}>
                <div>
                  <label style={styles.label}>Subject Name *</label>
                  <input type="text" required value={subjectForm.name} onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })} style={styles.input} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={styles.label}>Code (e.g. MATH101) *</label>
                    <input type="text" required value={subjectForm.subjectCode} onChange={(e) => setSubjectForm({ ...subjectForm, subjectCode: e.target.value })} style={styles.input} />
                  </div>
                  <div>
                    <label style={styles.label}>Credits</label>
                    <input type="number" value={subjectForm.credits} onChange={(e) => setSubjectForm({ ...subjectForm, credits: e.target.value })} style={styles.input} />
                  </div>
                </div>
                <div>
                  <label style={styles.label}>Academic Session *</label>
                  <select required value={subjectForm.academicYearId} onChange={(e) => setSubjectForm({ ...subjectForm, academicYearId: e.target.value })} style={styles.input}>
                    <option value="">Select Academic Year</option>
                    {academicYears.map(y => <option key={y._id} value={y._id}>{y.name}</option>)}
                  </select>
                </div>
                <button type="submit" style={styles.primaryBtn}>Save Subject</button>
              </form>
            )}

            {/* FORM: TEACHER ASSIGNMENT */}
            {modalType === 'create_assignment' && (
              <form onSubmit={handleCreateAssignment} style={styles.formStack}>
                <div>
                  <label style={styles.label}>Select Teacher *</label>
                  <select required value={assignmentForm.teacherId} onChange={(e) => setAssignmentForm({ ...assignmentForm, teacherId: e.target.value })} style={styles.input}>
                    <option value="">Select Teacher Profile</option>
                    {teachersList.map(t => <option key={t._id} value={t._id}>{t.userId?.fullName} ({t.employeeId})</option>)}
                  </select>
                </div>
                <div>
                  <label style={styles.label}>Select Subject *</label>
                  <select required value={assignmentForm.subjectId} onChange={(e) => setAssignmentForm({ ...assignmentForm, subjectId: e.target.value })} style={styles.input}>
                    <option value="">Select Subject</option>
                    {subjects.map(s => <option key={s._id} value={s._id}>{s.name} ({s.subjectCode})</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={styles.label}>Select Class *</label>
                    <select required value={assignmentForm.classId} onChange={(e) => setAssignmentForm({ ...assignmentForm, classId: e.target.value })} style={styles.input}>
                      <option value="">Select Class</option>
                      {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={styles.label}>Select Section *</label>
                    <select required value={assignmentForm.sectionId} onChange={(e) => setAssignmentForm({ ...assignmentForm, sectionId: e.target.value })} style={styles.input}>
                      <option value="">Select Section</option>
                      {sections.filter(sec => !assignmentForm.classId || sec.classId?._id === assignmentForm.classId || sec.classId === assignmentForm.classId).map(sec => (
                        <option key={sec._id} value={sec._id}>Section {sec.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button type="submit" style={styles.primaryBtn}>Assign Teacher</button>
              </form>
            )}

            {/* FORM: STUDENT ENROLLMENT */}
            {modalType === 'create_enrollment' && (
              <form onSubmit={handleCreateEnrollment} style={styles.formStack}>
                <div>
                  <label style={styles.label}>Select Student *</label>
                  <select required value={enrollmentForm.studentId} onChange={(e) => setEnrollmentForm({ ...enrollmentForm, studentId: e.target.value })} style={styles.input}>
                    <option value="">Select Student Profile</option>
                    {studentsList.map(st => <option key={st._id} value={st._id}>{st.userId?.fullName} (ID: {st.studentId})</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={styles.label}>Select Class *</label>
                    <select required value={enrollmentForm.classId} onChange={(e) => setEnrollmentForm({ ...enrollmentForm, classId: e.target.value })} style={styles.input}>
                      <option value="">Select Class</option>
                      {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={styles.label}>Select Section *</label>
                    <select required value={enrollmentForm.sectionId} onChange={(e) => setEnrollmentForm({ ...enrollmentForm, sectionId: e.target.value })} style={styles.input}>
                      <option value="">Select Section</option>
                      {sections.filter(sec => !enrollmentForm.classId || sec.classId?._id === enrollmentForm.classId || sec.classId === enrollmentForm.classId).map(sec => (
                        <option key={sec._id} value={sec._id}>Section {sec.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={styles.label}>Roll Number</label>
                  <input type="text" value={enrollmentForm.rollNumber} onChange={(e) => setEnrollmentForm({ ...enrollmentForm, rollNumber: e.target.value })} style={styles.input} />
                </div>
                <button type="submit" style={styles.primaryBtn}>Enroll Student</button>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}

const styles = {
  tabBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 18px',
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '0.9rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: '14px',
    border: '1px solid #e2e8f0',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left'
  },
  thRow: {
    backgroundColor: '#f8fafc',
    borderBottom: '1px solid #e2e8f0'
  },
  th: {
    padding: '10px 14px',
    fontSize: '0.8rem',
    fontWeight: 700,
    color: '#475569',
    textTransform: 'uppercase'
  },
  tr: {
    borderBottom: '1px solid #f1f5f9'
  },
  td: {
    padding: '12px 14px',
    fontSize: '0.875rem',
    color: '#1e293b'
  },
  primaryBtn: {
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    padding: '10px 16px',
    borderRadius: '8px',
    fontWeight: 600,
    fontSize: '0.85rem',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px'
  },
  secondaryBtn: {
    backgroundColor: '#ffffff',
    color: '#334155',
    border: '1px solid #cbd5e1',
    padding: '10px 16px',
    borderRadius: '8px',
    fontWeight: 600,
    fontSize: '0.85rem',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px'
  },
  formStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  },
  label: {
    display: 'block',
    fontSize: '0.85rem',
    fontWeight: 700,
    color: '#334155',
    marginBottom: '4px'
  },
  input: {
    width: '100%',
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    fontSize: '0.9rem',
    color: '#0f172a'
  }
};
