import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  SafeAreaView
} from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function WelcomeScreen({ navigation }) {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Header Branding */}
        <View style={styles.brandContainer}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>EB</Text>
          </View>
          <Text style={styles.brandTitle}>EduBridge</Text>
          <Text style={styles.brandTagline}>Multi-Institution Education Platform</Text>
        </View>

        {/* User Session Banner if logged in */}
        {isAuthenticated && user && (
          <View style={styles.userBanner}>
            <View>
              <Text style={styles.userName}>{user.fullName}</Text>
              <Text style={styles.userRole}>Role: {user.role.toUpperCase()}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
            </View>
            <TouchableOpacity style={styles.logoutButton} onPress={logout}>
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Feature Cards */}
        <View style={styles.cardSection}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🎓 Student & Parent Portal</Text>
            <Text style={styles.cardDesc}>
              Real-time attendance, grades, schedule updates, and instant institutional notifications.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>🏫 Institution Hub</Text>
            <Text style={styles.cardDesc}>
              Isolated multi-tenant access tailored for schools, colleges, and training academies.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>🔒 Privacy & On-Demand Access</Text>
            <Text style={styles.cardDesc}>
              Zero intrusive startup prompts. Permissions requested strictly on feature usage.
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {!isAuthenticated ? (
            <>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => navigation.navigate('Login')}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>Sign In to Institution</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => navigation.navigate('Register')}
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryButtonText}>Create Student/Parent Account</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate('PermissionDemo')}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>View Educational Dashboard</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.demoButton}
            onPress={() => navigation.navigate('PermissionDemo')}
            activeOpacity={0.8}
          >
            <Text style={styles.demoButtonText}>🛡️ Test Permission Policy</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a'
  },
  scrollContent: {
    padding: 24,
    justifyContent: 'space-between',
    minHeight: '100%'
  },
  brandContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff'
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5
  },
  brandTagline: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 6
  },
  userBanner: {
    backgroundColor: 'rgba(79, 70, 229, 0.15)',
    borderColor: '#4f46e5',
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  userName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700'
  },
  userRole: {
    color: '#818cf8',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2
  },
  userEmail: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2
  },
  logoutButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8
  },
  logoutText: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '700'
  },
  cardSection: {
    gap: 16,
    marginBottom: 24
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155'
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 6
  },
  cardDesc: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 18
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 20
  },
  primaryButton: {
    backgroundColor: '#4f46e5',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center'
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700'
  },
  secondaryButton: {
    backgroundColor: '#1e293b',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4f46e5'
  },
  secondaryButtonText: {
    color: '#818cf8',
    fontSize: 15,
    fontWeight: '600'
  },
  demoButton: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)'
  },
  demoButtonText: {
    color: '#34d399',
    fontSize: 14,
    fontWeight: '600'
  }
});
