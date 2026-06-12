import { IconSymbol } from "@/components/ui/icon-symbol";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React from "react";
import { Animated, Image, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { useAuth } from "../utils/auth-context";
import { getGameTotalScore, getModuleTotalScore } from "../utils/database/level-progress";
import { responsive } from "../utils/responsive";
import { soundManager } from "../utils/sound-manager";

const MATH_GAMES: Record<number, any[]> = {
  5: [
    { id: 'm5_suma', title: 'Suma', cover: 'https://images.unsplash.com/photo-1548175551-1edaea7bbf0d?q=80', description: 'Niveles progresivos de adición.' },
    { id: 'm5_resta', title: 'Resta', cover: 'https://s1.significados.com/foto/resta-og.jpg', description: 'Domina la sustracción nivel a nivel.' },
    { id: 'm5_multi', title: 'Multiplicación', cover: 'https://images.unsplash.com/photo-1546833998-877b37c2e5c6?q=80', description: 'Tablas y más tablas en acción.' },
    { id: 'm5_divi', title: 'División', cover: 'https://ichef.bbci.co.uk/images/ic/480xn/p0ks7t25.png', description: 'Repartos exactos y divertidos.' },
  ],
  6: [
    { id: 'm6_suma', title: 'Suma', cover: 'https://images.unsplash.com/photo-1548175551-1edaea7bbf0d?q=80', description: 'Niveles progresivos de adición.' },
    { id: 'm6_resta', title: 'Resta', cover: 'https://s1.significados.com/foto/resta-og.jpg', description: 'Domina la sustracción nivel a nivel.' },
    { id: 'm6_multi', title: 'Multiplicación', cover: 'https://images.unsplash.com/photo-1546833998-877b37c2e5c6?q=80', description: 'Tablas y más tablas en acción.' },
    { id: 'm6_divi', title: 'División', cover: 'https://ichef.bbci.co.uk/images/ic/480xn/p0ks7t25.png', description: 'Repartos exactos y divertidos.' },
    { id: 'm6_frac_read', title: 'Lectura de Fracciones', cover: 'https://i.ytimg.com/vi/DVXZi9ZWFvo/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD', description: 'Lee y reconoce fracciones.' },
    { id: 'm6_frac_ops', title: 'Operaciones con Fracciones', cover: 'https://yosoytuprofe.20minutos.es/wp-content/uploads/2020/09/operaciones-con-fracciones.png', description: 'Suma y resta fracciones con maestría.' },
  ],
  7: [
    { id: 'm7_suma', title: 'Suma', cover: 'https://images.unsplash.com/photo-1548175551-1edaea7bbf0d?q=80', description: 'Niveles progresivos de adición.' },
    { id: 'm7_resta', title: 'Resta', cover: 'https://s1.significados.com/foto/resta-og.jpg', description: 'Domina la sustracción nivel a nivel.' },
    { id: 'm7_multi', title: 'Multiplicación', cover: 'https://images.unsplash.com/photo-1546833998-877b37c2e5c6?q=80', description: 'Tablas y más tablas en acción.' },
    { id: 'm7_divi', title: 'División', cover: 'https://ichef.bbci.co.uk/images/ic/480xn/p0ks7t25.png', description: 'Repartos exactos y divertidos.' },
    { id: 'm7_plano', title: 'Plano Cartesiano', cover: 'https://concepto.de/wp-content/uploads/2019/09/plano-cartesiano-caracteristicas-e1569779134605.jpg', description: 'Ubica puntos en el mapa de coordenadas.' },
    { id: 'm7_porcentajes', title: 'Porcentajes Básicos', cover: 'https://definicion.de/wp-content/uploads/2009/12/proporcion.jpg', description: 'Calcula descuentos y razones simples.' },
  ],
  8: [
    { id: 'm8_suma', title: 'Suma', cover: 'https://images.unsplash.com/photo-1548175551-1edaea7bbf0d?q=80', description: 'Niveles avanzados de adición.' },
    { id: 'm8_resta', title: 'Resta', cover: 'https://s1.significados.com/foto/resta-og.jpg', description: 'Sustracción rápida y precisa.' },
    { id: 'm8_multi', title: 'Multiplicación', cover: 'https://images.unsplash.com/photo-1546833998-877b37c2e5c6?q=80', description: 'Potencia tus habilidades de cálculo.' },
    { id: 'm8_divi', title: 'División', cover: 'https://ichef.bbci.co.uk/images/ic/480xn/p0ks7t25.png', description: 'Divisiones complejas sin errores.' },
    { id: 'm8_proporciones', title: 'Proporciones', cover: 'https://libero.cronosmedia.glr.pe/original/2022/05/07/6276adad78f4d82baa05d319.jpg', description: 'Resuelve problemas de proporcionalidad directa.' },
    { id: 'm8_probabilidad', title: 'Probabilidad Simple', cover: 'https://definicion.de/wp-content/uploads/2010/06/probabilidad-1.jpg', description: 'Predice resultados con dados y eventos.' },
  ],
  9: [
    { id: 'm9_suma', title: 'Suma', cover: 'https://images.unsplash.com/photo-1548175551-1edaea7bbf0d?q=80', description: 'Desafíos de adición para expertos.' },
    { id: 'm9_resta', title: 'Resta', cover: 'https://s1.significados.com/foto/resta-og.jpg', description: 'Sustracción de alto nivel.' },
    { id: 'm9_multi', title: 'Multiplicación', cover: 'https://images.unsplash.com/photo-1546833998-877b37c2e5c6?q=80', description: 'Multiplicaciones complejas y rápidas.' },
    { id: 'm9_divi', title: 'División', cover: 'https://ichef.bbci.co.uk/images/ic/480xn/p0ks7t25.png', description: 'Divisiones maestras con precisión.' },
    { id: 'm9_negativos', title: 'Números Negativos', cover: 'https://yosoytuprofe.20minutos.es/wp-content/uploads/2023/01/operaciones-con-numeros-negativos.png', description: 'Explora temperaturas y niveles bajo cero.' },
    { id: 'm9_potencias', title: 'Potencias', cover: 'https://concepto.de/wp-content/uploads/2021/12/potencia-matematicas-e1640967114638.jpg', description: 'Domina los exponentes y las raíces cuadradas.' },
  ]
};

// Catálogo unificado para el Padre (Sin duplicados)
const PARENT_MATH_GAMES: any[] = [
  { id: 'suma', title: 'Suma', cover: 'https://images.unsplash.com/photo-1548175551-1edaea7bbf0d?q=80', description: 'Operaciones de adición en todos los niveles.' },
  { id: 'resta', title: 'Resta', cover: 'https://s1.significados.com/foto/resta-og.jpg', description: 'Desafíos de sustracción progresiva.' },
  { id: 'multi', title: 'Multiplicación', cover: 'https://images.unsplash.com/photo-1546833998-877b37c2e5c6?q=80', description: 'Tablas y cálculos multiplicativos.' },
  { id: 'divi', title: 'División', cover: 'https://ichef.bbci.co.uk/images/ic/480xn/p0ks7t25.png', description: 'Ejercicios de división y reparto.' },
  { id: 'frac_read', title: 'Lectura de Fracciones', cover: 'https://i.ytimg.com/vi/DVXZi9ZWFvo/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD', description: 'Identificación visual de fracciones.' },
  { id: 'frac_ops', title: 'Operaciones con Fracciones', cover: 'https://yosoytuprofe.20minutos.es/wp-content/uploads/2020/09/operaciones-con-fracciones.png', description: 'Cálculos complejos con fracciones.' },
  { id: 'plano', title: 'Plano Cartesiano', cover: 'https://concepto.de/wp-content/uploads/2019/09/plano-cartesiano-caracteristicas-e1569779134605.jpg', description: 'Coordenadas y ubicación espacial.' },
  { id: 'porcentajes', title: 'Porcentajes', cover: 'https://definicion.de/wp-content/uploads/2009/12/proporcion.jpg', description: 'Cálculo de razones y descuentos.' },
  { id: 'proporciones', title: 'Proporciones', cover: 'https://libero.cronosmedia.glr.pe/original/2022/05/07/6276adad78f4d82baa05d319.jpg', description: 'Problemas de proporcionalidad.' },
  { id: 'probabilidad', title: 'Probabilidad', cover: 'https://definicion.de/wp-content/uploads/2010/06/probabilidad-1.jpg', description: 'Eventos aleatorios y predicción.' },
  { id: 'negativos', title: 'Números Negativos', cover: 'https://yosoytuprofe.20minutos.es/wp-content/uploads/2023/01/operaciones-con-numeros-negativos.png', description: 'Operaciones bajo cero y ley de signos.' },
  { id: 'potencias', title: 'Potencias', cover: 'https://concepto.de/wp-content/uploads/2021/12/potencia-matematicas-e1640967114638.jpg', description: 'Exponentes y raíces cuadradas.' },
];

export default function MathMenu() {
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 768;
  const MAX_CONTENT_WIDTH = 1100;
  
  // Cálculo dinámico de columnas basado en el ancho disponible
  const getGridConfig = () => {
    if (width > 1200) return { columns: 4, gap: 25 };
    if (width > 768) return { columns: 3, gap: 20 };
    return { columns: 2, gap: 12 };
  };

  const gridConfig = getGridConfig();
  const containerPadding = 24; // Reducido para mejor aprovechamiento
  const actualContentWidth = isLargeScreen ? Math.min(width - containerPadding, MAX_CONTENT_WIDTH) : width - containerPadding;
  const cardWidth = (actualContentWidth - (gridConfig.columns - 1) * gridConfig.gap) / gridConfig.columns;

  const router = useRouter();
  const { activeChild } = useAuth();
  const [fadeAnim] = React.useState(new Animated.Value(0));
  const [gameScores, setGameScores] = React.useState<Record<string, number>>({});
  const [moduleTotalScore, setModuleTotalScore] = React.useState(0);
  
  const isParent = activeChild?.is_parent_profile;
  const grade = Number(activeChild?.grade_level) || 5;
  
  const games = React.useMemo(() => {
    return isParent ? PARENT_MATH_GAMES : (MATH_GAMES[grade] || MATH_GAMES[5]);
  }, [isParent, grade]);

  const loadScores = React.useCallback(async () => {
    if (activeChild) {
      try {
        const moduleScore = await getModuleTotalScore(activeChild.child_id, 'Matemáticas');
        setModuleTotalScore(moduleScore);

        const scores: Record<string, number> = {};
        // Carga de puntajes en paralelo para mayor eficiencia
        const scorePromises = games.map(async (game) => {
          // Si es perfil de padre, buscamos el puntaje base del juego (sin prefijo de grado)
          // Si es perfil de niño, usamos el ID específico del grado
          const score = await getGameTotalScore(activeChild.child_id, game.id);
          return { id: game.id, score };
        });
        
        const results = await Promise.all(scorePromises);
        results.forEach(res => {
          scores[res.id] = res.score;
        });
        
        setGameScores(scores);
      } catch (error) {
        console.error("Error al cargar puntajes:", error);
      }
    }
  }, [activeChild, games]);

  useFocusEffect(
    React.useCallback(() => {
      loadScores();
    }, [loadScores])
  );

  React.useEffect(() => {
    soundManager.startBackgroundMusic();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    return () => {
      // Opcional: Detener música al salir del menú
      // soundManager.stopBackgroundMusic();
    };
  }, []);

  const handleGamePress = (game: any) => {
    soundManager.playSound('click');
    router.push({
      pathname: "/math_level_selector",
      params: { 
        gameId: game.id, 
        gameTitle: game.title, 
        grade: grade.toString() 
      }
    });
  };

  return (
    <View style={styles.container}>
      <View style={[
        styles.header, 
        width > MAX_CONTENT_WIDTH && { paddingHorizontal: (width - MAX_CONTENT_WIDTH) / 2 + 20 }
      ]}>
        <TouchableOpacity style={styles.backButton} onPress={() => {
          soundManager.playSound('click');
          router.back();
        }}>
          <IconSymbol name="chevron.left" size={24} color="#fff" />
          <Text style={styles.backText}>Volver</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Matemáticas</Text>
        <Text style={styles.subtitle}>
          {isParent ? 'Perfil de Padre' : `Grado: ${grade}°`} | Puntaje Total: {moduleTotalScore}
        </Text>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          isLargeScreen && { alignItems: 'center' }
        ]}
      >
        <View style={{ width: actualContentWidth, maxWidth: '100%' }}>
          <Text style={styles.sectionTitle}>Catálogo de Minijuegos</Text>
          <Animated.View style={[
            styles.catalogGrid, 
            { opacity: fadeAnim, gap: gridConfig.gap },
          ]}>
            {games.map((game) => (
              <TouchableOpacity 
                key={game.id} 
                style={[styles.gameCard, { width: cardWidth, marginBottom: gridConfig.gap }]} 
                activeOpacity={0.9}
                onPress={() => handleGamePress(game)}
              >
                <Image source={{ uri: game.cover }} style={styles.gameImage} />
                <View style={styles.gameInfo}>
                  <Text style={styles.gameTitle} numberOfLines={1}>{game.title}</Text>
                  <Text style={styles.totalScoreText}>Puntaje: {gameScores[game.id] || 0}</Text>
                  <View style={styles.playBadge}>
                    <Text style={styles.playBadgeText}>JUGAR</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#4158D0',
    paddingTop: (typeof document !== 'undefined' || typeof navigator !== 'undefined') ? 20 : 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    elevation: 5,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  backText: {
    color: '#fff',
    fontSize: responsive.fontSize(14),
    marginLeft: 5,
  },
  title: {
    color: '#fff',
    fontSize: responsive.fontSize(24),
    fontWeight: 'bold',
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: responsive.fontSize(14),
  },
  scrollContent: {
    padding: 12,
  },
  sectionTitle: {
    fontSize: responsive.fontSize(18),
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    marginLeft: 5,
  },
  catalogGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  gameCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  gameImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#f0f0f0',
  },
  gameInfo: {
    padding: 12,
  },
  gameTitle: {
    fontSize: responsive.fontSize(14),
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  totalScoreText: {
    fontSize: responsive.fontSize(12),
    color: '#666',
    marginBottom: 8,
  },
  playBadge: {
    backgroundColor: '#4158D0',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  playBadgeText: {
    color: '#fff',
    fontSize: responsive.fontSize(10),
    fontWeight: 'bold',
  },
});
