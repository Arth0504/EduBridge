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
 * Fetch list of examinations
 */
export const fetchExaminations = async (queryParams = {}) => {
  try {
    const config = await getAuthHeaders();
    config.params = queryParams;
    const response = await axios.get(`${API_BASE_URL}/examinations`, config);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch examinations' };
  }
};

/**
 * Fetch exam subject schedules
 */
export const fetchExamSchedules = async (queryParams = {}) => {
  try {
    const config = await getAuthHeaders();
    config.params = queryParams;
    const response = await axios.get(`${API_BASE_URL}/exam-schedules`, config);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch exam schedules' };
  }
};

/**
 * Fetch recorded exam marks
 */
export const fetchExamMarks = async (queryParams = {}) => {
  try {
    const config = await getAuthHeaders();
    config.params = queryParams;
    const response = await axios.get(`${API_BASE_URL}/exam-marks`, config);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch exam marks' };
  }
};

/**
 * Submit single mark entry
 */
export const submitSingleMark = async (markData) => {
  try {
    const config = await getAuthHeaders();
    const response = await axios.post(`${API_BASE_URL}/exam-marks`, markData, config);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to submit mark' };
  }
};

/**
 * Submit bulk marks for class/section
 */
export const submitBulkMarks = async (bulkData) => {
  try {
    const config = await getAuthHeaders();
    const response = await axios.post(`${API_BASE_URL}/exam-marks/bulk`, bulkData, config);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to submit bulk marks' };
  }
};

/**
 * Fetch student detailed result report
 */
export const fetchStudentResult = async (studentId, queryParams = {}) => {
  try {
    const config = await getAuthHeaders();
    config.params = queryParams;
    const response = await axios.get(`${API_BASE_URL}/results/student/${studentId}`, config);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch student result' };
  }
};

/**
 * Fetch class/section result overview
 */
export const fetchClassResults = async (queryParams = {}) => {
  try {
    const config = await getAuthHeaders();
    config.params = queryParams;
    const response = await axios.get(`${API_BASE_URL}/results/class`, config);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch class results' };
  }
};

/**
 * Publish examination results
 */
export const publishResults = async (examinationId) => {
  try {
    const config = await getAuthHeaders();
    const response = await axios.post(`${API_BASE_URL}/results/publish`, { examinationId }, config);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to publish examination results' };
  }
};
