import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { COLORS } from '../../constants/colors';
import { LEVELS, TIERS, getLevelByXP } from '../../utils/levelSystem';
import { ACHIEVEMENTS } from '../../services/achievementService';

export default function ProgressScreen({ navigation }) {
  const { profile, refreshProfile } = useAuth();
  const { colors } = useTheme();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const styles = makeStyles(colors);

  async function onRefresh() {
    setIsRefreshing(true);
    await refreshProfile();
    setIsRefreshing(false);
  }

  if (!profile) return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={COLORS.action} />
    </View>
  );

  const currentLevel = LEVELS.find(l => l.level === profile.level) ?? LEVELS[0];
  const nextLevel = LEVELS.find(l => l.level === profile.level + 1);
  const xpProgress = nextLevel ? (profile.xp - currentLevel.minXP) / (nextLevel.minXP - currentLevel.minXP) : 1;

  const unlockedAchievements = new Set(profile.achievements ?? []);

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={COLORS.action} colors={[COLORS.action]} />}
    >

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Meu Progresso</Text>
          <Text style={styles.headerSub}>Acompanhe sua evolução</Text>
        </View>
        <TouchableOpacity style={styles.rankingButton} onPress={() => navigation.navigate('Ranking')}>
          <Ionicons name="trophy-outline" size={18} color={COLORS.action} />
          <Text style={styles.rankingButtonText}>Ranking</Text>
        </TouchableOpacity>
      </View>

      {/* Nível atual */}
      <View style={styles.levelCard}>
        <View style={styles.levelCardTop}>
          <Text style={styles.levelCardLabel}>Nível atual · {currentLevel?.tier}</Text>
          <Text style={styles.levelCardTitle}>{currentLevel?.title}</Text>
        </View>
        <Text style={styles.xpBig}>{profile.xp} XP</Text>
        <View style={styles.xpRow}>
          <Text style={styles.xpCurrent}>{currentLevel?.minXP} XP</Text>
          {nextLevel && <Text style={styles.xpNext}>Meta: {nextLevel.minXP} XP</Text>}
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${Math.min(xpProgress * 100, 100)}%` }]} />
        </View>
        {nextLevel ? (
          <Text style={styles.xpHint}>Faltam {nextLevel.minXP - profile.xp} XP para {nextLevel.title}</Text>
        ) : (
          <View style={styles.maxLevelRow}>
            <Ionicons name="trophy" size={13} color={COLORS.action} />
            <Text style={styles.xpHint}>Nível máximo atingido!</Text>
          </View>
        )}
      </View>

      {/* Stats */}
      <View style={styles.statsBlock}>
        <View style={styles.statsRow}>
          <View style={styles.statInlineItem}>
            <Text style={styles.statInlineValue}>{profile.totalPagesRead}</Text>
            <Text style={styles.statInlineLabel}>PÁGINAS</Text>
          </View>
          <View style={styles.statInlineDivider} />
          <View style={styles.statInlineItem}>
            <Text style={styles.statInlineValue}>{profile.totalBooksFinished}</Text>
            <Text style={styles.statInlineLabel}>LIVROS LIDOS</Text>
          </View>
          <View style={styles.statInlineDivider} />
          <View style={styles.statInlineItem}>
            <Text style={styles.statInlineValue}>{profile.xp}</Text>
            <Text style={styles.statInlineLabel}>XP TOTAL</Text>
          </View>
        </View>
        <View style={styles.statRowDivider} />
        <View style={styles.statsRow}>
          <View style={styles.statInlineItem}>
            <Text style={styles.statInlineValue}>{profile.streak}</Text>
            <Text style={styles.statInlineLabel}>STREAK</Text>
          </View>
          <View style={styles.statInlineDivider} />
          <View style={styles.statInlineItem}>
            <Text style={styles.statInlineValue}>{profile.bestStreak}</Text>
            <Text style={styles.statInlineLabel}>🔥 STREAK MÁX.</Text>
          </View>
          <View style={styles.statInlineDivider} />
          <View style={styles.statInlineItem}>
            <Text style={styles.statInlineValue}>{profile.level}</Text>
            <Text style={styles.statInlineLabel}>NÍVEL</Text>
          </View>
        </View>
      </View>

      {/* Jornada de Ranks (estilo Valorant) */}
      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Ionicons name="map-outline" size={15} color={COLORS.action} />
          <Text style={styles.cardTitle}>Jornada de Ranks</Text>
        </View>
        {TIERS.map(tier => {
          const tierLevels = tier.levels.map(l => LEVELS.find(lv => lv.level === l));
          const isCurrentTier = tier.levels.includes(profile.level);
          const unlockedCount = tierLevels.filter(l => profile.xp >= l.minXP).length;
          const fullyUnlocked = unlockedCount === tierLevels.length;
          return (
            <View key={tier.name} style={[styles.tierRow, isCurrentTier && { backgroundColor: `${tier.color}10`, borderColor: `${tier.color}30`, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10 }]}>
              <View style={[styles.tierDot, { backgroundColor: unlockedCount > 0 ? tier.color : colors.border }]}>
                {fullyUnlocked
                  ? <Ionicons name="checkmark" size={12} color="#fff" />
                  : <Text style={[styles.tierDotText, unlockedCount > 0 && { color: '#fff' }]}>{unlockedCount}</Text>
                }
              </View>
              <View style={styles.tierInfo}>
                <Text style={[styles.tierName, { color: unlockedCount > 0 ? tier.color : colors.textLight }]}>{tier.name}</Text>
                {isCurrentTier && <Text style={[styles.tierCurrentLabel, { color: tier.color }]}>você está aqui</Text>}
              </View>
              <View style={styles.tierSubDots}>
                {tierLevels.map(l => {
                  const isUnlocked = profile.xp >= l.minXP;
                  const isCurrent = profile.level === l.level;
                  return (
                    <View
                      key={l.level}
                      style={[
                        styles.subDot,
                        isUnlocked && { backgroundColor: tier.color },
                        isCurrent && styles.subDotCurrent,
                      ]}
                    />
                  );
                })}
              </View>
              {isCurrentTier && <Ionicons name="location" size={14} color={tier.color} />}
            </View>
          );
        })}
      </View>

      {/* Conquistas */}
      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Ionicons name="medal-outline" size={15} color={COLORS.action} />
          <Text style={styles.cardTitle}>Conquistas</Text>
          <Text style={styles.achievementCount}>{unlockedAchievements.size}/{ACHIEVEMENTS.length}</Text>
        </View>
        <View style={styles.achievementsGrid}>
          {ACHIEVEMENTS.map(a => {
            const unlocked = unlockedAchievements.has(a.id);
            return (
              <View key={a.id} style={[styles.achievementBadge, !unlocked && styles.achievementBadgeLocked]}>
                <View style={[styles.achievementIconWrap, { backgroundColor: unlocked ? `${a.color}20` : colors.border }]}>
                  <Ionicons
                    name={unlocked ? a.icon : 'lock-closed'}
                    size={20}
                    color={unlocked ? a.color : colors.textLight}
                  />
                </View>
                <Text style={[styles.achievementLabel, !unlocked && styles.achievementLabelLocked]} numberOfLines={2}>
                  {unlocked ? a.title : '???'}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },

    header: { paddingTop: 56, paddingBottom: 24, paddingHorizontal: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    headerTitle: { fontSize: 24, fontWeight: '800', color: colors.text },
    headerSub: { fontSize: 13, color: colors.textLight, marginTop: 2 },
    rankingButton: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      backgroundColor: 'rgba(214,158,46,0.1)', borderWidth: 1, borderColor: 'rgba(214,158,46,0.3)',
      paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    },
    rankingButtonText: { fontSize: 13, fontWeight: '700', color: COLORS.action },

    levelCard: {
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
      borderRadius: 12, padding: 20, marginHorizontal: 16, marginBottom: 12,
    },
    levelCardTop: { marginBottom: 4 },
    levelCardLabel: { fontSize: 12, color: colors.textLight, marginBottom: 2 },
    levelCardTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
    xpBig: { fontSize: 42, fontWeight: '800', color: COLORS.action, letterSpacing: -1, marginBottom: 4 },
    xpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    xpCurrent: { fontSize: 12, color: colors.textLight },
    xpNext: { fontSize: 12, color: colors.textLight },
    progressBarBg: { height: 3, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden' },
    progressBarFill: { height: '100%', backgroundColor: COLORS.action, borderRadius: 2 },
    xpHint: { fontSize: 12, color: colors.textLight, marginTop: 6 },
    maxLevelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },

    statsBlock: { marginHorizontal: 16, marginBottom: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, overflow: 'hidden' },
    statsRow: { flexDirection: 'row', alignItems: 'center' },
    statInlineItem: { flex: 1, alignItems: 'center', paddingVertical: 16 },
    statInlineValue: { fontSize: 22, fontWeight: '800', color: colors.text },
    statInlineLabel: { fontSize: 10, color: colors.textLight, textTransform: 'uppercase', marginTop: 2, letterSpacing: 0.5 },
    statInlineDivider: { width: 1, height: 40, backgroundColor: colors.border },
    statRowDivider: { height: 1, backgroundColor: colors.border },

    card: {
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
      borderRadius: 12, padding: 20, marginHorizontal: 16, marginBottom: 12,
    },
    cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
    cardTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.text, textTransform: 'uppercase', letterSpacing: 0.5 },

    tierRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
    tierDot: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    tierDotText: { fontSize: 11, fontWeight: '800', color: colors.textLight },
    tierInfo: { flex: 1 },
    tierName: { fontSize: 14, fontWeight: '700' },
    tierCurrentLabel: { fontSize: 11, marginTop: 1 },
    tierSubDots: { flexDirection: 'row', gap: 5 },
    subDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.border },
    subDotCurrent: { transform: [{ scale: 1.3 }], borderWidth: 1.5, borderColor: '#fff' },

    achievementCount: { fontSize: 13, fontWeight: '700', color: colors.textLight },
    achievementsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    achievementBadge: { width: '30%', alignItems: 'center', gap: 6, padding: 8 },
    achievementBadgeLocked: { opacity: 0.45 },
    achievementIconWrap: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    achievementLabel: { fontSize: 11, fontWeight: '600', color: colors.text, textAlign: 'center', lineHeight: 14 },
    achievementLabelLocked: { color: colors.textLight },
  });
}
