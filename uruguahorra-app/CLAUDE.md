# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Uruguahorra is a gamified savings mobile app for LATAM users built with React Native, Expo SDK 50, and TypeScript. The app uses Supabase for backend services and Zustand for state management.

## Essential Commands

```bash
# Development
npm start          # Start Expo development server
npm run android    # Run on Android device/emulator
npm run ios        # Run on iOS device/simulator

# Code Quality - ALWAYS run these before completing tasks
npm run lint       # Check for linting errors
npm run lint:fix   # Auto-fix linting errors
npm run format     # Format code with Prettier

# Testing
npm test           # Run Jest tests (when configured)

# Production Builds
eas build --platform android  # Build Android APK/AAB
eas build --platform ios      # Build iOS IPA
```

## Architecture

### Navigation Structure (Expo Router)
- `src/app/(auth)/` - Authentication flow (onboarding, login)
- `src/app/(tabs)/` - Main tab navigation (home, challenges, leaderboard, profile)
- Modal screens: `import-csv.tsx`, `paywall.tsx`

### Key Services & Stores
- **Supabase Client**: `src/lib/supabase.ts` - Configured with project credentials
- **Auth Service**: `src/services/auth.service.ts` - User authentication
- **Goals Service**: `src/services/goals.service.ts` - CRUD operations for savings goals
- **Zustand Stores**: `useAuthStore`, `useGoalsStore` - Global state management (theme managed via Context API)

### Database Schema
The app uses Supabase with 13 tables including:
- `users` - User profiles with gamification stats (XP, level, streaks)
- `goals` - Savings goals with category-specific fields and progress tracking
- `challenges` - Gamified challenges for motivation
- `micro_contributions` - Individual savings entries with multiple sources
- `squads` - Social groups for competition
- `learnings` - Educational content with gamification
- `subscriptions` - Premium user management
- `transactions_raw` - Imported financial data
- Additional tables for user progress, audit logs, and paywall events

All tables have optimized RLS policies. **UNIFIED MIGRATION**: Use `supabase/master_database_schema.sql` - single file that creates the complete database from scratch.

## Development Workflow

### Before Starting Development
1. Verify Supabase connection in `.env` file
2. Run `npm install` to ensure dependencies are installed
3. Check `NEXT_STEPS.md` for pending features status

### Working with Components
- Base components in `src/components/` (Button, Card, ProgressBar)
- Follow existing component patterns for consistency
- Use theme colors from `src/theme/colors.ts`

### TypeScript Configuration
- Strict mode enabled
- Path aliases configured (@/, @components/, @features/, etc.)
- Always maintain type safety

### Supabase Integration
- Client already configured with authentication persistence
- Use existing services (auth.service.ts, goals.service.ts) for database operations
- RLS policies are active - operations must include proper user context

## Important Notes

- **PowerShell Admin Required**: On Windows, run npm commands in PowerShell as Administrator due to permission requirements
- **Expo Go**: Use Expo Go app on mobile device for testing during development
- **Environment Variables**: Supabase credentials are in `.env` (not committed to git)
- **Pre-commit Hooks**: Husky configured to run linting on commit