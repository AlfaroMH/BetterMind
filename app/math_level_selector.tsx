import { IconSymbol } from "@/components/ui/icon-symbol";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "./utils/auth-context";
import { getLevelProgress } from "./utils/database/level-progress";
import { soundManager } from "./utils/sound-manager";

export default function LevelSelector() {
  const router = useRouter();
  const { gameId, gameTitle } = useLocalSearchParams();
  const { activeChild } = useAuth();
  const [levels, setLevels] = useState<any[]>([]);
  const [fadeAnim] = useState(new Animated.Value(0));

  const loadLevels = useCallback(async () => {
    if (activeChild && gameId) {
      const progress = await getLevelProgress(activeChild.child_id, gameId as string);
      // Ensure we always show 3 levels
      const fullLevels = [1, 2, 3].map(lvl => {
        const p = progress.find((item: any) => item.level === lvl);
        // If it's a parent, all levels are unlocked
        const isUnlocked = activeChild.is_parent_profile ? 1 : (p?.is_unlocked || (lvl === 1 ? 1 : 0));
        return { 
          level: lvl, 
          high_score: p?.high_score || 0, 
          is_unlocked: isUnlocked 
        };
      });
      setLevels(fullLevels);
      
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }
  }, [activeChild, gameId]);

  useFocusEffect(
    useCallback(() => {
      loadLevels();
    }, [loadLevels])
  );

  const handleLevelPress = (level: any) => {
    soundManager.playSound('click');
    if (level.is_unlocked || level.level === 1) {
      router.push({
        pathname: "/math_game_session",
        params: { gameId, level: level.level, gameTitle }
      });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.navButton} 
            onPress={() => {
              soundManager.playSound('click');
              router.back();
            }}
            activeOpacity={0.7}
          >
            <IconSymbol name="chevron.left" size={32} color="#4158D0" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.navButton} 
            onPress={() => {
              soundManager.playSound('click');
              router.replace('/(tabs)');
            }}
            activeOpacity={0.7}
          >
            <IconSymbol name="house.fill" size={32} color="#4158D0" />
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>{gameTitle}</Text>
        <Text style={styles.subtitle}>Selecciona un Nivel</Text>
      </View>

      <Animated.View style={[styles.levelsContainer, { opacity: fadeAnim }]}>
        {levels.map((level, idx) => (
          <TouchableOpacity
            key={`level-select-${level.level}-${idx}`}
            style={[
              styles.levelCard,
              !level.is_unlocked && level.level !== 1 && styles.levelLocked
            ]}
            onPress={() => handleLevelPress(level)}
            disabled={!level.is_unlocked && level.level !== 1}
            activeOpacity={0.7}
          >
            <View style={styles.levelInfo}>
              <Text style={styles.levelNumber}>Nivel {level.level}</Text>
              <Text style={styles.levelScore}>Mejor Puntaje: {level.high_score}</Text>
            </View>
            
            {level.is_unlocked || level.level === 1 ? (
              <IconSymbol name="play.fill" size={24} color="#4CAF50" />
            ) : (
              <IconSymbol name="lock.fill" size={24} color="#999" />
            )}
          </TouchableOpacity>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  header: {
    paddingTop: 40,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginBottom: 20,
  },
  headerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  navButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#f0f4ff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  levelsContainer: {
    gap: 15,
  },
  levelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#eee',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  levelLocked: {
    backgroundColor: '#eee',
    opacity: 0.7,
  },
  levelInfo: {
    flex: 1,
  },
  levelNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  levelScore: {
    fontSize: 14,
    color: '#666',
  },
});
