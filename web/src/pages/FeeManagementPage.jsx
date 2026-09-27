import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  CreditCard,
  DollarSign,
  Receipt,
  Tag,
  Calendar,
  Layers,
  Search,
  Plus,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Printer,
  ShieldAlert,
  ArrowUpRight,
  Clock,
  PieChart,
  User,
  Users,
  FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'http://localhost:5000/api/v1';

export default function FeeManagementPage() {
  const { user, token } = useAuth();
  const role = (user?.role || '').toLowerCase();
  const isAdmin = role === 'super_admin' || role === 'institution_admin';
  const isTeacher = role === 'teacher';
  const isStudent = role === 'student';
  const isParent = role === 'parent';

  // Active Tab: 'structures', 'student_fees', 'cash_collection', 'online_initiate', 'discounts', 'receipts', 'payments', 'reports', 'my_fees'
  const [activeTab, setActiveTab] = useState(isStudent || isParent ? 'my_fees' : 'reports');

  // Loaders & Message Alerts
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Summary Metrics State
  const [summaryMetrics, setSummaryMetrics] = useState({
    totalFees: 0,
    collectedAmount: 0,
    pendingAmount: 0,
    overdueAmount: 0,
    todaysCollection: 0,
    cashCollection: 0,
    onlineCollection: 0
  });

  // Master Dropdown Data
  const [academicYears, setAcademicYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [feeStructures, setFeeStructures] = useState([]);
  const [studentFees, setStudentFees] = useState([]);
  const [payments, setPayments] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [enrolledStudents, setEnrolledStudents] = useState([]);

  // Selected Filters
  const [selectedYearId, setSelectedYearId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal / Form States
  const [showStructureModal, setShowStructureModal] = useState(false);
  const [newStructureName, setNewStructureName] = useState('');
  const [newStructureDesc, setNewStructureDesc] = useState('');
  const [newStructureClassId, setNewStructureClassId] = useState('');
  const [componentsList, setComponentsList] = useState([{ name: 'Tuition Fee', amount: '10000', frequency: 'annual' }]);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignStudentId, setAssignStudentId] = useState('');
  const [assignFeeStructureId, setAssignFeeStructureId] = useState('');

  const [showCashModal, setShowCashModal] = useState(false);
  const [selectedFeeRecord, setSelectedFeeRecord] = useState(null);
  const [cashAmount, setCashAmount] = useState('');
  const [cashRemarks, setCashRemarks] = useState('');

  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountType, setDiscountType] = useState('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [discountReason, setDiscountReason] = useState('');

  // Parent Child Switcher
  const [linkedChildren, setLinkedChildren] = useState([]);
  const [selectedChildStudentId, setSelectedChildStudentId] = useState('');

  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  useEffect(() => {
    if (!token) return;
    if (isTeacher) return; // Blocked early
    fetchInitialMasterData();
    if (isParent) fetchLinkedChildren();
  }, [token]);

  const fetchInitialMasterData = async () => {
    setLoading(true);
    setError('');
    try {
      const [yearRes, classRes] = await Promise.all([
        axios.get(`${API_BASE}/academic-years`, { headers: authHeaders }),
        axios.get(`${API_BASE}/classes`, { headers: authHeaders })
      ]);
      const years = yearRes.data?.data?.academicYears || [];
      setAcademicYears(years);
      const activeYear = years.find((y) => y.status === 'active') || years[0];
      if (activeYear) setSelectedYearId(activeYear._id);

      setClasses(classRes.data?.data?.classes || []);

      if (isAdmin) {
        fetchFeeSummary();
        fetchFeeStructures();
        fetchStudentFees();
        fetchPayments();
        fetchReceipts();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load initial fee data.');
    } finally {
      setLoading(false);
    }
  };

  const fetchLinkedChildren = async () => {
    try {
      const res = await axios.get(`${API_BASE}/parent-child-links`, { headers: authHeaders });
      const links = res.data?.data?.links || [];
      const children = links.map((l) => l.studentId);
      setLinkedChildren(children);
      if (children.length > 0) setSelectedChildStudentId(children[0]._id || children[0]);
    } catch (err) {
      console.error('Failed to fetch linked children', err);
    }
  };

  const fetchFeeSummary = async () => {
    try {
      let url = `${API_BASE}/fee-reports/summary?`;
      if (selectedYearId) url += `academicYearId=${selectedYearId}&`;
      if (selectedClassId) url += `classId=${selectedClassId}&`;
      const res = await axios.get(url, { headers: authHeaders });
      setSummaryMetrics(res.data?.data?.summary || summaryMetrics);
    } catch (err) {
      console.error('Failed to fetch fee summary', err);
    }
  };

  const fetchFeeStructures = async () => {
    try {
      let url = `${API_BASE}/fee-structures?`;
      if (selectedYearId) url += `academicYearId=${selectedYearId}&`;
      const res = await axios.get(url, { headers: authHeaders });
      setFeeStructures(res.data?.data?.feeStructures || []);
    } catch (err) {
      console.error('Failed to fetch fee structures', err);
    }
  };

  const fetchStudentFees = async () => {
    try {
      let url = `${API_BASE}/student-fees?`;
      if (selectedYearId) url += `academicYearId=${selectedYearId}&`;
      if (selectedClassId) url += `classId=${selectedClassId}&`;
      if (selectedChildStudentId && isParent) url += `studentId=${selectedChildStudentId._id || selectedChildStudentId}&`;
      const res = await axios.get(url, { headers: authHeaders });
      setStudentFees(res.data?.data?.studentFees || []);
    } catch (err) {
      console.error('Failed to fetch student fees', err);
    }
  };

  const fetchPayments = async () => {
    try {
      let url = `${API_BASE}/fee-payments?`;
      if (selectedYearId) url += `academicYearId=${selectedYearId}&`;
      if (selectedChildStudentId && isParent) url += `studentId=${selectedChildStudentId._id || selectedChildStudentId}&`;
      const res = await axios.get(url, { headers: authHeaders });
      setPayments(res.data?.data?.payments || []);
    } catch (err) {
      console.error('Failed to fetch payments', err);
    }
  };

  const fetchReceipts = async () => {
    try {
      let url = `${API_BASE}/fee-receipts?`;
      if (selectedYearId) url += `academicYearId=${selectedYearId}&`;
      if (selectedChildStudentId && isParent) url += `studentId=${selectedChildStudentId._id || selectedChildStudentId}&`;
      const res = await axios.get(url, { headers: authHeaders });
      setReceipts(res.data?.data?.receipts || []);
    } catch (err) {
      console.error('Failed to fetch receipts', err);
    }
  };

  useEffect(() => {
    if (!token || isTeacher) return;
    fetchFeeSummary();
    fetchStudentFees();
    fetchPayments();
    fetchReceipts();
  }, [selectedYearId, selectedClassId, selectedChildStudentId]);

  // Load students for fee assignment when class selected
  useEffect(() => {
    if (!selectedClassId || !token) return;
    const fetchStudentsForClass = async () => {
      try {
        const res = await axios.get(`${API_BASE}/student-enrollments?classId=${selectedClassId}`, { headers: authHeaders });
        const enrolls = res.data?.data?.enrollments || [];
        setEnrolledStudents(enrolls);
      } catch (err) {
        console.error('Failed to fetch class students', err);
      }
    };
    fetchStudentsForClass();
  }, [selectedClassId]);

  // Handle Fee Structure Creation
  const handleCreateStructure = async (e) => {
    e.preventDefault();
    if (!selectedYearId || !newStructureName) {
      setError('Academic Year and Structure Name are required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const formattedComponents = componentsList.map((c) => ({
        name: c.name,
        amount: Number(c.amount),
        frequency: c.frequency || 'annual'
      }));

      await axios.post(
        `${API_BASE}/fee-structures`,
        {
          academicYearId: selectedYearId,
          classId: newStructureClassId || undefined,
          name: newStructureName,
          description: newStructureDesc,
          components: formattedComponents
        },
        { headers: authHeaders }
      );

      showSuccess('Fee structure created successfully!');
      setShowStructureModal(false);
      setNewStructureName('');
      setNewStructureDesc('');
      fetchFeeStructures();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create fee structure.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Student Fee Assignment
  const handleAssignFee = async (e) => {
    e.preventDefault();
    if (!assignStudentId || !assignFeeStructureId || !selectedClassId) {
      setError('Class, Student, and Fee Structure are required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await axios.post(
        `${API_BASE}/student-fees`,
        {
          academicYearId: selectedYearId,
          studentId: assignStudentId,
          classId: selectedClassId,
          feeStructureId: assignFeeStructureId
        },
        { headers: authHeaders }
      );

      showSuccess('Fee structure assigned to student successfully!');
      setShowAssignModal(false);
      fetchStudentFees();
      fetchFeeSummary();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign fee structure.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Cash Payment Recording
  const handleRecordCashPayment = async (e) => {
    e.preventDefault();
    if (!selectedFeeRecord || !cashAmount) {
      setError('Fee Record and Cash Amount are required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await axios.post(
        `${API_BASE}/fee-payments/cash`,
        {
          studentFeeId: selectedFeeRecord._id,
          amount: Number(cashAmount),
          remarks: cashRemarks
        },
        { headers: authHeaders }
      );

      const receiptNo = res.data?.data?.receipt?.receiptNumber;
      showSuccess(`Cash payment of ₹${cashAmount} recorded! Receipt generated: ${receiptNo}`);
      setShowCashModal(false);
      setCashAmount('');
      setCashRemarks('');
      fetchStudentFees();
      fetchPayments();
      fetchReceipts();
      fetchFeeSummary();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record cash payment.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Discount Application
  const handleApplyDiscount = async (e) => {
    e.preventDefault();
    if (!selectedFeeRecord || !discountValue) {
      setError('Fee Record and Discount Value are required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await axios.post(
        `${API_BASE}/fee-discounts`,
        {
          studentFeeId: selectedFeeRecord._id,
          discountType,
          discountValue: Number(discountValue),
          reason: discountReason
        },
        { headers: authHeaders }
      );

      showSuccess('Discount concession applied successfully!');
      setShowDiscountModal(false);
      setDiscountValue('');
      setDiscountReason('');
      fetchStudentFees();
      fetchFeeSummary();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to apply discount.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Online Payment Order Initiation
  const handleInitiateOnlinePayment = async (feeRec) => {
    setSubmitting(true);
    setError('');
    try {
      const res = await axios.post(
        `${API_BASE}/fee-payments/online/initiate`,
        {
          studentFeeId: feeRec._id,
          amount: feeRec.pendingAmount,
          paymentProvider: 'razorpay'
        },
        { headers: authHeaders }
      );

      const order = res.data?.data?.paymentOrder;
      alert(`Online Payment Order Created!\n\nOrder ID: ${order.orderId}\nAmount: ₹${order.amount}\nProvider: ${order.paymentProvider}\nStatus: ${order.status}\n\nNotice: Live payment capture requires gateway integration.`);
      fetchPayments();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to initiate online payment.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isTeacher) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center space-y-4">
        <div className="p-6 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl flex flex-col items-center gap-3">
          <ShieldAlert className="w-12 h-12 text-amber-600" />
          <h2 className="text-xl font-bold">Access Restricted</h2>
          <p className="text-sm text-amber-700 max-w-md">
            Teachers do not have authorization to access financial fee structures, collection counters, or student billing records. Contact institution management for assistance.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-800">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="w-7 h-7 text-emerald-600" />
            Fee Management & Billing Hub
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Historical academic-year fee structures, cash collection counter, discount concessions, and payment receipt tracking.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-slate-100 p-1 rounded-lg text-sm font-semibold flex-wrap gap-1">
          {isAdmin && (
            <>
              <button
                onClick={() => setActiveTab('reports')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  activeTab === 'reports' ? 'bg-white text-emerald-700 shadow-sm font-bold' : 'text-slate-600'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('structures')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  activeTab === 'structures' ? 'bg-white text-emerald-700 shadow-sm font-bold' : 'text-slate-600'
                }`}
              >
                Structures
              </button>
              <button
                onClick={() => setActiveTab('student_fees')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  activeTab === 'student_fees' ? 'bg-white text-emerald-700 shadow-sm font-bold' : 'text-slate-600'
                }`}
              >
                Student Balances
              </button>
              <button
                onClick={() => setActiveTab('payments')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  activeTab === 'payments' ? 'bg-white text-emerald-700 shadow-sm font-bold' : 'text-slate-600'
                }`}
              >
                Transactions
              </button>
              <button
                onClick={() => setActiveTab('receipts')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  activeTab === 'receipts' ? 'bg-white text-emerald-700 shadow-sm font-bold' : 'text-slate-600'
                }`}
              >
                Receipts
              </button>
            </>
          )}

          {(isStudent || isParent) && (
            <button
              onClick={() => setActiveTab('my_fees')}
              className="px-4 py-2 bg-white text-emerald-700 shadow-sm font-bold rounded-md"
            >
              My Fee Statement
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg flex items-center gap-2 text-sm font-medium">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Summary Analytics Cards */}
      {isAdmin && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
            <p className="text-xs font-semibold text-slate-500 uppercase">Total Billed</p>
            <p className="text-lg font-bold text-slate-900 mt-1">₹{summaryMetrics.totalFees.toLocaleString()}</p>
          </div>
          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 text-center">
            <p className="text-xs font-semibold text-emerald-600 uppercase">Total Collected</p>
            <p className="text-lg font-bold text-emerald-700 mt-1">₹{summaryMetrics.collectedAmount.toLocaleString()}</p>
          </div>
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-center">
            <p className="text-xs font-semibold text-amber-600 uppercase">Total Pending</p>
            <p className="text-lg font-bold text-amber-700 mt-1">₹{summaryMetrics.pendingAmount.toLocaleString()}</p>
          </div>
          <div className="bg-rose-50 p-4 rounded-xl border border-rose-200 text-center">
            <p className="text-xs font-semibold text-rose-600 uppercase">Overdue</p>
            <p className="text-lg font-bold text-rose-700 mt-1">₹{summaryMetrics.overdueAmount.toLocaleString()}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
            <p className="text-xs font-semibold text-slate-500 uppercase">Today's Counter</p>
            <p className="text-lg font-bold text-emerald-600 mt-1">₹{summaryMetrics.todaysCollection.toLocaleString()}</p>
          </div>
          <div className="bg-sky-50 p-4 rounded-xl border border-sky-200 text-center">
            <p className="text-xs font-semibold text-sky-600 uppercase">Cash Collected</p>
            <p className="text-lg font-bold text-sky-700 mt-1">₹{summaryMetrics.cashCollection.toLocaleString()}</p>
          </div>
          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-200 text-center">
            <p className="text-xs font-semibold text-indigo-600 uppercase">Online Total</p>
            <p className="text-lg font-bold text-indigo-700 mt-1">₹{summaryMetrics.onlineCollection.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* TAB 1: OVERVIEW & REPORTS */}
      {activeTab === 'reports' && isAdmin && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Academic Session</label>
                <select
                  value={selectedYearId}
                  onChange={(e) => setSelectedYearId(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                >
                  <option value="">Select Year...</option>
                  {academicYears.map((y) => (
                    <option key={y._id} value={y._id}>
                      {y.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Filter Class</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                >
                  <option value="">All Classes</option>
                  {classes.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name || c.className}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={fetchFeeSummary}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Refresh Reports
            </button>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Fee Operations Quick Guide</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <p className="font-bold text-slate-800">1. Define Fee Structures</p>
                <p className="text-slate-600 mt-1">Configure components (Tuition, Library, Computer) and total amounts for an academic year.</p>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <p className="font-bold text-slate-800">2. Assign Fees & Installments</p>
                <p className="text-slate-600 mt-1">Assign structures to students with custom term installment due dates.</p>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <p className="font-bold text-slate-800">3. Cash & Online Collection</p>
                <p className="text-slate-600 mt-1">Collect cash counter payments with instant receipt generation or initiate online provider orders.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FEE STRUCTURES */}
      {activeTab === 'structures' && isAdmin && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-900">Fee Structures ({feeStructures.length})</h2>
            <button
              onClick={() => setShowStructureModal(true)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Create Fee Structure
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {feeStructures.map((struct) => (
              <div key={struct._id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{struct.name}</h3>
                    <p className="text-xs text-slate-500">
                      Session: {struct.academicYearId?.name || 'All'} | Class: {struct.classId?.name || 'General'}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold text-sm rounded-full">
                    ₹{struct.totalAmount.toLocaleString()}
                  </span>
                </div>

                <div className="border-t border-slate-100 pt-3 space-y-1">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Fee Breakdown Components:</p>
                  {struct.components.map((comp, idx) => (
                    <div key={idx} className="flex justify-between text-xs text-slate-700">
                      <span>• {comp.name} ({comp.frequency})</span>
                      <span className="font-semibold">₹{comp.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: STUDENT BALANCES & CASH COLLECTION */}
      {activeTab === 'student_fees' && isAdmin && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-xl font-bold text-slate-900">Student Fee Balances ({studentFees.length})</h2>
            <button
              onClick={() => setShowAssignModal(true)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Assign Fee to Student
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Class</th>
                    <th className="py-3 px-4">Structure</th>
                    <th className="py-3 px-4">Total</th>
                    <th className="py-3 px-4">Discount</th>
                    <th className="py-3 px-4">Paid</th>
                    <th className="py-3 px-4">Pending</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {studentFees.map((fee) => (
                    <tr key={fee._id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-medium">
                        {fee.studentId?.userId?.fullName || 'Student'}
                        <p className="text-xs text-slate-400 font-mono">{fee.studentId?.studentId}</p>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        {fee.classId?.name || fee.classId?.className}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {fee.feeStructureId?.name}
                      </td>
                      <td className="py-3 px-4 font-mono">₹{fee.totalAmount.toLocaleString()}</td>
                      <td className="py-3 px-4 font-mono text-emerald-600">₹{fee.discountAmount.toLocaleString()}</td>
                      <td className="py-3 px-4 font-mono text-emerald-700 font-bold">₹{fee.paidAmount.toLocaleString()}</td>
                      <td className="py-3 px-4 font-mono text-amber-700 font-bold">₹{fee.pendingAmount.toLocaleString()}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                            fee.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : fee.status === 'partially_paid'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {fee.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {fee.pendingAmount > 0 && (
                            <button
                              onClick={() => {
                                setSelectedFeeRecord(fee);
                                setCashAmount(String(fee.pendingAmount));
                                setShowCashModal(true);
                              }}
                              className="px-2.5 py-1 bg-emerald-600 text-white rounded text-xs font-medium hover:bg-emerald-700"
                            >
                              Collect Cash
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedFeeRecord(fee);
                              setShowDiscountModal(true);
                            }}
                            className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium hover:bg-slate-200"
                          >
                            Concession
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: TRANSACTIONS / PAYMENTS */}
      {activeTab === 'payments' && isAdmin && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-900">Payment Transactions ({payments.length})</h2>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                    <th className="py-3 px-4">Payment No</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Mode</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {payments.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-medium text-xs">{p.paymentNumber}</td>
                      <td className="py-3 px-4 font-medium">{p.studentId?.userId?.fullName || 'Student'}</td>
                      <td className="py-3 px-4 text-xs font-mono">{new Date(p.paymentDate).toLocaleDateString()}</td>
                      <td className="py-3 px-4 uppercase font-semibold text-xs text-slate-600">{p.paymentMode}</td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-700">₹{p.amount.toLocaleString()}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                            p.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : p.status === 'initiated'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-slate-500">{p.receiptNumber || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: RECEIPTS */}
      {activeTab === 'receipts' && isAdmin && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-900">Generated Fee Receipts ({receipts.length})</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {receipts.map((rec) => (
              <div key={rec._id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <span className="font-mono font-bold text-emerald-700">{rec.receiptNumber}</span>
                  <span className="text-xs text-slate-400">{new Date(rec.paymentDate).toLocaleDateString()}</span>
                </div>
                <p className="font-semibold text-slate-800 text-sm">{rec.studentId?.userId?.fullName}</p>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Mode: <strong className="uppercase">{rec.paymentMode}</strong></span>
                  <span className="font-bold text-slate-900">₹{rec.amount.toLocaleString()}</span>
                </div>
                <button
                  onClick={() => alert(`Official Payment Receipt\n\nReceipt No: ${rec.receiptNumber}\nStudent: ${rec.studentId?.userId?.fullName}\nAmount Paid: ₹${rec.amount}\nMode: ${rec.paymentMode.toUpperCase()}\nDate: ${new Date(rec.paymentDate).toLocaleDateString()}`)}
                  className="w-full mt-2 py-1.5 bg-slate-100 text-slate-700 rounded text-xs font-medium hover:bg-slate-200 flex items-center justify-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Receipt
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: STUDENT / PARENT VIEW */}
      {activeTab === 'my_fees' && (isStudent || isParent) && (
        <div className="space-y-6">
          {isParent && linkedChildren.length > 0 && (
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-600">Select Child:</span>
              <select
                value={selectedChildStudentId}
                onChange={(e) => setSelectedChildStudentId(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium"
              >
                {linkedChildren.map((c) => (
                  <option key={c._id || c} value={c._id || c}>
                    {c.userId?.fullName || 'Child'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {studentFees.length === 0 ? (
            <div className="p-12 bg-white rounded-xl text-center text-slate-500">
              <p>No fee statement records found for the selected student.</p>
            </div>
          ) : (
            studentFees.map((fee) => (
              <div key={fee._id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">{fee.feeStructureId?.name || 'Fee Statement'}</h3>
                    <p className="text-xs text-slate-500">Session: {fee.academicYearId?.name}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                      fee.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {fee.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 uppercase">Total Fee</p>
                    <p className="text-lg font-bold text-slate-800">₹{fee.totalAmount.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-lg">
                    <p className="text-xs text-emerald-600 uppercase">Discount</p>
                    <p className="text-lg font-bold text-emerald-700">₹{fee.discountAmount.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-sky-50 rounded-lg">
                    <p className="text-xs text-sky-600 uppercase">Paid Amount</p>
                    <p className="text-lg font-bold text-sky-700">₹{fee.paidAmount.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg">
                    <p className="text-xs text-amber-600 uppercase">Pending Payable</p>
                    <p className="text-lg font-bold text-amber-700">₹{fee.pendingAmount.toLocaleString()}</p>
                  </div>
                </div>

                {fee.pendingAmount > 0 && (
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => handleInitiateOnlinePayment(fee)}
                      className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-bold text-sm shadow-sm flex items-center gap-2"
                    >
                      <CreditCard className="w-4 h-4" /> Pay Online (Initiate Order)
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* MODAL: CREATE FEE STRUCTURE */}
      {showStructureModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full space-y-4 shadow-xl">
            <h3 className="font-bold text-lg text-slate-900">Create Fee Structure</h3>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Structure Name</label>
              <input
                type="text"
                placeholder="e.g. Class 10 Annual Package"
                value={newStructureName}
                onChange={(e) => setNewStructureName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Fee Components</label>
              {componentsList.map((comp, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Component Name"
                    value={comp.name}
                    onChange={(e) => {
                      const updated = [...componentsList];
                      updated[idx].name = e.target.value;
                      setComponentsList(updated);
                    }}
                    className="flex-1 px-3 py-1.5 border border-slate-300 rounded text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Amount"
                    value={comp.amount}
                    onChange={(e) => {
                      const updated = [...componentsList];
                      updated[idx].amount = e.target.value;
                      setComponentsList(updated);
                    }}
                    className="w-28 px-3 py-1.5 border border-slate-300 rounded text-sm"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <button onClick={() => setShowStructureModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
              <button onClick={handleCreateStructure} disabled={submitting} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold">
                Save Structure
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ASSIGN FEE TO STUDENT */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="font-bold text-lg text-slate-900">Assign Fee Structure</h3>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Select Class</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="">Select Class...</option>
                {classes.map((c) => (
                  <option key={c._id} value={c._id}>{c.name || c.className}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Select Student</label>
              <select
                value={assignStudentId}
                onChange={(e) => setAssignStudentId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="">Select Student...</option>
                {enrolledStudents.map((e) => (
                  <option key={e.studentId?._id || e.studentId} value={e.studentId?._id || e.studentId}>
                    {e.studentId?.userId?.fullName || 'Student'} ({e.rollNumber || 'No Roll'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Fee Structure</label>
              <select
                value={assignFeeStructureId}
                onChange={(e) => setAssignFeeStructureId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="">Select Structure...</option>
                {feeStructures.map((s) => (
                  <option key={s._id} value={s._id}>{s.name} (₹{s.totalAmount})</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <button onClick={() => setShowAssignModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
              <button onClick={handleAssignFee} disabled={submitting} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold">
                Assign Fee
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: COLLECT CASH PAYMENT */}
      {showCashModal && selectedFeeRecord && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="font-bold text-lg text-slate-900">Record Cash Payment</h3>
            <p className="text-xs text-slate-500">Student: {selectedFeeRecord.studentId?.userId?.fullName}</p>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Amount (₹)</label>
              <input
                type="number"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-emerald-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Remarks</label>
              <input
                type="text"
                value={cashRemarks}
                onChange={(e) => setCashRemarks(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <button onClick={() => setShowCashModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
              <button onClick={handleRecordCashPayment} disabled={submitting} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold">
                Confirm Cash Collection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: APPLY CONCESSION / DISCOUNT */}
      {showDiscountModal && selectedFeeRecord && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="font-bold text-lg text-slate-900">Apply Fee Concession</h3>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Discount Type</label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (₹)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Discount Value</label>
              <input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Reason / Approval Note</label>
              <input
                type="text"
                value={discountReason}
                onChange={(e) => setDiscountReason(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <button onClick={() => setShowDiscountModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
              <button onClick={handleApplyDiscount} disabled={submitting} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold">
                Apply Concession
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
