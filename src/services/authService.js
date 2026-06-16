import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export async function register(name, email, password) {
  try {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(user, { displayName: name });
    await setDoc(doc(db, 'users', user.uid), {
      name, nameLower: name.toLowerCase(), email, photoURL: null, createdAt: serverTimestamp(),
      xp: 0, level: 1, streak: 0, bestStreak: 0, lastReadingDate: null,
      totalPagesRead: 0, totalBooksFinished: 0, isPremium: false, achievements: [],
    });
    return { success: true, user };
  } catch (error) { return { success: false, error: error.message }; }
}

export async function login(email, password) {
  try {
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user };
  } catch (error) { return { success: false, error: error.message }; }
}

export async function logout() {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) { return { success: false, error: error.message }; }
}