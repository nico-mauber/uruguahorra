import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useTheme } from '@theme';
import { logger, LogModule } from '@/utils/logger';
import {
  VoiceRecordingState,
  VoiceTransactionStep,
} from '@/types/voice-transaction.types';

interface AudioTransactionComponentProps {
  onRecordingComplete: (audioUri: string) => Promise<void>;
  currentStep: VoiceTransactionStep;
  disabled?: boolean;
  maxDuration?: number;
}

export const AudioTransactionComponent: React.FC<
  AudioTransactionComponentProps
> = ({
  onRecordingComplete,
  currentStep,
  disabled = false,
  maxDuration = 30000, // 30 seconds max
}) => {
  const { colors } = useTheme();
  const [recordingState, setRecordingState] = useState<VoiceRecordingState>({
    isRecording: false,
    isProcessing: false,
    duration: 0,
    error: null,
  });

  // Animation refs
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;

  // Recording refs
  const recordingRef = useRef<Audio.Recording | null>(null);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Setup audio permissions and configuration when component mounts
    setupAudio();

    return () => {
      // Cleanup on unmount
      stopRecording();
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    };
  }, []);

  useEffect(() => {
    // Start or stop pulse animation based on recording state
    if (recordingState.isRecording) {
      startPulseAnimation();
      startWaveAnimation();
    } else {
      stopAnimations();
    }
  }, [recordingState.isRecording]);

  const getRecordingOptions = () => {
    if (Platform.OS === 'web') {
      // Web-specific recording options for better compatibility with OpenAI Whisper
      return {
        web: {
          mimeType: 'audio/webm;codecs=opus',
          bitsPerSecond: 64000,
        },
        android: {
          extension: '.webm',
          outputFormat: Audio.RECORDING_FORMAT_WEBM,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 64000,
        },
        ios: {
          extension: '.wav',
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 64000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
      };
    } else {
      // Use standard high quality for mobile
      return Audio.RecordingOptionsPresets.HIGH_QUALITY;
    }
  };

  const setupAudio = async () => {
    try {
      // Request audio permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Audio permission denied');
      }

      // Configure audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });

      logger.info(LogModule.TRANSACTIONS, 'Audio setup completed');
    } catch (error) {
      logger.error(LogModule.TRANSACTIONS, 'Error setting up audio', error);
      setRecordingState((prev) => ({
        ...prev,
        error: 'Audio permissions required',
      }));
    }
  };

  const startRecording = async () => {
    try {
      if (disabled || currentStep !== 'idle') {
        return;
      }

      setRecordingState({
        isRecording: true,
        isProcessing: false,
        duration: 0,
        error: null,
      });

      // Create and start recording
      const recordingOptions = getRecordingOptions();
      const { recording } = await Audio.Recording.createAsync(recordingOptions);
      recordingRef.current = recording;

      // Start duration counter
      const startTime = Date.now();
      durationInterval.current = setInterval(() => {
        const duration = Date.now() - startTime;
        setRecordingState((prev) => ({
          ...prev,
          duration,
        }));

        // Auto-stop at max duration
        if (duration >= maxDuration) {
          stopRecording();
        }
      }, 100);

      logger.info(LogModule.TRANSACTIONS, 'Recording started');
    } catch (error) {
      logger.error(LogModule.TRANSACTIONS, 'Error starting recording', error);
      setRecordingState((prev) => ({
        ...prev,
        isRecording: false,
        error: 'Failed to start recording',
      }));
    }
  };

  const stopRecording = async () => {
    try {
      if (!recordingState.isRecording && !recordingRef.current) {
        return;
      }

      setRecordingState((prev) => ({
        ...prev,
        isRecording: false,
        isProcessing: true,
      }));

      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }

      // Stop and get the recording
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
        const uri = recordingRef.current.getURI();
        recordingRef.current = null;

        if (uri) {
          logger.info(
            LogModule.TRANSACTIONS,
            'Recording stopped, processing audio',
            { uri }
          );
          await onRecordingComplete(uri);
        } else {
          throw new Error('No audio file generated');
        }
      }

      setRecordingState((prev) => ({
        ...prev,
        isProcessing: false,
      }));
    } catch (error) {
      logger.error(LogModule.TRANSACTIONS, 'Error stopping recording', error);
      setRecordingState((prev) => ({
        ...prev,
        isRecording: false,
        isProcessing: false,
        error: 'Failed to stop recording',
      }));
    }
  };

  const handlePress = () => {
    if (recordingState.isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const startWaveAnimation = () => {
    Animated.loop(
      Animated.timing(waveAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    ).start();
  };

  const stopAnimations = () => {
    pulseAnim.setValue(1);
    waveAnim.setValue(0);
  };

  const getButtonColor = () => {
    if (disabled || recordingState.error) {
      return colors.text.disabled;
    }
    if (recordingState.isRecording) {
      return '#FF6B6B'; // Red when recording
    }
    if (
      recordingState.isProcessing ||
      currentStep === 'transcribing' ||
      currentStep === 'parsing'
    ) {
      return '#FFA500'; // Orange when processing
    }
    return colors.primary; // Default blue
  };

  const getButtonIcon = () => {
    if (
      recordingState.isProcessing ||
      currentStep === 'transcribing' ||
      currentStep === 'parsing'
    ) {
      return 'hourglass';
    }
    if (recordingState.isRecording) {
      return 'stop';
    }
    return 'mic';
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    return `${seconds}s`;
  };

  const getStatusText = () => {
    if (recordingState.error) {
      return recordingState.error;
    }

    switch (currentStep) {
      case 'recording':
        return `Grabando... ${formatDuration(recordingState.duration)}`;
      case 'transcribing':
        return 'Transcribiendo audio...';
      case 'parsing':
        return 'Analizando transacción...';
      case 'creating':
        return 'Creando transacción...';
      case 'success':
        return '¡Transacción creada!';
      case 'error':
        return 'Error procesando';
      default:
        return 'Mantén presionado para hablar';
    }
  };

  const styles = StyleSheet.create({
    container: {
      alignItems: 'center',
      padding: 20,
    },

    buttonContainer: {
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
    },

    waveCircle: {
      position: 'absolute',
      width: 120,
      height: 120,
      borderRadius: 60,
      borderWidth: 2,
      borderColor: getButtonColor(),
    },

    recordButton: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: getButtonColor(),
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 8,
    },

    statusContainer: {
      marginTop: 20,
      alignItems: 'center',
    },

    statusText: {
      fontSize: 16,
      color: colors.text.primary,
      textAlign: 'center',
      marginBottom: 8,
    },

    durationText: {
      fontSize: 14,
      color: colors.text.secondary,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },

    errorText: {
      color: colors.error,
      fontSize: 14,
      textAlign: 'center',
      marginTop: 8,
    },

    helpText: {
      fontSize: 12,
      color: colors.text.secondary,
      textAlign: 'center',
      marginTop: 12,
      paddingHorizontal: 20,
    },
  });

  const waveScale = waveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.5],
  });

  const waveOpacity = waveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.7, 0],
  });

  return (
    <View style={styles.container}>
      <View style={styles.buttonContainer}>
        {/* Animated wave effect when recording */}
        {recordingState.isRecording && (
          <Animated.View
            style={[
              styles.waveCircle,
              {
                transform: [{ scale: waveScale }],
                opacity: waveOpacity,
              },
            ]}
          />
        )}

        {/* Main record button */}
        <Animated.View
          style={{
            transform: [{ scale: scaleAnim }, { scale: pulseAnim }],
          }}
        >
          <TouchableOpacity
            style={styles.recordButton}
            onPress={handlePress}
            disabled={disabled && !recordingState.isRecording}
            activeOpacity={0.8}
            onPressIn={() => {
              Animated.spring(scaleAnim, {
                toValue: 0.95,
                useNativeDriver: true,
              }).start();
            }}
            onPressOut={() => {
              Animated.spring(scaleAnim, {
                toValue: 1,
                useNativeDriver: true,
              }).start();
            }}
          >
            <Ionicons name={getButtonIcon()} size={32} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>
      </View>

      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>{getStatusText()}</Text>

        {recordingState.duration > 0 && (
          <Text style={styles.durationText}>
            {formatDuration(recordingState.duration)} /{' '}
            {formatDuration(maxDuration)}
          </Text>
        )}

        {recordingState.error && (
          <Text style={styles.errorText}>{recordingState.error}</Text>
        )}
      </View>

      {currentStep === 'idle' && (
        <Text style={styles.helpText}>
          {`Di algo como: "Gasté 50 pesos en almuerzo" o "Me pagaron 2000 por
          trabajo"`}
        </Text>
      )}
    </View>
  );
};
