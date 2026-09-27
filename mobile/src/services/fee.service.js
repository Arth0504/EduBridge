import axios from 'axios';
import { getAuthToken } from './auth.service';

const API_BASE_URL = 'http://10.0.2.2:5000/api/v1';

const getAuthHeaders = async () => {
  const token = await getAuthToken();
  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
};

/**
 * Fetch fee summary reports
 */
export const fetchFeeSummary = async (queryParams = {}) => {
  try {
    const config = await getAuthHeaders();
    config.params = queryParams;
    const response = await axios.get(`${API_BASE_URL}/fee-reports/summary`, config);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch fee summary' };
  }
};

/**
 * Fetch student fee balances
 */
export const fetchStudentFees = async (queryParams = {}) => {
  try {
    const config = await getAuthHeaders();
    config.params = queryParams;
    const response = await axios.get(`${API_BASE_URL}/student-fees`, config);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch student fees' };
  }
};

/**
 * Fetch payment transaction history
 */
export const fetchFeePayments = async (queryParams = {}) => {
  try {
    const config = await getAuthHeaders();
    config.params = queryParams;
    const response = await axios.get(`${API_BASE_URL}/fee-payments`, config);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch payments' };
  }
};

/**
 * Fetch generated receipts
 */
export const fetchFeeReceipts = async (queryParams = {}) => {
  try {
    const config = await getAuthHeaders();
    config.params = queryParams;
    const response = await axios.get(`${API_BASE_URL}/fee-receipts`, config);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch receipts' };
  }
};

/**
 * Initiate Online Payment Order
 */
export const initiateOnlinePayment = async (paymentData) => {
  try {
    const config = await getAuthHeaders();
    const response = await axios.post(`${API_BASE_URL}/fee-payments/online/initiate`, paymentData, config);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to initiate online payment' };
  }
};
