import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Platform } from 'react-native';

const API_BASE = Platform.OS === 'android' ? 'http://10.0.2.2:5000/api/v1' : 'http://localhost:5000/api/v1';
const TOKEN_KEY = '@edubridge_token';

export const userService = {
  async getStudentProfile(profileId) {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      const res = await axios.get(`${API_BASE}/students/${profileId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return { success: true, student: res.data.data.student };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Failed to fetch student profile.' };
    }
  },

  async getParentProfile(profileId) {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      const res = await axios.get(`${API_BASE}/parents/${profileId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return { success: true, parent: res.data.data.parent };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Failed to fetch parent profile.' };
    }
  },

  async getParentChildLinks() {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      const res = await axios.get(`${API_BASE}/parent-child-links`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return { success: true, links: res.data.data.links };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Failed to fetch linked children.' };
    }
  }
};
