import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useAuth } from './utils/auth-context';
import { registerParent } from './utils/database/auth';
import { ensureParentProfile } from './utils/database/children';
import { soundManager } from './utils/sound-manager';

export default function RegisterScreen() {
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 768;
  const contentWidth = isLargeScreen ? 500 : '100%';

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { setParent } = useAuth();

  const handleRegister = async () => {
    soundManager.playSound('click');
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Error', 'Por favor completa todos los campos requeridos.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await registerParent(
        firstName.trim(), 
        lastName.trim(), 
        email.trim().toLowerCase(), 
        phone.trim(), 
        password
      );
      
      if (result.success) {
        // Ensure parent has a game profile
        await ensureParentProfile(result.id as number, firstName.trim());
        setParent({
          parent_id: result.id as number,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
        });
        router.replace('/(tabs)');
      } else {
        Alert.alert('Error', 'No se pudo completar el registro.');
      }
    } catch (error) {
      Alert.alert('Error', 'Ocurrió un error.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={[styles.scroll, isLargeScreen && { alignItems: 'center' }]}>
        <View style={{ width: contentWidth as any, maxWidth: '100%' }}>
          <ThemedText type="title">Crear Cuenta</ThemedText>
          <ThemedText style={styles.subtitle}>Regístrate para empezar</ThemedText>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Nombre"
              value={firstName}
              onChangeText={setFirstName}
            />
            <TextInput
              style={styles.input}
              placeholder="Apellido"
              value={lastName}
              onChangeText={setLastName}
            />
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
              placeholder="Teléfono (Opcional)"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
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
              onPress={handleRegister}
              disabled={isLoading}
            >
              <ThemedText style={styles.buttonText}>
                {isLoading ? 'Cargando...' : 'Registrarse'}
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => {
              soundManager.playSound('click');
              router.push('/login');
            }}>
              <ThemedText style={styles.link}>¿Ya tienes cuenta? Inicia sesión</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    padding: 20,
    paddingTop: 60,
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
  link: {
    color: '#0a7ea4',
    textAlign: 'center',
    marginTop: 15,
  },
});
