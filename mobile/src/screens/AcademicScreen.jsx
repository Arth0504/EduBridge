import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import {
  fetchStudentEnrollments,
  fetchTeacherAssignments,
  fetchSubjects,
  fetchClasses,
  fetchAcademicSummary
} from '../services/academic.service';

export default function AcademicScreen({ navigation }) {
  const { user } = useAuth();
  const role = (user?.role || '').toLowerCase();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [myEnrollments, setMyEnrollments] = useState([]);
  const [myAssignments, setMyAssignments] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');

      if (role === 'student' || role === 'parent') {
        const res = await fetchStudentEnrollments();
        setMyEnrollments(res.data?.enrollments || []);
      }

      if (role === 'teacher') {
        const assignRes = await fetchTeacherAssignments();
        setMyAssignments(assignRes.data?.assignments || []);
      }

      const subjRes = await fetchSubjects();
      setSubjects(subjRes.data?.subjects || []);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load academic details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Dashboard</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Academic Hub</Text>
        <View style={{ width: 70 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {errorMsg !== '' && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#4f46e5" />
            <Text style={styles.loadingText}>Loading academic information...</Text>
          </View>
        ) : (
          <>
            {/* STUDENT VIEW */}
            {role === 'student' && (
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>🎓 My Academic Enrollment</Text>
                {myEnrollments.length === 0 ? (
                  <Text style={styles.emptyText}>No active class enrollment found for this academic year.</Text>
                ) : (
                  myEnrollments.map((enr) => (
                    <View key={enr._id} style={styles.card}>
                      <Text style={styles.cardHeader}>{enr.classId?.name || 'Class Unassigned'}</Text>
                      <Text style={styles.cardSub}>Section: {enr.sectionId?.name || 'A'} | Roll No: {enr.rollNumber || 'N/A'}</Text>
                      <Text style={styles.cardDetail}>Session: {enr.academicYearId?.name || 'Current Session'}</Text>
                      <View style={styles.statusBadge}>
                        <Text style={styles.statusBadgeText}>{enr.enrollmentStatus.toUpperCase()}</Text>
                      </View>
                    </View>
                  ))
                )}

                <Text style={[styles.sectionTitle, { marginTop: 24 }]}>📚 Enrolled Subjects</Text>
                {subjects.length === 0 ? (
                  <Text style={styles.emptyText}>No subject curriculum published yet.</Text>
                ) : (
                  subjects.map((s) => (
                    <View key={s._id} style={styles.miniCard}>
                      <Text style={styles.codeBadge}>{s.subjectCode}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemTitle}>{s.name}</Text>
                        <Text style={styles.itemSub}>{s.subjectType.toUpperCase()} | {s.credits} Credits</Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* TEACHER VIEW */}
            {role === 'teacher' && (
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>👨‍🏫 My Assigned Classes & Subjects</Text>
                {myAssignments.length === 0 ? (
                  <Text style={styles.emptyText}>No subject assignments allocated to you yet.</Text>
                ) : (
                  myAssignments.map((asg) => (
                    <View key={asg._id} style={styles.card}>
                      <Text style={styles.cardHeader}>{asg.subjectId?.name} ({asg.subjectId?.subjectCode})</Text>
                      <Text style={styles.cardSub}>Class: {asg.classId?.name} | Section: {asg.sectionId?.name}</Text>
                      <Text style={styles.cardDetail}>Academic Session: {asg.academicYearId?.name}</Text>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* PARENT VIEW */}
            {role === 'parent' && (
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>👨‍👩‍👧 Child Academic Information</Text>
                {myEnrollments.length === 0 ? (
                  <Text style={styles.emptyText}>No enrollment record for linked children.</Text>
                ) : (
                  myEnrollments.map((enr) => (
                    <View key={enr._id} style={styles.card}>
                      <Text style={styles.cardHeader}>Student: {enr.studentId?.userId?.fullName || 'Child'}</Text>
                      <Text style={styles.cardSub}>Enrolled: {enr.classId?.name} - Section {enr.sectionId?.name}</Text>
                      <Text style={styles.cardDetail}>Roll Number: {enr.rollNumber || 'N/A'}</Text>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* ADMIN / SUPER ADMIN VIEW */}
            {role !== 'student' && role !== 'teacher' && role !== 'parent' && (
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>🏫 Institution Academic Structure</Text>
                <View style={styles.card}>
                  <Text style={styles.cardHeader}>Academic Overview Available</Text>
                  <Text style={styles.cardSub}>Curriculum, grades, teacher allocation, and student enrollment are fully configured.</Text>
                  <Text style={styles.cardDetail}>Use the Web Administration Console for comprehensive CRUD operations.</Text>
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
    backgroundColor: '#0f172a'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b'
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 6
  },
  backButtonText: {
    color: '#38bdf8',
    fontSize: 15,
    fontWeight: '600'
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700'
  },
  scrollContent: {
    padding: 20
  },
  sectionContainer: {
    marginBottom: 20
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155'
  },
  cardHeader: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4
  },
  cardSub: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4
  },
  cardDetail: {
    color: '#94a3b8',
    fontSize: 12
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: '#10b981',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8
  },
  statusBadgeText: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '700'
  },
  miniCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#334155'
  },
  codeBadge: {
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8
  },
  itemTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700'
  },
  itemSub: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
    fontStyle: 'italic',
    paddingVertical: 10
  },
  loadingBox: {
    paddingVertical: 60,
    alignItems: 'center'
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 10,
    fontSize: 14
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f87171',
    marginBottom: 16
  },
  errorText: {
    color: '#f87171',
    fontSize: 13,
    textAlign: 'center'
  }
});
