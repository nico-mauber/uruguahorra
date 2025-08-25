import { Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { logger, LogModule } from '@/utils/logger';
import { ToastService } from '@/utils/toast';

/**
 * Hook para manejar funcionalidad de portapapeles
 */
export const useClipboard = () => {
  /**
   * Copiar texto al portapapeles
   */
  const copyToClipboard = async (
    text: string,
    message?: string
  ): Promise<boolean> => {
    try {
      await Clipboard.setStringAsync(text);

      const successMessage = message || 'Copiado al portapapeles';
      ToastService.success(successMessage);

      logger.debug(LogModule.UI, 'Texto copiado al portapapeles', {
        platform: Platform.OS,
        textLength: text.length,
      });

      return true;
    } catch (error) {
      logger.error(LogModule.UI, 'Error copiando al portapapeles', error);
      ToastService.error('Error al copiar');
      return false;
    }
  };

  /**
   * Obtener texto del portapapeles
   */
  const getFromClipboard = async (): Promise<string | null> => {
    try {
      const text = await Clipboard.getStringAsync();
      logger.debug(LogModule.UI, 'Texto obtenido del portapapeles', {
        platform: Platform.OS,
        textLength: text.length,
      });
      return text;
    } catch (error) {
      logger.error(LogModule.UI, 'Error obteniendo del portapapeles', error);
      return null;
    }
  };

  return {
    copyToClipboard,
    getFromClipboard,
  };
};
