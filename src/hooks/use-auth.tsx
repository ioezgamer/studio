'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onIdTokenChanged, User, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, UserCredential } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getUserRole as fetchUserRole, createUserDocument } from '@/app/actions';

type UserRole = 'admin' | 'editor' | 'viewer';

interface AuthContextType {
  user: User | null;
  userRole: UserRole | null;
  loading: boolean;
  login: (email: string, pass:string) => Promise<UserCredential>;
  signup: (email: string, pass: string) => Promise<UserCredential>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      if (user) {
        // Forzar la actualización del token para asegurar que esté fresco
        await user.getIdToken(true); 
        const role = await fetchUserRole(user.uid);
        // --- AÑADE ESTA LÍNEA PARA DEPURAR ---
        console.log("Rol recibido del servidor:", role);
        setUserRole(role);
        setUser(user);
      } else {
        setUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);
  
  const login = (email: string, pass: string) => {
    return signInWithEmailAndPassword(auth, email, pass)
  }
  
  const signup = async (email: string, pass: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const newUser = userCredential.user;
    
    if (newUser && newUser.email) {
      // Llama a la Server Action para crear el documento de forma segura
      const result = await createUserDocument(newUser.uid, newUser.email);
      if(result.success) {
        // Asigna el rol en el estado local para una actualización inmediata de la UI
        setUserRole('viewer');
      } else {
        // Manejar el error si la creación del documento falla
        console.error("Failed to create user document:", result.error);
        // Opcional: podrías querer eliminar al usuario de Auth si la creación del documento es crítica
      }
    }
    
    return userCredential;
  }


  const logout = () => {
    setUser(null);
    setUserRole(null);
    return signOut(auth);
  };

  const value = {
    user,
    userRole,
    loading,
    login,
    signup,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
