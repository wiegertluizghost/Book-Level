const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccount.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const UID = 'uQhnHZ0hkqTC1LuL0pfveSi5c6x1';

async function reset() {
  await db.collection('users').doc(UID).update({
    xp: 0,
    level: 1,
    totalPagesRead: 0,
    totalBooksFinished: 0,
    streak: 0,
    bestStreak: 0,
    lastReadingDate: null,
    streakRecoveriesThisMonth: 0,
    streakRecoveryMonthKey: '',
    achievements: [],
  });
  console.log('Stats zerados.');

  const books = await db.collection('userBooks').doc(UID).collection('books').get();
  for (const doc of books.docs) await doc.ref.delete();
  console.log(`${books.size} livros removidos.`);

  const logs = await db.collection('readingLogs').doc(UID).collection('logs').get();
  for (const doc of logs.docs) await doc.ref.delete();
  console.log(`${logs.size} logs removidos.`);

  console.log('Pronto. Conta limpa.');
  process.exit(0);
}

reset().catch(e => { console.error(e); process.exit(1); });
