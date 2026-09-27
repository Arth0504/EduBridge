import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  StatusBar
} from 'react-native';
import {
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
} from '../services/notification.service';
import { useAuth } from '../context/AuthContext';

export default function NotificationScreen({ navigation }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterUnread, setFilterUnread] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadNotifications = async () => {
    try {
      setErrorMessage('');
      const params = filterUnread ? { unread: 'true' } : {};
      const res = await fetchNotifications(params);
      if (res.success) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [filterUnread]);

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleItemPress = async (item) => {
    if (!item.isRead) {
      try {
        await markNotificationAsRead(item._id);
        setNotifications(prev =>
          prev.map(n => (n._id === item._id ? { ...n, isRead: true } : n))
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Failed to mark as read:', err);
      }
    }
    navigation.navigate('NotificationDetail', { notification: item });
  };

  const renderNotificationItem = ({ item }) => {
    const isUnread = !item.isRead;
    return (
      <TouchableOpacity
        style={[styles.card, isUnread && styles.unreadCard]}
        onPress={() => handleItemPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.badgeRow}>
            {isUnread && <View style={styles.unreadDot} />}
            <Text style={styles.typeBadge}>{item.type.toUpperCase()}</Text>
            <Text
              style={[
                styles.priorityBadge,
                item.priority === 'urgent' && styles.urgentPriority,
                item.priority === 'high' && styles.highPriority
              ]}
            >
              {item.priority}
            </Text>
          </View>
          <Text style={styles.dateText}>
            {new Date(item.publishedAt || item.createdAt).toLocaleDateString()}
          </Text>
        </View>

        <Text style={styles.titleText}>{item.title}</Text>
        <Text style={styles.messageSnippet} numberOfLines={2}>
          {item.message}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={handleMarkAllRead} style={styles.readAllBtn}>
            <Text style={styles.readAllText}>Mark Read</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, !filterUnread && styles.activeTab]}
          onPress={() => setFilterUnread(false)}
        >
          <Text style={[styles.tabText, !filterUnread && styles.activeTabText]}>
            All Notifications
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, filterUnread && styles.activeTab]}
          onPress={() => setFilterUnread(true)}
        >
          <Text style={[styles.tabText, filterUnread && styles.activeTabText]}>
            Unread ({unreadCount})
          </Text>
        </TouchableOpacity>
      </View>

      {errorMessage !== '' && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item._id}
          renderItem={renderNotificationItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#818cf8" />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No Notifications</Text>
              <Text style={styles.emptySubtitle}>
                {filterUnread ? 'You have no unread notifications.' : 'There are no active notifications at this time.'}
              </Text>
            </View>
          }
        />
      )}
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
    paddingHorizontal: 10
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
  readAllBtn: {
    backgroundColor: 'rgba(79, 70, 229, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8
  },
  readAllText: {
    color: '#818cf8',
    fontSize: 12,
    fontWeight: '700'
  },
  tabContainer: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: '#0f172a'
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155'
  },
  activeTab: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5'
  },
  tabText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600'
  },
  activeTabText: {
    color: '#ffffff',
    fontWeight: '700'
  },
  listContent: {
    padding: 16,
    gap: 12
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155'
  },
  unreadCard: {
    borderColor: '#6366f1',
    backgroundColor: '#1e1b4b'
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#38bdf8'
  },
  typeBadge: {
    backgroundColor: 'rgba(79, 70, 229, 0.3)',
    color: '#a5b4fc',
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  priorityBadge: {
    backgroundColor: '#334155',
    color: '#cbd5e1',
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
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
  dateText: {
    color: '#64748b',
    fontSize: 11
  },
  titleText: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4
  },
  messageSnippet: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 18
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 10,
    fontSize: 14
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60
  },
  emptyTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6
  },
  emptySubtitle: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center'
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    padding: 10,
    margin: 16,
    borderRadius: 8,
    borderColor: '#f87171',
    borderWidth: 1
  },
  errorText: {
    color: '#f87171',
    fontSize: 13,
    textAlign: 'center'
  }
});
