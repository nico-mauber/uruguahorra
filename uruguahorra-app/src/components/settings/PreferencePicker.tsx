import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@components';
import { useTheme } from '@theme';

interface PickerOption {
  value: string;
  label: string;
  description?: string;
}

interface PreferencePickerProps {
  label: string;
  value: string;
  options: PickerOption[];
  onValueChange: (value: string) => void;
  disabled?: boolean;
  icon?: string;
}

export const PreferencePicker: React.FC<PreferencePickerProps> = ({
  label,
  value,
  options,
  onValueChange,
  disabled = false,
  icon,
}) => {
  const { colors } = useTheme();
  const [isModalVisible, setIsModalVisible] = useState(false);

  const selectedOption = options.find((option) => option.value === value);

  const handleOptionSelect = (selectedValue: string) => {
    onValueChange(selectedValue);
    setIsModalVisible(false);
  };

  const renderOption = ({ item }: { item: PickerOption }) => (
    <TouchableOpacity
      style={[
        styles.option,
        {
          backgroundColor:
            item.value === value ? colors.primary + '10' : 'transparent',
        },
      ]}
      onPress={() => handleOptionSelect(item.value)}
    >
      <View style={styles.optionContent}>
        <Text style={[styles.optionLabel, { color: colors.text.primary }]}>
          {item.label}
        </Text>
        {item.description && (
          <Text
            style={[styles.optionDescription, { color: colors.text.secondary }]}
          >
            {item.description}
          </Text>
        )}
      </View>
      {item.value === value && (
        <Ionicons name="checkmark" size={20} color={colors.primary} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.text.primary }]}>
        {label}
      </Text>

      <TouchableOpacity
        style={[
          styles.selector,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border.primary,
          },
          disabled && styles.disabled,
        ]}
        onPress={() => !disabled && setIsModalVisible(true)}
        disabled={disabled}
      >
        <View style={styles.selectorContent}>
          {icon && (
            <Ionicons
              // @ts-expect-error - Ionicons type issue
              name={icon}
              size={20}
              color={colors.text.secondary}
              style={styles.selectorIcon}
            />
          )}
          <Text style={[styles.selectorText, { color: colors.text.primary }]}>
            {selectedOption?.label || 'Seleccionar...'}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={20} color={colors.text.secondary} />
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Card
              style={[styles.modal, { backgroundColor: colors.background }]}
            >
              <View style={styles.modalHeader}>
                <Text
                  style={[styles.modalTitle, { color: colors.text.primary }]}
                >
                  {label}
                </Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setIsModalVisible(false)}
                >
                  <Ionicons
                    name="close"
                    size={24}
                    color={colors.text.secondary}
                  />
                </TouchableOpacity>
              </View>

              <FlatList
                data={options}
                renderItem={renderOption}
                keyExtractor={(item) => item.value}
                style={styles.optionsList}
                showsVerticalScrollIndicator={false}
              />
            </Card>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  selector: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectorContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectorIcon: {
    marginRight: 8,
  },
  selectorText: {
    fontSize: 16,
  },
  disabled: {
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    width: '100%',
    maxHeight: '80%',
  },
  modal: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  optionsList: {
    maxHeight: 300,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  optionDescription: {
    fontSize: 14,
    marginTop: 2,
  },
});
