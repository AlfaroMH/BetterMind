-- Copia y pega este script en el SQL Editor de tu proyecto en Supabase (https://supabase.com/dashboard/project/_/sql)

-- Eliminar tablas si existen para empezar de cero (OPCIONAL - Cuidado con los datos)
-- DROP TABLE IF EXISTS sessions;
-- DROP TABLE IF EXISTS progress;
-- DROP TABLE IF EXISTS levelprogress;
-- DROP TABLE IF EXISTS modules;
-- DROP TABLE IF EXISTS children;
-- DROP TABLE IF EXISTS parents;

-- Create parents table
CREATE TABLE IF NOT EXISTS parents (
  parent_id SERIAL PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  password TEXT NOT NULL,
  registration_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create children table
CREATE TABLE IF NOT EXISTS children (
  child_id SERIAL PRIMARY KEY,
  parent_id INTEGER NOT NULL REFERENCES parents(parent_id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  birth_date TEXT,
  grade_level INTEGER,
  pin TEXT,
  is_parent_profile BOOLEAN DEFAULT FALSE,
  access_request_status TEXT DEFAULT 'none',
  access_request_time TIMESTAMP WITH TIME ZONE,
  registration_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create modules table
CREATE TABLE IF NOT EXISTS modules (
  module_id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT
);

-- Create levelprogress table
CREATE TABLE IF NOT EXISTS levelprogress (
  id SERIAL PRIMARY KEY,
  child_id INTEGER NOT NULL REFERENCES children(child_id) ON DELETE CASCADE,
  module_name TEXT NOT NULL,
  game_id TEXT NOT NULL,
  level INTEGER NOT NULL,
  high_score INTEGER DEFAULT 0,
  total_errors INTEGER DEFAULT 0,
  is_unlocked BOOLEAN DEFAULT FALSE,
  UNIQUE(child_id, game_id, level)
);

-- Create progress table
CREATE TABLE IF NOT EXISTS progress (
  progress_id SERIAL PRIMARY KEY,
  child_id INTEGER NOT NULL REFERENCES children(child_id) ON DELETE CASCADE,
  module_id INTEGER NOT NULL REFERENCES modules(module_id) ON DELETE CASCADE,
  score INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  playtime INTEGER DEFAULT 0,
  successes INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
  session_id SERIAL PRIMARY KEY,
  parent_id INTEGER NOT NULL REFERENCES parents(parent_id) ON DELETE CASCADE,
  login_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Habilitar Realtime para la tabla children
-- Nota: Si la publicación ya existe, esto fallará. Se puede habilitar manualmente en el dashboard de Supabase (Database -> Replication)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE children;

-- Seed Modules
INSERT INTO modules (name, description) 
VALUES 
  ('Matemáticas', 'Módulo de matemáticas: operaciones y razonamiento lógico.'),
  ('Memoria', 'Módulo de memoria: ejercicios para mejorar la memoria a corto y largo plazo.'),
  ('Lógica', 'Módulo de lógica: acertijos y estrategias de resolución de problemas.')
ON CONFLICT (name) DO NOTHING;

-- Configuración de Row Level Security (RLS)
-- Esto permite que la base de datos sea segura pero funcional con la clave anon de la app

-- 1. Habilitar RLS en todas las tablas
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE levelprogress ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- 2. Crear políticas para permitir operaciones a usuarios anónimos (clave pública de la app)
-- Nota: En una app de producción real, usarías auth.uid() para mayor seguridad.
-- Para esta etapa, permitimos que la clave anon realice las operaciones necesarias.

-- Políticas para la tabla 'parents'
CREATE POLICY "Enable all for anon on parents" ON parents FOR ALL TO anon USING (true) WITH CHECK (true);

-- Políticas para la tabla 'children'
CREATE POLICY "Enable all for anon on children" ON children FOR ALL TO anon USING (true) WITH CHECK (true);

-- Políticas para la tabla 'modules' (Solo lectura para usuarios, a menos que necesiten insertar)
CREATE POLICY "Enable read for anon on modules" ON modules FOR SELECT TO anon USING (true);
CREATE POLICY "Enable insert for anon on modules" ON modules FOR INSERT TO anon WITH CHECK (true);

-- Políticas para la tabla 'levelprogress'
CREATE POLICY "Enable all for anon on levelprogress" ON levelprogress FOR ALL TO anon USING (true) WITH CHECK (true);

-- Políticas para la tabla 'progress'
CREATE POLICY "Enable all for anon on progress" ON progress FOR ALL TO anon USING (true) WITH CHECK (true);

-- Políticas para la tabla 'sessions'
CREATE POLICY "Enable all for anon on sessions" ON sessions FOR ALL TO anon USING (true) WITH CHECK (true);
