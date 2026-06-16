import {
  collection, doc, addDoc, getDocs,
  setDoc, updateDoc, deleteDoc, serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export async function addBook(bookData) {
  try {
    const ref = await addDoc(collection(db, 'books'), {
      title: bookData.title || '',
      author: bookData.author || '',
      totalPages: bookData.totalPages || 0,
      genre: bookData.genre || '',
      coverURL: bookData.coverURL || null,
      addedBy: auth.currentUser.uid,
      createdAt: serverTimestamp(),
    });
    return { success: true, bookId: ref.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function addBookToLibrary(userId, bookId, bookData, status, currentPage, startingXP = 0) {
  try {
    await setDoc(doc(db, 'userBooks', userId, 'books', bookId), {
      bookId: bookId || '',
      title: bookData.title || '',
      author: bookData.author || '',
      coverURL: bookData.coverURL || null,
      totalPages: Number(bookData.totalPages) || 0,
      genre: bookData.genre || '',
      status: status || 'reading',
      currentPage: Number(currentPage) || 0,
      startedAt: status === 'reading' ? serverTimestamp() : null,
      finishedAt: status === 'finished' ? serverTimestamp() : null,
      xpEarned: 0,
      pagesTracked: 0,
      startingXP: startingXP,
      rating: null,
      addedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function getUserLibrary(userId) {
  try {
    const snap = await getDocs(collection(db, 'userBooks', userId, 'books'));
    const books = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return { success: true, books };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function updateCurrentPage(userId, bookId, currentPage, totalPages) {
  try {
    const isFinished = currentPage >= totalPages;
    await updateDoc(doc(db, 'userBooks', userId, 'books', bookId), {
      currentPage: Number(currentPage),
      status: isFinished ? 'finished' : 'reading',
      finishedAt: isFinished ? serverTimestamp() : null,
    });
    return { success: true, isFinished };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function updateBookStatus(userId, bookId, status) {
  try {
    await updateDoc(doc(db, 'userBooks', userId, 'books', bookId), {
      status,
      finishedAt: status === 'finished' ? serverTimestamp() : null,
      startedAt: status === 'reading' ? serverTimestamp() : null,
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function removeBookFromLibrary(userId, bookId) {
  try {
    await deleteDoc(doc(db, 'userBooks', userId, 'books', bookId));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}