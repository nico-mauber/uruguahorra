import React from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { TransactionFAB } from '@/components';

export default function TransactionsFABDemo() {
  const handleTransactionCreated = (transaction: any) => {
    console.log('Nueva transacción creada:', transaction);
    // Aquí podrías mostrar una notificación de éxito
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>{/* Tu contenido principal aquí */}</View>

      {/* FAB de transacciones */}
      <TransactionFAB
        userId="demo-user-id"
        onTransactionCreated={handleTransactionCreated}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    flex: 1,
    padding: 20,
  },
});
