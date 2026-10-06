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
  fetchTimetables,
  fetchParentTimetable
} from '../services/timetable.service';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function TimetableScreen({ navigation }) {
  const { user } = useAuth();
  const role = (user?.role || '').toLowerCase();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [timetables, setTimetables] = useState([]);
  const [parentChildData, setParentChildData] = useState([]);
  const [selectedChildIndex, setSelectedChildIndex] = useState(0);
  const [selectedDay, setSelectedDay] = useState('Monday');

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');

      if (role === 'parent') {
        const res = await fetchParentTimetable(user._id);
        const childData = res.data?.childTimetables || [];
        setParentChildData(childData);
      } else {
        const res = await fetchTimetables();
        const list = res.data?.timetables || [];
        setTimetables(list);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load timetable details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getFilteredEntries = (entries) => {
    if (!selectedDay) return entries;
    return entries.filter((item) => item.dayOfWeek === selectedDay);
  };

  const currentEntries = role === 'parent'
    ? (parentChildData[selectedChildIndex]?.timetables || [])
    : timetables;

  const displayEntries = getFilteredEntries(currentEntries);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Dashboard</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {role === 'student' && 'My Timetable'}
          {role === 'teacher' && 'My Teaching Timetable'}
          {role === 'parent' && "Child's Timetable"}
          {role !== 'student' && role !== 'teacher' && role !== 'parent' && 'Timetable Management'}
        </Text>
        <View style={{ width: 70 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {errorMsg !== '' && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {/* Parent Child Selector */}
        {role === 'parent' && parentChildData.length > 1 && (
          <View style={styles.selectorContainer}>
            <Text style={styles.selectorLabel}>Select Linked Child:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
              {parentChildData.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.chip,
                    selectedChildIndex === idx && styles.activeChip
                  ]}
                  onPress={() => setSelectedChildIndex(idx)}
                >
                  <Text style={[
                    styles.chipText,
                    selectedChildIndex === idx && styles.activeChipText
                  ]}>
                    {item.student?.userId?.fullName || `Child ${idx + 1}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Day Selector Chips */}
        <View style={{ marginBottom: 16 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {DAYS_OF_WEEK.map((day) => (
              <TouchableOpacity
                key={day}
                style={[
                  styles.dayChip,
                  selectedDay === day && styles.activeDayChip
                ]}
                onPress={() => setSelectedDay(day)}
              >
                <Text style={[
                  styles.dayChipText,
                  selectedDay === day && styles.activeDayChipText
                ]}>
                  {day.substring(0, 3)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#4f46e5" />
            <Text style={styles.loadingText}>Loading schedule...</Text>
          </View>
        ) : (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>
              📅 {selectedDay} Schedule ({displayEntries.length} Period{displayEntries.length === 1 ? '' : 's'})
            </Text>

            {displayEntries.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No classes or subjects scheduled for {selectedDay}.</Text>
              </View>
            ) : (
              displayEntries.map((item) => (
                <View key={item._id} style={styles.card}>
                  
                  <View style={styles.cardTopRow}>
                    <Text style={styles.periodBadge}>Period {item.periodNumber}</Text>
                    <Text style={styles.timeText}>⏰ {item.startTime} – {item.endTime}</Text>
                  </View>

                  <Text style={styles.subjectTitle}>{item.subjectId?.name || 'Subject'}</Text>

                  {role === 'teacher' ? (
                    <Text style={styles.cardSub}>
                      Class: {item.classId?.name} | Section: {item.sectionId?.name}
                    </Text>
                  ) : (
                    <Text style={styles.cardSub}>
                      Teacher: {item.teacherId?.userId?.fullName || 'Assigned Instructor'}
                    </Text>
                  )}

                  {(item.roomId?.name || item.roomId?.roomNumber || item.roomName) && (
                    <View style={styles.roomBadge}>
                      <Text style={styles.roomText}>
                        📍 Room: {item.roomId?.name || item.roomId?.roomNumber || item.roomName}
                      </Text>
                    </View>
                  )}

                </View>
              ))
            )}
          </View>
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
  selectorContainer: {
    marginBottom: 16
  },
  selectorLabel: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600'
  },
  chip: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#334155'
  },
  activeChip: {
    backgroundColor: '#4f46e5',
    borderColor: '#6366f1'
  },
  chipText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600'
  },
  activeChipText: {
    color: '#ffffff',
    fontWeight: '700'
  },
  dayChip: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#334155'
  },
  activeDayChip: {
    backgroundColor: '#059669',
    borderColor: '#10b981'
  },
  dayChipText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '700'
  },
  activeDayChipText: {
    color: '#ffffff'
  },
  sectionContainer: {
    marginBottom: 20
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 17,
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
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  periodBadge: {
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  timeText: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '600'
  },
  subjectTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4
  },
  cardSub: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 6
  },
  roomBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4
  },
  roomText: {
    color: '#34d399',
    fontSize: 12,
    fontWeight: '600'
  },
  emptyCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155'
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
    fontStyle: 'italic'
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
