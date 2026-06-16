import React from 'react';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { FriendshipProvider } from './src/context/FriendshipContext';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <FriendshipProvider>
          <RootNavigator />
        </FriendshipProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}