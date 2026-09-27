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
 * Fetch Academic Summary for current institution/user
 */
export const fetchAcademicSummary = async () => {
  try {
    const config = await getAuthHeaders();
    const response = await axios.get(`${API_BASE_URL}/academic/summary`, config);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch academic summary' };
  }
};

/**
 * Fetch Academic Years
 */
export const fetchAcademicYears = async () => {
  try {
    const config = await getAuthHeaders();
    const response = await axios.get(`${API_BASE_URL}/academic-years`, config);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch academic years' };
  }
};

/**
 * Fetch Classes
 */
export const fetchClasses = async () => {
  try {
    const config = await getAuthHeaders();
    const response = await axios.get(`${API_BASE_URL}/classes`, config);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch classes' };
  }
};

/**
 * Fetch Sections
 */
export const fetchSections = async () => {
  try {
    const config = await getAuthHeaders();
    const response = await axios.get(`${API_BASE_URL}/sections`, config);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch sections' };
  }
};

/**
 * Fetch Subjects
 */
export const fetchSubjects = async () => {
  try {
    const config = await getAuthHeaders();
    const response = await axios.get(`${API_BASE_URL}/subjects`, config);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch subjects' };
  }
};

/**
 * Fetch Teacher Subject Allocations
 */
export const fetchTeacherAssignments = async () => {
  try {
    const config = await getAuthHeaders();
    const response = await axios.get(`${API_BASE_URL}/teacher-subject-assignments`, config);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch teacher assignments' };
  }
};

/**
 * Fetch Student Enrollments
 */
export const fetchStudentEnrollments = async () => {
  try {
    const config = await getAuthHeaders();
    const response = await axios.get(`${API_BASE_URL}/student-enrollments`, config);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch student enrollments' };
  }
};
