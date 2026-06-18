import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AuthProvider } from './utils/auth-context';
import { soundManager } from './utils/sound-manager';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    const initAudio = async () => {
      await soundManager.startBackgroundMusic();
    };
    initAudio();

    // Establecer el título del documento
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      document.title = 'BetterMind';
    }

    // Listener global para activar audio tras la primera interacción (especialmente en Web)
    const handleFirstInteraction = () => {
      console.log('LOG: Primera interacción detectada, activando audio');
      soundManager.startBackgroundMusic();
      if (typeof window !== 'undefined') {
        window.removeEventListener('click', handleFirstInteraction);
        window.removeEventListener('touchstart', handleFirstInteraction);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('click', handleFirstInteraction);
      window.addEventListener('touchstart', handleFirstInteraction);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('click', handleFirstInteraction);
        window.removeEventListener('touchstart', handleFirstInteraction);
      }
    };
  }, []);

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="parent-panel" />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}
