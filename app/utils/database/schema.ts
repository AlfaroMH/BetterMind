import { getDatabase } from './adapter';

export const dbName = 'bettermind.db';

export async function initDatabase() {
  console.log('Initializing Database...');
  const db = await getDatabase();

  // Enable foreign keys
  await db.execAsync('PRAGMA foreign_keys = ON;');

  // Create Parents table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS Parents (
      parent_id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      password TEXT NOT NULL,
      registration_date DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create Children table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS Children (
      child_id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id INTEGER NOT NULL,
      first_name TEXT NOT NULL,
      birth_date TEXT,
      grade_level INTEGER,
      pin TEXT,
      is_parent_profile BOOLEAN DEFAULT 0,
      access_request_status TEXT DEFAULT 'none', -- 'none', 'pending', 'authorized', 'denied'
      access_request_time DATETIME,
      registration_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES Parents(parent_id) ON DELETE CASCADE
    );
  `);

  // Add columns if table already exists
  try {
    await db.execAsync('ALTER TABLE Children ADD COLUMN birth_date TEXT;');
  } catch (e) {}
  try {
    await db.execAsync('ALTER TABLE Children ADD COLUMN pin TEXT;');
  } catch (e) {}
  try {
    await db.execAsync('ALTER TABLE Children ADD COLUMN is_parent_profile BOOLEAN DEFAULT 0;');
  } catch (e) {}
  try {
    await db.execAsync("ALTER TABLE Children ADD COLUMN access_request_status TEXT DEFAULT 'none';");
  } catch (e) {}
  try {
    await db.execAsync('ALTER TABLE Children ADD COLUMN access_request_time DATETIME;');
  } catch (e) {}

  // Create Modules table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS Modules (
      module_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT
    );
  `);

  // Create LevelProgress table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS LevelProgress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      child_id INTEGER NOT NULL,
      module_name TEXT NOT NULL,
      game_id TEXT NOT NULL,
      level INTEGER NOT NULL,
      high_score INTEGER DEFAULT 0,
      total_errors INTEGER DEFAULT 0,
      is_unlocked BOOLEAN DEFAULT 0,
      UNIQUE(child_id, game_id, level),
      FOREIGN KEY (child_id) REFERENCES Children(child_id) ON DELETE CASCADE
    );
  `);

  // Ensure total_errors exists in LevelProgress
  try {
    await db.execAsync('ALTER TABLE LevelProgress ADD COLUMN total_errors INTEGER DEFAULT 0;');
  } catch (e) {
    // Column might already exist
  }

  // Create Progress table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS Progress (
      progress_id INTEGER PRIMARY KEY AUTOINCREMENT,
      child_id INTEGER NOT NULL,
      module_id INTEGER NOT NULL,
      score INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      playtime INTEGER DEFAULT 0,
      successes INTEGER DEFAULT 0,
      errors INTEGER DEFAULT 0,
      date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (child_id) REFERENCES Children(child_id) ON DELETE CASCADE,
      FOREIGN KEY (module_id) REFERENCES Modules(module_id) ON DELETE CASCADE
    );
  `);

  // Create Sessions table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS Sessions (
      session_id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id INTEGER NOT NULL,
      login_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES Parents(parent_id) ON DELETE CASCADE
    );
  `);

  // Ensure Spanish Modules exist
  const modules = [
    { name: 'Matemáticas', description: 'Módulo de matemáticas: operaciones y razonamiento lógico.' },
    { name: 'Memoria', description: 'Módulo de memoria: ejercicios para mejorar la memoria a corto y largo plazo.' },
    { name: 'Lógica', description: 'Módulo de lógica: acertijos y estrategias de resolución de problemas.' }
  ];

  for (const module of modules) {
    const existing = await db.getFirstAsync<{ module_id: number }>('SELECT module_id FROM Modules WHERE name = ?;', [module.name]);
    if (!existing) {
      await db.runAsync('INSERT INTO Modules (name, description) VALUES (?, ?);', [module.name, module.description]);
    }
  }

  // Optional: Update old English modules if they exist to avoid confusion
  await db.runAsync("UPDATE Modules SET name = 'Matemáticas' WHERE name = 'math';");
  await db.runAsync("UPDATE Modules SET name = 'Memoria' WHERE name = 'memory';");
  await db.runAsync("UPDATE Modules SET name = 'Lógica' WHERE name = 'logic';");

  console.log('Database initialized successfully');
  return db;
}
