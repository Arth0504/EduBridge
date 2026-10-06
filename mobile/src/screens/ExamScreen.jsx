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
  Alert,
  TextInput
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import {
  fetchExaminations,
  fetchExamSchedules,
  fetchExamMarks,
  submitBulkMarks,
  fetchStudentResult,
  fetchClassResults,
  publishResults
} from '../services/exam.service';

export default function ExamScreen({ navigation }) {
  const { user } = useAuth();
  const role = (user?.role || '').toLowerCase();
  const isTeacher = role === 'teacher';
  const isStudent = role === 'student';
  const isParent = role === 'parent';
  const isAdmin = role === 'super_admin' || role === 'institution_admin';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Active Tab: 'schedules', 'results', 'marks_entry'
  const [activeTab, setActiveTab] = useState(isStudent || isParent ? 'results' : 'schedules');

  // Data States
  const [examinations, setExaminations] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [studentResult, setStudentResult] = useState(null);

  // Selection States for Teacher Marks Entry
  const [selectedExam, setSelectedExam] = useState(null);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [marksMap, setMarksMap] = useState({});

  useEffect(() => {
    loadData();
  }, [role, activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');

      const exRes = await fetchExaminations();
      const exList = exRes.data || [];
      setExaminations(exList);

      if (exList.length > 0) {
        const firstExam = exList[0];
        setSelectedExam(firstExam);
        const schedRes = await fetchExamSchedules({ examinationId: firstExam._id });
        setSchedules(schedRes.data || []);
      }

      if (isStudent || isParent) {
        if (user?._id) {
          const res = await fetchStudentResult(user._id).catch(() => null);
          if (res?.data) {
            setStudentResult(res.data);
          }
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load examination data.');
    } finally {
      setLoading(false);
    }
  };

  const handlePublishResults = async (examId) => {
    try {
      setSaving(true);
      await publishResults(examId);
      Alert.alert('Success', 'Examination results published successfully.');
      loadData();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to publish results.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Examinations & Assessment</Text>
        <Text style={styles.headerSubtitle}>Academic Year Aware Results & Schedules</Text>
      </View>

      {/* Role Navigation Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'schedules' && styles.tabButtonActive]}
          onPress={() => setActiveTab('schedules')}
        >
          <Text style={[styles.tabText, activeTab === 'schedules' && styles.tabTextActive]}>Schedules</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'results' && styles.tabButtonActive]}
          onPress={() => setActiveTab('results')}
        >
          <Text style={[styles.tabText, activeTab === 'results' && styles.tabTextActive]}>Results</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading examinations...</Text>
        </View>
      ) : (
        <ScrollView style={styles.contentScroll} contentContainerStyle={styles.scrollContent}>
          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* TAB 1: SCHEDULES */}
          {activeTab === 'schedules' && (
            <View>
              <Text style={styles.sectionTitle}>Upcoming & Active Exams</Text>
              {examinations.length === 0 ? (
                <Text style={styles.emptyText}>No examinations scheduled.</Text>
              ) : (
                examinations.map((ex) => (
                  <View key={ex._id} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.examName}>{ex.name}</Text>
                      <Text style={[styles.badge, ex.status === 'published' ? styles.badgeSuccess : styles.badgeInfo]}>
                        {ex.status.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.cardMeta}>
                      Type: {ex.examType?.replace('_', ' ').toUpperCase()}
                    </Text>
                    <Text style={styles.cardMeta}>
                      Dates: {new Date(ex.startDate).toLocaleDateString()} - {new Date(ex.endDate).toLocaleDateString()}
                    </Text>

                    {isAdmin && ex.status !== 'published' && (
                      <TouchableOpacity
                        style={styles.publishBtn}
                        onPress={() => handlePublishResults(ex._id)}
                      >
                        <Text style={styles.publishBtnText}>Publish Results</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              )}

              <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Subject Timetable</Text>
              {schedules.length === 0 ? (
                <Text style={styles.emptyText}>No subject schedules available.</Text>
              ) : (
                schedules.map((sc) => (
                  <View key={sc._id} style={styles.scheduleCard}>
                    <Text style={styles.subjectName}>{sc.subjectId?.name || 'Subject'}</Text>
                    <Text style={styles.scheduleMeta}>
                      Date: {new Date(sc.examDate).toLocaleDateString()} | Time: {sc.startTime} - {sc.endTime}
                    </Text>
                    <Text style={styles.scheduleMeta}>
                      Class: {sc.classId?.name} ({sc.sectionId?.name}) | Max Marks: {sc.maxMarks} (Pass: {sc.passingMarks})
                    </Text>
                  </View>
                ))
              )}
            </View>
          )}

          {/* TAB 2: RESULTS */}
          {activeTab === 'results' && (
            <View>
              {isStudent || isParent ? (
                studentResult ? (
                  <View>
                    <View style={styles.summaryCard}>
                      <View style={styles.summaryRow}>
                        <View style={styles.summaryCol}>
                          <Text style={styles.summaryLabel}>Obtained</Text>
                          <Text style={styles.summaryVal}>{studentResult.summary?.totalObtained} / {studentResult.summary?.totalMax}</Text>
                        </View>
                        <View style={styles.summaryCol}>
                          <Text style={styles.summaryLabel}>Percentage</Text>
                          <Text style={styles.summaryValHighlight}>{studentResult.summary?.percentage}%</Text>
                        </View>
                        <View style={styles.summaryCol}>
                          <Text style={styles.summaryLabel}>Grade</Text>
                          <Text style={styles.summaryValGrade}>{studentResult.summary?.grade}</Text>
                        </View>
                      </View>
                    </View>

                    <Text style={styles.sectionTitle}>Subject Wise Performance</Text>
                    {studentResult.subjectMarks?.map((m) => (
                      <View key={m._id} style={styles.subjectResultCard}>
                        <View style={styles.cardHeader}>
                          <Text style={styles.subjectTitle}>{m.subjectId?.name}</Text>
                          <Text style={[styles.statusBadge, m.status === 'pass' ? styles.passText : styles.failText]}>
                            {m.status?.toUpperCase()}
                          </Text>
                        </View>
                        <Text style={styles.cardMeta}>Marks: {m.marksObtained} / {m.maxMarks} | Grade: {m.grade}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.emptyText}>No published results found for your profile.</Text>
                )
              ) : (
                <Text style={styles.emptyText}>Select an examination from web portal for full class analytical reports.</Text>
              )}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  header: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a'
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent'
  },
  tabButtonActive: {
    borderBottomColor: '#2563eb'
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b'
  },
  tabTextActive: {
    color: '#2563eb'
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#64748b'
  },
  contentScroll: {
    flex: 1
  },
  scrollContent: {
    padding: 16
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fca5a5',
    marginBottom: 16
  },
  errorText: {
    color: '#991b1b',
    fontSize: 13
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 10
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    fontStyle: 'italic',
    marginVertical: 10
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  examName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a'
  },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    overflow: 'hidden'
  },
  badgeSuccess: {
    backgroundColor: '#dcfce7',
    color: '#15803d'
  },
  badgeInfo: {
    backgroundColor: '#f1f5f9',
    color: '#475569'
  },
  cardMeta: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2
  },
  publishBtn: {
    marginTop: 10,
    backgroundColor: '#16a34a',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center'
  },
  publishBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700'
  },
  scheduleCard: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  subjectName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b'
  },
  scheduleMeta: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 3
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around'
  },
  summaryCol: {
    alignItems: 'center'
  },
  summaryLabel: {
    fontSize: 11,
    color: '#64748b'
  },
  summaryVal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 4
  },
  summaryValHighlight: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563eb',
    marginTop: 4
  },
  summaryValGrade: {
    fontSize: 16,
    fontWeight: '700',
    color: '#16a34a',
    marginTop: 4
  },
  subjectResultCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  subjectTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a'
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: '700'
  },
  passText: {
    color: '#16a34a'
  },
  failText: {
    color: '#dc2626'
  }
});
