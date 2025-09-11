import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { logger, LogModule } from '@/utils/logger';

export function useDeepLinking() {
  const router = useRouter();

  useEffect(() => {
    // Disable deep linking completely in web development to avoid infinite loops
    if (Platform.OS === 'web' && __DEV__) {
      logger.info(LogModule.NAV, 'Deep linking disabled in web development mode');
      return;
    }

    // Handle initial URL when app is opened from a deep link
    const handleInitialURL = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          logger.info(LogModule.NAV, 'App opened with initial URL:', initialUrl);
          handleDeepLink(initialUrl);
        }
      } catch (error) {
        logger.error(LogModule.NAV, 'Error getting initial URL:', error);
      }
    };

    // Handle URLs when app is already running
    const handleURLChange = (event: { url: string }) => {
      logger.info(LogModule.NAV, 'Deep link received:', event.url);
      handleDeepLink(event.url);
    };

    const handleDeepLink = (url: string) => {
      try {
        // Parse the URL to extract the path
        const { hostname, path, scheme } = Linking.parse(url);
        
        logger.info(LogModule.NAV, 'Parsing deep link:', { hostname, path, url, scheme });

        // Skip localhost URLs and regular web navigation to avoid loops
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          logger.info(LogModule.NAV, 'Skipping localhost URL to avoid navigation loop');
          return;
        }

        // Skip regular HTTP/HTTPS URLs that aren't subscription-related
        if ((scheme === 'http' || scheme === 'https') && 
            !path?.includes('subscription-success') && 
            !path?.includes('subscription-failure') && 
            !path?.includes('subscription-pending')) {
          logger.info(LogModule.NAV, 'Skipping regular web URL, not subscription-related');
          return;
        }

        // Only handle deep links for our app (uruguahorra://) or subscription URLs
        const isAppDeepLink = scheme === 'uruguahorra';
        const isSubscriptionURL = path?.includes('subscription-success') || 
                                  path?.includes('subscription-failure') || 
                                  path?.includes('subscription-pending');

        if (!isAppDeepLink && !isSubscriptionURL) {
          logger.info(LogModule.NAV, 'URL not relevant for deep linking, ignoring');
          return;
        }

        // Handle subscription-related deep links
        if (path?.includes('subscription-success')) {
          logger.info(LogModule.NAV, 'Navigating to subscription success');
          router.push('/subscription-success');
        } else if (path?.includes('subscription-failure')) {
          logger.info(LogModule.NAV, 'Navigating to subscription failure');
          router.push('/subscription-failure');
        } else if (path?.includes('subscription-pending')) {
          logger.info(LogModule.NAV, 'Navigating to subscription pending');
          router.push('/subscription-pending');
        } else if (isAppDeepLink) {
          // Only navigate to home for actual app deep links, not web URLs
          logger.info(LogModule.NAV, 'App deep link, navigating to home');
          router.push('/(tabs)/');
        }
      } catch (error) {
        logger.error(LogModule.NAV, 'Error handling deep link:', error);
      }
    };

    // Set up listeners
    handleInitialURL();
    const subscription = Linking.addEventListener('url', handleURLChange);

    // Cleanup
    return () => {
      subscription?.remove();
    };
  }, [router]);
}