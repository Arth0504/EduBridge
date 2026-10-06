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
 * Fetch Timetables with optional filters
 */
export const fetchTimetables = async (params = {}) => {
  try {
    const config = await getAuthHeaders();
    config.params = params;
    const response = await axios.get(`${API_BASE_URL}/timetables`, config);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch timetables' };
  }
};

/**
 * Fetch Section Timetable
 */
export const fetchSectionTimetable = async (sectionId) => {
  try {
    const config = await getAuthHeaders();
    const response = await axios.get(`${API_BASE_URL}/timetables/section/${sectionId}`, config);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch section timetable' };
  }
};

/**
 * Fetch Teacher Timetable
 */
export const fetchTeacherTimetable = async (teacherId) => {
  try {
    const config = await getAuthHeaders();
    const response = await axios.get(`${API_BASE_URL}/timetables/teacher/${teacherId}`, config);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch teacher timetable' };
  }
};

/**
 * Fetch Student Timetable
 */
export const fetchStudentTimetable = async (studentId) => {
  try {
    const config = await getAuthHeaders();
    const response = await axios.get(`${API_BASE_URL}/timetables/student/${studentId}`, config);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch student timetable' };
  }
};

/**
 * Fetch Parent Child Timetables
 */
export const fetchParentTimetable = async (parentId) => {
  try {
    const config = await getAuthHeaders();
    const response = await axios.get(`${API_BASE_URL}/timetables/parent/${parentId}`, config);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch parent timetables' };
  }
};
