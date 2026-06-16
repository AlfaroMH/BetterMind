import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View
} from 'react-native';
import { AIDiagnosis, getAIDiagnosis, LevelProgressRecord } from './utils/ai-service';
import { useAuth } from './utils/auth-context';
import {
    calculateAge,
    checkAccessStatus,
    createChild,
    deleteChild,
    getChildren,
    getPendingRequests,
    requestRemoteAccess,
    updateAccessRequest,
    updateChild
} from './utils/database/children';
import { getFullChildProgress } from './utils/database/level-progress';
import { soundManager } from './utils/sound-manager';
import { supabase } from './utils/supabase';

export default function ParentPanel() {
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 768;
  const contentWidth = isLargeScreen ? 700 : '100%';

  const { parent, activeChild, setActiveChild } = useAuth();
  const [children, setChildren] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [isAddModalVisible, setAddModalVisible] = useState(false);
  const [editingChild, setEditingChild] = useState<any>(null);
  const [newChildName, setNewChildName] = useState('');
  const [newChildBirthDate, setNewChildBirthDate] = useState(new Date());
  const [newChildPin, setNewChildPin] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [newChildGrade, setNewChildGrade] = useState('5');
  const [dateInputString, setDateInputString] = useState(''); // Nueva entrada de fecha manual

  // State for Remote Access
  const [childToAccess, setChildToAccess] = useState<any>(null);
  const [isAccessModalVisible, setIsAccessModalVisible] = useState(false);
  const [isPinModalVisible, setIsPinModalVisible] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [accessStatus, setAccessStatus] = useState<'none' | 'pending' | 'authorized' | 'denied'>('none');
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  // State for Tracking Map
  const [selectedChildForTracking, setSelectedChildForTracking] = useState<any>(null);
  const [trackingMap, setTrackingMap] = useState<LevelProgressRecord[]>([]);
  const [isTrackingModalVisible, setTrackingModalVisible] = useState(false);
  const [aiDiagnosis, setAiDiagnosis] = useState<AIDiagnosis | string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Custom Alert State
  const [customAlert, setCustomAlert] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    onConfirm?: () => void;
    showConfirm?: boolean;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info'
  });

  const router = useRouter();

  // Iniciar música de fondo si no está sonando
  useEffect(() => {
    soundManager.startBackgroundMusic();
  }, []);


  // Helper para alertas que funciona en Web y Nativo
  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setCustomAlert({
      visible: true,
      title,
      message,
      type,
      showConfirm: false
    });
    
    // Mantener Alert.alert para nativo como respaldo si se prefiere, 
    // pero el usuario pidió algo más vistoso (ventana flotante).
    if (Platform.OS !== 'web') {
      // Alert.alert(title, message); // Comentado para usar el modal personalizado
    }
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setCustomAlert({
      visible: true,
      title,
      message,
      type: 'warning',
      onConfirm,
      showConfirm: true
    });
  };

  const loadData = useCallback(async () => {
    if (parent) {
      try {
        const childrenList = await getChildren(parent.parent_id);
        setChildren(childrenList);
        
        const pending = await getPendingRequests(parent.parent_id);
        setPendingRequests(pending);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    }
  }, [parent]);

  useEffect(() => {
    if (!parent) return;
    loadData(); // Carga inicial

    const channelId = Math.random().toString(36).substring(7);
    const channel = supabase
      .channel(`db-changes-${parent.parent_id}-${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'children',
          filter: `parent_id=eq.${parent.parent_id}`
        },
        () => {
          console.log('Cambio detectado en Supabase, recargando datos...');
          loadData();
        }
      );
    
    channel.subscribe();

    // Mantener la escucha de eventos locales para compatibilidad
    if (Platform.OS === 'web') {
      window.addEventListener('local-db-updated', loadData);
    }

    return () => {
      supabase.removeChannel(channel);
      if (Platform.OS === 'web') {
        window.removeEventListener('local-db-updated', loadData);
      }
    };
  }, [parent, loadData]);

  useFocusEffect(
    useCallback(() => {
      if (!parent) {
        router.replace('/login');
      } else {
        loadData();
      }
    }, [parent, loadData])
  );

  const handleShowTracking = async (child: any) => {
    soundManager.playSound('click');
    setSelectedChildForTracking(child);
    const progress = await getFullChildProgress(child.child_id);
    
    // De-duplicate progress by game type and level for consistent tracking
    const deDuplicatedProgress: LevelProgressRecord[] = [];
    const getGameType = (id: string) => {
      if (id.includes('suma')) return 'suma';
      if (id.includes('resta')) return 'resta';
      if (id.includes('multi')) return 'multi';
      if (id.includes('divi')) return 'divi';
      return id.replace(/^m\d_/, '');
    };

    progress.forEach(record => {
      const type = getGameType(record.game_id);
      const existing = deDuplicatedProgress.find(r => getGameType(r.game_id) === type && r.level === record.level);
      if (existing) {
        // Keep the best performance: higher score or fewer errors if score is same
        const isBetter = record.high_score > existing.high_score || 
                        (record.high_score === existing.high_score && record.total_errors < existing.total_errors);
        
        if (isBetter) {
          existing.high_score = record.high_score;
          existing.total_errors = record.total_errors;
        }
        existing.is_unlocked = existing.is_unlocked || record.is_unlocked;
      } else {
        deDuplicatedProgress.push({ ...record });
      }
    });

    setTrackingMap(deDuplicatedProgress);
    setAiDiagnosis(null);
    setTrackingModalVisible(true);
  };

  const handleGenerateAI = async () => {
    soundManager.playSound('click');
    if (!selectedChildForTracking) return;
    setIsAiLoading(true);
    try {
      const diagnosis = await getAIDiagnosis(selectedChildForTracking.first_name, trackingMap);
      setAiDiagnosis(diagnosis);
    } catch (error) {
      showAlert('Error', 'No se pudo generar el diagnóstico de IA.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAddChild = async () => {
    if (!newChildName.trim() || !newChildPin.trim()) {
      showAlert('Error', 'Por favor completa todos los campos (Nombre y PIN).');
      return;
    }

    if (newChildPin.length < 4) {
      showAlert('Error', 'El PIN debe tener al menos 4 caracteres.');
      return;
    }

    // Validar edad mínima (10 años)
    const today = new Date();
    let birthDateToUse = newChildBirthDate;
    
    // Si estamos en web y hay texto manual, intentar parsearlo
    if (Platform.OS === 'web' && dateInputString) {
      const parts = dateInputString.split('-');
      if (parts.length === 3) {
        const [year, month, day] = parts.map(Number);
        birthDateToUse = new Date(year, month - 1, day);
      }
    }

    let age = today.getFullYear() - birthDateToUse.getFullYear();
    const m = today.getMonth() - birthDateToUse.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDateToUse.getDate())) {
      age--;
    }

    if (age < 10) {
      console.log('Age validation failed:', age);
      showAlert(
        'Requisito de Edad',
        'El niño no cumple con el requisito del sistema. La aplicación solo puede ser usada por niños de 10 años en adelante.',
        'warning'
      );
      return;
    }

    const year = birthDateToUse.getFullYear();
    const month = String(birthDateToUse.getMonth() + 1).padStart(2, '0');
    const day = String(birthDateToUse.getDate()).padStart(2, '0');
    const birthDateStr = `${year}-${month}-${day}`;

    if (editingChild) {
      const result = await updateChild(editingChild.child_id, newChildName.trim(), birthDateStr, parseInt(newChildGrade), newChildPin);
      if (result.success) {
        setAddModalVisible(false);
        setEditingChild(null);
        setNewChildName('');
        setNewChildBirthDate(new Date());
        setNewChildPin('');
        setNewChildGrade('5');
        loadData();
      }
    } else if (parent) {
      const result = await createChild(parent.parent_id, newChildName.trim(), birthDateStr, parseInt(newChildGrade), newChildPin);
      if (result.success) {
        setAddModalVisible(false);
        setNewChildName('');
        setNewChildBirthDate(new Date());
        setNewChildPin('');
        setNewChildGrade('5');
        loadData();
      }
    }
  };

  const handleDeleteChild = async (childId: number) => {
    console.log('Component: Requesting deletion for childId:', childId);
    
    const performDelete = async () => {
      soundManager.playSound('click');
      console.log('Component: Executing performDelete for childId:', childId);
      try {
        const result = await deleteChild(childId);
        console.log('Component: Delete operation result:', result);
        
        if (result.success) {
          if (activeChild?.child_id === childId) {
            setActiveChild(null);
          }
          console.log('Component: Reloading data after successful delete...');
          await loadData();
          showAlert('Éxito', 'Perfil eliminado correctamente.', 'success');
        } else {
          console.error('Component: Delete operation reported failure:', result.error);
          showAlert('Error', 'No se pudo eliminar el perfil: ' + (result.error || 'Error desconocido'), 'error');
        }
      } catch (error) {
        console.error('Component: Exception in handleDeleteChild:', error);
        showAlert('Error', 'Ocurrió un error inesperado: ' + (error instanceof Error ? error.message : String(error)), 'error');
      }
    };

    showConfirm(
      'Eliminar Perfil',
      '¿Estás seguro de que quieres eliminar este perfil? Se borrará todo su progreso y esta acción no se puede deshacer.',
      performDelete
    );
  };

  const openEditModal = (child: any) => {
    soundManager.playSound('click');
    setEditingChild(child);
    setNewChildName(child.first_name);
    setNewChildPin(child.pin || '');
    if (child.birth_date && typeof child.birth_date === 'string' && child.birth_date.includes('-')) {
      const [year, month, day] = child.birth_date.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      setNewChildBirthDate(date);
      setDateInputString(child.birth_date);
    } else {
      setNewChildBirthDate(new Date());
      setDateInputString('');
    }
    setNewChildGrade((child.grade_level || 5).toString());
    setAddModalVisible(true);
  };

  const selectChild = async (child: any) => {
    soundManager.playSound('click');
    if (child.is_parent_profile) {
      setActiveChild(child);
      router.replace('/(tabs)');
      return;
    }

    setChildToAccess(child);
    setEnteredPin('');
    setIsPinModalVisible(true);
  };

  const handleVerifyPin = async () => {
    if (!childToAccess) return;

    if (enteredPin === childToAccess.pin) {
      setIsPinModalVisible(false);
      
      // Lógica de restricciones de edad para Control Parental
      const age = calculateAge(childToAccess.birth_date);
      
      if (age >= 16) {
        // Usuarios de 16+ entran directo solo con PIN
        setActiveChild(childToAccess);
        router.replace('/(tabs)');
      } else {
        // Niños entre 10 y 15 requieren autorización remota
        startAccessFlow(childToAccess);
      }
    } else {
      showAlert('Error', 'PIN incorrecto. Inténtalo de nuevo.');
      setEnteredPin('');
    }
  };

  const startAccessFlow = async (child: any) => {
    setAccessStatus('none');
    setIsAccessModalVisible(true);
    
    // Check current status
    const statusResult = await checkAccessStatus(child.child_id);
    if (statusResult.status === 'authorized') {
      setAccessStatus('authorized');
      setActiveChild(child);
      setTimeout(() => {
        setIsAccessModalVisible(false);
        router.replace('/(tabs)');
      }, 500);
      return;
    }

    // Otherwise, request access
    setAccessStatus('pending');
    await requestRemoteAccess(child.child_id);
    
    // Configurar escucha en tiempo real para esta solicitud específica
    const channelId = Math.random().toString(36).substring(7);
    const channel = supabase
      .channel(`access-check-${child.child_id}-${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'children',
          filter: `child_id=eq.${child.child_id}`
        },
        (payload: any) => {
          const newStatus = payload.new.access_request_status;
          if (newStatus === 'authorized') {
            setAccessStatus('authorized');
            setActiveChild(child);
            supabase.removeChannel(channel);
            if (pollingInterval.current) clearInterval(pollingInterval.current);
            
            setTimeout(() => {
              setIsAccessModalVisible(false);
              router.replace('/(tabs)');
            }, 1000);
          } else if (newStatus === 'denied') {
            setAccessStatus('denied');
            supabase.removeChannel(channel);
            if (pollingInterval.current) clearInterval(pollingInterval.current);
          }
        }
      )
      .subscribe();

    // Polling de respaldo por si Realtime falla
    if (pollingInterval.current) clearInterval(pollingInterval.current);
    pollingInterval.current = setInterval(async () => {
      const check = await checkAccessStatus(child.child_id);
      if (check.status === 'authorized') {
        if (pollingInterval.current) clearInterval(pollingInterval.current);
        supabase.removeChannel(channel);
        setAccessStatus('authorized');
        setActiveChild(child);
        setTimeout(() => {
          setIsAccessModalVisible(false);
          router.replace('/(tabs)');
        }, 1000);
      } else if (check.status === 'denied') {
        setAccessStatus('denied');
        supabase.removeChannel(channel);
        if (pollingInterval.current) clearInterval(pollingInterval.current);
      }
    }, 3000);
  };

  const handleAuthorizeRequest = async (childId: number) => {
    soundManager.playSound('click');
    await updateAccessRequest(childId, 'authorized');
    loadData();
  };

  const handleDenyRequest = async (childId: number) => {
    soundManager.playSound('click');
    await updateAccessRequest(childId, 'denied');
    loadData();
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView 
        contentContainerStyle={[
          styles.scrollContainer, 
          isLargeScreen && { alignItems: 'center' }
        ]}
      >
        <View style={{ width: contentWidth as any, maxWidth: '100%' }}>
          <ThemedText style={styles.mainTitle}>Panel de Control</ThemedText>
          <ThemedText style={styles.subtitle}>Bienvenido, {parent?.first_name}</ThemedText>

          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Mi Perfil de Jugador</ThemedText>
            {children.filter(c => c.is_parent_profile).slice(0, 1).map((child, index) => (
              <View key={`parent-profile-${child.child_id}`} style={[styles.childCard, styles.parentCard]}>
                <TouchableOpacity style={{ flex: 1 }} onPress={() => selectChild(child)}>
                  <ThemedText type="defaultSemiBold" style={{ color: '#1a1a1a' }}>
                    {child.first_name} (Tú)
                  </ThemedText>
                  <ThemedText style={{ color: '#333333' }}>Acceso Total a todos los Grados</ThemedText>
                </TouchableOpacity>
                <View style={styles.actions}>
                  <TouchableOpacity onPress={() => {
                    soundManager.playSound('click');
                    handleShowTracking(child);
                  }} style={styles.trackingLink}>
                    <ThemedText style={{ color: '#218838', fontWeight: 'bold' }}>Mi Progreso</ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>

          {/* Remote Requests Section */}
          {pendingRequests.length > 0 && (
            <View style={[styles.section, { backgroundColor: '#fff8e1', borderColor: '#f57c00', borderWidth: 2 }]}>
              <ThemedText type="subtitle" style={{ color: '#e65100', fontWeight: 'bold' }}>⚠️ Solicitudes de Acceso Remoto</ThemedText>
              {pendingRequests.map((req) => (
                <View key={`req-${req.child_id}`} style={styles.requestCard}>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="defaultSemiBold" style={{ color: '#1a1a1a' }}>{req.first_name}</ThemedText>
                    <ThemedText style={{ fontSize: 12, color: '#333333' }}>Solicitado: {new Date(req.access_request_time).toLocaleTimeString()}</ThemedText>
                  </View>
                  <View style={styles.requestActions}>
                    <TouchableOpacity 
                      style={[styles.requestButton, { backgroundColor: '#2e7d32' }]} 
                      onPress={() => handleAuthorizeRequest(req.child_id)}
                    >
                      <ThemedText style={styles.requestButtonText}>Autorizar</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.requestButton, { backgroundColor: '#c62828' }]} 
                      onPress={() => handleDenyRequest(req.child_id)}
                    >
                      <ThemedText style={styles.requestButtonText}>Denegar</ThemedText>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>Perfiles de Mis Hijos</ThemedText>
              <TouchableOpacity 
                style={styles.addButton} 
                onPress={() => {
                  soundManager.playSound('click');
                  setEditingChild(null);
                  setNewChildName('');
                  setNewChildBirthDate(new Date());
                  setDateInputString('');
                  setAddModalVisible(true);
                }}
              >
                <ThemedText style={styles.addButtonText}>+ Añadir Hijo</ThemedText>
              </TouchableOpacity>
            </View>
            
            {children.filter(c => !c.is_parent_profile).length === 0 ? (
              <ThemedText style={styles.emptyText}>No has añadido perfiles para tus hijos aún.</ThemedText>
            ) : (
              children.filter(c => !c.is_parent_profile).map((child, index) => (
                <View key={`child-profile-${child.child_id}-${index}`} style={styles.childCard}>
                  <TouchableOpacity style={{ flex: 1 }} onPress={() => selectChild(child)}>
                    <ThemedText type="defaultSemiBold" style={{ color: '#1a1a1a' }}>{child.first_name}</ThemedText>
                    <ThemedText style={{ color: '#333333' }}>{child.birth_date ? `${calculateAge(child.birth_date)} años` : 'Edad no registrada'}</ThemedText>
                  </TouchableOpacity>
                  <View style={styles.actions}>
                    <TouchableOpacity onPress={() => {
                      soundManager.playSound('click');
                      handleShowTracking(child);
                    }} style={styles.trackingLink}>
                      <ThemedText style={{ color: '#218838', fontWeight: 'bold' }}>Seguimiento</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => {
                      soundManager.playSound('click');
                      openEditModal(child);
                    }}>
                      <ThemedText style={[styles.editLink, { color: '#0056b3' }]}>Editar</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => {
                      soundManager.playSound('click');
                      handleDeleteChild(Number(child.child_id));
                    }}>
                      <ThemedText style={[styles.deleteLink, { color: '#c62828' }]}>Eliminar</ThemedText>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>

          <TouchableOpacity style={styles.backButton} onPress={() => {
            soundManager.playSound('click');
            router.replace('/(tabs)');
          }}>
            <ThemedText style={styles.backButtonText}>Volver al Menú Principal</ThemedText>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal de Seguimiento y Mapa */}
      <Modal visible={isTrackingModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalContent, 
            { width: isLargeScreen ? 800 : '95%', maxHeight: '90%' }
          ]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <ThemedText type="subtitle" style={styles.trackingProfileName}>Mapa de Seguimiento: {selectedChildForTracking?.first_name}</ThemedText>
              
              {trackingMap.length === 0 || trackingMap.every(t => t.high_score === 0) ? (
                <ThemedText style={{ marginTop: 20, color: '#1a1a1a', textAlign: 'center' }}>Aún no hay progreso registrado para este perfil. ¡Comienza a jugar para ver las métricas!</ThemedText>
              ) : (
                <View style={styles.trackingContainer}>
                  {/* Dashboard Summary Cards */}
                  <View style={styles.dashboardSummaryRow}>
                    <View style={styles.summaryCard}>
                      <ThemedText style={styles.summaryLabel}>Puntaje Total</ThemedText>
                      <ThemedText style={styles.summaryValue}>
                        {trackingMap.reduce((acc, curr) => acc + (curr.high_score || 0), 0)}
                      </ThemedText>
                    </View>
                    <View style={styles.summaryCard}>
                      <ThemedText style={styles.summaryLabel}>Errores Totales</ThemedText>
                      <ThemedText style={[styles.summaryValue, { color: '#ff3b30' }]}>
                        {trackingMap.reduce((acc, curr) => acc + (Number(curr.total_errors) || 0), 0)}
                      </ThemedText>
                    </View>
                    <View style={styles.summaryCard}>
                      <ThemedText style={styles.summaryLabel}>Niveles Logrados</ThemedText>
                      <ThemedText style={styles.summaryValue}>
                        {trackingMap.filter(t => t.high_score > 0).length}
                      </ThemedText>
                    </View>
                  </View>

                  <ThemedText style={styles.sectionTitleTracking}>Desempeño por Minijuego:</ThemedText>

                  {/* Grouped by Game Type (Data is already de-duplicated in handleShowTracking) */}
                  {(() => {
                    const groupedByType: Record<string, LevelProgressRecord[]> = {};
                    const getGameType = (id: string) => {
                      if (id.includes('suma')) return 'suma';
                      if (id.includes('resta')) return 'resta';
                      if (id.includes('multi')) return 'multi';
                      if (id.includes('divi')) return 'divi';
                      return id.replace(/^m\d_/, '');
                    };

                    trackingMap.forEach(r => {
                      const type = getGameType(r.game_id);
                      if (!groupedByType[type]) groupedByType[type] = [];
                      groupedByType[type].push(r);
                    });

                    return Object.entries(groupedByType).map(([type, gameRecords]) => {
                      const getReadableGameTitle = (t: string) => {
                        switch (t) {
                          case 'suma': return 'Suma Galáctica';
                          case 'resta': return 'Resta Ninja';
                          case 'multi': return 'Multiplicación 3D';
                          case 'divi': return 'División de Élite';
                          case 'frac_read': return 'Lectura de Fracciones';
                          case 'frac_ops': return 'Operaciones con Fracciones';
                          case 'plano': return 'Plano Cartesiano';
                          case 'porcentajes': return 'Porcentajes';
                          case 'proporciones': return 'Proporciones';
                          case 'probabilidad': return 'Probabilidad Simple';
                          case 'negativos': return 'Números Negativos';
                          case 'potencias': return 'Potencias y Raíces';
                          default: return t.replace('_', ' ').toUpperCase();
                        }
                      };
                      
                      const gameTitle = getReadableGameTitle(type);
                      const gameTotal = gameRecords.reduce((acc, curr) => acc + (curr.high_score || 0), 0);
                      const gameErrors = gameRecords.reduce((acc, curr) => acc + (Number(curr.total_errors) || 0), 0);
                      
                      return (
                        <View key={`game-type-card-${type}`} style={styles.trackingModuleCard}>
                          <View style={styles.gameCardHeader}>
                            <ThemedText style={styles.trackingModuleName}>{gameTitle}</ThemedText>
                            <View style={{ alignItems: 'flex-end' }}>
                              <ThemedText style={styles.gameTotalBadge}>Puntaje: {gameTotal}</ThemedText>
                              <ThemedText style={[styles.gameTotalBadge, { backgroundColor: '#ffebee', color: '#c62828', marginTop: 4 }]}>
                                Errores: {gameErrors}
                              </ThemedText>
                            </View>
                          </View>
                          
                          <View style={styles.levelsRow}>
                            {gameRecords.sort((a, b) => a.level - b.level).map((record, lIdx) => {
                              const successes = Math.floor(record.high_score / 10);
                              const totalAttempts = successes + (Number(record.total_errors) || 0);
                              const accuracy = totalAttempts > 0 
                                ? Math.round((successes / totalAttempts) * 100) 
                                : 0;
                              
                              let statusLabel = "Bloqueado";
                              let statusColor = "#ccc";
                              
                              if (record.high_score >= 100) {
                                statusLabel = "Dominado";
                                statusColor = "#4CAF50";
                              } else if (record.high_score > 0) {
                                statusLabel = "En Práctica";
                                statusColor = "#FF9800";
                              } else if (record.is_unlocked) {
                                statusLabel = "Iniciado";
                                statusColor = "#2196F3";
                              }

                              return (
                                <View key={`level-card-${type}-${record.level}-${lIdx}`} style={[
                                  styles.levelMiniCard,
                                  record.high_score > 80 ? styles.levelSuccess : 
                                  record.high_score > 40 ? styles.levelAverage : 
                                  record.high_score > 0 ? styles.levelWeak : styles.levelLocked
                                ]}>
                                  <View style={styles.levelHeaderRow}>
                                    <ThemedText style={styles.levelMiniLabel}>Nivel {record.level}</ThemedText>
                                    <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                                      <ThemedText style={styles.statusBadgeText}>{statusLabel}</ThemedText>
                                    </View>
                                  </View>
                                  
                                  <ThemedText style={styles.levelMiniScore}>{record.high_score} / 100 pts</ThemedText>
                                  
                                  {record.is_unlocked && (
                                    <View style={styles.errorStatsContainer}>
                                      <View style={styles.statLine}>
                                        <ThemedText style={styles.statLabel}>Precisión:</ThemedText>
                                        <ThemedText style={[styles.statValue, { color: accuracy > 80 ? '#4CAF50' : accuracy > 50 ? '#FF9800' : '#f44336' }]}>
                                          {accuracy}%
                                        </ThemedText>
                                      </View>
                                      <View style={styles.statLine}>
                                        <ThemedText style={styles.statLabel}>Errores:</ThemedText>
                                        <ThemedText style={styles.statValue}>{Number(record.total_errors) || 0}</ThemedText>
                                      </View>
                                    </View>
                                  )}
                                </View>
                              );
                            })}
                          </View>
                        </View>
                      );
                    });
                  })()}
                </View>
              )}

              <View style={styles.aiSection}>
                <TouchableOpacity 
                  style={[styles.aiButton, isAiLoading && { opacity: 0.7 }]} 
                  onPress={handleGenerateAI}
                  disabled={isAiLoading}
                >
                  {isAiLoading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <ThemedText style={styles.aiButtonText}>🧠 Consultar Diagnóstico IA</ThemedText>
                  )}
                </TouchableOpacity>

                {aiDiagnosis ? (
                  <View style={styles.aiDiagnosisContent}>
                    {typeof aiDiagnosis === 'string' ? (
                      <ThemedText style={styles.diagnosisText}>{aiDiagnosis}</ThemedText>
                    ) : (
                      <View>
                        <View style={styles.aiHeader}>
                          <IconSymbol name="brain" size={24} color="#0056b3" />
                          <ThemedText style={styles.aiTitle}>Diagnóstico del Agente Pedagógico</ThemedText>
                        </View>
                        
                        <ThemedText style={styles.aiSummary}>{aiDiagnosis.summary}</ThemedText>
                        
                        <ThemedText style={styles.aiSubtitle}>Análisis Cognitivo Profundo</ThemedText>
                        <ThemedText style={styles.diagnosisText}>{aiDiagnosis.cognitiveAnalysis}</ThemedText>

                        <ThemedText style={styles.aiSubtitle}>Observaciones de Seguimiento</ThemedText>
                        <View style={styles.observationsList}>
                          {aiDiagnosis.performanceObservations.map((obs, idx) => (
                            <View 
                              key={`ai-obs-${idx}`} 
                              style={[
                                styles.aiObservationItem, 
                                styles[`obs_${obs.type}` as keyof typeof styles] as any
                              ]}
                            >
                              <IconSymbol 
                                name={
                                  obs.type === 'positive' ? "checkmark.circle.fill" : 
                                  obs.type === 'negative' ? "exclamationmark.circle.fill" : 
                                  "info.circle.fill"
                                } 
                                size={18} 
                                color={
                                  obs.type === 'positive' ? "#2e7d32" : 
                                  obs.type === 'negative' ? "#c62828" : 
                                  "#e65100"
                                } 
                              />
                              <ThemedText style={[
                                styles.aiObsTextItem,
                                { color: obs.type === 'negative' ? '#c62828' : obs.type === 'positive' ? '#2e7d32' : '#e65100' }
                              ]}>
                                {obs.text}
                              </ThemedText>
                            </View>
                          ))}
                        </View>

                        <View style={styles.personalizedPlanBox}>
                          <ThemedText style={styles.planTitle}>Plan de Mejora Personalizado</ThemedText>
                          <ThemedText style={styles.planFocus}>{aiDiagnosis.personalizedPlan.title}</ThemedText>
                          <View style={styles.planMetaRow}>
                            <ThemedText style={styles.planMetaText}>Área: {aiDiagnosis.personalizedPlan.focusArea}</ThemedText>
                            <ThemedText style={styles.planMetaText}>Tiempo: {aiDiagnosis.personalizedPlan.estimatedTime}</ThemedText>
                          </View>
                          {aiDiagnosis.personalizedPlan.steps.map((step, idx) => (
                            <View key={`plan-step-${idx}`} style={styles.planStep}>
                              <View style={styles.stepCircle}><ThemedText style={styles.stepNumber}>{idx + 1}</ThemedText></View>
                              <ThemedText style={styles.stepText}>{step}</ThemedText>
                            </View>
                          ))}
                        </View>

                        <ThemedText style={styles.aiSubtitle}>Recomendaciones Clave</ThemedText>
                        {aiDiagnosis.recommendations.map((rec, idx) => (
                          <View key={`ai-rec-${idx}`} style={styles.aiRecBox}>
                            <View style={styles.recHeaderRow}>
                              <ThemedText style={styles.recTitle}>{rec.title}</ThemedText>
                              <View style={[styles.priorityBadge, styles[`priority_${rec.priority}` as keyof typeof styles] as any]}>

                                <ThemedText style={styles.priorityText}>{rec.priority.toUpperCase()}</ThemedText>
                              </View>
                            </View>
                            <ThemedText style={styles.aiRecDesc}>{rec.description}</ThemedText>
                          </View>
                        ))}

                        <View style={styles.aiConclusionBox}>
                          <ThemedText style={styles.aiSubtitle}>Conclusión Final</ThemedText>
                          <ThemedText style={styles.conclusionText}>{aiDiagnosis.conclusion}</ThemedText>
                        </View>
                      </View>
                    )}
                  </View>
                ) : null}
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.closeButton} onPress={() => {
              soundManager.playSound('click');
              setTrackingModalVisible(false);
            }}>
              <ThemedText style={{ color: '#0a7ea4', fontWeight: 'bold' }}>Cerrar</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={isAddModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalContent, 
            { width: isLargeScreen ? 500 : '100%', maxWidth: '100%' }
          ]}>
            <ThemedText type="subtitle">{editingChild ? 'Editar Hijo' : 'Añadir Hijo'}</ThemedText>
            <TextInput
              style={styles.input}
              placeholder="Nombre"
              value={newChildName}
              onChangeText={setNewChildName}
            />

            <TextInput
              style={styles.input}
              placeholder="PIN de acceso (Ej: 1234)"
              value={newChildPin}
              onChangeText={setNewChildPin}
              keyboardType="numeric"
              secureTextEntry
              maxLength={6}
            />

            <ThemedText style={{ fontSize: 14, color: '#1a1a1a', marginBottom: 5, fontWeight: '600' }}>Fecha de Nacimiento:</ThemedText>
            <TouchableOpacity 
              style={styles.datePickerButton} 
              onPress={() => setShowDatePicker(true)}
            >
              <ThemedText style={[styles.datePickerButtonText, { color: '#1a1a1a' }]}>
                {newChildBirthDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </ThemedText>
            </TouchableOpacity>

            {showDatePicker && Platform.OS !== 'web' && (
              <DateTimePicker
                value={newChildBirthDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={new Date()}
                onChange={(event, selectedDate) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (selectedDate) {
                    setNewChildBirthDate(selectedDate);
                  }
                }}
              />
            )}

            {showDatePicker && Platform.OS === 'web' && (
              <View style={styles.webDateInputContainer}>
                <input
                  type="date"
                  style={{
                    padding: '12px',
                    fontSize: '16px',
                    borderRadius: '10px',
                    border: '2px solid #0a7ea4',
                    width: '100%',
                    marginBottom: '15px',
                    color: '#1a1a1a',
                    backgroundColor: '#fff',
                    fontFamily: 'inherit'
                  }}
                  value={dateInputString || newChildBirthDate.toISOString().split('T')[0]}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDateInputString(val);
                    if (val) {
                      const [year, month, day] = val.split('-').map(Number);
                      setNewChildBirthDate(new Date(year, month - 1, day));
                    }
                  }}
                />
                <ThemedText style={{ fontSize: 12, color: '#0a7ea4', marginBottom: 10, textAlign: 'center' }}>
                  Selecciona la fecha en el calendario del navegador
                </ThemedText>
              </View>
            )}
            
            <ThemedText style={{ fontSize: 14, color: '#1a1a1a', marginBottom: -5, marginTop: 10, fontWeight: '600' }}>Grado Escolar:</ThemedText>
            <View style={styles.gradeSelector}>
              {[5, 6, 7, 8, 9].map((grade) => (
                <TouchableOpacity
                  key={grade}
                  style={[
                    styles.gradeOption,
                    newChildGrade === grade.toString() && styles.gradeOptionSelected
                  ]}
                  onPress={() => {
                    soundManager.playSound('click');
                    setNewChildGrade(grade.toString());
                  }}
                >
                  <ThemedText style={[
                    styles.gradeOptionText,
                    newChildGrade === grade.toString() && styles.gradeOptionTextSelected
                  ]}>{grade}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => {
                soundManager.playSound('click');
                setAddModalVisible(false);
              }}>
                <ThemedText style={styles.cancelButtonText}>Cancelar</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={() => {
                soundManager.playSound('click');
                handleAddChild();
              }}>
                <ThemedText style={{ color: 'white', fontWeight: 'bold' }}>Guardar</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Alerta Personalizado */}
      <Modal visible={customAlert.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 400 }]}>
            <View style={{ alignItems: 'center', marginBottom: 15 }}>
              {customAlert.type === 'success' && <IconSymbol name="checkmark.circle.fill" size={50} color="#4caf50" />}
              {customAlert.type === 'error' && <IconSymbol name="xmark.circle.fill" size={50} color="#f44336" />}
              {customAlert.type === 'warning' && <IconSymbol name="exclamationmark.triangle.fill" size={50} color="#ff9800" />}
              {customAlert.type === 'info' && <IconSymbol name="info.circle.fill" size={50} color="#2196f3" />}
            </View>
            <ThemedText type="subtitle" style={[styles.modalTitle, { textAlign: 'center' }]}>{customAlert.title}</ThemedText>
            <ThemedText style={{ textAlign: 'center', marginBottom: 25, color: '#1a1a1a', fontSize: 16 }}>
              {customAlert.message}
            </ThemedText>
            
            <View style={styles.modalButtons}>
              {customAlert.showConfirm ? (
                <>
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.cancelButton, { flex: 1 }]} 
                    onPress={() => {
                      soundManager.playSound('click');
                      setCustomAlert(prev => ({ ...prev, visible: false }));
                    }}
                  >
                    <ThemedText style={styles.cancelButtonText}>Cancelar</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.modalButton, { backgroundColor: customAlert.type === 'warning' ? '#f44336' : '#0a7ea4', flex: 1 }]} 
                    onPress={() => {
                      soundManager.playSound('click');
                      setCustomAlert(prev => ({ ...prev, visible: false }));
                      if (customAlert.onConfirm) customAlert.onConfirm();
                    }}
                  >
                    <ThemedText style={{ color: 'white', fontWeight: 'bold' }}>Confirmar</ThemedText>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity 
                  style={[styles.modalButton, { backgroundColor: '#0a7ea4', flex: 1 }]} 
                  onPress={() => {
                    soundManager.playSound('click');
                    setCustomAlert(prev => ({ ...prev, visible: false }));
                  }}
                >
                  <ThemedText style={{ color: 'white', fontWeight: 'bold' }}>Entendido</ThemedText>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de PIN de Acceso */}
      <Modal visible={isPinModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <IconSymbol name="lock.fill" size={50} color="#0a7ea4" />
            </View>
            <ThemedText type="subtitle" style={styles.modalTitle}>PIN de Acceso Requerido</ThemedText>
            <ThemedText style={{ textAlign: 'center', marginBottom: 20, color: '#1a1a1a' }}>
              Ingresa el PIN de 4 dígitos para acceder al perfil de {childToAccess?.first_name}.
            </ThemedText>
            
            <TextInput
              style={[styles.input, styles.pinInput]}
              value={enteredPin}
              onChangeText={setEnteredPin}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              autoFocus
              placeholder="0000"
              placeholderTextColor="#ccd0d5"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => {
                  soundManager.playSound('click');
                  setIsPinModalVisible(false);
                }}
              >
                <ThemedText style={styles.cancelButtonText}>Cancelar</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]} 
                onPress={() => {
                  soundManager.playSound('click');
                  handleVerifyPin();
                }}
              >
                <ThemedText style={{ color: 'white', fontWeight: 'bold' }}>Verificar</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Acceso Remoto */}
      <Modal visible={isAccessModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ThemedText type="subtitle" style={styles.modalTitle}>Control Parental Remoto</ThemedText>
            
            <View style={styles.authContainer}>
              {accessStatus === 'pending' && (
                <>
                  <ActivityIndicator size="large" color="#0a7ea4" />
                  <ThemedText style={styles.authMessage}>
                    PIN Correcto. Esperando autorización de tus padres desde otro dispositivo...
                  </ThemedText>
                  <ThemedText style={{ fontSize: 12, color: '#333333', marginTop: 10, textAlign: 'center', fontWeight: '500' }}>
                    Esta pantalla se actualizará automáticamente cuando acepten tu solicitud.
                  </ThemedText>
                </>
              )}

              {accessStatus === 'authorized' && (
                <>
                  <IconSymbol name="checkmark.circle.fill" size={60} color="#4caf50" />
                  <ThemedText style={[styles.authMessage, { color: '#4caf50' }]}>
                    ¡Acceso Autorizado!
                  </ThemedText>
                  <ThemedText style={{ marginTop: 10 }}>Cargando perfil de {childToAccess?.first_name}...</ThemedText>
                </>
              )}

              {accessStatus === 'denied' && (
                <>
                  <IconSymbol name="xmark.circle.fill" size={60} color="#f44336" />
                  <ThemedText style={[styles.authMessage, { color: '#f44336' }]}>
                    Acceso Denegado
                  </ThemedText>
                  <TouchableOpacity 
                    style={[styles.modalButton, { backgroundColor: '#0a7ea4', marginTop: 20 }]}
                    onPress={() => {
                      soundManager.playSound('click');
                      setIsAccessModalVisible(false);
                    }}
                  >
                    <ThemedText style={styles.modalButtonText}>Volver</ThemedText>
                  </TouchableOpacity>
                </>
              )}
            </View>

            {accessStatus === 'pending' && (
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: '#999', marginTop: 20 }]}
                onPress={() => {
                  soundManager.playSound('click');
                  if (pollingInterval.current) clearInterval(pollingInterval.current);
                  setIsAccessModalVisible(false);
                }}
              >
                <ThemedText style={styles.modalButtonText}>Cancelar Solicitud</ThemedText>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5', // Slightly darker background for better contrast
  },
  scrollContainer: {
    padding: 20,
    paddingTop: 60,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 15,
  },
  subtitle: {
    fontSize: 16,
    color: '#1a1a1a', // Much darker for legibility
    marginBottom: 20,
    fontWeight: '500',
  },
  section: {
    marginBottom: 25,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  childCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#ffffff', // Pure white card
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e1e4e8',
  },
  parentCard: {
    backgroundColor: '#e7f5ff',
    borderWidth: 1,
    borderColor: '#339af0', // More visible border
  },
  childInfo: {
    flex: 1,
  },
  childName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a', // Darker
  },
  childDetails: {
    fontSize: 14,
    color: '#333333', // Darker
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  addButton: {
    backgroundColor: '#0a7ea4',
    padding: 10,
    borderRadius: 10,
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)', // Darker overlay
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    width: '100%',
    maxHeight: '80%',
    borderRadius: 20,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#1a1a1a',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccd0d5',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    fontSize: 16,
    color: '#1a1a1a',
    backgroundColor: '#f8f9fa',
  },
  pinInput: {
    letterSpacing: 10,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
  },
  dateButton: {
    padding: 12,
    backgroundColor: '#f1f3f5',
    borderRadius: 10,
    marginBottom: 15,
  },
  gradeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 15,
  },
  gradeOption: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#f1f3f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradeOptionSelected: {
    backgroundColor: '#0a7ea4',
  },
  gradeOptionText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  gradeOptionTextSelected: {
    color: 'white',
    fontWeight: 'bold',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    paddingVertical: 14,
    paddingHorizontal: 25,
    borderRadius: 12,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    backgroundColor: '#0a7ea4',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  cancelButton: {
    backgroundColor: '#f1f3f5',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  cancelButtonText: {
    color: '#495057',
    fontWeight: '700',
  },
  trackingContainer: {
    marginTop: 15,
  },
  dashboardSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  summaryLabel: {
    fontSize: 10,
    color: '#495057',
    marginBottom: 5,
    textAlign: 'center',
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0a7ea4',
  },
  sectionTitleTracking: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#1a1a1a',
  },
  trackingModuleCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 5,
    borderLeftColor: '#0a7ea4',
  },
  gameCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  trackingModuleName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    flex: 1,
  },
  gameTotalBadge: {
    fontSize: 11,
    backgroundColor: '#e7f5ff',
    color: '#007bff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    fontWeight: '600',
    overflow: 'hidden',
  },
  levelsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  levelCircle: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  levelText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  aiContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f0f7ff',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#cde4ff',
  },
  aiContainerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0056b3',
    marginBottom: 10,
  },
  aiContent: {
    fontSize: 14,
    lineHeight: 20,
    color: '#1a1a1a',
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 10,
    marginTop: 10,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  requestButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  requestButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  authContainer: {
    alignItems: 'center',
    padding: 20,
  },
  authMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 24,
    color: '#1a1a1a',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  trackingProfileName: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
    color: '#1a1a1a',
  },
  webDateInputContainer: {
    marginBottom: 15,
  },
  trackingLink: {
    padding: 5,
  },
  levelMiniCard: {
    width: '45%',
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  levelSuccess: {
    borderColor: '#4CAF50',
  },
  levelAverage: {
    borderColor: '#FF9800',
  },
  levelWeak: {
    borderColor: '#f44336',
  },
  levelLocked: {
    opacity: 0.6,
  },
  levelHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  levelMiniLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    color: 'white',
    fontWeight: 'bold',
  },
  levelMiniScore: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0a7ea4',
    marginBottom: 5,
  },
  errorStatsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 5,
  },
  statLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statLabel: {
    fontSize: 10,
    color: '#495057',
  },
  statValue: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  aiSection: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 20,
  },
  aiButton: {
    backgroundColor: '#4158D0',
    padding: 18,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#4158D0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  aiButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
    letterSpacing: 0.5,
  },
  aiDiagnosisContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 15,
  },
  aiTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0056b3',
  },
  aiSummary: {
    fontSize: 15,
    color: '#495057',
    lineHeight: 22,
    marginBottom: 20,
    fontStyle: 'italic',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#0056b3',
  },
  aiSubtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginTop: 25,
    marginBottom: 12,
  },
  diagnosisText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#333',
    textAlign: 'justify',
  },
  observationsList: {
    gap: 10,
  },
  aiObservationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  obs_positive: {
    backgroundColor: '#e8f5e9',
    borderColor: '#c8e6c9',
  },
  obs_negative: {
    backgroundColor: '#ffebee',
    borderColor: '#ffcdd2',
  },
  obs_neutral: {
    backgroundColor: '#fff3e0',
    borderColor: '#ffe0b2',
  },
  aiObsTextItem: {
    fontSize: 13,
    flex: 1,
  },
  personalizedPlanBox: {
    marginTop: 30,
    backgroundColor: '#e3f2fd',
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#bbdefb',
  },
  planTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0d47a1',
    marginBottom: 5,
  },
  planFocus: {
    fontSize: 14,
    color: '#1565c0',
    fontWeight: '600',
    marginBottom: 15,
  },
  planMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.5)',
    padding: 10,
    borderRadius: 8,
  },
  planMetaText: {
    fontSize: 12,
    color: '#0d47a1',
    fontWeight: '500',
  },
  planStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0d47a1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumber: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  stepText: {
    fontSize: 13,
    color: '#333',
    flex: 1,
    lineHeight: 18,
  },
  aiRecBox: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  recHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1a1a1a',
    flex: 1,
  },
  aiRecDesc: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  priority_alta: {
    backgroundColor: '#f44336',
  },
  priority_media: {
    backgroundColor: '#FF9800',
  },
  priority_baja: {
    backgroundColor: '#4CAF50',
  },
  aiConclusionBox: {
    marginTop: 30,
    padding: 20,
    backgroundColor: '#fff3e0',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#ffe0b2',
  },
  conclusionText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#e65100',
    fontWeight: '500',
    textAlign: 'center',
  },
  aiLoadingContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 15,
  },
  aiLoadingText: {
    fontSize: 14,
    color: '#0a7ea4',
    textAlign: 'center',
    lineHeight: 20,
  },
  closeButton: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f1f3f5',
    borderRadius: 12,
    alignItems: 'center',
  },
  datePickerButton: {
    padding: 12,
    backgroundColor: '#f1f3f5',
    borderRadius: 10,
    marginBottom: 15,
  },
  datePickerButtonText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  emptyText: {
    textAlign: 'center',
    color: '#495057',
    marginTop: 10,
  },
  editLink: {
    color: '#007bff',
    fontWeight: '600',
  },
  deleteLink: {
    color: '#dc3545',
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: '#6c757d',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  backButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  }
});


