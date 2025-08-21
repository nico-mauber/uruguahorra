import { useState, useEffect } from 'react';
import { useAnalytics } from './useAnalytics';

/**
 * Hook to check if the "pods_ahorro" feature flag is enabled
 * @returns boolean - true if feature is enabled, false otherwise
 */
export const useFlagPodsAhorro = (): boolean => {
  const [isEnabled, setIsEnabled] = useState(false);
  const { isFeatureEnabled } = useAnalytics();

  useEffect(() => {
    const checkFlag = () => {
      const enabled = isFeatureEnabled('pods_ahorro');
      setIsEnabled(enabled);
    };

    // Check immediately
    checkFlag();

    // Set up interval to check periodically (feature flags can change)
    const interval = setInterval(checkFlag, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [isFeatureEnabled]);

  return isEnabled;
};

/**
 * Generic hook for any feature flag
 * @param flagKey - The feature flag key to check
 * @returns boolean - true if feature is enabled, false otherwise
 */
export const useFeatureFlag = (flagKey: string): boolean => {
  const [isEnabled, setIsEnabled] = useState(false);
  const { isFeatureEnabled } = useAnalytics();

  useEffect(() => {
    const checkFlag = () => {
      const enabled = isFeatureEnabled(flagKey);
      setIsEnabled(enabled);
    };

    checkFlag();
    const interval = setInterval(checkFlag, 30000);

    return () => clearInterval(interval);
  }, [flagKey, isFeatureEnabled]);

  return isEnabled;
};
