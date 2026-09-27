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
  Alert
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import {
  fetchFeeSummary,
  fetchStudentFees,
  fetchFeePayments,
  fetchFeeReceipts,
  initiateOnlinePayment
} from '../services/fee.service';
import { fetchStudentEnrollments } from '../services/academic.service';

export default function FeeScreen({ navigation }) {
  const { user } = useAuth();
  const role = (user?.role || '').toLowerCase();
  const isTeacher = role === 'teacher';
  const isStudent = role === 'student';
  const isParent = role === 'parent';
  const isAdmin = role === 'super_admin' || role === 'institution_admin';

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Data States
  const [summary, setSummary] = useState(null);
  const [studentFees, setStudentFees] = useState([]);
  const [payments, setPayments] = useState([]);
  const [receipts, setReceipts] = useState([]);

  // Active Tab for Student/Parent/Admin: 'summary', 'installments', 'history', 'receipts'
  const [activeTab, setActiveTab] = useState('summary');

  useEffect(() => {
    if (isTeacher) return;
    loadScreenData();
  }, [role]);

  const loadScreenData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');

      if (isAdmin) {
        const sumRes = await fetchFeeSummary();
        setSummary(sumRes.data?.summary || null);
        const feesRes = await fetchStudentFees();
        setStudentFees(feesRes.data?.studentFees || []);
      } else if (isStudent || isParent) {
        const feesRes = await fetchStudentFees();
        setStudentFees(feesRes.data?.studentFees || []);
        const payRes = await fetchFeePayments();
        setPayments(payRes.data?.payments || []);
        const recRes = await fetchFeeReceipts();
        setReceipts(recRes.data?.receipts || []);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load fee information');
    } finally {
      setLoading(false);
    }
  };

  const handlePayOnlineOrder = async (feeRecord) => {
    try {
      const res = await initiateOnlinePayment({
        studentFeeId: feeRecord._id,
        amount: feeRecord.pendingAmount,
        paymentProvider: 'razorpay'
      });
      const order = res.data?.paymentOrder;
      Alert.alert(
        'Online Order Initiated',
        `Order ID: ${order.orderId}\nAmount: ₹${order.amount}\nProvider: ${order.paymentProvider}\nStatus: ${order.status}\n\nNotice: Integration with gateway provider required for live payment capture.`
      );
      loadScreenData();
    } catch (err) {
      Alert.alert('Payment Error', err.message || 'Failed to initiate online payment order');
    }
  };

  if (isTeacher) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Fee Management</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.restrictedBox}>
          <Text style={styles.restrictedTitle}>Access Restricted</Text>
          <Text style={styles.restrictedText}>
            Teachers are not authorized to access financial fee management or student billing records.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* Screen Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fee & Billing Hub</Text>
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

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#059669" />
            <Text style={styles.loadingText}>Loading fee data...</Text>
          </View>
        ) : (
          <>
            {/* Admin Collection Overview */}
            {isAdmin && summary && (
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Financial Collection Summary</Text>
                <View style={styles.statsGrid}>
                  <View style={styles.statCard}>
                    <Text style={styles.statNumber}>₹{summary.totalFees.toLocaleString()}</Text>
                    <Text style={styles.statLabel}>Total Billed</Text>
                  </View>
                  <View style={[styles.statCard, { backgroundColor: '#ecfdf5' }]}>
                    <Text style={[styles.statNumber, { color: '#047857' }]}>₹{summary.collectedAmount.toLocaleString()}</Text>
                    <Text style={[styles.statLabel, { color: '#047857' }]}>Collected</Text>
                  </View>
                  <View style={[styles.statCard, { backgroundColor: '#fff1f2' }]}>
                    <Text style={[styles.statNumber, { color: '#be123c' }]}>₹{summary.pendingAmount.toLocaleString()}</Text>
                    <Text style={[styles.statLabel, { color: '#be123c' }]}>Pending</Text>
                  </View>
                </View>

                {/* Pending Balances List */}
                <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Student Fee Balances ({studentFees.length})</Text>
                {studentFees.map((fee) => (
                  <View key={fee._id} style={styles.feeCard}>
                    <View style={styles.feeCardHeader}>
                      <Text style={styles.studentName}>{fee.studentId?.userId?.fullName || 'Student'}</Text>
                      <Text style={styles.feeStatus}>{fee.status.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.feeSubText}>Class: {fee.classId?.name || fee.classId?.className}</Text>
                    <View style={styles.feeAmountRow}>
                      <Text style={styles.amountLabel}>Pending: <Text style={styles.amountValue}>₹{fee.pendingAmount.toLocaleString()}</Text></Text>
                      <Text style={styles.amountLabel}>Total: <Text style={styles.amountValue}>₹{fee.totalAmount.toLocaleString()}</Text></Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Student & Parent Personal Fee View */}
            {(isStudent || isParent) && (
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>My Fee Statement</Text>

                {studentFees.length === 0 ? (
                  <Text style={styles.emptyText}>No active fee statements found.</Text>
                ) : (
                  studentFees.map((fee) => (
                    <View key={fee._id} style={styles.personalFeeCard}>
                      <View style={styles.feeCardHeader}>
                        <Text style={styles.structName}>{fee.feeStructureId?.name || 'Fee Package'}</Text>
                        <View style={[styles.badge, fee.status === 'paid' ? styles.badgePaid : styles.badgePending]}>
                          <Text style={styles.badgeText}>{fee.status.toUpperCase()}</Text>
                        </View>
                      </View>

                      <View style={styles.personalStatsGrid}>
                        <View style={styles.pStatItem}>
                          <Text style={styles.pStatLabel}>Total Fee</Text>
                          <Text style={styles.pStatValue}>₹{fee.totalAmount.toLocaleString()}</Text>
                        </View>
                        <View style={styles.pStatItem}>
                          <Text style={styles.pStatLabel}>Concession</Text>
                          <Text style={[styles.pStatValue, { color: '#047857' }]}>₹{fee.discountAmount.toLocaleString()}</Text>
                        </View>
                        <View style={styles.pStatItem}>
                          <Text style={styles.pStatLabel}>Paid</Text>
                          <Text style={[styles.pStatValue, { color: '#0369a1' }]}>₹{fee.paidAmount.toLocaleString()}</Text>
                        </View>
                        <View style={styles.pStatItem}>
                          <Text style={styles.pStatLabel}>Pending</Text>
                          <Text style={[styles.pStatValue, { color: '#b45309' }]}>₹{fee.pendingAmount.toLocaleString()}</Text>
                        </View>
                      </View>

                      {fee.pendingAmount > 0 && (
                        <TouchableOpacity
                          style={styles.payBtn}
                          onPress={() => handlePayOnlineOrder(fee)}
                        >
                          <Text style={styles.payBtnText}>Pay Online (Initiate Order)</Text>
                        </TouchableOpacity>
                      )}

                      {/* Installments Breakdown */}
                      {fee.installments && fee.installments.length > 0 && (
                        <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0' }}>
                          <Text style={styles.subHeading}>Installments Schedule</Text>
                          {fee.installments.map((inst, idx) => (
                            <View key={idx} style={styles.instRow}>
                              <Text style={styles.instName}>{inst.name} ({new Date(inst.dueDate).toLocaleDateString()})</Text>
                              <Text style={styles.instAmt}>₹{inst.amount.toLocaleString()} - <Text style={{ color: inst.status === 'paid' ? '#047857' : '#b45309' }}>{inst.status.toUpperCase()}</Text></Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  ))
                )}

                {/* Receipts Section */}
                <Text style={[styles.sectionTitle, { marginTop: 20 }]}>My Receipts ({receipts.length})</Text>
                {receipts.map((rec) => (
                  <View key={rec._id} style={styles.receiptCard}>
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptNum}>{rec.receiptNumber}</Text>
                      <Text style={styles.receiptDate}>{new Date(rec.paymentDate).toLocaleDateString()}</Text>
                    </View>
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptMode}>Mode: {rec.paymentMode.toUpperCase()}</Text>
                      <Text style={styles.receiptAmt}>₹{rec.amount.toLocaleString()}</Text>
                    </View>
                  </View>
                ))}
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
  backButton: { padding: 6 },
  backButtonText: { fontSize: 22, color: '#0f172a', fontWeight: 'bold' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  refreshButton: { padding: 6 },
  refreshButtonText: { fontSize: 20, color: '#059669', fontWeight: 'bold' },
  scrollContent: { padding: 16 },
  errorCard: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12
  },
  errorText: { color: '#991b1b', fontSize: 13, fontWeight: '500' },
  loadingContainer: { padding: 40, alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#64748b', fontSize: 14 },
  sectionContainer: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  restrictedBox: {
    padding: 24,
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    margin: 16,
    borderWidth: 1,
    borderColor: '#fcd34d',
    alignItems: 'center'
  },
  restrictedTitle: { fontSize: 16, fontWeight: '700', color: '#b45309', marginBottom: 8 },
  restrictedText: { fontSize: 13, color: '#92400e', textAlign: 'center' },
  statsGrid: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  statCard: {
    width: '31%',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center'
  },
  statNumber: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  statLabel: { fontSize: 11, color: '#64748b', fontWeight: '600', marginTop: 2 },
  feeCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 8,
    backgroundColor: '#f8fafc'
  },
  feeCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  studentName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  feeStatus: { fontSize: 11, fontWeight: '700', color: '#059669' },
  feeSubText: { fontSize: 12, color: '#64748b', marginTop: 2 },
  feeAmountRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  amountLabel: { fontSize: 12, color: '#475569' },
  amountValue: { fontWeight: '700', color: '#0f172a' },
  emptyText: { color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', marginVertical: 10 },
  personalFeeCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12
  },
  structName: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgePaid: { backgroundColor: '#dcfce7' },
  badgePending: { backgroundColor: '#fef3c7' },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#0f172a' },
  personalStatsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  pStatItem: { width: '48%', backgroundColor: '#f8fafc', padding: 8, borderRadius: 6 },
  pStatLabel: { fontSize: 11, color: '#64748b' },
  pStatValue: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginTop: 2 },
  payBtn: {
    backgroundColor: '#059669',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12
  },
  payBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
  subHeading: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6 },
  instRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  instName: { fontSize: 12, color: '#475569' },
  instAmt: { fontSize: 12, fontWeight: '600' },
  receiptCard: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8
  },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between' },
  receiptNum: { fontSize: 13, fontWeight: '700', color: '#047857' },
  receiptDate: { fontSize: 12, color: '#64748b' },
  receiptMode: { fontSize: 12, color: '#475569', marginTop: 4 },
  receiptAmt: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginTop: 4 }
});
