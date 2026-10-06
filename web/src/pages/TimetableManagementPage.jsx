import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Calendar,
  Clock,
  Plus,
  Filter,
  CheckCircle2,
  AlertCircle,
  Building,
  User,
  BookOpen,
  Trash2,
  Edit2,
  RefreshCw,
  Layers,
  MapPin,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'http://localhost:5000/api/v1';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function TimetableManagementPage() {
  const { user, token } = useAuth();
  const role = (user?.role || '').toLowerCase();
  const isAdmin = role === 'super_admin' || role === 'institution_admin';
  const isTeacher = role === 'teacher';
  const isStudent = role === 'student';
  const isParent = role === 'parent';

  // Loaders & Feedback
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Tab Selection
  const [activeTab, setActiveTab] = useState('grid'); // 'grid', 'manage_slots', 'manage_rooms'

  // Master Dropdown Data
  const [academicYears, setAcademicYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teacherAssignments, setTeacherAssignments] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [timetables, setTimetables] = useState([]);
  const [parentChildData, setParentChildData] = useState([]);

  // Filters
  const [selectedYearId, setSelectedYearId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedChildId, setSelectedChildId] = useState('');

  // Modal / Form States for Timetable Entry
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [entryForm, setEntryForm] = useState({
    academicYearId: '',
    classId: '',
    sectionId: '',
    subjectId: '',
    teacherId: '',
    dayOfWeek: 'Monday',
    periodNumber: 1,
    startTime: '08:00',
    endTime: '08:45',
    roomId: '',
    roomName: ''
  });

  // Modal / Form States for TimeSlot
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [slotForm, setSlotForm] = useState({
    academicYearId: '',
    periodNumber: 1,
    periodName: 'Period 1',
    startTime: '08:00',
    endTime: '08:45',
    type: 'lecture'
  });

  // Modal / Form States for Room
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [roomForm, setRoomForm] = useState({
    roomNumber: '',
    name: '',
    roomType: 'classroom',
    capacity: 40,
    building: '',
    floor: ''
  });

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  // Fetch Master Data on Mount
  useEffect(() => {
    fetchMasterData();
  }, []);

  // Re-fetch timetable entries when filters or tabs change
  useEffect(() => {
    if (selectedYearId || isStudent || isParent || isTeacher) {
      fetchTimetableEntries();
    }
  }, [selectedYearId, selectedClassId, selectedSectionId, selectedDay, selectedChildId]);

  const fetchMasterData = async () => {
    try {
      setLoading(true);
      setError('');

      const [ayRes, clsRes, subRes, slotsRes, roomsRes, asgRes] = await Promise.all([
        axios.get(`${API_BASE}/academic-years`, authHeaders).catch(() => ({ data: { academicYears: [], data: [] } })),
        axios.get(`${API_BASE}/classes`, authHeaders).catch(() => ({ data: { classes: [], data: [] } })),
        axios.get(`${API_BASE}/subjects`, authHeaders).catch(() => ({ data: { subjects: [], data: [] } })),
        axios.get(`${API_BASE}/time-slots`, authHeaders).catch(() => ({ data: { data: { timeSlots: [] } } })),
        axios.get(`${API_BASE}/rooms`, authHeaders).catch(() => ({ data: { data: { rooms: [] } } })),
        axios.get(`${API_BASE}/teacher-subject-assignments`, authHeaders).catch(() => ({ data: { data: { assignments: [] } } }))
      ]);

      const ayList = ayRes.data?.academicYears || ayRes.data?.data || [];
      const clsList = clsRes.data?.classes || clsRes.data?.data || [];
      const subList = subRes.data?.subjects || subRes.data?.data || [];
      const slotList = slotsRes.data?.data?.timeSlots || [];
      const roomList = roomsRes.data?.data?.rooms || [];
      const asgList = asgRes.data?.data?.assignments || asgRes.data?.assignments || [];

      setAcademicYears(ayList);
      setClasses(clsList);
      setSubjects(subList);
      setTimeSlots(slotList);
      setRooms(roomList);
      setTeacherAssignments(asgList);

      const activeAY = ayList.find((y) => y.status === 'active' || y.isActive) || ayList[0];
      if (activeAY) {
        setSelectedYearId(activeAY._id);
        setEntryForm((prev) => ({ ...prev, academicYearId: activeAY._id }));
        setSlotForm((prev) => ({ ...prev, academicYearId: activeAY._id }));
      }

      if (clsList.length > 0) {
        setSelectedClassId(clsList[0]._id);
        fetchSectionsForClass(clsList[0]._id);
      }

      if (isParent) {
        fetchParentChildData();
      }
    } catch (err) {
      setError('Failed to load master metadata: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchSectionsForClass = async (classId) => {
    try {
      if (!classId) return;
      const res = await axios.get(`${API_BASE}/sections?classId=${classId}`, authHeaders);
      const list = res.data?.sections || res.data?.data || [];
      setSections(list);
      if (list.length > 0) {
        setSelectedSectionId(list[0]._id);
      } else {
        setSelectedSectionId('');
      }
    } catch (err) {
      setSections([]);
    }
  };

  const fetchParentChildData = async () => {
    try {
      const res = await axios.get(`${API_BASE}/timetables/parent/${user._id}`, authHeaders);
      const data = res.data?.data?.childTimetables || [];
      setParentChildData(data);
      if (data.length > 0) {
        setSelectedChildId(data[0].student?._id || '');
      }
    } catch (err) {
      setParentChildData([]);
    }
  };

  const fetchTimetableEntries = async () => {
    try {
      setLoading(true);
      setError('');
      setTimetables([]);

      let url = `${API_BASE}/timetables`;
      const params = new URLSearchParams();

      if (selectedYearId) params.append('academicYearId', selectedYearId);
      if (selectedDay) params.append('dayOfWeek', selectedDay);

      if (isAdmin) {
        if (selectedClassId) params.append('classId', selectedClassId);
        if (selectedSectionId) params.append('sectionId', selectedSectionId);
      } else if (isTeacher) {
        // Teacher timetable endpoint or filter
        url = `${API_BASE}/timetables`;
      } else if (isStudent) {
        url = `${API_BASE}/timetables`;
      } else if (isParent && selectedChildId) {
        url = `${API_BASE}/timetables/student/${selectedChildId}`;
      }

      const queryString = params.toString();
      const finalUrl = queryString ? `${url}?${queryString}` : url;

      const res = await axios.get(finalUrl, authHeaders);
      const list = res.data?.data?.timetables || res.data?.timetables || [];
      setTimetables(list);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load timetables');
    } finally {
      setLoading(false);
    }
  };

  const handleClassChange = (classId) => {
    setSelectedClassId(classId);
    fetchSectionsForClass(classId);
  };

  // Filter Teacher Assignments by selected Class, Section, and Subject in Form
  const getAuthorizedTeachersForForm = () => {
    const { classId, sectionId, subjectId, academicYearId } = entryForm;
    if (!classId || !sectionId || !subjectId) return [];

    const matched = teacherAssignments.filter((asg) => {
      const cId = typeof asg.classId === 'object' ? asg.classId?._id : asg.classId;
      const sId = typeof asg.sectionId === 'object' ? asg.sectionId?._id : asg.sectionId;
      const subId = typeof asg.subjectId === 'object' ? asg.subjectId?._id : asg.subjectId;
      const ayId = typeof asg.academicYearId === 'object' ? asg.academicYearId?._id : asg.academicYearId;

      return (
        cId?.toString() === classId?.toString() &&
        sId?.toString() === sectionId?.toString() &&
        subId?.toString() === subjectId?.toString() &&
        (!academicYearId || ayId?.toString() === academicYearId?.toString())
      );
    });

    return matched.map((asg) => asg.teacherId);
  };

  // Open Modal for New Entry
  const openNewEntryModal = (day = 'Monday', period = 1) => {
    setError('');
    setSuccessMsg('');
    setEditingEntryId(null);
    const slot = timeSlots.find((s) => s.periodNumber === period);

    setEntryForm({
      academicYearId: selectedYearId || (academicYears[0]?._id || ''),
      classId: selectedClassId || (classes[0]?._id || ''),
      sectionId: selectedSectionId || (sections[0]?._id || ''),
      subjectId: subjects[0]?._id || '',
      teacherId: '',
      dayOfWeek: day,
      periodNumber: period,
      startTime: slot ? slot.startTime : '08:00',
      endTime: slot ? slot.endTime : '08:45',
      roomId: '',
      roomName: ''
    });
    setShowEntryModal(true);
  };

  // Open Modal for Editing Entry
  const openEditEntryModal = (entry) => {
    setError('');
    setSuccessMsg('');
    setEditingEntryId(entry._id);

    setEntryForm({
      academicYearId: entry.academicYearId?._id || entry.academicYearId,
      classId: entry.classId?._id || entry.classId,
      sectionId: entry.sectionId?._id || entry.sectionId,
      subjectId: entry.subjectId?._id || entry.subjectId,
      teacherId: entry.teacherId?._id || entry.teacherId,
      dayOfWeek: entry.dayOfWeek,
      periodNumber: entry.periodNumber,
      startTime: entry.startTime,
      endTime: entry.endTime,
      roomId: entry.roomId?._id || entry.roomId || '',
      roomName: entry.roomName || ''
    });

    if (entry.classId?._id) {
      fetchSectionsForClass(entry.classId._id);
    }
    setShowEntryModal(true);
  };

  // Submit Timetable Entry Form
  const handleSaveEntry = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError('');
      setSuccessMsg('');

      if (!entryForm.teacherId) {
        setError('Please select an authorized teacher.');
        setSubmitting(false);
        return;
      }

      if (editingEntryId) {
        await axios.patch(`${API_BASE}/timetables/${editingEntryId}`, entryForm, authHeaders);
        setSuccessMsg('Timetable entry updated successfully.');
      } else {
        await axios.post(`${API_BASE}/timetables`, entryForm, authHeaders);
        setSuccessMsg('Timetable entry created successfully.');
      }

      setShowEntryModal(false);
      fetchTimetableEntries();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save timetable entry');
    } finally {
      setSubmitting(false);
    }
  };

  // Deactivate Timetable Entry
  const handleDeactivateEntry = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate this timetable entry?')) return;
    try {
      setSubmitting(true);
      await axios.delete(`${API_BASE}/timetables/${id}`, authHeaders);
      setSuccessMsg('Timetable entry deactivated successfully.');
      fetchTimetableEntries();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to deactivate entry');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit TimeSlot Form
  const handleSaveSlot = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError('');
      await axios.post(`${API_BASE}/time-slots`, slotForm, authHeaders);
      setSuccessMsg('Time slot created successfully.');
      setShowSlotModal(false);
      // Refresh time slots
      const res = await axios.get(`${API_BASE}/time-slots`, authHeaders);
      setTimeSlots(res.data?.data?.timeSlots || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save time slot');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Room Form
  const handleSaveRoom = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError('');
      await axios.post(`${API_BASE}/rooms`, roomForm, authHeaders);
      setSuccessMsg('Room created successfully.');
      setShowRoomModal(false);
      // Refresh rooms
      const res = await axios.get(`${API_BASE}/rooms`, authHeaders);
      setRooms(res.data?.data?.rooms || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save room');
    } finally {
      setSubmitting(false);
    }
  };

  // Prepare Grid Slots
  const displaySlots = timeSlots.length > 0 ? timeSlots : [
    { periodNumber: 1, periodName: 'Period 1', startTime: '08:00', endTime: '08:45' },
    { periodNumber: 2, periodName: 'Period 2', startTime: '08:45', endTime: '09:30' },
    { periodNumber: 3, periodName: 'Period 3', startTime: '09:30', endTime: '10:15' },
    { periodNumber: 4, periodName: 'Period 4', startTime: '10:30', endTime: '11:15' },
    { periodNumber: 5, periodName: 'Period 5', startTime: '11:15', endTime: '12:00' },
    { periodNumber: 6, periodName: 'Period 6', startTime: '12:00', endTime: '12:45' }
  ];

  // Helper to get timetable cell entry
  const getCellEntry = (day, periodNumber) => {
    return timetables.find(
      (t) => t.dayOfWeek === day && t.periodNumber === periodNumber && t.isActive !== false
    );
  };

  const authorizedTeachers = getAuthorizedTeachersForForm();

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Calendar size={28} color="#4f46e5" />
            Timetable & Scheduling Management
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px', margin: 0 }}>
            {isAdmin && 'Institution-wide academic timetable, period slots, and classroom allocation.'}
            {isTeacher && 'My teaching schedule and class timetable allocations.'}
            {isStudent && 'My class section weekly timetable schedule.'}
            {isParent && "Linked child's class schedule overview."}
          </p>
        </div>

        {isAdmin && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => openNewEntryModal('Monday', 1)}
              style={{
                backgroundColor: '#4f46e5',
                color: '#ffffff',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Plus size={16} /> Add Schedule Entry
            </button>
          </div>
        )}
      </div>

      {/* Alert Banners */}
      {error && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Admin Tab Navigation & Controls */}
      {isAdmin && (
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
          <button
            onClick={() => setActiveTab('grid')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              fontWeight: '600',
              fontSize: '14px',
              cursor: 'pointer',
              backgroundColor: activeTab === 'grid' ? '#4f46e5' : '#e2e8f0',
              color: activeTab === 'grid' ? '#ffffff' : '#475569'
            }}
          >
            🗓️ Weekly Timetable Grid
          </button>
          <button
            onClick={() => setActiveTab('manage_slots')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              fontWeight: '600',
              fontSize: '14px',
              cursor: 'pointer',
              backgroundColor: activeTab === 'manage_slots' ? '#4f46e5' : '#e2e8f0',
              color: activeTab === 'manage_slots' ? '#ffffff' : '#475569'
            }}
          >
            ⏰ Manage Time Slots ({timeSlots.length})
          </button>
          <button
            onClick={() => setActiveTab('manage_rooms')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              fontWeight: '600',
              fontSize: '14px',
              cursor: 'pointer',
              backgroundColor: activeTab === 'manage_rooms' ? '#4f46e5' : '#e2e8f0',
              color: activeTab === 'manage_rooms' ? '#ffffff' : '#475569'
            }}
          >
            🏫 Manage Classrooms & Labs ({rooms.length})
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      {activeTab === 'grid' && (
        <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
          
          {/* Academic Year Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Academic Year</label>
            <select
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', minWidth: '160px' }}
            >
              {academicYears.map((ay) => (
                <option key={ay._id} value={ay._id}>
                  {ay.name} {ay.status === 'active' ? '(Current)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Admin Class Selector */}
          {isAdmin && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Class</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => handleClassChange(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', minWidth: '140px' }}
                >
                  {classes.map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Section</label>
                <select
                  value={selectedSectionId}
                  onChange={(e) => setSelectedSectionId(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', minWidth: '120px' }}
                >
                  {sections.map((s) => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Parent Child Selector */}
          {isParent && parentChildData.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Linked Child</label>
              <select
                value={selectedChildId}
                onChange={(e) => setSelectedChildId(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', minWidth: '180px' }}
              >
                {parentChildData.map((item) => (
                  <option key={item.student?._id} value={item.student?._id}>
                    {item.student?.userId?.fullName || 'Child'} ({item.enrollment?.classId?.name} - {item.enrollment?.sectionId?.name})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Day Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Filter Day</label>
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', minWidth: '130px' }}
            >
              <option value="">All Days</option>
              {DAYS_OF_WEEK.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchTimetableEntries}
            style={{
              marginTop: '18px',
              backgroundColor: '#f1f5f9',
              border: '1px solid #cbd5e1',
              padding: '8px 12px',
              borderRadius: '6px',
              color: '#334155',
              fontWeight: '600',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RefreshCw size={14} /> Refresh Grid
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <RefreshCw size={32} color="#4f46e5" style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: '12px', color: '#64748b', fontSize: '14px' }}>Loading timetable schedule data...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: WEEKLY TIMETABLE GRID VIEW */}
          {activeTab === 'grid' && (
            <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', overflowX: 'auto', padding: '16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                    <th style={{ padding: '12px', fontSize: '13px', fontWeight: '700', color: '#334155', width: '120px' }}>Time Slot</th>
                    {DAYS_OF_WEEK.map((day) => (
                      <th key={day} style={{ padding: '12px', fontSize: '13px', fontWeight: '700', color: '#334155', textAlign: 'center' }}>
                        {day.substring(0, 3).toUpperCase()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displaySlots.map((slot) => (
                    <tr key={slot.periodNumber} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      
                      {/* Period Header Column */}
                      <td style={{ padding: '12px', backgroundColor: '#fafafa', borderRight: '1px solid #e2e8f0', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '13px' }}>
                          {slot.periodName || `Period ${slot.periodNumber}`}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={11} /> {slot.startTime} – {slot.endTime}
                        </div>
                      </td>

                      {/* Day Columns */}
                      {DAYS_OF_WEEK.map((day) => {
                        const entry = getCellEntry(day, slot.periodNumber);
                        const teacherName = entry?.teacherId?.userId?.fullName || 'Teacher';
                        const subjectName = entry?.subjectId?.name || '';
                        const roomLabel = entry?.roomId?.name || entry?.roomId?.roomNumber || entry?.roomName || '';
                        const className = entry?.classId?.name || '';
                        const sectionName = entry?.sectionId?.name || '';

                        return (
                          <td
                            key={day}
                            style={{
                              padding: '8px',
                              borderRight: '1px solid #f1f5f9',
                              verticalAlign: 'top',
                              backgroundColor: entry ? '#f8fafc' : '#ffffff',
                              height: '90px'
                            }}
                          >
                            {entry ? (
                              <div style={{
                                border: '1px solid #cbd5e1',
                                borderRadius: '8px',
                                padding: '8px',
                                backgroundColor: '#ffffff',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between'
                              }}>
                                <div>
                                  {/* Subject Header */}
                                  <div style={{ fontWeight: '700', fontSize: '13px', color: '#0f172a', marginBottom: '2px' }}>
                                    {subjectName}
                                  </div>

                                  {/* Class & Section tag if in Teacher view */}
                                  {isTeacher && (
                                    <div style={{ fontSize: '11px', color: '#4f46e5', fontWeight: '600' }}>
                                      Class {className} - {sectionName}
                                    </div>
                                  )}

                                  {/* Teacher name if in Admin/Student/Parent view */}
                                  {!isTeacher && (
                                    <div style={{ fontSize: '11px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                      <User size={11} color="#64748b" /> {teacherName}
                                    </div>
                                  )}

                                  {/* Room tag */}
                                  {roomLabel && (
                                    <div style={{ fontSize: '11px', color: '#059669', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', fontWeight: '600' }}>
                                      <MapPin size={11} /> {roomLabel}
                                    </div>
                                  )}
                                </div>

                                {/* Admin Action Icons */}
                                {isAdmin && (
                                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '6px', paddingTop: '4px', borderTop: '1px dashed #e2e8f0' }}>
                                    <button
                                      onClick={() => openEditEntryModal(entry)}
                                      title="Edit Entry"
                                      style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#2563eb', padding: '2px' }}
                                    >
                                      <Edit2 size={13} />
                                    </button>
                                    <button
                                      onClick={() => handleDeactivateEntry(entry._id)}
                                      title="Deactivate Entry"
                                      style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626', padding: '2px' }}
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              isAdmin ? (
                                <div
                                  onClick={() => openNewEntryModal(day, slot.periodNumber)}
                                  style={{
                                    height: '100%',
                                    border: '1px dashed #e2e8f0',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#94a3b8',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                  }}
                                  onMouseOver={(e) => (e.currentTarget.style.borderColor = '#4f46e5')}
                                  onMouseOut={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
                                >
                                  + Assign
                                </div>
                              ) : (
                                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', fontSize: '11px', fontStyle: 'italic' }}>
                                  Free
                                </div>
                              )
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: MANAGE TIME SLOTS */}
          {activeTab === 'manage_slots' && isAdmin && (
            <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Institutional Period Time Slots</h3>
                <button
                  onClick={() => { setError(''); setShowSlotModal(true); }}
                  style={{ backgroundColor: '#4f46e5', color: '#ffffff', border: 'none', padding: '8px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                >
                  + Create Time Slot
                </button>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                    <th style={{ padding: '10px', fontSize: '13px', fontWeight: '700', color: '#334155' }}>Period #</th>
                    <th style={{ padding: '10px', fontSize: '13px', fontWeight: '700', color: '#334155' }}>Name</th>
                    <th style={{ padding: '10px', fontSize: '13px', fontWeight: '700', color: '#334155' }}>Start Time</th>
                    <th style={{ padding: '10px', fontSize: '13px', fontWeight: '700', color: '#334155' }}>End Time</th>
                    <th style={{ padding: '10px', fontSize: '13px', fontWeight: '700', color: '#334155' }}>Type</th>
                    <th style={{ padding: '10px', fontSize: '13px', fontWeight: '700', color: '#334155' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map((slot) => (
                    <tr key={slot._id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '10px', fontWeight: '700', color: '#0f172a' }}>Period {slot.periodNumber}</td>
                      <td style={{ padding: '10px', color: '#334155' }}>{slot.periodName}</td>
                      <td style={{ padding: '10px', color: '#334155' }}>{slot.startTime}</td>
                      <td style={{ padding: '10px', color: '#334155' }}>{slot.endTime}</td>
                      <td style={{ padding: '10px', color: '#4f46e5', textTransform: 'capitalize', fontWeight: '600' }}>{slot.type}</td>
                      <td style={{ padding: '10px' }}>
                        <span style={{ backgroundColor: slot.isActive ? '#dcfce7' : '#f1f5f9', color: slot.isActive ? '#15803d' : '#64748b', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>
                          {slot.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: MANAGE ROOMS */}
          {activeTab === 'manage_rooms' && isAdmin && (
            <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Classrooms & Laboratories Directory</h3>
                <button
                  onClick={() => { setError(''); setShowRoomModal(true); }}
                  style={{ backgroundColor: '#4f46e5', color: '#ffffff', border: 'none', padding: '8px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                >
                  + Add Room / Lab
                </button>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                    <th style={{ padding: '10px', fontSize: '13px', fontWeight: '700', color: '#334155' }}>Room #</th>
                    <th style={{ padding: '10px', fontSize: '13px', fontWeight: '700', color: '#334155' }}>Name</th>
                    <th style={{ padding: '10px', fontSize: '13px', fontWeight: '700', color: '#334155' }}>Type</th>
                    <th style={{ padding: '10px', fontSize: '13px', fontWeight: '700', color: '#334155' }}>Capacity</th>
                    <th style={{ padding: '10px', fontSize: '13px', fontWeight: '700', color: '#334155' }}>Building / Floor</th>
                    <th style={{ padding: '10px', fontSize: '13px', fontWeight: '700', color: '#334155' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.map((room) => (
                    <tr key={room._id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '10px', fontWeight: '700', color: '#0f172a' }}>{room.roomNumber}</td>
                      <td style={{ padding: '10px', color: '#334155' }}>{room.name}</td>
                      <td style={{ padding: '10px', color: '#059669', textTransform: 'capitalize', fontWeight: '600' }}>{room.roomType}</td>
                      <td style={{ padding: '10px', color: '#334155' }}>{room.capacity} students</td>
                      <td style={{ padding: '10px', color: '#64748b' }}>{room.building || 'Main'} {room.floor ? `(Floor ${room.floor})` : ''}</td>
                      <td style={{ padding: '10px' }}>
                        <span style={{ backgroundColor: room.isActive ? '#dcfce7' : '#f1f5f9', color: room.isActive ? '#15803d' : '#64748b', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>
                          {room.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* MODAL: TIMETABLE ENTRY FORM */}
      {showEntryModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px', width: '520px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto', border: '1px solid #e2e8f0', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', marginTop: 0, marginBottom: '16px' }}>
              {editingEntryId ? 'Edit Timetable Entry' : 'Create Timetable Entry'}
            </h2>

            <form onSubmit={handleSaveEntry} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* Academic Year */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Academic Year *</label>
                <select
                  value={entryForm.academicYearId}
                  onChange={(e) => setEntryForm({ ...entryForm, academicYearId: e.target.value })}
                  required
                  style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                >
                  {academicYears.map((ay) => (
                    <option key={ay._id} value={ay._id}>{ay.name}</option>
                  ))}
                </select>
              </div>

              {/* Class & Section */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Class *</label>
                  <select
                    value={entryForm.classId}
                    onChange={(e) => {
                      setEntryForm({ ...entryForm, classId: e.target.value, sectionId: '' });
                      fetchSectionsForClass(e.target.value);
                    }}
                    required
                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  >
                    <option value="">Select Class</option>
                    {classes.map((c) => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Section *</label>
                  <select
                    value={entryForm.sectionId}
                    onChange={(e) => setEntryForm({ ...entryForm, sectionId: e.target.value })}
                    required
                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  >
                    <option value="">Select Section</option>
                    {sections.map((s) => (
                      <option key={s._id} value={s._id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Subject */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Subject *</label>
                <select
                  value={entryForm.subjectId}
                  onChange={(e) => setEntryForm({ ...entryForm, subjectId: e.target.value, teacherId: '' })}
                  required
                  style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                >
                  <option value="">Select Subject</option>
                  {subjects.map((sub) => (
                    <option key={sub._id} value={sub._id}>{sub.name} ({sub.subjectCode})</option>
                  ))}
                </select>
              </div>

              {/* Authorized Teacher */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>
                  Authorized Teacher * (From TeacherSubjectAssignments)
                </label>
                <select
                  value={entryForm.teacherId}
                  onChange={(e) => setEntryForm({ ...entryForm, teacherId: e.target.value })}
                  required
                  style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                >
                  <option value="">-- Select Assigned Teacher --</option>
                  {authorizedTeachers.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.userId?.fullName || 'Teacher'} (Emp ID: {t.employeeId})
                    </option>
                  ))}
                </select>
                {authorizedTeachers.length === 0 && entryForm.subjectId && (
                  <p style={{ fontSize: '11px', color: '#dc2626', margin: '2px 0 0 0' }}>
                    ⚠️ No teacher is assigned to this subject/class/section in TeacherSubjectAssignments. Please create a teacher assignment first.
                  </p>
                )}
              </div>

              {/* Day & Period */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Day of Week *</label>
                  <select
                    value={entryForm.dayOfWeek}
                    onChange={(e) => setEntryForm({ ...entryForm, dayOfWeek: e.target.value })}
                    required
                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  >
                    {DAYS_OF_WEEK.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Period Number *</label>
                  <input
                    type="number"
                    min="1"
                    value={entryForm.periodNumber}
                    onChange={(e) => setEntryForm({ ...entryForm, periodNumber: parseInt(e.target.value) || 1 })}
                    required
                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>
              </div>

              {/* Start & End Time */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Start Time *</label>
                  <input
                    type="text"
                    placeholder="08:00"
                    value={entryForm.startTime}
                    onChange={(e) => setEntryForm({ ...entryForm, startTime: e.target.value })}
                    required
                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>End Time *</label>
                  <input
                    type="text"
                    placeholder="08:45"
                    value={entryForm.endTime}
                    onChange={(e) => setEntryForm({ ...entryForm, endTime: e.target.value })}
                    required
                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>
              </div>

              {/* Room Selection */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Room / Classroom</label>
                <select
                  value={entryForm.roomId}
                  onChange={(e) => {
                    const selectedRoom = rooms.find((r) => r._id === e.target.value);
                    setEntryForm({
                      ...entryForm,
                      roomId: e.target.value,
                      roomName: selectedRoom ? selectedRoom.name || selectedRoom.roomNumber : ''
                    });
                  }}
                  style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                >
                  <option value="">-- Unassigned / Custom Room --</option>
                  {rooms.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.roomNumber} ({r.name || r.roomType}) - Cap: {r.capacity}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowEntryModal(false)}
                  style={{ backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ backgroundColor: '#4f46e5', color: '#ffffff', border: 'none', padding: '8px 20px', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
                >
                  {submitting ? 'Saving...' : 'Save Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TIME SLOT FORM */}
      {showSlotModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px', width: '420px', maxWidth: '90%', border: '1px solid #e2e8f0' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', marginTop: 0, marginBottom: '16px' }}>Create Time Slot</h2>
            <form onSubmit={handleSaveSlot} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Period Number *</label>
                <input
                  type="number"
                  min="1"
                  value={slotForm.periodNumber}
                  onChange={(e) => setSlotForm({ ...slotForm, periodNumber: parseInt(e.target.value) || 1, periodName: `Period ${e.target.value}` })}
                  required
                  style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Period Name</label>
                <input
                  type="text"
                  placeholder="Period 1"
                  value={slotForm.periodName}
                  onChange={(e) => setSlotForm({ ...slotForm, periodName: e.target.value })}
                  style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Start Time *</label>
                  <input
                    type="text"
                    placeholder="08:00"
                    value={slotForm.startTime}
                    onChange={(e) => setSlotForm({ ...slotForm, startTime: e.target.value })}
                    required
                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>End Time *</label>
                  <input
                    type="text"
                    placeholder="08:45"
                    value={slotForm.endTime}
                    onChange={(e) => setSlotForm({ ...slotForm, endTime: e.target.value })}
                    required
                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowSlotModal(false)} style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px', fontSize: '14px' }}>Cancel</button>
                <button type="submit" disabled={submitting} style={{ backgroundColor: '#4f46e5', color: '#ffffff', border: 'none', padding: '8px 20px', borderRadius: '6px', fontSize: '14px', fontWeight: '600' }}>Save Slot</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ROOM FORM */}
      {showRoomModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px', width: '420px', maxWidth: '90%', border: '1px solid #e2e8f0' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', marginTop: 0, marginBottom: '16px' }}>Add Classroom / Laboratory</h2>
            <form onSubmit={handleSaveRoom} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Room Number *</label>
                <input
                  type="text"
                  placeholder="101"
                  value={roomForm.roomNumber}
                  onChange={(e) => setRoomForm({ ...roomForm, roomNumber: e.target.value, name: roomForm.name || `Room ${e.target.value}` })}
                  required
                  style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Room Name / Display Label</label>
                <input
                  type="text"
                  placeholder="Physics Lab / Classroom 101"
                  value={roomForm.name}
                  onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                  style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Type</label>
                  <select
                    value={roomForm.roomType}
                    onChange={(e) => setRoomForm({ ...roomForm, roomType: e.target.value })}
                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  >
                    <option value="classroom">Classroom</option>
                    <option value="lab">Science/Computer Lab</option>
                    <option value="auditorium">Auditorium</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Capacity</label>
                  <input
                    type="number"
                    value={roomForm.capacity}
                    onChange={(e) => setRoomForm({ ...roomForm, capacity: parseInt(e.target.value) || 40 })}
                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowRoomModal(false)} style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px', fontSize: '14px' }}>Cancel</button>
                <button type="submit" disabled={submitting} style={{ backgroundColor: '#4f46e5', color: '#ffffff', border: 'none', padding: '8px 20px', borderRadius: '6px', fontSize: '14px', fontWeight: '600' }}>Save Room</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
