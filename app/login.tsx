import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useAuth } from './utils/auth-context';
import { loginParent } from './utils/database/auth';
import { ensureParentProfile } from './utils/database/children';
import { soundManager } from './utils/sound-manager';

import { clearAllData } from './utils/database/adapter';

export default function LoginScreen() {
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 768;
  const contentWidth = isLargeScreen ? 450 : '100%';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { setParent } = useAuth();

  const handleReset = async () => {
    soundManager.playSound('click');
    Alert.alert(
      'Limpiar Datos',
      '¿Estás seguro de que deseas borrar TODA la información? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Borrar Todo', style: 'destructive', onPress: async () => await clearAllData() }
      ]
    );
  };

  const handleLogin = async () => {
    soundManager.playSound('click');
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Por favor ingresa todos los datos.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await loginParent(email.trim().toLowerCase(), password);
      if (result.success) {
        // Ensure parent has a game profile
        await ensureParentProfile(result.parent.parent_id, result.parent.first_name);
        setParent(result.parent);
        router.replace('/parent-panel');
      } else {
        Alert.alert('Error', 'Credenciales incorrectas.');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo iniciar sesión.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemedView style={[styles.container, isLargeScreen && { alignItems: 'center' }]}>
      <View style={{ width: contentWidth as any, maxWidth: '100%' }}>
        <ThemedText type="title">Iniciar Sesión</ThemedText>
        <ThemedText style={styles.subtitle}>Accede a tu panel de control</ThemedText>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder="Contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TouchableOpacity 
            style={[styles.button, isLoading && styles.buttonDisabled]} 
            onPress={handleLogin}
            disabled={isLoading}
          >
            <ThemedText style={styles.buttonText}>
              {isLoading ? 'Cargando...' : 'Entrar'}
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => {
            soundManager.playSound('click');
            router.push('/register');
          }}>
            <ThemedText style={styles.link}>¿No tienes cuenta? Regístrate</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  subtitle: {
    marginBottom: 30,
    opacity: 0.7,
  },
  form: {
    gap: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 15,
    borderRadius: 10,
  },
  button: {
    backgroundColor: '#0a7ea4',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  resetButton: {
    marginTop: 20,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ff3b30',
    borderRadius: 8,
  },
  resetButtonText: {
    color: '#ff3b30',
    fontSize: 14,
    fontWeight: '600',
  },
  link: {
    color: '#0a7ea4',
    textAlign: 'center',
    marginTop: 15,
  },
});
