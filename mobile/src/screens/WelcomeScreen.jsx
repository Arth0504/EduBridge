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

export default function WelcomeScreen({ navigation }) {
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
            <Text style={styles.secondaryButtonText}>Create Account</Text>
          </TouchableOpacity>

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
    marginBottom: 32
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
  cardSection: {
    gap: 16,
    marginBottom: 32
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155'
  },
  cardTitle: {
    fontSize: 16,
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
    fontSize: 16,
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
