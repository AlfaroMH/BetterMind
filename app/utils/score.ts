// app/utils/score.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { addProgress } from "./database/progress";

const HIGH_SCORE_KEY = "highscore";

// Obtener el highscore
export async function getHighScore(): Promise<number> {
  try {
    const storedScore = await AsyncStorage.getItem(HIGH_SCORE_KEY);
    return storedScore ? parseInt(storedScore, 10) : 0;
  } catch (error) {
    console.error("Error leyendo highscore", error);
    return 0;
  }
}

// Guardar un nuevo highscore si es mayor
export async function saveHighScore(score: number, moduleName?: string, level?: number, playtime?: number, successes: number = 0, errors: number = 0): Promise<void> {
  try {
    const currentHigh = await getHighScore();
    if (score > currentHigh) {
      await AsyncStorage.setItem(HIGH_SCORE_KEY, score.toString());
    }

    // Save to database if child is active
    const storedChild = await AsyncStorage.getItem('activeChild');
    if (storedChild && moduleName) {
      const child = JSON.parse(storedChild);
      await addProgress(child.child_id, moduleName, score, level || 1, playtime || 0, successes, errors);
    }
  } catch (error) {
    console.error("Error guardando highscore", error);
  }
}