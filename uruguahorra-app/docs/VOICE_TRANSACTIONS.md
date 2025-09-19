# Voice Transactions Implementation

## Overview

This implementation adds voice-to-transaction functionality to the UruguAhorra app, allowing users to create transactions by speaking naturally in Spanish.

## Architecture

### Core Components

1. **AudioTransactionComponent**: React Native component for recording audio with visual feedback
2. **AITranscriptionService**: Handles audio-to-text conversion using OpenAI Whisper
3. **AITransactionParserService**: Processes transcribed text to extract transaction details using GPT-4o-mini
4. **MCPService**: Client for MCP (Model Context Protocol) server with fallback to direct services
5. **VoiceTransactionProcessor**: Orchestrates the entire voice-to-transaction pipeline
6. **VoiceTransactionModal**: Complete UI for the voice transaction experience

### Data Flow

```
User Voice Input
       ↓
AudioTransactionComponent (Recording)
       ↓
AITranscriptionService (OpenAI Whisper)
       ↓
AITransactionParserService (GPT-4o-mini)
       ↓
VoiceTransactionProcessor (Validation)
       ↓
MCPService or Direct TransactionsService
       ↓
Database Transaction Created
```

## Features

### Voice Recognition
- Records audio using expo-av (when installed)
- Optimized audio quality for transcription
- Visual feedback with animations during recording
- Maximum recording duration of 30 seconds

### AI Processing
- **Transcription**: OpenAI Whisper via GPT-4o-mini-transcribe model
- **Parsing**: GPT-4o-mini for natural language understanding
- **Categories**: Automatic categorization based on available transaction categories
- **Confidence Scoring**: Multi-factor confidence calculation

### User Experience
- **Progressive Disclosure**: Step-by-step progress indication
- **Confirmation Flow**: Manual confirmation for low-confidence transactions
- **Error Handling**: Graceful error handling with retry options
- **Visual Feedback**: Real-time progress and status updates

### MCP Server Integration
- **Primary Path**: Uses MCP server for transaction creation when available
- **Fallback**: Direct service calls if MCP server is unavailable
- **Tool Set**: create_expense, create_income, get_categories, get_user_stats

## Usage

### Basic Voice Commands (Spanish)

```
"Gasté cincuenta pesos en almuerzo"
"Pagué 200 pesos de supermercado"
"Me pagaron 5000 por trabajo freelance"
"Ingresé 1500 de la venta"
```

### Voice Transaction Modal

The modal guides users through the process:

1. **Recording Phase**: User speaks their transaction
2. **Processing Phase**: Audio is transcribed and analyzed
3. **Confirmation Phase**: User confirms or edits the detected transaction
4. **Success Phase**: Transaction is created and confirmed

## Configuration

### Environment Variables

```bash
OPENAI_API_KEY=your_openai_api_key_here
```

### VoiceTransactionProcessor Config

```typescript
VoiceTransactionProcessor.configure({
  maxRecordingDuration: 30000,
  audioQuality: 'medium',
  transcriptionTimeout: 10000,
  parsingTimeout: 8000,
  enableMCP: true,
  fallbackToDirectService: true,
});
```

### MCP Server Config

```typescript
MCPService.configure({
  baseUrl: 'http://localhost:8080/mcp',
  timeout: 15000,
  retryAttempts: 2,
  enableFallback: true,
});
```

## Integration

### Adding to TransactionFAB

The voice button is automatically integrated into the existing TransactionFAB:

```typescript
// Voice button appears in quick actions with purple color
<TouchableOpacity
  style={[styles.quickActionButton, styles.voiceButton]}
  onPress={() => handleQuickAction('voice')}
>
  <Ionicons name="mic" size={24} color="#FFFFFF" />
</TouchableOpacity>
```

### Dashboard Integration

The voice functionality is available through the floating action button (FAB) on the main dashboard.

## Error Handling

### Confidence Thresholds
- **High Confidence (>80%)**: Auto-create transaction
- **Medium Confidence (60-80%)**: Request confirmation
- **Low Confidence (<60%)**: Request confirmation with warnings

### Fallback Mechanisms
1. MCP server unavailable → Direct service calls
2. Transcription fails → Error message with retry option
3. Parsing fails → Manual entry suggestion
4. Network issues → Offline mode (future enhancement)

## Security & Privacy

### Audio Data
- Audio files are processed in memory when possible
- Temporary audio files are cleaned up after processing
- No audio data is stored permanently

### API Keys
- OpenAI API key is stored securely
- API calls are made over HTTPS
- Rate limiting is implemented to prevent abuse

### Data Validation
- All parsed transaction data is validated before creation
- SQL injection protection through parameterized queries
- User input sanitization

## Dependencies

### Required
- `expo-av`: Audio recording functionality
- `@supabase/supabase-js`: Database operations
- `@expo/vector-icons`: UI icons

### Optional
- MCP server: Enhanced transaction processing
- Linear gradient libraries: Better visual effects

## Troubleshooting

### Common Issues

1. **Audio permissions denied**
   - Solution: Request permissions in app settings

2. **OpenAI API key not configured**
   - Solution: Set OPENAI_API_KEY environment variable

3. **MCP server unavailable**
   - Solution: Automatic fallback to direct services

4. **Low transcription confidence**
   - Solution: Speak more clearly, reduce background noise

5. **Category not recognized**
   - Solution: Manual category selection in confirmation screen

### Debug Mode

Enable detailed logging:

```typescript
logger.setLevel(LogLevel.DEBUG);
```

## Future Enhancements

1. **Offline Mode**: Local transcription models
2. **Multi-language**: Support for English and Portuguese
3. **Voice Profiles**: User-specific voice recognition
4. **Smart Categories**: Learning-based category suggestions
5. **Batch Transactions**: Multiple transactions in one recording
6. **Voice Commands**: Beyond transactions (queries, reports)

## Performance Metrics

### Expected Performance
- **Recording to transcription**: 2-5 seconds
- **Transcription to parsing**: 1-3 seconds
- **Parsing to creation**: 0.5-2 seconds
- **Total end-to-end**: 3-10 seconds

### Optimization Strategies
- Streaming transcription for real-time feedback
- Local caching of frequent categories
- Batch API calls when possible

## Testing

### Manual Testing Scenarios
1. Clear speech in quiet environment
2. Background noise testing
3. Different Spanish accents
4. Various transaction types and amounts
5. Network interruption handling
6. Rapid successive transactions

### Automated Tests
- Unit tests for parsing logic
- Integration tests for API calls
- UI tests for modal interactions
- Performance tests for audio processing