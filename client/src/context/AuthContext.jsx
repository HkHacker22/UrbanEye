import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import LoadingScreen from '../components/LoadingScreen';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [karmaData, setKarmaData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('civic_auth_user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setCurrentUser(parsed);
        // Re-sync karma data on session restore
        if (parsed.uid) {
          axios.get(`${import.meta.env.VITE_API_URL}/users/me/${parsed.uid}`)
            .then(res => setKarmaData(res.data.tierInfo))
            .catch(() => {});
        }
      } catch (err) {
        console.error('Failed to parse stored user', err);
      }
    }
    setLoading(false);
  }, []);

  const login = async (userData) => {
    localStorage.setItem('civic_auth_user', JSON.stringify(userData));
    setCurrentUser(userData);
    // Sync to backend DB and fetch karma
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/users/sync`, {
        uid: userData.uid,
        displayName: userData.displayName,
        email: userData.email,
        photoURL: userData.photoURL,
      });
      setKarmaData(res.data.tierInfo);
    } catch (err) {
      console.warn('User sync failed (non-critical):', err.message);
    }
  };

  const logout = () => {
    localStorage.removeItem('civic_auth_user');
    setCurrentUser(null);
    setKarmaData(null);
  };

  const value = { currentUser, karmaData, login, logout };

  return (
    <AuthContext.Provider value={value}>
      {loading ? <LoadingScreen /> : children}
    </AuthContext.Provider>
  );
}
