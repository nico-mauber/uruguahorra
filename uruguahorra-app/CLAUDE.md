# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
```bash
npm start           # Start Expo dev server
npm run ios         # Open iOS simulator
npm run android     # Open Android emulator  
npm run web         # Open web browser

npm run lint        # Run ESLint
npm run lint:fix    # Fix ESLint issues automatically
npm run format      # Format code with Prettier
npm test            # Run Jest tests
```

### Database & Supabase
```bash
npm run supabase:start    # Start local Supabase
npm run supabase:stop     # Stop local Supabase
npm run supabase:status   # Check Supabase status

npm run functions:serve   # Serve billing webhooks locally
npm run functions:deploy  # Deploy billing webhooks
```

### Building
```bash
npm run build:ios      # Build iOS with EAS
npm run build:android  # Build Android with EAS
npm run build:web      # Build web static files
npm run build:pwa      # Build full PWA
```

### Database Schema
**CRITICAL**: Always use `supabase/complete_database_schema.sql` as the single source of truth. This file contains the complete database schema including:
- Challenge check-in system (manual daily tracking)
- Challenge sessions with progress calculation
- All corrected PostgreSQL functions
- Complete RLS policies

## Architecture Overview

### Tech Stack
- **Frontend**: React Native 0.79.5 + Expo ~53.0.0 + TypeScript 5.8.3
- **Routing**: Expo Router (file-based)
- **State**: Zustand stores + React Context
- **Database**: Supabase (PostgreSQL with RLS)
- **Styling**: Theme system with consistent colors/typography
- **Analytics**: PostHog integration

### Project Structure

```
src/
├── app/                    # Expo Router file-based routing
│   ├── (auth)/            # Authentication flow
│   ├── (tabs)/            # Main app navigation
│   └── _layout.tsx        # Root layout with providers
├── components/            # Reusable UI components
├── features/              # Feature-based modules
│   └── gamification/      # XP, levels, streaks, quests
├── services/              # API service layer
├── store/                 # Zustand state management
├── contexts/              # React contexts (auth, theme)
├── hooks/                 # Custom React hooks
├── lib/                   # Core configurations (supabase, auth)
├── theme/                 # Design system (colors, typography)
├── types/                 # TypeScript type definitions
└── utils/                 # Utility functions
```

### Key Systems

#### Authentication System
- Magic link authentication via Supabase Auth
- Simple onboarding flow in `(auth)/simple-onboarding.tsx`
- Auto profile creation with `simple_create_user_profile()` function
- Session management in `contexts/SimpleAuthContext.tsx`

#### Challenge System (Manual Check-ins)
**Core Concept**: Behavioral challenges require manual daily check-ins (NOT linked to monetary contributions)

- **Database**: `daily_challenge_checkins` table stores daily completion status
- **UI Flow**: Click active challenge → Modal asks "Did you complete today?" → Mark Yes/No
- **Progress**: Only advances when user marks "Yes, completed"
- **Functions**:
  - `record_challenge_daily_checkin()` - Records daily check-in
  - `calculate_challenge_session_progress()` - Calculates real progress
  - `complete_challenge_session_automatically()` - Awards XP when 100% complete

#### Gamification System
- **XP Sources**: Contributions (+2 XP/$1, max 10), Challenge completion (+30), Daily streak (+5)
- **Levels**: `level = Math.floor(Math.sqrt(totalXP) / 2)`
- **Streaks**: Daily activity tracking with monthly protections (3 per month)
- **Services**: Located in `features/gamification/services/`

#### Database Architecture
- **Single Source**: `supabase/complete_database_schema.sql` (Version 5.7)
- **Challenge Tables**: `challenges`, `user_challenge_sessions`, `daily_challenge_checkins`
- **Gamification**: `users` (with total_xp), `user_xp_log`, `user_streaks`
- **Core Features**: `goals`, `micro_contributions`, `squads`

### Critical Implementation Details

#### Challenge Check-in Flow
1. User starts challenge (e.g., "Don't buy clothes for 7 days")
2. Daily: Click active challenge → `ChallengeCheckinModal` opens
3. User marks "Yes, I completed" or "No, I didn't"
4. System records in `daily_challenge_checkins` table
5. Progress updates based on actual completed days
6. At 100% completion → auto-awards XP

#### Service Layer Pattern
Services use static methods and return typed responses:
```typescript
// Example pattern
export class ChallengeSessionsService {
  static async recordDailyCheckin(
    userId: UUID, 
    sessionId: UUID, 
    completed: boolean, 
    note?: string
  ): Promise<void> {
    // Implementation with error handling and logging
  }
}
```

#### Database Function Usage
Always prefer database functions for complex operations:
```typescript
// Use PostgreSQL functions via supabase.rpc()
const { data, error } = await supabase.rpc('calculate_challenge_session_progress', {
  p_session_id: sessionId
});
```

### Testing Strategy
- **Unit Tests**: Services and utilities (`src/utils/__tests__/`)
- **Component Tests**: React components with Jest
- **Integration Tests**: Database functions and API flows
- **Manual Testing**: Challenge flow requires 7+ day testing cycles

### Development Guidelines

#### Database Changes
1. **NEVER** create separate SQL files - always update `complete_database_schema.sql`
2. Test all PostgreSQL functions in Supabase SQL Editor first
3. Challenge system functions use corrected date syntax: `(end_date::DATE - start_date::DATE) + 1`

#### Challenge System Development
- Remember: Challenges are BEHAVIORAL, not monetary
- Always test the full check-in flow: start → daily clicks → completion
- Progress is calculated from `daily_challenge_checkins` table, not contributions
- Use `ChallengeCheckinModal.tsx` for all daily interactions

#### Code Standards
- Use TypeScript strictly with defined types in `src/types/`
- Follow logging patterns with `LogModule` enum
- Implement error boundaries for robustness
- Use themed colors/typography from `src/theme/`

### Common Pitfalls
1. **Don't link challenges to contributions** - they are separate systems
2. **Don't modify database schema** without updating complete_database_schema.sql
3. **Don't assume test completion** - challenges need real-time testing over days
4. **Don't skip RLS policies** - all tables need proper row-level security

### PWA & Multi-platform
- Works on iOS, Android, and Web
- PWA capabilities with offline support
- Consistent experience across platforms
- Web-specific adaptations in `web/` directory