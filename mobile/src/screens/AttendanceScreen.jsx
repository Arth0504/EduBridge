import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  FlatList,
  Alert
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import {
  fetchAttendanceSummary,
  fetchStudentAttendance,
  fetchAttendanceRecords,
  submitBulkAttendance
} from '../services/attendance.service';
import {
  fetchTeacherAssignments,
  fetchStudentEnrollments,
  fetchAcademicYears
} from '../services/academic.service';

export default function AttendanceScreen({ navigation }) {
  const { user } = useAuth();
  const role = (user?.role || '').toLowerCase();
  const isTeacher = role === 'teacher';
  const isStudent = role === 'student';
  const isParent = role === 'parent';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Summary State
  const [summaryData, setSummaryData] = useState(null);
  const [attendanceLogs, setAttendanceLogs] = useState([]);

  // Teacher Marking State
  const [myAssignments, setMyAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [studentList, setStudentList] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadScreenData();
  }, [role]);

  const loadScreenData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');

      if (isStudent) {
        // Fetch student's own profile attendance
        const enrollRes = await fetchStudentEnrollments();
        const myEnroll = enrollRes.data?.enrollments?.[0];
        if (myEnroll?.studentId?._id) {
          const res = await fetchStudentAttendance(myEnroll.studentId._id);
          setSummaryData(res.data?.summary || null);
          setAttendanceLogs(res.data?.attendance || []);
        }
      } else if (isParent) {
        // Fetch parent's child attendance
        const enrollRes = await fetchStudentEnrollments();
        const childEnroll = enrollRes.data?.enrollments?.[0];
        if (childEnroll?.studentId?._id) {
          const res = await fetchStudentAttendance(childEnroll.studentId._id);
          setSummaryData(res.data?.summary || null);
          setAttendanceLogs(res.data?.attendance || []);
        }
      } else if (isTeacher) {
        // Fetch teacher assignments for marking
        const assignRes = await fetchTeacherAssignments();
        const assigns = assignRes.data?.assignments || [];
        setMyAssignments(assigns);
        if (assigns.length > 0) {
          setSelectedAssignment(assigns[0]);
          loadRosterForAssignment(assigns[0]);
        }
      } else {
        // Admin Summary
        const sumRes = await fetchAttendanceSummary();
        setSummaryData(sumRes.data?.summary || null);
        const recRes = await fetchAttendanceRecords({ limit: 20 });
        setAttendanceLogs(recRes.data?.attendance || []);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const loadRosterForAssignment = async (assign) => {
    if (!assign) return;
    try {
      setLoading(true);
      const classId = assign.classId?._id || assign.classId;
      const sectionId = assign.sectionId?._id || assign.sectionId;
      const academicYearId = assign.academicYearId?._id || assign.academicYearId;

      const enrollRes = await fetchStudentEnrollments();
      const allEnrollments = enrollRes.data?.enrollments || [];
      const filtered = allEnrollments.filter((e) => {
        const cId = e.classId?._id || e.classId;
        const sId = e.sectionId?._id || e.sectionId;
        return cId.toString() === classId.toString() && sId.toString() === sectionId.toString();
      });

      const list = filtered.map((e) => ({
        studentProfileId: e.studentId?._id || e.studentId,
        fullName: e.studentId?.userId?.fullName || 'Student',
        rollNumber: e.rollNumber || '-'
      }));

      setStudentList(list);

      const initialMap = {};
      list.forEach((s) => {
        initialMap[s.studentProfileId] = 'present';
      });
      setAttendanceMap(initialMap);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load class roster');
    } flexally: {
      setLoading(false);
    }
  };

  const handleStatusToggle = (studentProfileId, newStatus) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentProfileId]: newStatus
    }));
  };

  const handleSaveBulkAttendance = async () => {
    if (!selectedAssignment || studentList.length === 0) return;
    try {
      setSaving(true);
      setErrorMsg('');

      const classId = selectedAssignment.classId?._id || selectedAssignment.classId;
      const sectionId = selectedAssignment.sectionId?._id || selectedAssignment.sectionId;
      const academicYearId = selectedAssignment.academicYearId?._id || selectedAssignment.academicYearId;
      const teacherId = selectedAssignment.teacherId?._id || selectedAssignment.teacherId;
      const subjectId = selectedAssignment.subjectId?._id || selectedAssignment.subjectId;

      const records = studentList.map((s) => ({
        studentId: s.studentProfileId,
        status: attendanceMap[s.studentProfileId] || 'present',
        remarks: ''
      }));

      await submitBulkAttendance({
        academicYearId,
        classId,
        sectionId,
        teacherId,
        subjectId,
        attendanceDate: selectedDate,
        records
      });

      setSuccessMsg(`Attendance saved for ${records.length} students!`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit attendance');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* Screen Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attendance Operations</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={loadScreenData}>
          <Text style={styles.refreshButtonText}>↻</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {errorMsg ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        {successMsg ? (
          <View style={styles.successCard}>
            <Text style={styles.successText}>{successMsg}</Text>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#059669" />
            <Text style={styles.loadingText}>Loading attendance data...</Text>
          </View>
        ) : (
          <>
            {/* Student & Parent View */}
            {(isStudent || isParent) && summaryData && (
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Attendance Summary</Text>

                <View style={styles.statsGrid}>
                  <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{summaryData.totalWorkingDays}</Text>
                    <Text style={styles.statLabel}>Working Days</Text>
                  </View>
                  <View style={[styles.statCard, { backgroundColor: '#ecfdf5' }]}>
                    <Text style={[styles.statNumber, { color: '#047857' }]}>{summaryData.present}</Text>
                    <Text style={[styles.statLabel, { color: '#047857' }]}>Present</Text>
                  </View>
                  <View style={[styles.statCard, { backgroundColor: '#fff1f2' }]}>
                    <Text style={[styles.statNumber, { color: '#be123c' }]}>{summaryData.absent}</Text>
                    <Text style={[styles.statLabel, { color: '#be123c' }]}>Absent</Text>
                  </View>
                  <View style={[styles.statCard, { backgroundColor: '#fffbeb' }]}>
                    <Text style={[styles.statNumber, { color: '#b45309' }]}>{summaryData.late}</Text>
                    <Text style={[styles.statLabel, { color: '#b45309' }]}>Late</Text>
                  </View>
                  <View style={[styles.statCard, { backgroundColor: '#f0f9ff' }]}>
                    <Text style={[styles.statNumber, { color: '#0369a1' }]}>{summaryData.leave}</Text>
                    <Text style={[styles.statLabel, { color: '#0369a1' }]}>Leave</Text>
                  </View>
                  <View style={[styles.statCard, { backgroundColor: '#f8fafc' }]}>
                    <Text style={[styles.statNumber, { color: '#059669' }]}>{summaryData.attendancePercentage}%</Text>
                    <Text style={styles.statLabel}>Percentage</Text>
                  </View>
                </View>

                {/* History Log */}
                <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Attendance Log</Text>
                {attendanceLogs.length === 0 ? (
                  <Text style={styles.emptyText}>No attendance records logged yet.</Text>
                ) : (
                  attendanceLogs.map((log) => (
                    <View key={log._id} style={styles.logCard}>
                      <View style={styles.logLeft}>
                        <Text style={styles.logDate}>
                          {new Date(log.attendanceDate).toLocaleDateString()}
                        </Text>
                        <Text style={styles.logSub}>
                          {log.subjectId?.subjectName || 'General Daily'}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          log.status === 'present'
                            ? styles.badgePresent
                            : log.status === 'absent'
                            ? styles.badgeAbsent
                            : log.status === 'late'
                            ? styles.badgeLate
                            : styles.badgeLeave
                        ]}
                      >
                        <Text style={styles.statusBadgeText}>{log.status.toUpperCase()}</Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* Teacher View */}
            {isTeacher && (
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Mark Class Attendance</Text>

                {/* Class Assignment Selector */}
                {myAssignments.length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                    {myAssignments.map((a) => {
                      const isSelected = selectedAssignment?._id === a._id;
                      return (
                        <TouchableOpacity
                          key={a._id}
                          style={[styles.chip, isSelected && styles.chipActive]}
                          onPress={() => {
                            setSelectedAssignment(a);
                            loadRosterForAssignment(a);
                          }}
                        >
                          <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                            {a.classId?.name || a.classId?.className || 'Class'} - Section {a.sectionId?.name || a.sectionId?.sectionName || 'Sec'} ({a.subjectId?.subjectName || 'Subject'})
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                ) : (
                  <Text style={styles.emptyText}>No assigned classes found for teacher.</Text>
                )}

                {/* Roster List */}
                {studentList.length > 0 && (
                  <View style={{ marginTop: 15 }}>
                    <Text style={styles.rosterHeader}>Enrolled Students ({studentList.length})</Text>

                    {studentList.map((stu) => {
                      const st = attendanceMap[stu.studentProfileId] || 'present';
                      return (
                        <View key={stu.studentProfileId} style={styles.studentCard}>
                          <View>
                            <Text style={styles.studentName}>{stu.fullName}</Text>
                            <Text style={styles.studentRoll}>Roll: {stu.rollNumber}</Text>
                          </View>

                          <View style={styles.btnRow}>
                            <TouchableOpacity
                              style={[styles.smBtn, st === 'present' && styles.btnPresentActive]}
                              onPress={() => handleStatusToggle(stu.studentProfileId, 'present')}
                            >
                              <Text style={[styles.smBtnText, st === 'present' && styles.btnTextActive]}>P</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.smBtn, st === 'absent' && styles.btnAbsentActive]}
                              onPress={() => handleStatusToggle(stu.studentProfileId, 'absent')}
                            >
                              <Text style={[styles.smBtnText, st === 'absent' && styles.btnTextActive]}>A</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.smBtn, st === 'late' && styles.btnLateActive]}
                              onPress={() => handleStatusToggle(stu.studentProfileId, 'late')}
                            >
                              <Text style={[styles.smBtnText, st === 'late' && styles.btnTextActive]}>L</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}

                    <TouchableOpacity
                      style={styles.saveButton}
                      onPress={handleSaveBulkAttendance}
                      disabled={saving}
                    >
                      {saving ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.saveButtonText}>Save Attendance</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* Admin Overview */}
            {!isStudent && !isParent && !isTeacher && summaryData && (
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Institution Attendance Overview</Text>
                <View style={styles.statsGrid}>
                  <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{summaryData.totalWorkingDays}</Text>
                    <Text style={styles.statLabel}>Total Entries</Text>
                  </View>
                  <View style={[styles.statCard, { backgroundColor: '#ecfdf5' }]}>
                    <Text style={[styles.statNumber, { color: '#047857' }]}>{summaryData.present}</Text>
                    <Text style={[styles.statLabel, { color: '#047857' }]}>Present</Text>
                  </View>
                  <View style={[styles.statCard, { backgroundColor: '#fff1f2' }]}>
                    <Text style={[styles.statNumber, { color: '#be123c' }]}>{summaryData.absent}</Text>
                    <Text style={[styles.statLabel, { color: '#be123c' }]}>Absent</Text>
                  </View>
                  <View style={[styles.statCard, { backgroundColor: '#f8fafc' }]}>
                    <Text style={[styles.statNumber, { color: '#059669' }]}>{summaryData.attendancePercentage}%</Text>
                    <Text style={styles.statLabel}>Attendance Rate</Text>
                  </View>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  backButton: {
    padding: 6
  },
  backButtonText: {
    fontSize: 22,
    color: '#0f172a',
    fontWeight: 'bold'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a'
  },
  refreshButton: {
    padding: 6
  },
  refreshButtonText: {
    fontSize: 20,
    color: '#059669',
    fontWeight: 'bold'
  },
  scrollContent: {
    padding: 16
  },
  errorCard: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12
  },
  errorText: {
    color: '#991b1b',
    fontSize: 13,
    fontWeight: '500'
  },
  successCard: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12
  },
  successText: {
    color: '#065f46',
    fontSize: 13,
    fontWeight: '600'
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 10,
    color: '#64748b',
    fontSize: 14
  },
  sectionContainer: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  statCard: {
    width: '31%',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center'
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a'
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 2
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 10
  },
  logCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  logLeft: {
    flex: 1
  },
  logDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b'
  },
  logSub: {
    fontSize: 12,
    color: '#64748b'
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  badgePresent: { backgroundColor: '#dcfce7' },
  badgeAbsent: { backgroundColor: '#ffe4e6' },
  badgeLate: { backgroundColor: '#fef3c7' },
  badgeLeave: { backgroundColor: '#e0f2fe' },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a'
  },
  chipRow: {
    marginBottom: 10
  },
  chip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1'
  },
  chipActive: {
    backgroundColor: '#059669',
    borderColor: '#059669'
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155'
  },
  chipTextActive: {
    color: '#ffffff'
  },
  rosterHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 10
  },
  studentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  studentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a'
  },
  studentRoll: {
    fontSize: 12,
    color: '#64748b'
  },
  btnRow: {
    flexDirection: 'row',
    gap: 6
  },
  smBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center'
  },
  smBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b'
  },
  btnPresentActive: { backgroundColor: '#059669' },
  btnAbsentActive: { backgroundColor: '#e11d48' },
  btnLateActive: { backgroundColor: '#d97706' },
  btnTextActive: { color: '#ffffff' },
  saveButton: {
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700'
  }
});
