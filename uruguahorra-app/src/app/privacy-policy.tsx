import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Card } from '@components';
import { useTheme } from '@theme';
import { Ionicons } from '@expo/vector-icons';

export default function PrivacyPolicyScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.primary,
    },
    backButton: {
      padding: 8,
      marginRight: 12,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text.primary,
    },
    content: {
      padding: 20,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text.primary,
      marginBottom: 12,
    },
    text: {
      fontSize: 14,
      color: colors.text.secondary,
      lineHeight: 20,
      marginBottom: 8,
    },
    bulletPoint: {
      fontSize: 14,
      color: colors.text.secondary,
      lineHeight: 20,
      marginBottom: 4,
      marginLeft: 16,
    },
    highlight: {
      fontWeight: '600',
      color: colors.text.primary,
    },
    contactInfo: {
      backgroundColor: colors.border.primary + '20',
      padding: 16,
      borderRadius: 8,
      marginTop: 8,
    },
    lastUpdated: {
      fontSize: 12,
      color: colors.text.secondary,
      textAlign: 'center',
      marginTop: 24,
      fontStyle: 'italic',
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Política de Privacidad</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              1. Información que Recopilamos
            </Text>
            <Text style={styles.text}>
              <Text style={styles.highlight}>Datos de Cuenta:</Text> Dirección
              de correo electrónico para autenticación y comunicación.
            </Text>
            <Text style={styles.text}>
              <Text style={styles.highlight}>Datos Financieros:</Text> Metas de
              ahorro, contribuciones registradas, patrones de gastos y progreso
              de desafíos.
            </Text>
            <Text style={styles.text}>
              <Text style={styles.highlight}>Datos de Uso:</Text> Interacciones
              con la app, tiempo de uso, funcionalidades utilizadas (vía PostHog
              Analytics).
            </Text>
            <Text style={styles.text}>
              <Text style={styles.highlight}>Datos Técnicos:</Text> Tipo de
              dispositivo, sistema operativo, dirección IP, identificadores
              únicos.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              2. Cómo Usamos la Información
            </Text>
            <Text style={styles.bulletPoint}>
              • Proporcionar servicios de seguimiento de metas y ahorro
            </Text>
            <Text style={styles.bulletPoint}>
              • Gamificación y sistema de recompensas (XP, niveles, rachas)
            </Text>
            <Text style={styles.bulletPoint}>
              • Análisis de patrones para mejorar la experiencia
            </Text>
            <Text style={styles.bulletPoint}>
              • Comunicación sobre actualizaciones y funcionalidades
            </Text>
            <Text style={styles.bulletPoint}>
              • Cumplimiento legal y prevención de fraude
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Compartir Información</Text>
            <Text style={styles.text}>
              <Text style={styles.highlight}>Proveedores de Servicios:</Text>
            </Text>
            <Text style={styles.bulletPoint}>
              • Supabase (base de datos) - Estados Unidos
            </Text>
            <Text style={styles.bulletPoint}>
              • PostHog (analíticas) - Estados Unidos
            </Text>
            <Text style={styles.bulletPoint}>
              • Expo/Vercel (hosting web) - Estados Unidos
            </Text>
            <Text style={styles.text}>
              No vendemos ni compartimos datos personales con terceros para
              marketing.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. Tus Derechos</Text>
            <Text style={styles.text}>Tienes derecho a:</Text>
            <Text style={styles.bulletPoint}>
              • <Text style={styles.highlight}>Acceso:</Text> Solicitar copia de
              tus datos personales
            </Text>
            <Text style={styles.bulletPoint}>
              • <Text style={styles.highlight}>Corrección:</Text> Actualizar
              información incorrecta
            </Text>
            <Text style={styles.bulletPoint}>
              • <Text style={styles.highlight}>Eliminación:</Text> Borrar tu
              cuenta y datos asociados
            </Text>
            <Text style={styles.bulletPoint}>
              • <Text style={styles.highlight}>Portabilidad:</Text> Exportar tus
              datos en formato estructurado
            </Text>
            <Text style={styles.bulletPoint}>
              • <Text style={styles.highlight}>Oposición:</Text> Oponerte al
              procesamiento para marketing directo
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. Seguridad de Datos</Text>
            <Text style={styles.text}>
              Implementamos medidas técnicas y organizativas apropiadas:
            </Text>
            <Text style={styles.bulletPoint}>
              • Encriptación de datos en tránsito y reposo
            </Text>
            <Text style={styles.bulletPoint}>
              • Autenticación segura mediante magic links
            </Text>
            <Text style={styles.bulletPoint}>
              • Acceso limitado por roles y permisos
            </Text>
            <Text style={styles.bulletPoint}>
              • Auditorías de seguridad regulares
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>6. Retención de Datos</Text>
            <Text style={styles.text}>
              Conservamos tus datos mientras mantengas tu cuenta activa. Después
              de la eliminación de cuenta, los datos se borran dentro de 30
              días, excepto información requerida por obligaciones legales.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              7. Transferencias Internacionales
            </Text>
            <Text style={styles.text}>
              Tus datos pueden procesarse en Estados Unidos a través de nuestros
              proveedores de servicios. Estas transferencias están protegidas
              por cláusulas contractuales estándar aprobadas.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>8. Menores de Edad</Text>
            <Text style={styles.text}>
              Nuestro servicio está dirigido a personas mayores de 16 años. No
              recopilamos intencionalmente datos de menores de 16 años sin
              consentimiento parental.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              9. Cookies y Tecnologías de Seguimiento
            </Text>
            <Text style={styles.text}>
              Utilizamos cookies esenciales para funcionalidad y cookies
              analíticas para mejorar el servicio. Puedes gestionar preferencias
              en la configuración de tu dispositivo.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>10. Cambios a esta Política</Text>
            <Text style={styles.text}>
              Podemos actualizar esta política ocasionalmente. Te notificaremos
              cambios significativos por correo electrónico o mediante
              notificación en la app.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>11. Contacto</Text>
            <Text style={styles.text}>
              Para ejercer tus derechos o consultas sobre privacidad:
            </Text>
            <View style={styles.contactInfo}>
              <Text style={styles.text}>
                <Text style={styles.highlight}>Email:</Text>{' '}
                privacy@uruguahorra.app
              </Text>
              <Text style={styles.text}>
                <Text style={styles.highlight}>Responsable de Datos:</Text>{' '}
                Equipo UruguAhorra
              </Text>
            </View>
          </View>

          <Text style={styles.lastUpdated}>
            Última actualización: {new Date().toLocaleDateString('es-ES')}
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
