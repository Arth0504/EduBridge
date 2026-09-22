import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Platform } from 'react-native';

// For Android emulator vs physical phone (use localhost or local network IP)
const API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5000/api/v1/auth' : 'http://localhost:5000/api/v1/auth';

const TOKEN_KEY = '@edubridge_token';
const USER_KEY = '@edubridge_user';

export const authService = {
  // Login API
  async login(email, password) {
    try {
      const response = await axios.post(`${API_URL}/login`, { email, password });
      const { token, user } = response.data.data;

      await AsyncStorage.setItem(TOKEN_KEY, token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));

      return { success: true, token, user };
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed. Check your network or credentials.';
      return { success: false, message };
    }
  },

  // Register API (Student/Parent)
  async register(data) {
    try {
      const response = await axios.post(`${API_URL}/register`, data);
      const { token, user } = response.data.data;

      await AsyncStorage.setItem(TOKEN_KEY, token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));

      return { success: true, token, user };
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed.';
      return { success: false, message };
    }
  },

  // Restore User Profile from Token
  async getMe(token) {
    try {
      const response = await axios.get(`${API_URL}/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return { success: true, user: response.data.data.user };
    } catch (error) {
      return { success: false };
    }
  },

  // Read Local Session
  async getStoredSession() {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      const userStr = await AsyncStorage.getItem(USER_KEY);
      const user = userStr ? JSON.parse(userStr) : null;
      return { token, user };
    } catch (error) {
      return { token: null, user: null };
    }
  },

  // Clear Session
  async logout() {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(USER_KEY);
    } catch (error) {
      console.warn('Logout clear error:', error);
    }
  }
};
