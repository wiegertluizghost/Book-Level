import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: "AIzaSyAzVI-NElB_EXqAswFoXPeUMQzJGdFgM3s",
  authDomain: "booklevel-d9bda.firebaseapp.com",
  projectId: "booklevel-d9bda",
  storageBucket: "booklevel-d9bda.firebasestorage.app",
  messagingSenderId: "341107603193",
  appId: "1:341107603193:web:394d556d5efb2039ddd428"
};

const app = initializeApp(firebaseConfig);

// Use AsyncStorage persistence on native, localStorage on web
const persistence = Platform.OS === 'web'
  ? browserLocalPersistence
  : getReactNativePersistence(ReactNativeAsyncStorage);

export const auth = initializeAuth(app, { persistence });

export const db = getFirestore(app);
