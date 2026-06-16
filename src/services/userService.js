import { doc, getDoc, updateDoc, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getLevelByXP } from '../utils/levelSystem';
import { XP_PER_PAGE, BOOK_FINISH_BONUS } from '../utils/xpCalculator';

const RECOVERY_COSTS = [100, 250, 500];

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export async function getUser(userId) {
  try {
    const snap = await getDoc(doc(db, 'users', userId));
    if (snap.exists()) return { success: true, data: snap.data() };
    return { success: false, error: 'Usuário não encontrado' };
  } catch (error) { return { success: false, error: error.message }; }
}

export async function addXP(userId, xpToAdd) {
  try {
    const { data: user } = await getUser(userId);
    const newXP = user.xp + xpToAdd;
    const newLevel = getLevelByXP(newXP);
    await updateDoc(doc(db, 'users', userId), { xp: newXP, level: newLevel.level });
    return { success: true, newXP, newLevel };
  } catch (error) { return { success: false, error: error.message }; }
}

export async function subtractXP(userId, xpToRemove) {
  try {
    const { data: user } = await getUser(userId);
    const newXP = Math.max(0, user.xp - xpToRemove);
    const newLevel = getLevelByXP(newXP);
    await updateDoc(doc(db, 'users', userId), { xp: newXP, level: newLevel.level });
    return { success: true, newXP, newLevel };
  } catch (error) { return { success: false, error: error.message }; }
}

export async function recordFinishedBook(userId, totalPages, bookId = null) {
  try {
    const xpToAdd = (totalPages * XP_PER_PAGE) + BOOK_FINISH_BONUS;
    const { data: user } = await getUser(userId);
    const newXP = user.xp + xpToAdd;
    const newLevel = getLevelByXP(newXP);
    await updateDoc(doc(db, 'users', userId), {
      xp: newXP,
      level: newLevel.level,
      totalBooksFinished: increment(1),
      totalPagesRead: increment(totalPages),
    });
    // Rastreia XP e páginas no userBook para remoção precisa (best-effort)
    if (bookId) {
      try {
        await updateDoc(doc(db, 'userBooks', userId, 'books', bookId), {
          xpEarned: increment(xpToAdd),
          pagesTracked: increment(totalPages),
        });
      } catch (_) {}
    }
    return { success: true, xpEarned: xpToAdd, newXP, newLevel };
  } catch (error) { return { success: false, error: error.message }; }
}

export async function updateStreak(userId) {
  try {
    const { data: user } = await getUser(userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastDate = user.lastReadingDate?.toDate();
    lastDate?.setHours(0, 0, 0, 0);
    const diffDays = lastDate ? Math.floor((today - lastDate) / (1000 * 60 * 60 * 24)) : null;

    const streakBroke = diffDays !== null && diffDays > 1 && (user.streak ?? 0) > 1;
    const prevStreak = user.streak ?? 0;

    let newStreak = user.streak;
    if (diffDays === null || diffDays > 1) { newStreak = 1; }
    else if (diffDays === 1) { newStreak = user.streak + 1; }

    const newBestStreak = Math.max(newStreak, user.bestStreak ?? 0);
    await updateDoc(doc(db, 'users', userId), {
      streak: newStreak,
      bestStreak: newBestStreak,
      lastReadingDate: serverTimestamp(),
    });

    // Calculate recovery info
    const monthKey = currentMonthKey();
    const savedMonth = user.streakRecoveryMonthKey ?? '';
    const recoveriesUsed = savedMonth === monthKey ? (user.streakRecoveriesThisMonth ?? 0) : 0;
    const canRecover = streakBroke && recoveriesUsed < 3;
    const recoveryCost = canRecover ? RECOVERY_COSTS[recoveriesUsed] : null;
    const recoveriesLeft = 3 - recoveriesUsed;

    return { success: true, newStreak, newBestStreak, streakBroke, prevStreak, canRecover, recoveryCost, recoveriesLeft };
  } catch (error) { return { success: false, error: error.message }; }
}

// Subtrai XP proporcional e páginas quando o usuário corrige a página para trás
export async function subtractProgress(userId, bookId, pagesBack, wasFinished = false) {
  try {
    const userBookSnap = await getDoc(doc(db, 'userBooks', userId, 'books', bookId));
    const userBook = userBookSnap.exists() ? userBookSnap.data() : {};

    const xpTracked = userBook.xpEarned ?? 0;
    const pagesTracked = userBook.pagesTracked ?? 0;

    // XP base sem o bônus de conclusão (se era livro finalizado)
    const baseXP = wasFinished ? Math.max(0, xpTracked - BOOK_FINISH_BONUS) : xpTracked;
    // XP proporcional das páginas removidas
    const xpForPages = (pagesTracked > 0 && baseXP > 0)
      ? Math.floor((pagesBack / pagesTracked) * baseXP)
      : 0;
    // Se era finalizado, remove também o bônus completo
    const totalXPToRemove = xpForPages + (wasFinished ? BOOK_FINISH_BONUS : 0);

    const { data: user } = await getUser(userId);
    const newXP = Math.max(0, (user.xp ?? 0) - totalXPToRemove);
    const newLevel = getLevelByXP(newXP);

    const updates = {
      xp: newXP,
      level: newLevel.level,
      totalPagesRead: increment(-pagesBack),
    };
    if (wasFinished) updates.totalBooksFinished = increment(-1);

    await updateDoc(doc(db, 'users', userId), updates);

    try {
      await updateDoc(doc(db, 'userBooks', userId, 'books', bookId), {
        xpEarned: increment(-totalXPToRemove),
        pagesTracked: increment(-pagesBack),
      });
    } catch (_) {}

    return { success: true, xpRemoved: totalXPToRemove, newXP, newLevel };
  } catch (error) { return { success: false, error: error.message }; }
}

// Adiciona apenas o bônus de conclusão (quando livro já está na última página)
export async function addFinishBonus(userId, bookId) {
  try {
    const { data: user } = await getUser(userId);
    const newXP = (user.xp ?? 0) + BOOK_FINISH_BONUS;
    const newLevel = getLevelByXP(newXP);

    await updateDoc(doc(db, 'users', userId), {
      xp: newXP,
      level: newLevel.level,
      totalBooksFinished: increment(1),
    });

    try {
      await updateDoc(doc(db, 'userBooks', userId, 'books', bookId), {
        xpEarned: increment(BOOK_FINISH_BONUS),
      });
    } catch (_) {}

    return { success: true, xpEarned: BOOK_FINISH_BONUS, newXP, newLevel };
  } catch (error) { return { success: false, error: error.message }; }
}

export async function removeBookStats(userId, bookId, bookData) {
  // bookData: { status } — usado só para saber se era livro concluído
  try {
    // Lê XP e páginas exatos rastreados no próprio documento do livro
    const userBookSnap = await getDoc(doc(db, 'userBooks', userId, 'books', bookId));
    const userBook = userBookSnap.exists() ? userBookSnap.data() : {};

    const totalXPToRemove = userBook.xpEarned ?? 0;
    const pagesTracked = userBook.pagesTracked ?? 0;
    const wasFinished = bookData.status === 'finished';

    const { data: user } = await getUser(userId);
    const newXP = Math.max(0, (user.xp ?? 0) - totalXPToRemove);
    const newLevel = getLevelByXP(newXP);

    const updates = {
      xp: newXP,
      level: newLevel.level,
      totalPagesRead: increment(-pagesTracked),
    };
    if (wasFinished) updates.totalBooksFinished = increment(-1);

    await updateDoc(doc(db, 'users', userId), updates);
    return { success: true, xpRemoved: totalXPToRemove, newXP, newLevel };
  } catch (error) { return { success: false, error: error.message }; }
}

export async function recoverStreak(userId, prevStreak) {
  try {
    const { data: user } = await getUser(userId);
    const monthKey = currentMonthKey();
    const savedMonth = user.streakRecoveryMonthKey ?? '';
    const recoveriesUsed = savedMonth === monthKey ? (user.streakRecoveriesThisMonth ?? 0) : 0;

    if (recoveriesUsed >= 3) {
      return { success: false, error: 'Limite de 3 recuperações por mês atingido.' };
    }

    const cost = RECOVERY_COSTS[recoveriesUsed];
    if ((user.xp ?? 0) < cost) {
      return { success: false, error: `XP insuficiente. Você precisa de ${cost} XP.` };
    }

    const newXP = user.xp - cost;
    const newLevel = getLevelByXP(newXP);
    const newRecoveriesUsed = recoveriesUsed + 1;

    await updateDoc(doc(db, 'users', userId), {
      streak: prevStreak,
      bestStreak: Math.max(prevStreak, user.bestStreak ?? 0),
      xp: newXP,
      level: newLevel.level,
      streakRecoveriesThisMonth: newRecoveriesUsed,
      streakRecoveryMonthKey: monthKey,
    });

    return {
      success: true,
      newStreak: prevStreak,
      xpSpent: cost,
      recoveriesLeft: 3 - newRecoveriesUsed,
    };
  } catch (error) { return { success: false, error: error.message }; }
}
