import axios from 'axios';
import { getAuthToken } from './auth.service';

const API_BASE_URL = 'http://10.0.2.2:5000/api/v1'; // Default Android emulator localhost bridge or IP

/**
 * Helper to construct authorized request headers
 */
const getAuthHeaders = async () => {
  const token = await getAuthToken();
  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
};

/**
 * Fetch visible notifications for logged-in user
 */
export const fetchNotifications = async (params = {}) => {
  try {
    const config = await getAuthHeaders();
    config.params = params;
    const response = await axios.get(`${API_BASE_URL}/notifications`, config);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to connect to server' };
  }
};

/**
 * Get total unread notifications count
 */
export const fetchUnreadCount = async () => {
  try {
    const config = await getAuthHeaders();
    const response = await axios.get(`${API_BASE_URL}/notifications/unread-count`, config);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to connect to server' };
  }
};

/**
 * Get details of a single notification
 */
export const fetchNotificationById = async (id) => {
  try {
    const config = await getAuthHeaders();
    const response = await axios.get(`${API_BASE_URL}/notifications/${id}`, config);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to connect to server' };
  }
};

/**
 * Mark a single notification as read
 */
export const markNotificationAsRead = async (id) => {
  try {
    const config = await getAuthHeaders();
    const response = await axios.patch(`${API_BASE_URL}/notifications/${id}/read`, {}, config);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to connect to server' };
  }
};

/**
 * Mark all visible notifications as read
 */
export const markAllNotificationsAsRead = async () => {
  try {
    const config = await getAuthHeaders();
    const response = await axios.patch(`${API_BASE_URL}/notifications/read-all`, {}, config);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to connect to server' };
  }
};
