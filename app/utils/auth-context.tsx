import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { initDatabase } from './database/schema';

type Parent = {
  parent_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
};

type Child = {
  child_id: number;
  first_name: string;
  birth_date: string;
  grade_level?: number;
  is_parent_profile?: boolean;
};

type AuthContextType = {
  parent: Parent | null;
  activeChild: Child | null;
  setParent: (parent: Parent | null) => void;
  setActiveChild: (child: Child | null) => void;
  logout: () => void;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [parent, setParentState] = useState<Parent | null>(null);
  const [activeChild, setActiveChildState] = useState<Child | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadAuth() {
      try {
        await initDatabase();
        
        // Verificamos si queremos forzar una base de datos limpia
        // Si acabamos de migrar a Supabase, lo mejor es limpiar el estado local una vez
        const isFirstSupabaseRun = await AsyncStorage.getItem('supabase_migrated');
        if (!isFirstSupabaseRun) {
          await AsyncStorage.removeItem('parent');
          await AsyncStorage.removeItem('activeChild');
          await AsyncStorage.setItem('supabase_migrated', 'true');
          setParentState(null);
          setActiveChildState(null);
          setIsLoading(false);
          return;
        }

        const storedParent = await AsyncStorage.getItem('parent');
        const storedChild = await AsyncStorage.getItem('activeChild');
        
        if (storedParent) {
          setParentState(JSON.parse(storedParent));
        }
        if (storedChild) {
          setActiveChildState(JSON.parse(storedChild));
        }
      } catch (e) {
        console.error('Failed to load auth state', e);
      } finally {
        setIsLoading(false);
      }
    }
    loadAuth();
  }, []);

  const setParent = async (p: Parent | null) => {
    setParentState(p);
    if (p) {
      await AsyncStorage.setItem('parent', JSON.stringify(p));
    } else {
      await AsyncStorage.removeItem('parent');
      await AsyncStorage.removeItem('activeChild');
      setActiveChildState(null);
    }
  };

  const setActiveChild = async (c: Child | null) => {
    setActiveChildState(c);
    if (c) {
      await AsyncStorage.setItem('activeChild', JSON.stringify(c));
    } else {
      await AsyncStorage.removeItem('activeChild');
    }
  };

  const logout = async () => {
    setParentState(null);
    setActiveChildState(null);
    await AsyncStorage.removeItem('parent');
    await AsyncStorage.removeItem('activeChild');
  };

  return (
    <AuthContext.Provider value={{ parent, activeChild, setParent, setActiveChild, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
