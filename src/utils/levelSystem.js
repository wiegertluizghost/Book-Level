const ROMAN = ['I', 'II', 'III', 'IV', 'V'];

const TIER_DEFS = [
  { name: 'Iniciante',     color: '#9CA3AF' },
  { name: 'Leitor Curioso',color: '#6EE7B7' },
  { name: 'Explorador',    color: '#92400E' },
  { name: 'Dedicado',      color: '#6B7280' },
  { name: 'Apaixonado',    color: '#D97706' },
  { name: 'Voraz',         color: '#10B981' },
  { name: 'Erudito',       color: '#3B82F6' },
  { name: 'Sábio',         color: '#8B5CF6' },
  { name: 'Mestre',        color: '#EC4899' },
  { name: 'Lendário',      color: '#F59E0B' },
];

// minXP(level) = 50 * level * (level - 1)  →  gap between n and n+1 = n * 100
const _levels = [];
for (let i = 0; i < 50; i++) {
  const level = i + 1;
  const minXP = 50 * level * (level - 1);
  const tierIndex = Math.floor(i / 5);
  const tier = TIER_DEFS[tierIndex];
  const roman = ROMAN[i % 5];
  _levels.push({ level, title: `${tier.name} ${roman}`, tier: tier.name, minXP });
}

export const LEVELS = _levels;

export const TIERS = TIER_DEFS.map((t, i) => ({
  name: t.name,
  color: t.color,
  levels: [i * 5 + 1, i * 5 + 2, i * 5 + 3, i * 5 + 4, i * 5 + 5],
}));

export function getLevelByXP(xp) {
  return [...LEVELS].reverse().find(l => xp >= l.minXP) ?? LEVELS[0];
}

export function getTierForLevel(level) {
  return TIERS.find(t => t.levels.includes(level));
}
