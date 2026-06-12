import * as Crypto from 'expo-crypto';
import { getDatabase } from './adapter';

export async function hashPassword(password: string) {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    password
  );
}

export async function registerParent(firstName: string, lastName: string, email: string, phone: string, password: string) {
  const db = await getDatabase();
  const hashedPassword = await hashPassword(password);
  
  try {
    const result = await db.runAsync(
      'INSERT INTO Parents (first_name, last_name, email, phone, password) VALUES (?, ?, ?, ?, ?);',
      [firstName, lastName, email, phone, hashedPassword]
    );
    return { success: true, id: result.lastInsertRowId };
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, error: 'Email already exists or invalid data' };
  }
}

export async function loginParent(email: string, password: string) {
  const db = await getDatabase();
  const hashedPassword = await hashPassword(password);
  
  const parent = await db.getFirstAsync<any>(
    'SELECT * FROM Parents WHERE email = ? AND password = ?;',
    [email, hashedPassword]
  );
  
  if (parent) {
    // Record session
    await db.runAsync('INSERT INTO Sessions (parent_id) VALUES (?);', [parent.parent_id]);
    return { success: true, parent };
  }
  
  return { success: false, error: 'Invalid email or password' };
}

export async function verifyPassword(parentId: number, password: string) {
  const db = await getDatabase();
  const hashedPassword = await hashPassword(password);
  
  const parent = await db.getFirstAsync<any>(
    'SELECT * FROM Parents WHERE parent_id = ? AND password = ?;',
    [parentId, hashedPassword]
  );
  
  return !!parent;
}
