import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Platform-aware storage adapter that works on both web and native
class StorageAdapter {
  private isWeb = Platform.OS === 'web';

  async getItem(key: string): Promise<string | null> {
    if (this.isWeb) {
      // Use localStorage for web
      try {
        return localStorage.getItem(key);
      } catch (error) {
        console.error('Error reading from localStorage:', error);
        return null;
      }
    } else {
      // Use SecureStore for native (iOS/Android)
      try {
        return await SecureStore.getItemAsync(key);
      } catch (error) {
        console.error('Error reading from SecureStore:', error);
        return null;
      }
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    if (this.isWeb) {
      // Use localStorage for web
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        console.error('Error writing to localStorage:', error);
      }
    } else {
      // Use SecureStore for native (iOS/Android)
      try {
        await SecureStore.setItemAsync(key, value);
      } catch (error) {
        console.error('Error writing to SecureStore:', error);
      }
    }
  }

  async removeItem(key: string): Promise<void> {
    if (this.isWeb) {
      // Use localStorage for web
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error('Error removing from localStorage:', error);
      }
    } else {
      // Use SecureStore for native (iOS/Android)
      try {
        await SecureStore.deleteItemAsync(key);
      } catch (error) {
        console.error('Error removing from SecureStore:', error);
      }
    }
  }
}

// Export a singleton instance
export const storage = new StorageAdapter();

// Export the adapter formatted for Supabase
export const SupabaseStorageAdapter = {
  getItem: (key: string) => storage.getItem(key),
  setItem: (key: string, value: string) => storage.setItem(key, value),
  removeItem: (key: string) => storage.removeItem(key),
};