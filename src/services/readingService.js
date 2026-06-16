import { collection, addDoc, getDocs, getDoc, updateDoc, doc, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '../config/firebase';
import { calcXP, BOOK_FINISH_BONUS } from '../utils/xpCalculator';
import { addXP, updateStreak } from './userService';
import { updateCurrentPage } from './bookService';
import { checkAndUnlockAchievements } from './achievementService';

export async function logReading(userId, bookId, bookTitle, pagesRead, currentPage, totalPages) {
  try {
    const { newStreak, streakBroke, prevStreak, canRecover, recoveryCost, recoveriesLeft } = await updateStreak(userId);
    let xpEarned = calcXP(pagesRead, newStreak);
    const { isFinished } = await updateCurrentPage(userId, bookId, currentPage, totalPages);
    if (isFinished) {
      xpEarned += BOOK_FINISH_BONUS;
      await updateDoc(doc(db, 'users', userId), { totalBooksFinished: increment(1) });
    }
    const { newXP, newLevel } = await addXP(userId, xpEarned);
    await updateDoc(doc(db, 'users', userId), { totalPagesRead: increment(pagesRead) });
    await addDoc(collection(db, 'readingLogs', userId, 'logs'), { bookId, bookTitle, pagesRead, xpEarned, date: serverTimestamp() });
    // Rastreia XP e páginas no userBook para remoção precisa (best-effort)
    try {
      await updateDoc(doc(db, 'userBooks', userId, 'books', bookId), {
        xpEarned: increment(xpEarned),
        pagesTracked: increment(pagesRead),
      });
    } catch (_) {}
    const freshSnap = await getDoc(doc(db, 'users', userId));
    const freshData = freshSnap.data();
    const newAchievements = await checkAndUnlockAchievements(userId, {
      existingAchievements: freshData.achievements ?? [],
      streak: newStreak,
      totalBooksFinished: freshData.totalBooksFinished ?? 0,
      totalPagesRead: freshData.totalPagesRead ?? 0,
      pagesRead,
      level: newLevel.level,
    });
    return { success: true, xpEarned, newXP, newLevel, newStreak, isFinished, newAchievements, streakBroke, prevStreak, canRecover, recoveryCost, recoveriesLeft };
  } catch (error) { return { success: false, error: error.message }; }
}

export async function getReadingHistory(userId) {
  try {
    const snap = await getDocs(collection(db, 'readingLogs', userId, 'logs'));
    const logs = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.date?.seconds ?? 0) - (a.date?.seconds ?? 0));
    return { success: true, logs };
  } catch (error) { return { success: false, error: error.message }; }
}
