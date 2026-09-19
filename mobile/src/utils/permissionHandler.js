import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Linking, Platform } from 'react-native';

const STORAGE_PREFIX = '@edubridge_perm_';

/**
 * Checks if a permission preference state exists in AsyncStorage
 */
export const getStoredPermissionState = async (permissionKey) => {
  try {
    const value = await AsyncStorage.getItem(`${STORAGE_PREFIX}${permissionKey}`);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.warn(`[PermissionHandler] Failed to read ${permissionKey} state:`, error);
    return null;
  }
};

/**
 * Saves permission preference state in AsyncStorage
 */
export const setStoredPermissionState = async (permissionKey, stateData) => {
  try {
    await AsyncStorage.setItem(
      `${STORAGE_PREFIX}${permissionKey}`,
      JSON.stringify({
        ...stateData,
        updatedAt: new Date().toISOString()
      })
    );
  } catch (error) {
    console.warn(`[PermissionHandler] Failed to store ${permissionKey} state:`, error);
  }
};

/**
 * On-Demand Safe Permission Request Handler
 * @param {string} permissionKey - e.g. 'camera', 'location', 'notifications'
 * @param {string} featureName - Human friendly feature title e.g. 'ID Scanner'
 * @param {Function} checkStatusFn - Async function returning { granted, canAskAgain, status }
 * @param {Function} requestStatusFn - Async function triggering the system prompt
 */
export const requestPermissionOnDemand = async ({
  permissionKey,
  featureName,
  checkStatusFn,
  requestStatusFn
}) => {
  try {
    // 1. Check current hardware/system permission status
    const current = await checkStatusFn();
    if (current && (current.granted || current.status === 'granted')) {
      await setStoredPermissionState(permissionKey, { status: 'granted', permanentlyDenied: false });
      return { success: true, status: 'granted' };
    }

    // 2. Check cached local preference state
    const cached = await getStoredPermissionState(permissionKey);

    // 3. Handle permanently denied or max prompt reached state
    if ((current && current.canAskAgain === false) || (cached && cached.permanentlyDenied)) {
      Alert.alert(
        `${featureName} Permission Required`,
        `Access to ${permissionKey} is disabled for EduBridge. Please enable it in your device settings to use this feature.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => {
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              } else {
                Linking.openSettings();
              }
            }
          }
        ]
      );
      return { success: false, status: 'permanently_denied' };
    }

    // 4. Trigger system permission prompt only when on-demand feature is invoked
    const response = await requestStatusFn();

    if (response && (response.granted || response.status === 'granted')) {
      await setStoredPermissionState(permissionKey, { status: 'granted', permanentlyDenied: false });
      return { success: true, status: 'granted' };
    } else {
      const isBlocked = response ? response.canAskAgain === false : false;
      await setStoredPermissionState(permissionKey, {
        status: 'denied',
        permanentlyDenied: isBlocked
      });

      Alert.alert(
        'Permission Denied',
        `${featureName} requires ${permissionKey} permission to proceed.`
      );
      return { success: false, status: 'denied' };
    }
  } catch (error) {
    console.error(`[PermissionHandler] Error requesting ${permissionKey}:`, error);
    return { success: false, status: 'error', error: error.message };
  }
};
