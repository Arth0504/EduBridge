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
 * Fetch overall attendance summary statistics
 */
export const fetchAttendanceSummary = async (queryParams = {}) => {
  try {
    const config = await getAuthHeaders();
    config.params = queryParams;
    const response = await axios.get(`${API_BASE_URL}/attendance/summary`, config);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch attendance summary' };
  }
};

/**
 * Fetch specific student attendance history and metrics
 */
export const fetchStudentAttendance = async (studentId, queryParams = {}) => {
  try {
    const config = await getAuthHeaders();
    config.params = queryParams;
    const response = await axios.get(`${API_BASE_URL}/attendance/student/${studentId}`, config);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch student attendance' };
  }
};

/**
 * Fetch class/section attendance list and summary
 */
export const fetchClassSectionAttendance = async (classId, sectionId, queryParams = {}) => {
  try {
    const config = await getAuthHeaders();
    config.params = queryParams;
    const response = await axios.get(`${API_BASE_URL}/attendance/class/${classId}/section/${sectionId}`, config);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch class section attendance' };
  }
};

/**
 * Fetch general attendance records list with filters
 */
export const fetchAttendanceRecords = async (queryParams = {}) => {
  try {
    const config = await getAuthHeaders();
    config.params = queryParams;
    const response = await axios.get(`${API_BASE_URL}/attendance`, config);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch attendance records' };
  }
};

/**
 * Submit single student attendance record
 */
export const submitSingleAttendance = async (attendanceData) => {
  try {
    const config = await getAuthHeaders();
    const response = await axios.post(`${API_BASE_URL}/attendance`, attendanceData, config);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to save attendance' };
  }
};

/**
 * Submit bulk attendance for class/section
 */
export const submitBulkAttendance = async (bulkData) => {
  try {
    const config = await getAuthHeaders();
    const response = await axios.post(`${API_BASE_URL}/attendance/bulk`, bulkData, config);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to submit bulk attendance' };
  }
};

/**
 * Update attendance record by ID
 */
export const updateAttendanceRecord = async (id, updateData) => {
  try {
    const config = await getAuthHeaders();
    const response = await axios.patch(`${API_BASE_URL}/attendance/${id}`, updateData, config);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to update attendance record' };
  }
};
