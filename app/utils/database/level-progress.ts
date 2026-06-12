import { getDatabase } from './adapter';

export async function getLevelProgress(childId: number, gameId: string) {
  const db = await getDatabase();
  const levels = await db.getAllAsync<any>(
    'SELECT * FROM LevelProgress WHERE child_id = ? AND game_id = ? ORDER BY level ASC;',
    [childId, gameId]
  );
  
  // If no progress yet, unlock level 1
  if (levels.length === 0) {
    await db.runAsync(
      'INSERT INTO LevelProgress (child_id, module_name, game_id, level, high_score, total_errors, is_unlocked) VALUES (?, ?, ?, ?, ?, ?, ?);',
      [childId, 'Matemáticas', gameId, 1, 0, 0, 1]
    );
    return [{ level: 1, high_score: 0, total_errors: 0, is_unlocked: 1 }];
  }
  
  return levels;
}

export async function getGameTotalScore(childId: number, gameId: string) {
  const db = await getDatabase();
  
  // Si el gameId no tiene prefijo de grado (ej: "suma" en lugar de "m5_suma"),
  // buscamos todos los registros que terminen en ese ID
  const query = gameId.startsWith('m') && gameId.includes('_') 
    ? 'SELECT SUM(high_score) as total_score FROM LevelProgress WHERE child_id = ? AND game_id = ?;'
    : 'SELECT SUM(high_score) as total_score FROM LevelProgress WHERE child_id = ? AND (game_id = ? OR game_id LIKE ?);';
  
  const params = gameId.startsWith('m') && gameId.includes('_')
    ? [childId, gameId]
    : [childId, gameId, `%_${gameId}`];

  const result = await db.getFirstAsync<any>(query, params);
  return result?.total_score || 0;
}

export async function getModuleTotalScore(childId: number, moduleName: string) {
  const db = await getDatabase();
  const result = await db.getFirstAsync<any>(
    'SELECT SUM(high_score) as total_score FROM LevelProgress WHERE child_id = ? AND module_name = ?;',
    [childId, moduleName]
  );
  return result?.total_score || 0;
}

export async function getFullChildProgress(childId: number) {
  const db = await getDatabase();
  return await db.getAllAsync<any>(
    'SELECT * FROM LevelProgress WHERE child_id = ? ORDER BY module_name, game_id, level;',
    [childId]
  );
}

export async function saveLevelProgress(childId: number, gameId: string, level: number, score: number, completed: boolean, errors: number = 0) {
  const db = await getDatabase();
  
  // Update progress for current level
  const existing = await db.getFirstAsync<any>(
    'SELECT high_score, total_errors FROM LevelProgress WHERE child_id = ? AND game_id = ? AND level = ?;',
    [childId, gameId, level]
  );
  
  if (existing) {
    // We update if:
    // 1. The score is strictly higher
    // 2. The score is the same but we have fewer errors (better performance)
    const isBetterScore = score > existing.high_score;
    const isSameScoreBetterErrors = score === existing.high_score && errors < existing.total_errors;

    if (isBetterScore || isSameScoreBetterErrors) {
      await db.runAsync(
        'UPDATE LevelProgress SET high_score = ?, total_errors = ?, is_unlocked = 1 WHERE child_id = ? AND game_id = ? AND level = ?;',
        [score, errors, childId, gameId, level]
      );
    }
  } else {
    await db.runAsync(
      'INSERT INTO LevelProgress (child_id, module_name, game_id, level, high_score, total_errors, is_unlocked) VALUES (?, ?, ?, ?, ?, ?, ?);',
      [childId, 'Matemáticas', gameId, level, score, errors, 1]
    );
  }
  
  // Unlock next level if completed
  if (completed && level < 3) {
    const nextLevel = level + 1;
    const nextExisting = await db.getFirstAsync<any>(
      'SELECT id FROM LevelProgress WHERE child_id = ? AND game_id = ? AND level = ?;',
      [childId, gameId, nextLevel]
    );
    
    if (!nextExisting) {
      await db.runAsync(
        'INSERT INTO LevelProgress (child_id, module_name, game_id, level, high_score, total_errors, is_unlocked) VALUES (?, ?, ?, ?, ?, ?, ?);',
        [childId, 'Matemáticas', gameId, nextLevel, 0, 0, 1]
      );
    } else {
      await db.runAsync(
        'UPDATE LevelProgress SET is_unlocked = 1 WHERE child_id = ? AND game_id = ? AND level = ?;',
        [childId, gameId, nextLevel]
      );
    }
  }
}
