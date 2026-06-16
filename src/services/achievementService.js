import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../config/firebase';

export const ACHIEVEMENTS = [
  { id: 'primeira_leitura',   title: 'Primeira Sessão',   desc: 'Registrou sua primeira leitura',    icon: 'book-outline',       color: '#38A169' },
  { id: 'maratonista',        title: 'Maratonista',        desc: 'Leu 50+ páginas em uma sessão',     icon: 'flash',              color: '#D97706' },
  { id: 'semana_completa',    title: 'Semana Completa',    desc: '7 dias de streak seguidos',         icon: 'flame',              color: '#E53E3E' },
  { id: 'mes_completo',       title: 'Mês de Leitor',      desc: '30 dias de streak seguidos',        icon: 'calendar',           color: '#E53E3E' },
  { id: 'primeiro_livro',     title: 'Primeiro Livro',     desc: 'Terminou seu primeiro livro',       icon: 'checkmark-circle',   color: '#38A169' },
  { id: 'cinco_livros',       title: 'Colecionador',       desc: 'Terminou 5 livros',                 icon: 'library-outline',    color: '#4A9ECC' },
  { id: 'dez_livros',         title: 'Bibliófilo',         desc: 'Terminou 10 livros',                icon: 'archive',            color: '#8B5CF6' },
  { id: 'cem_paginas',        title: '100 Páginas',        desc: 'Leu 100 páginas no total',          icon: 'document-text',      color: '#9CA3AF' },
  { id: 'quinhentas_paginas', title: '500 Páginas',        desc: 'Leu 500 páginas no total',          icon: 'documents',          color: '#D97706' },
  { id: 'mil_paginas',        title: '1000 Páginas',       desc: 'Leu 1000 páginas no total',         icon: 'medal',              color: '#D69E2E' },
  { id: 'rank_explorador',    title: 'Explorador',         desc: 'Alcançou o rank Explorador',        icon: 'compass',            color: '#92400E' },
  { id: 'rank_erudito',       title: 'Chegou ao Erudito',  desc: 'Alcançou o rank Erudito',           icon: 'school',             color: '#3B82F6' },
  { id: 'rank_lendario',      title: 'Lendário',           desc: 'Alcançou o rank Lendário',          icon: 'star',               color: '#F59E0B' },
];

export async function checkAndUnlockAchievements(userId, { existingAchievements, streak, totalBooksFinished, totalPagesRead, pagesRead, level }) {
  try {
    const existing = existingAchievements ?? [];
    const toUnlock = [];
    const check = (id, condition) => {
      if (condition && !existing.includes(id)) toUnlock.push(id);
    };
    check('primeira_leitura',   true);
    check('maratonista',        pagesRead >= 50);
    check('semana_completa',    streak >= 7);
    check('mes_completo',       streak >= 30);
    check('primeiro_livro',     totalBooksFinished >= 1);
    check('cinco_livros',       totalBooksFinished >= 5);
    check('dez_livros',         totalBooksFinished >= 10);
    check('cem_paginas',        totalPagesRead >= 100);
    check('quinhentas_paginas', totalPagesRead >= 500);
    check('mil_paginas',        totalPagesRead >= 1000);
    check('rank_explorador',    level >= 11);
    check('rank_erudito',       level >= 31);
    check('rank_lendario',      level >= 46);
    if (toUnlock.length > 0) {
      await updateDoc(doc(db, 'users', userId), { achievements: arrayUnion(...toUnlock) });
    }
    return toUnlock.map(id => ACHIEVEMENTS.find(a => a.id === id)).filter(Boolean);
  } catch { return []; }
}
