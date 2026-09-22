import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function RegisterScreen({ navigation }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [submitting, setSubmitting] = useState(false);

  const { register } = useAuth();

  const handleRegister = async () => {
    if (!fullName || !email || !password) {
      Alert.alert('Validation Error', 'Please complete all required fields.');
      return;
    }

    setSubmitting(true);
    const result = await register({ fullName, email, password, role });
    setSubmitting(false);

    if (result.success) {
      Alert.alert('Account Created', `Welcome to EduBridge, ${result.user.fullName}!`);
      navigation.navigate('Welcome');
    } else {
      Alert.alert('Registration Error', result.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <ScrollView contentContainerStyle={styles.content}>
        
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Join EduBridge</Text>
        <Text style={styles.subtitle}>Student & Parent Public Registration</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="John Doe"
            placeholderTextColor="#64748b"
            value={fullName}
            onChangeText={setFullName}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="john@example.com"
            placeholderTextColor="#64748b"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="•••••••• (Min 6 chars)"
            placeholderTextColor="#64748b"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Select Public Role</Text>
          <View style={styles.rolePicker}>
            {[
              { id: 'student', label: '🎓 Student' },
              { id: 'parent', label: '👨‍👩‍👧 Parent' }
            ].map((r) => (
              <TouchableOpacity
                key={r.id}
                style={[styles.roleOption, role === r.id && styles.roleOptionActive]}
                onPress={() => setRole(r.id)}
              >
                <Text style={[styles.roleText, role === r.id && styles.roleTextActive]}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.roleNote}>
            * Teachers and Administrators must be registered by institution managers.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.registerButton}
          onPress={handleRegister}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.registerButtonText}>Register Account</Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
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
    marginBottom: 24,
    paddingVertical: 8
  },
  backText: {
    color: '#818cf8',
    fontSize: 16,
    fontWeight: '600'
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 24
  },
  formGroup: {
    marginBottom: 20
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 8
  },
  input: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#ffffff',
    fontSize: 15
  },
  rolePicker: {
    flexDirection: 'row',
    gap: 12
  },
  roleOption: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center'
  },
  roleOptionActive: {
    backgroundColor: 'rgba(79, 70, 229, 0.2)',
    borderColor: '#4f46e5'
  },
  roleText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600'
  },
  roleTextActive: {
    color: '#818cf8',
    fontWeight: '700'
  },
  roleNote: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 8
  },
  registerButton: {
    backgroundColor: '#4f46e5',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 16
  },
  registerButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700'
  }
});
