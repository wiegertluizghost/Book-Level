import React, { createContext, useContext, useState } from 'react';
import { useColorScheme } from 'react-native';

const LIGHT = {
  background: '#F7FAFC',
  surface: '#FFFFFF',
  surfaceSecondary: '#EDF2F7',
  border: '#E2E8F0',
  primary: '#1A365D',
  action: '#D69E2E',
  actionDark: '#B7791F',
  support: '#38A169',
  progress: '#38A169',
  error: '#E53E3E',
  text: '#2D3748',
  textLight: '#718096',
  white: '#FFFFFF',
};

const DARK = {
  background: '#0D1117',
  surface: '#161B22',
  surfaceSecondary: '#1C2128',
  border: '#21262D',
  primary: '#1A365D',
  action: '#D69E2E',
  actionDark: '#B7791F',
  support: '#38A169',
  progress: '#38A169',
  error: '#E53E3E',
  text: '#FFFFFF',
  textLight: '#4A5568',
  white: '#FFFFFF',
};

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState('light');
  const toggleTheme = () => setMode(m => m === 'light' ? 'dark' : 'light');
  const colors = mode === 'dark' ? DARK : LIGHT;
  return (
    <ThemeContext.Provider value={{ colors, mode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
