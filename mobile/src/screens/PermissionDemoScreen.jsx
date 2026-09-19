import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Alert
} from 'react-native';
import * as Camera from 'expo-camera';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import {
  requestPermissionOnDemand,
  getStoredPermissionState
} from '../utils/permissionHandler';

export default function PermissionDemoScreen({ navigation }) {
  const [cameraState, setCameraState] = useState('Not Requested');
  const [locationState, setLocationState] = useState('Not Requested');
  const [notifState, setNotifState] = useState('Not Requested');

  useEffect(() => {
    // Audit stored permission states silently without prompting user
    async function auditPermissions() {
      const cam = await getStoredPermissionState('camera');
      const loc = await getStoredPermissionState('location');
      const notif = await getStoredPermissionState('notifications');

      if (cam) setCameraState(cam.status);
      if (loc) setLocationState(loc.status);
      if (notif) setNotifState(notif.status);
    }
    auditPermissions();
  }, []);

  // 1. On-Demand Camera Feature
  const handleCameraFeature = async () => {
    const result = await requestPermissionOnDemand({
      permissionKey: 'camera',
      featureName: 'ID Badge Scanner',
      checkStatusFn: async () => await Camera.getCameraPermissionsAsync(),
      requestStatusFn: async () => await Camera.requestCameraPermissionsAsync()
    });

    setCameraState(result.status);
    if (result.success) {
      Alert.alert('Camera Activated', 'ID Badge scanner opened successfully!');
    }
  };

  // 2. On-Demand Location Feature
  const handleLocationFeature = async () => {
    const result = await requestPermissionOnDemand({
      permissionKey: 'location',
      featureName: 'Attendance Geofence',
      checkStatusFn: async () => await Location.getForegroundPermissionsAsync(),
      requestStatusFn: async () => await Location.requestForegroundPermissionsAsync()
    });

    setLocationState(result.status);
    if (result.success) {
      Alert.alert('Geofence Verified', 'Attendance checked in at Campus HQ!');
    }
  };

  // 3. On-Demand Notification Feature
  const handleNotificationFeature = async () => {
    const result = await requestPermissionOnDemand({
      permissionKey: 'notifications',
      featureName: 'Exam Reminders',
      checkStatusFn: async () => await Notifications.getPermissionsAsync(),
      requestStatusFn: async () => await Notifications.requestPermissionsAsync()
    });

    setNotifState(result.status);
    if (result.success) {
      Alert.alert('Reminders Enabled', 'You will receive exam schedule alerts.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <ScrollView contentContainerStyle={styles.content}>
        
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back to Welcome</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Lazy On-Demand Permission Policy</Text>
        <Text style={styles.subtitle}>
          Permissions are never asked at app startup. They are checked and requested only when you trigger specific features below.
        </Text>

        {/* Camera Feature */}
        <View style={styles.featureCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>📷 ID Badge Scanner</Text>
            <Text style={[styles.statusBadge, getStatusStyle(cameraState)]}>
              {cameraState}
            </Text>
          </View>
          <Text style={styles.cardDesc}>
            Requires Camera permission only when taking a photo of student ID.
          </Text>
          <TouchableOpacity style={styles.actionButton} onPress={handleCameraFeature}>
            <Text style={styles.actionText}>Trigger Camera Feature</Text>
          </TouchableOpacity>
        </View>

        {/* Location Feature */}
        <View style={styles.featureCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>📍 Campus Geofence</Text>
            <Text style={[styles.statusBadge, getStatusStyle(locationState)]}>
              {locationState}
            </Text>
          </View>
          <Text style={styles.cardDesc}>
            Requires Location permission only when checking in for campus attendance.
          </Text>
          <TouchableOpacity style={styles.actionButton} onPress={handleLocationFeature}>
            <Text style={styles.actionText}>Check Attendance Location</Text>
          </TouchableOpacity>
        </View>

        {/* Notification Feature */}
        <View style={styles.featureCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>🔔 Exam Alerts</Text>
            <Text style={[styles.statusBadge, getStatusStyle(notifState)]}>
              {notifState}
            </Text>
          </View>
          <Text style={styles.cardDesc}>
            Requires Notification permission only when opting in for class alerts.
          </Text>
          <TouchableOpacity style={styles.actionButton} onPress={handleNotificationFeature}>
            <Text style={styles.actionText}>Enable Push Alerts</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function getStatusStyle(status) {
  if (status === 'granted') return styles.statusGranted;
  if (status === 'permanently_denied' || status === 'denied') return styles.statusDenied;
  return styles.statusDefault;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a'
  },
  content: {
    padding: 24
  },
  backButton: {
    marginBottom: 20,
    paddingVertical: 6
  },
  backText: {
    color: '#818cf8',
    fontSize: 16,
    fontWeight: '600'
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 18,
    marginBottom: 24
  },
  featureCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff'
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    textTransform: 'uppercase'
  },
  statusDefault: {
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
    color: '#94a3b8'
  },
  statusGranted: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    color: '#34d399'
  },
  statusDenied: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    color: '#f87171'
  },
  cardDesc: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 14,
    lineHeight: 18
  },
  actionButton: {
    backgroundColor: '#4f46e5',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center'
  },
  actionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600'
  }
});
