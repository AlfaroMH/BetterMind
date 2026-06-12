import { getDatabase } from './adapter';

export async function createChild(parentId: number, firstName: string, birthDate: string, gradeLevel: number, pin: string) {
  const db = await getDatabase();
  try {
    const result = await db.runAsync(
      'INSERT INTO Children (parent_id, first_name, birth_date, grade_level, pin) VALUES (?, ?, ?, ?, ?);',
      [parentId, firstName, birthDate, gradeLevel, pin]
    );
    return { success: true, id: result.lastInsertRowId };
  } catch (error) {
    console.error('Create child error:', error);
    return { success: false, error: 'Could not create child profile' };
  }
}

export async function getChildren(parentId: number) {
  const db = await getDatabase();
  return await db.getAllAsync<any>('SELECT * FROM Children WHERE parent_id = ? ORDER BY is_parent_profile DESC, first_name ASC;', [parentId]);
}

export async function ensureParentProfile(parentId: number, firstName: string) {
  const db = await getDatabase();
  try {
    // 1. Check for profile by parent_id and flag (Primary Check)
    let existing = await db.getFirstAsync<any>(
      'SELECT child_id, first_name FROM Children WHERE parent_id = ? AND is_parent_profile = 1;',
      [parentId]
    );
    
    // 2. Fallback: Check if a profile with the same name exists (Legacy Support)
    if (!existing) {
      existing = await db.getFirstAsync<any>(
        'SELECT child_id FROM Children WHERE parent_id = ? AND (first_name = ? OR first_name = ?);',
        [parentId, firstName + ' (Yo)', firstName]
      );
      
      // If we found it but flag was missing, update it and ensure name consistency
      if (existing) {
        await db.runAsync(
          'UPDATE Children SET is_parent_profile = 1, first_name = ? WHERE child_id = ?;',
          [firstName + ' (Yo)', existing.child_id]
        );
      }
    } else {
      // If it exists, ensure the name is updated if the parent changed their name
      if (existing.first_name !== firstName + ' (Yo)') {
        await db.runAsync(
          'UPDATE Children SET first_name = ? WHERE child_id = ?;',
          [firstName + ' (Yo)', existing.child_id]
        );
      }
    }
    
    if (!existing) {
      // Create a "child" profile for the parent
      await db.runAsync(
        'INSERT INTO Children (parent_id, first_name, grade_level, is_parent_profile) VALUES (?, ?, ?, ?);',
        [parentId, firstName + ' (Yo)', 6, 1] // Using grade 6 as a "master" grade
      );
    }
    return { success: true };
  } catch (error) {
    console.error('Ensure parent profile error:', error);
    return { success: false };
  }
}

export async function updateChild(childId: number, firstName: string, birthDate: string, gradeLevel: number, pin: string) {
  const db = await getDatabase();
  try {
    await db.runAsync(
      'UPDATE Children SET first_name = ?, birth_date = ?, grade_level = ?, pin = ? WHERE child_id = ?;',
      [firstName, birthDate, gradeLevel, pin, childId]
    );
    return { success: true };
  } catch (error) {
    console.error('Update child error:', error);
    return { success: false, error: 'Could not update child profile' };
  }
}

export async function requestRemoteAccess(childId: number) {
  const db = await getDatabase();
  try {
    await db.runAsync(
      "UPDATE Children SET access_request_status = 'pending', access_request_time = CURRENT_TIMESTAMP WHERE child_id = ?;",
      [childId]
    );
    return { success: true };
  } catch (error) {
    console.error('Request remote access error:', error);
    return { success: false };
  }
}

export async function checkAccessStatus(childId: number) {
  const db = await getDatabase();
  try {
    const result = await db.getFirstAsync<any>(
      'SELECT access_request_status FROM Children WHERE child_id = ?;',
      [childId]
    );
    return { success: true, status: result?.access_request_status || 'none' };
  } catch (error) {
    console.error('Check access status error:', error);
    return { success: false, status: 'error' };
  }
}

export async function updateAccessRequest(childId: number, status: 'authorized' | 'denied' | 'none') {
  const db = await getDatabase();
  try {
    await db.runAsync(
      'UPDATE Children SET access_request_status = ? WHERE child_id = ?;',
      [status, childId]
    );
    return { success: true };
  } catch (error) {
    console.error('Update access request error:', error);
    return { success: false };
  }
}

export async function getPendingRequests(parentId: number) {
  const db = await getDatabase();
  try {
    return await db.getAllAsync<any>(
      "SELECT * FROM Children WHERE parent_id = ? AND access_request_status = 'pending';",
      [parentId]
    );
  } catch (error) {
    console.error('Get pending requests error:', error);
    return [];
  }
}

export function calculateAge(birthDate: any): number {
  if (!birthDate || typeof birthDate !== 'string') return 0;
  const today = new Date();
  const parts = birthDate.split('-');
  if (parts.length !== 3) return 0;
  
  const [year, month, day] = parts.map(Number);
  const birth = new Date(year, month - 1, day);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export async function deleteChild(childId: number) {
  const db = await getDatabase();
  try {
    await db.runAsync('DELETE FROM Children WHERE child_id = ?;', [childId]);
    return { success: true };
  } catch (error) {
    console.error('Delete child error:', error);
    return { success: false, error: 'Could not delete child profile' };
  }
}
