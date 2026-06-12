import { getDatabase } from './adapter';

export async function addProgress(childId: number, moduleName: string, score: number, level: number, playtime: number, successes: number = 0, errors: number = 0) {
  const db = await getDatabase();
  
  const module = await db.getFirstAsync<any>('SELECT module_id FROM Modules WHERE name = ?;', [moduleName]);
  
  if (!module) {
    console.warn(`Module not found: ${moduleName}. Make sure it is seeded in the database.`);
    return { success: false, error: 'Module not found' };
  }
  
  try {
    const result = await db.runAsync(
      'INSERT INTO Progress (child_id, module_id, score, level, playtime, successes, errors) VALUES (?, ?, ?, ?, ?, ?, ?);',
      [childId, module.module_id, score, level, playtime, successes, errors]
    );
    return { success: true, id: result.lastInsertRowId };
  } catch (error) {
    console.error('Add progress error:', error);
    return { success: false, error: 'Could not record progress' };
  }
}

export async function getChildProgress(childId: number) {
  const db = await getDatabase();
  return await db.getAllAsync<any>(`
    SELECT p.*, m.name as module_name, m.description as module_description
    FROM Progress p
    JOIN Modules m ON p.module_id = m.module_id
    WHERE p.child_id = ?
    ORDER BY p.date DESC;
  `, [childId]);
}

export async function getParentDashboardData(parentId: number) {
  const db = await getDatabase();
  return await db.getAllAsync<any>(`
    SELECT c.first_name as child_name, p.*, m.name as module_name
    FROM Progress p
    JOIN Children c ON p.child_id = c.child_id
    JOIN Modules m ON p.module_id = m.module_id
    WHERE c.parent_id = ?
    ORDER BY p.date DESC;
  `, [parentId]);
}

export async function getChildTrackingMap(childId: number) {
  const db = await getDatabase();
  return await db.getAllAsync<any>(`
    SELECT 
      m.name as module_name,
      SUM(p.playtime) as total_playtime,
      AVG(p.score) as avg_score,
      AVG(p.successes) as avg_successes,
      AVG(p.errors) as avg_errors,
      COUNT(p.progress_id) as sessions_count
    FROM Progress p
    JOIN Modules m ON p.module_id = m.module_id
    WHERE p.child_id = ?
    GROUP BY m.module_id;
  `, [childId]);
}
