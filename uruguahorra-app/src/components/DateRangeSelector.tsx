import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@theme';

interface DateRangeSelectorProps {
  startDate: Date;
  endDate: Date;
  onStartDateChange: (date: Date) => void;
  onEndDateChange: (date: Date) => void;
  maxHistoryYears?: number;
}

export const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  maxHistoryYears = 2,
}) => {
  const { colors } = useTheme();
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // Estados temporales para el picker
  const [tempDay, setTempDay] = useState<number>(1);
  const [tempMonth, setTempMonth] = useState<number>(1);
  const [tempYear, setTempYear] = useState<number>(new Date().getFullYear());

  // Formatear fecha para mostrar
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('es-UY', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Generar arrays para los pickers
  const generateDays = (): number[] => {
    const daysInMonth = new Date(tempYear, tempMonth, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  };

  const generateMonths = (): { label: string; value: number }[] => {
    const months = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];
    return months.map((month, index) => ({ label: month, value: index + 1 }));
  };

  const generateYears = (): number[] => {
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - maxHistoryYears;
    return Array.from({ length: maxHistoryYears + 1 }, (_, i) => startYear + i);
  };

  // Validar fecha
  const validateDate = (
    day: number,
    month: number,
    year: number,
    isStartDate: boolean
  ): boolean => {
    const newDate = new Date(year, month - 1, day);
    const now = new Date();
    const maxPastDate = new Date();
    maxPastDate.setFullYear(now.getFullYear() - maxHistoryYears);

    // No puede ser futura
    if (newDate > now) {
      Alert.alert('Error', 'La fecha no puede ser futura');
      return false;
    }

    // No puede ser más de N años atrás
    if (newDate < maxPastDate) {
      Alert.alert(
        'Error',
        `La fecha no puede ser anterior a ${maxHistoryYears} años`
      );
      return false;
    }

    // Si es fecha de inicio, no puede ser posterior a fecha fin
    if (isStartDate && newDate > endDate) {
      Alert.alert(
        'Error',
        'La fecha de inicio no puede ser posterior a la fecha fin'
      );
      return false;
    }

    // Si es fecha fin, no puede ser anterior a fecha inicio
    if (!isStartDate && newDate < startDate) {
      Alert.alert(
        'Error',
        'La fecha fin no puede ser anterior a la fecha de inicio'
      );
      return false;
    }

    return true;
  };

  const openDatePicker = (isStartDate: boolean) => {
    const currentDate = isStartDate ? startDate : endDate;
    setTempDay(currentDate.getDate());
    setTempMonth(currentDate.getMonth() + 1);
    setTempYear(currentDate.getFullYear());

    if (isStartDate) {
      setShowStartDatePicker(true);
    } else {
      setShowEndDatePicker(true);
    }
  };

  const handleDateSelection = (isStartDate: boolean) => {
    if (validateDate(tempDay, tempMonth, tempYear, isStartDate)) {
      const newDate = new Date(tempYear, tempMonth - 1, tempDay);
      if (isStartDate) {
        onStartDateChange(newDate);
        setShowStartDatePicker(false);
      } else {
        onEndDateChange(newDate);
        setShowEndDatePicker(false);
      }
    }
  };

  const renderDateButton = (
    date: Date,
    label: string,
    isStartDate: boolean
  ) => (
    <TouchableOpacity
      style={[
        styles.dateButton,
        {
          backgroundColor: colors.background,
          borderColor: colors.primary,
          shadowColor: colors.text.primary,
        },
      ]}
      onPress={() => openDatePicker(isStartDate)}
      activeOpacity={0.8}
    >
      <View style={styles.dateButtonContent}>
        <Text style={[styles.dateLabel, { color: colors.primary }]}>
          {label}
        </Text>
        <Text style={[styles.dateValue, { color: colors.text.primary }]}>
          {formatDate(date)}
        </Text>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: colors.primary + '15' },
          ]}
        >
          <Ionicons name="calendar-outline" size={18} color={colors.primary} />
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderDatePickerModal = (isVisible: boolean, isStartDate: boolean) => (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={() => {
        if (isStartDate) {
          setShowStartDatePicker(false);
        } else {
          setShowEndDatePicker(false);
        }
      }}
    >
      <View style={styles.modalContainer}>
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: colors.background,
              shadowColor: colors.text.primary,
            },
          ]}
        >
          <View style={styles.modalHeader}>
            <View
              style={[
                styles.modalHandle,
                { backgroundColor: colors.text.secondary + '30' },
              ]}
            />
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
              Seleccionar {isStartDate ? 'fecha de inicio' : 'fecha fin'}
            </Text>
            <Text
              style={[styles.modalSubtitle, { color: colors.text.secondary }]}
            >
              Elige día, mes y año manualmente
            </Text>
          </View>

          <View style={styles.pickersContainer}>
            {/* Selector de Día */}
            <View style={styles.pickerColumn}>
              <View
                style={[
                  styles.pickerLabelContainer,
                  { backgroundColor: colors.primary + '10' },
                ]}
              >
                <Ionicons name="calendar" size={16} color={colors.primary} />
                <Text style={[styles.pickerLabel, { color: colors.primary }]}>
                  Día
                </Text>
              </View>
              <View
                style={[
                  styles.pickerWrapper,
                  {
                    borderColor: colors.primary + '30',
                    backgroundColor: colors.background,
                    shadowColor: colors.primary,
                  },
                ]}
              >
                <ScrollView
                  style={styles.scrollPicker}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.scrollContent}
                >
                  {generateDays().map((day) => (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.pickerItem,
                        tempDay === day && {
                          backgroundColor: colors.primary,
                          transform: [{ scale: 1.05 }],
                        },
                      ]}
                      onPress={() => setTempDay(day)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          {
                            color:
                              tempDay === day ? '#FFFFFF' : colors.text.primary,
                            fontWeight: tempDay === day ? '700' : '500',
                          },
                        ]}
                      >
                        {day.toString().padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* Selector de Mes */}
            <View style={styles.pickerColumn}>
              <View
                style={[
                  styles.pickerLabelContainer,
                  { backgroundColor: colors.primary + '10' },
                ]}
              >
                <Ionicons name="time" size={16} color={colors.primary} />
                <Text style={[styles.pickerLabel, { color: colors.primary }]}>
                  Mes
                </Text>
              </View>
              <View
                style={[
                  styles.pickerWrapper,
                  {
                    borderColor: colors.primary + '30',
                    backgroundColor: colors.background,
                    shadowColor: colors.primary,
                  },
                ]}
              >
                <ScrollView
                  style={styles.scrollPicker}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.scrollContent}
                >
                  {generateMonths().map((month) => (
                    <TouchableOpacity
                      key={month.value}
                      style={[
                        styles.pickerItem,
                        tempMonth === month.value && {
                          backgroundColor: colors.primary,
                          transform: [{ scale: 1.05 }],
                        },
                      ]}
                      onPress={() => setTempMonth(month.value)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          {
                            color:
                              tempMonth === month.value
                                ? '#FFFFFF'
                                : colors.text.primary,
                            fontWeight:
                              tempMonth === month.value ? '700' : '500',
                          },
                        ]}
                      >
                        {month.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* Selector de Año */}
            <View style={styles.pickerColumn}>
              <View
                style={[
                  styles.pickerLabelContainer,
                  { backgroundColor: colors.primary + '10' },
                ]}
              >
                <Ionicons name="library" size={16} color={colors.primary} />
                <Text style={[styles.pickerLabel, { color: colors.primary }]}>
                  Año
                </Text>
              </View>
              <View
                style={[
                  styles.pickerWrapper,
                  {
                    borderColor: colors.primary + '30',
                    backgroundColor: colors.background,
                    shadowColor: colors.primary,
                  },
                ]}
              >
                <ScrollView
                  style={styles.scrollPicker}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.scrollContent}
                >
                  {generateYears().map((year) => (
                    <TouchableOpacity
                      key={year}
                      style={[
                        styles.pickerItem,
                        tempYear === year && {
                          backgroundColor: colors.primary,
                          transform: [{ scale: 1.05 }],
                        },
                      ]}
                      onPress={() => setTempYear(year)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          {
                            color:
                              tempYear === year
                                ? '#FFFFFF'
                                : colors.text.primary,
                            fontWeight: tempYear === year ? '700' : '500',
                          },
                        ]}
                      >
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </View>

          {/* Mostrar fecha seleccionada */}
          <View
            style={[
              styles.selectedDateContainer,
              {
                backgroundColor: colors.primary + '08',
                borderColor: colors.primary + '20',
              },
            ]}
          >
            <View style={styles.selectedDateHeader}>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={colors.primary}
              />
              <Text
                style={[styles.selectedDateLabel, { color: colors.primary }]}
              >
                Fecha seleccionada
              </Text>
            </View>
            <Text
              style={[styles.selectedDateText, { color: colors.text.primary }]}
            >
              {`${tempDay.toString().padStart(2, '0')}/${tempMonth.toString().padStart(2, '0')}/${tempYear}`}
            </Text>
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[
                styles.modalButton,
                styles.cancelButton,
                { borderColor: colors.text.secondary + '30' },
              ]}
              onPress={() => {
                if (isStartDate) {
                  setShowStartDatePicker(false);
                } else {
                  setShowEndDatePicker(false);
                }
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={18} color={colors.text.secondary} />
              <Text
                style={[
                  styles.modalButtonText,
                  { color: colors.text.secondary },
                ]}
              >
                Cancelar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modalButton,
                {
                  backgroundColor: colors.primary,
                  shadowColor: colors.primary,
                },
              ]}
              onPress={() => handleDateSelection(isStartDate)}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark" size={18} color="#FFFFFF" />
              <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>
                Confirmar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <View style={styles.dateRange}>
        {renderDateButton(startDate, 'Desde', true)}
        <View
          style={[
            styles.arrowContainer,
            { backgroundColor: colors.primary + '15' },
          ]}
        >
          <Ionicons name="arrow-forward" size={20} color={colors.primary} />
        </View>
        {renderDateButton(endDate, 'Hasta', false)}
      </View>

      {renderDatePickerModal(showStartDatePicker, true)}
      {renderDatePickerModal(showEndDatePicker, false)}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  dateRange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },

  dateButton: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    minHeight: 64,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  dateButtonContent: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },

  dateLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  dateValue: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },

  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },

  arrowContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },

  arrowIcon: {
    marginHorizontal: 8,
  },

  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 0,
  },

  modalContent: {
    width: '100%',
    maxHeight: '80%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingTop: 16,
    elevation: 8,
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },

  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },

  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 16,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },

  modalSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    opacity: 0.8,
  },

  // Date Pickers
  pickersContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    paddingHorizontal: 4,
  },

  pickerColumn: {
    flex: 1,
  },

  pickerLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 6,
  },

  pickerLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  pickerWrapper: {
    borderRadius: 12,
    borderWidth: 1.5,
    overflow: 'hidden',
    height: 140,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  scrollPicker: {
    flex: 1,
  },

  scrollContent: {
    paddingVertical: 8,
  },

  pickerItem: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 4,
    marginVertical: 2,
    minHeight: 44,
    justifyContent: 'center',
  },

  pickerItemText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Selected date display
  selectedDateContainer: {
    alignItems: 'center',
    marginBottom: 24,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1.5,
    marginHorizontal: 4,
  },

  selectedDateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },

  selectedDateLabel: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  selectedDateText: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 1,
  },

  modalButtons: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 4,
    paddingTop: 8,
  },

  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
  },

  modalButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
