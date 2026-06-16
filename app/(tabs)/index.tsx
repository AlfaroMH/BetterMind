import { IconSymbol } from "@/components/ui/icon-symbol";
import { useRouter, type Href } from "expo-router";
import React, { useState } from "react";
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { useAuth } from "../utils/auth-context";
import { verifyPassword } from "../utils/database/auth";
import { soundManager } from "../utils/sound-manager";
import { supabase } from "../utils/supabase";

/**
 * Inferimos el tipo del prop `name` directamente desde el componente IconSymbol.
 * Esto evita importar un tipo que quizás no exista/exporte en icon-symbol.
 */
type IconName = React.ComponentProps<typeof IconSymbol>['name'];

interface GameCardProps {
  title: string;
  description: string;
  iconName: IconName;    // 🔹 inferido desde IconSymbol
  route: string | Href;  // 🔹 permitimos string para literales simples + Href para seguridad
  comingSoon?: boolean;
}

function GameCard({
  title,
  description,
  iconName,
  route,
  comingSoon = false,
}: GameCardProps) {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={[styles.gameCard, comingSoon && styles.disabledCard]}
      onPress={() => {
        if (comingSoon) return;
        soundManager.playSound('click');
        // casteamos a Href para satisfacer la firma de router.push
        router.push(route as Href);
      }}
      disabled={comingSoon}
      activeOpacity={0.8}
    >
      <View style={styles.iconContainer}>
        <IconSymbol size={50} name={iconName} color="#FFD700" />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.gameTitle}>{title}</Text>
        <Text style={styles.gameDescription}>{description}</Text>
        {comingSoon && (
          <View style={styles.soonBadge}>
            <Text style={styles.soonText}>Próximamente</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function GamesScreen() {
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 768;
  const contentWidth = isLargeScreen ? 800 : '100%';

  const { parent, activeChild, logout } = useAuth();
  const router = useRouter();
  const [isPasswordModalVisible, setPasswordModalVisible] = useState(false);
  const [password, setPassword] = useState('');

  // Auto-refresh profile status for cross-tab sync (Realtime Supabase)
  React.useEffect(() => {
    if (!parent) return;

    // Usar un ID único para el canal para evitar errores de suscripción duplicada
    const channelId = Math.random().toString(36).substring(7);
    const channel = supabase
      .channel(`child-auth-${parent.parent_id}-${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'children',
          filter: `parent_id=eq.${parent.parent_id}`
        },
        (payload: any) => {
          console.log('Cambio de autorización detectado:', payload);
          // Si el hijo activo fue actualizado a 'authorized', podrías refrescar o redirigir
        }
      );
    
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [parent]);

  // Mantener escucha de eventos locales
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleUpdate = () => {
        console.log('Database updated locally');
      };
      window.addEventListener('local-db-updated', handleUpdate);
      return () => window.removeEventListener('local-db-updated', handleUpdate);
    }
  }, []);

  const handleAccessParentPanel = async () => {
    soundManager.playSound('click');
    if (!parent) {
      router.push('/login');
      return;
    }
    setPasswordModalVisible(true);
  };

  const confirmPassword = async () => {
    soundManager.playSound('click');
    if (!parent) return;
    const isValid = await verifyPassword(parent.parent_id, password);
    if (isValid) {
      setPasswordModalVisible(false);
      setPassword('');
      router.push('/parent-panel');
    } else {
      Alert.alert('Error', 'Incorrect password');
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, isLargeScreen ? { paddingHorizontal: (width - (contentWidth as number)) / 2 + 20 } : {}]}>
        {parent ? (
          <View style={styles.userInfo}>
            <TouchableOpacity 
              style={styles.parentButton} 
              onPress={() => {
                soundManager.playSound('click');
                handleAccessParentPanel();
              }}
            >
              <Text style={styles.parentButtonText}>👤 {parent.first_name}</Text>
            </TouchableOpacity>
            <Text style={styles.childInfoText}>
              Perfil: {activeChild ? (activeChild.is_parent_profile ? 'Mío (Padre)' : activeChild.first_name) : 'Ninguno seleccionado'}
            </Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.loginButton} onPress={() => {
            soundManager.playSound('click');
            router.push('/login');
          }}>
            <Text style={styles.loginButtonText}>Login / Register</Text>
          </TouchableOpacity>
        )}
        {parent && (
          <TouchableOpacity onPress={() => {
            soundManager.playSound('click');
            logout();
          }} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isLargeScreen && { alignItems: 'center' }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: contentWidth as any, maxWidth: '100%' }}>
          <Text style={styles.title}>🎮 BetterMind - Juegos Mentales</Text>
          <Text style={styles.subtitle}>¡Selecciona un juego para comenzar!</Text>

          {/* Grid de juegos para pantallas grandes */}
          <View style={[
            styles.gamesGrid,
            isLargeScreen && { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 20 }
          ]}>
            <View style={isLargeScreen ? { width: '45%' } : { width: '100%' }}>
              <GameCard
                title="Matemáticas"
                description="Mejora tus habilidades con operaciones básicas"
                iconName="plus.forwardslash.minus"
                route="/menu_matematicas"
              />
            </View>

            <View style={isLargeScreen ? { width: '45%' } : { width: '100%' }}>
              <GameCard
                title="Memoria"
                description="Ejercita tu memoria con secuencias y patrones"
                iconName="brain"
                route="/memory"
                comingSoon
              />
            </View>

            <View style={isLargeScreen ? { width: '45%' } : { width: '100%' }}>
              <GameCard
                title="Lógica"
                description="Resuelve acertijos y problemas de lógica"
                iconName="puzzlepiece"
                route="/logic"
                comingSoon
              />
            </View>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={isPasswordModalVisible} transparent animationType="fade" onRequestClose={() => setPasswordModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalLogoContainer}>
              <IconSymbol name="lock.fill" size={30} color="#007AFF" />
            </View>
            <Text style={styles.modalTitle}>Verificación de Seguridad</Text>
            <Text style={styles.modalSubtitle}>Por favor ingresa tu contraseña para acceder al panel parental</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Contraseña"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoFocus
              placeholderTextColor="#A9A9A9"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => {
                  soundManager.playSound('click');
                  setPasswordModalVisible(false);
                  setPassword('');
                }}
              >
                <Text style={[styles.buttonText, { color: '#666' }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.confirmButton]} onPress={confirmPassword}>
                <Text style={styles.buttonText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#6A11CB',
  },
  topBar: {
    paddingTop: 50,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  parentButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 5,
  },
  parentButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  childInfoText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginLeft: 5,
  },
  loginButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  loginButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  logoutButton: {
    padding: 10,
  },
  logoutText: {
    color: '#fff',
    opacity: 0.7,
    fontSize: 12,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    marginBottom: 30,
  },
  gamesGrid: {
    width: '100%',
  },
  gameCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    marginRight: 16,
  },
  gameTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  gameDescription: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
  },
  soonBadge: {
    marginTop: 8,
    backgroundColor: "#FFD700",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  soonText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 12,
  },
  disabledCard: {
    opacity: 0.6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 30,
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 25,
    borderRadius: 30,
    alignItems: 'center',
    width: '100%',
    maxWidth: 450, // Añadido para monitores grandes
    alignSelf: 'center', // Centrar en pantalla
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  modalLogoContainer: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalSubtitle: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  modalInput: {
    width: '100%',
    backgroundColor: '#F1F3F5',
    padding: 16,
    borderRadius: 16,
    fontSize: 16,
    color: '#1A1A1A',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F1F3F5',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
});
