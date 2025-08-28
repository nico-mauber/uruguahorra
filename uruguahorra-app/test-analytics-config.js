// Test script to verify analytics configuration
import { ENV_CONFIG } from './src/config/env.config';

console.log('🔧 Analytics Configuration Test:');
console.log('================================');
console.log('PREFER_REAL_DATA:', ENV_CONFIG.PREFER_REAL_DATA);
console.log('MOCK_FALLBACK:', ENV_CONFIG.MOCK_FALLBACK);
console.log('ANALYTICS_ENABLED:', ENV_CONFIG.ANALYTICS_ENABLED);

console.log('\n📊 Expected Behavior:');
if (ENV_CONFIG.PREFER_REAL_DATA && ENV_CONFIG.MOCK_FALLBACK) {
  console.log('✅ Will show real user data if available, empty state if not');
} else if (!ENV_CONFIG.PREFER_REAL_DATA && ENV_CONFIG.MOCK_FALLBACK) {
  console.log('🎭 Will show real user data if available, mock data if not');
} else if (ENV_CONFIG.PREFER_REAL_DATA && !ENV_CONFIG.MOCK_FALLBACK) {
  console.log('📊 Will show only real user data, empty state if none');
} else {
  console.log('⚠️  Will show only real user data, error if none');
}
