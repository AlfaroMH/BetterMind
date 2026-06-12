import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Basado en un diseño estándar de móvil (iPhone 11 / Pixel 4)
const baseWidth = 375;

// Cálculo de escala más moderado para evitar tamaños gigantes en pantallas grandes
const getScale = () => {
  const rawScale = SCREEN_WIDTH / baseWidth;
  if (SCREEN_WIDTH > 1024) return 1.1; // Limitar escala en desktop
  if (SCREEN_WIDTH > 768) return 1.05; // Limitar escala en tablets
  return rawScale; // Escala normal en móviles
};

const scale = getScale();

export function normalize(size: number) {
  const newSize = size * scale;
  const result = Math.round(PixelRatio.roundToNearestPixel(newSize));
  
  // En móviles pequeños, no queremos que el texto sea ilegible
  if (SCREEN_WIDTH < 350 && size > 12) {
    return result + 1;
  }
  
  return Platform.OS === 'ios' ? result : result - 1;
}

// Helper para obtener dimensiones responsivas
export const responsive = {
  width: (percent: number) => SCREEN_WIDTH * (percent / 100),
  height: (percent: number) => {
    // Para altura, también limitamos el crecimiento en pantallas muy grandes
    const maxHeight = SCREEN_WIDTH > 1024 ? 800 : SCREEN_HEIGHT;
    return maxHeight * (percent / 100);
  },
  isTablet: SCREEN_WIDTH > 768 && SCREEN_WIDTH <= 1024,
  isDesktop: SCREEN_WIDTH > 1024,
  fontSize: (size: number) => normalize(size),
  SCREEN_WIDTH,
  SCREEN_HEIGHT
};
