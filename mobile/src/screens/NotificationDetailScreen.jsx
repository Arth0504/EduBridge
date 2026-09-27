import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar
} from 'react-native';

export default function NotificationDetailScreen({ route, navigation }) {
  const { notification } = route.params || {};

  if (!notification) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Notification detail not found.</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>← Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Notifications</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detail View</Text>
        <View style={{ width: 80 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Type & Priority Badges */}
        <View style={styles.badgeRow}>
          <Text style={styles.typeBadge}>{notification.type.toUpperCase()}</Text>
          <Text
            style={[
              styles.priorityBadge,
              notification.priority === 'urgent' && styles.urgentPriority,
              notification.priority === 'high' && styles.highPriority
            ]}
          >
            Priority: {notification.priority}
          </Text>
          <Text style={styles.audienceBadge}>Audience: {notification.targetAudience}</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>{notification.title}</Text>

        {/* Date & Sender */}
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>
            📅 {new Date(notification.publishedAt || notification.createdAt).toLocaleString()}
          </Text>
          {notification.senderId && (
            <Text style={styles.metaText}>
              👤 Sender: {notification.senderId.fullName || 'Institution Admin'}
            </Text>
          )}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Full Message Body */}
        <Text style={styles.messageBody}>{notification.message}</Text>

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
    fontSize: 17,
    fontWeight: '700'
  },
  content: {
    padding: 20
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14
  },
  typeBadge: {
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8
  },
  priorityBadge: {
    backgroundColor: '#334155',
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    textTransform: 'capitalize'
  },
  urgentPriority: {
    backgroundColor: '#991b1b',
    color: '#fecaca'
  },
  highPriority: {
    backgroundColor: '#9a3412',
    color: '#fed7aa'
  },
  audienceBadge: {
    backgroundColor: '#1e293b',
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155'
  },
  title: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
    marginBottom: 12
  },
  metaRow: {
    gap: 4,
    marginBottom: 16
  },
  metaText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '500'
  },
  divider: {
    height: 1,
    backgroundColor: '#1e293b',
    marginBottom: 20
  },
  messageBody: {
    color: '#cbd5e1',
    fontSize: 15,
    lineHeight: 24
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  errorText: {
    color: '#f87171',
    fontSize: 16,
    marginBottom: 16
  }
});
