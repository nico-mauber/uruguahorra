import { useState, useEffect } from 'react';
import { ChallengeSessionsService } from '@/services/challenge-sessions.service';
import { logger, LogModule } from '@/utils/logger';

export interface ChallengeProgressData {
  sessionId: string;
  currentProgress: number;
  daysCompleted: number;
  totalDaysRequired: number;
  isOnTrack: boolean;
  loading: boolean;
  error: string | null;
}

/**
 * Hook para obtener el progreso real de un reto basado en días completados
 */
export function useChallengeProgress(sessionId: string): ChallengeProgressData {
  const [data, setData] = useState<ChallengeProgressData>({
    sessionId,
    currentProgress: 0,
    daysCompleted: 0,
    totalDaysRequired: 0,
    isOnTrack: false,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    const fetchProgress = async () => {
      if (!sessionId) {
        setData((prev) => ({
          ...prev,
          loading: false,
          error: 'ID de sesión no válido',
        }));
        return;
      }

      try {
        setData((prev) => ({ ...prev, loading: true, error: null }));

        const progressData =
          await ChallengeSessionsService.calculateSessionRealProgress(
            sessionId
          );

        if (mounted) {
          setData((prev) => ({
            ...prev,
            currentProgress: progressData.currentProgress,
            daysCompleted: progressData.daysCompleted,
            totalDaysRequired: progressData.totalDaysRequired,
            isOnTrack: progressData.isOnTrack,
            loading: false,
            error: null,
          }));
        }
      } catch (error) {
        logger.error(LogModule.UI, 'Error obteniendo progreso de reto', {
          sessionId,
          error,
        });

        if (mounted) {
          setData((prev) => ({
            ...prev,
            loading: false,
            error: error instanceof Error ? error.message : 'Error desconocido',
          }));
        }
      }
    };

    fetchProgress();

    return () => {
      mounted = false;
    };
  }, [sessionId]);

  return data;
}

/**
 * Hook para manejar múltiples sesiones de retos
 */
export function useMultipleChallengeProgress(
  sessionIds: string[]
): Record<string, ChallengeProgressData> {
  const [dataMap, setDataMap] = useState<Record<string, ChallengeProgressData>>(
    {}
  );

  useEffect(() => {
    let mounted = true;

    const fetchAllProgress = async () => {
      const newDataMap: Record<string, ChallengeProgressData> = {};

      // Inicializar con estado de carga
      sessionIds.forEach((sessionId) => {
        newDataMap[sessionId] = {
          sessionId,
          currentProgress: 0,
          daysCompleted: 0,
          totalDaysRequired: 0,
          isOnTrack: false,
          loading: true,
          error: null,
        };
      });

      if (mounted) {
        setDataMap(newDataMap);
      }

      // Obtener progreso para cada sesión
      const promises = sessionIds.map(async (sessionId) => {
        try {
          const progressData =
            await ChallengeSessionsService.calculateSessionRealProgress(
              sessionId
            );
          return { sessionId, progressData, error: null };
        } catch (error) {
          logger.error(LogModule.UI, 'Error obteniendo progreso de reto', {
            sessionId,
            error,
          });
          return {
            sessionId,
            progressData: null,
            error: error instanceof Error ? error.message : 'Error desconocido',
          };
        }
      });

      const results = await Promise.allSettled(promises);

      if (mounted) {
        const finalDataMap = { ...newDataMap };

        results.forEach((result, index) => {
          const sessionId = sessionIds[index];

          if (result.status === 'fulfilled' && result.value.progressData) {
            const { progressData } = result.value;
            finalDataMap[sessionId] = {
              sessionId,
              currentProgress: progressData.currentProgress,
              daysCompleted: progressData.daysCompleted,
              totalDaysRequired: progressData.totalDaysRequired,
              isOnTrack: progressData.isOnTrack,
              loading: false,
              error: null,
            };
          } else {
            finalDataMap[sessionId] = {
              sessionId,
              currentProgress: 0,
              daysCompleted: 0,
              totalDaysRequired: 0,
              isOnTrack: false,
              loading: false,
              error:
                result.status === 'fulfilled'
                  ? result.value.error
                  : 'Error obteniendo progreso',
            };
          }
        });

        setDataMap(finalDataMap);
      }
    };

    if (sessionIds.length > 0) {
      fetchAllProgress();
    } else {
      setDataMap({});
    }

    return () => {
      mounted = false;
    };
  }, [sessionIds.join(',')]); // Dependencia basada en IDs concatenados

  return dataMap;
}
