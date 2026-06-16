import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Image, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getUserLibrary } from '../../services/bookService';
import { COLORS } from '../../constants/colors';
import { LEVELS } from '../../utils/levelSystem';

export default function HomeScreen({ navigation }) {
  const { user, profile } = useAuth();
  const { colors } = useTheme();
  const [readingBooks, setReadingBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => { if (user) loadData(); }, [user]);

  async function loadData(silent = false) {
    if (!silent) setLoading(true);
    try {
      const res = await getUserLibrary(user.uid);
      if (res.success) setReadingBooks(res.books.filter(b => b.status === 'reading').slice(0, 3));
    } catch (e) { console.error(e); }
    if (!silent) setLoading(false);
  }

  async function onRefresh() {
    setIsRefreshing(true);
    await loadData(true);
    setIsRefreshing(false);
  }

  const styles = makeStyles(colors);

  if (!profile || loading) return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={COLORS.action} />
    </View>
  );

  const currentLevel = LEVELS.find(l => l.level === profile.level) ?? LEVELS[0];
  const nextLevel = LEVELS.find(l => l.level === profile.level + 1);
  const xpProgress = nextLevel
    ? (profile.xp - currentLevel.minXP) / (nextLevel.minXP - currentLevel.minXP)
    : 1;
  const firstName = profile.name?.split(' ')[0] ?? '';
  const hour = new Date().getHours();
  const greetingText = hour < 12 ? `Bom dia, ${firstName}!` : hour < 18 ? `Boa tarde, ${firstName}!` : `Boa noite, ${firstName}!`;
  const greetingIcon = hour < 12 ? 'sunny-outline' : hour < 18 ? 'partly-sunny-outline' : 'moon-outline';

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={COLORS.action} colors={[COLORS.action]} />}
    >

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.greetingRow}>
            <Ionicons name={greetingIcon} size={18} color={COLORS.action} />
            <Text style={styles.greeting}>{greetingText}</Text>
          </View>
          <Text style={styles.subtitle}>Pronto para mais uma sessão?</Text>
        </View>
        <View style={styles.streakBadge}>
          <Ionicons name="flame" size={18} color={COLORS.error} />
          <Text style={styles.streakNumber}>{profile.streak}</Text>
        </View>
      </View>

      {/* XP Display */}
      <View style={styles.xpSection}>
        <Text style={styles.levelLabel}>{currentLevel?.title} · Nível {profile.level}</Text>
        <Text style={styles.xpValue}>{profile.xp} XP</Text>
        {nextLevel ? (
          <Text style={styles.xpNextLabel}>
            Faltam {nextLevel.minXP - profile.xp} XP para {nextLevel.title}
          </Text>
        ) : (
          <View style={styles.maxLevelRow}>
            <Ionicons name="trophy" size={13} color={COLORS.action} />
            <Text style={styles.xpNextLabel}>Nível máximo atingido</Text>
          </View>
        )}
        <View style={styles.xpBarBg}>
          <View style={[styles.xpBarFill, { width: `${Math.min(xpProgress * 100, 100)}%` }]} />
        </View>
      </View>

      {/* Mini stats */}
      <View style={styles.miniStats}>
        <View style={styles.miniStat}>
          <Text style={styles.miniStatValue}>{profile.totalBooksFinished}</Text>
          <Text style={styles.miniStatLabel}>livros</Text>
        </View>
        <View style={styles.miniStatDivider} />
        <View style={styles.miniStat}>
          <Text style={styles.miniStatValue}>{profile.totalPagesRead}</Text>
          <Text style={styles.miniStatLabel}>páginas</Text>
        </View>
        <View style={styles.miniStatDivider} />
        <View style={styles.miniStat}>
          <Text style={styles.miniStatValue}>{profile.bestStreak}</Text>
          <Text style={styles.miniStatLabel}>🔥 streak máx.</Text>
        </View>
      </View>

      <View style={styles.sectionDivider} />

      {/* Botão registrar leitura */}
      <TouchableOpacity
        style={styles.registerButton}
        onPress={() => navigation.navigate('Books', { screen: 'AddReading' })}
        activeOpacity={0.85}
      >
        <View style={styles.actionButtonLeft}>
          <View style={styles.actionIconWrap}>
            <Ionicons name="add-circle" size={24} color={COLORS.action} />
          </View>
          <View>
            <Text style={styles.registerButtonTitle}>Registrar leitura</Text>
            <Text style={styles.registerButtonSub}>Ganhe XP e mantenha seu streak!</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.action} />
      </TouchableOpacity>

      {/* Botão grupos */}
      <TouchableOpacity
        style={styles.groupsButton}
        onPress={() => navigation.navigate('Groups')}
        activeOpacity={0.85}
      >
        <View style={styles.actionButtonLeft}>
          <View style={styles.actionIconWrap}>
            <Ionicons name="people" size={24} color={colors.textLight} />
          </View>
          <View>
            <Text style={styles.groupsButtonTitle}>Grupos de leitura</Text>
            <Text style={styles.registerButtonSub}>Compita com seus amigos!</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
      </TouchableOpacity>

      {/* Livros em andamento */}
      {readingBooks.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Ionicons name="book-outline" size={15} color={COLORS.action} />
            <Text style={styles.sectionTitle}>Continue lendo</Text>
          </View>
          {readingBooks.map(book => (
            <TouchableOpacity
              key={book.id}
              style={styles.bookCard}
              onPress={() => navigation.navigate('Books')}
              activeOpacity={0.85}
            >
              {book.coverURL ? (
                <Image source={{ uri: book.coverURL }} style={styles.bookCover} />
              ) : (
                <View style={styles.bookCoverPlaceholder}>
                  <Ionicons name="book" size={26} color={colors.textLight} />
                </View>
              )}
              <View style={styles.bookInfo}>
                <Text style={styles.bookTitle} numberOfLines={2}>{book.title}</Text>
                <Text style={styles.bookAuthor} numberOfLines={1}>{book.author}</Text>
                <View style={styles.bookProgressRow}>
                  <View style={styles.bookProgressBg}>
                    <View style={[styles.bookProgressFill, { width: `${Math.min(((book.currentPage || 0) / book.totalPages) * 100, 100)}%` }]} />
                  </View>
                  <Text style={styles.bookProgressPercent}>
                    {Math.round(((book.currentPage || 0) / book.totalPages) * 100)}%
                  </Text>
                </View>
                <Text style={styles.bookPages}>Página {book.currentPage ?? 0} de {book.totalPages}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </>
      )}

      {readingBooks.length === 0 && (
        <TouchableOpacity
          style={styles.emptyBookCard}
          onPress={() => navigation.navigate('Books')}
          activeOpacity={0.85}
        >
          <Ionicons name="book-outline" size={30} color={colors.textLight} />
          <Text style={styles.emptyBookText}>Nenhum livro em andamento</Text>
          <Text style={styles.emptyBookSub}>Toque para adicionar um livro</Text>
        </TouchableOpacity>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },

    header: {
      paddingTop: 56, paddingBottom: 20, paddingHorizontal: 24,
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    },
    headerLeft: { flex: 1 },
    greetingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    greeting: { fontSize: 18, fontWeight: '700', color: colors.text },
    subtitle: { fontSize: 13, color: colors.textLight },
    streakBadge: {
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
      borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8,
      flexDirection: 'row', alignItems: 'center', gap: 6,
    },
    streakNumber: { fontSize: 15, fontWeight: '800', color: colors.text },

    xpSection: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 20 },
    levelLabel: { fontSize: 13, color: colors.textLight, marginBottom: 4 },
    xpValue: { fontSize: 58, fontWeight: '800', color: COLORS.action, letterSpacing: -1, lineHeight: 66 },
    xpNextLabel: { fontSize: 12, color: colors.textLight, marginTop: 4, marginBottom: 12 },
    maxLevelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, marginBottom: 12 },
    xpBarBg: { height: 3, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden' },
    xpBarFill: { height: '100%', backgroundColor: COLORS.action, borderRadius: 2 },

    miniStats: {
      flexDirection: 'row', justifyContent: 'space-around',
      paddingHorizontal: 24, paddingBottom: 20,
    },
    miniStat: { alignItems: 'center', gap: 2 },
    miniStatValue: { fontSize: 20, fontWeight: '800', color: colors.text },
    miniStatLabel: { fontSize: 11, color: colors.textLight, textTransform: 'uppercase', letterSpacing: 0.5 },
    miniStatDivider: { width: 1, height: 36, backgroundColor: colors.border },

    sectionDivider: { height: 1, backgroundColor: colors.border, marginHorizontal: 24, marginBottom: 16 },

    registerButton: {
      backgroundColor: colors.surface, borderWidth: 1.5, borderColor: COLORS.action,
      borderRadius: 12, marginHorizontal: 16, marginBottom: 10,
      paddingVertical: 16, paddingHorizontal: 18,
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    },
    groupsButton: {
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
      borderRadius: 12, marginHorizontal: 16, marginBottom: 20,
      paddingVertical: 16, paddingHorizontal: 18,
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    },
    actionButtonLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    actionIconWrap: {
      width: 42, height: 42, borderRadius: 10,
      backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center',
    },
    registerButtonTitle: { fontSize: 15, fontWeight: '700', color: COLORS.action },
    groupsButtonTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
    registerButtonSub: { fontSize: 12, color: colors.textLight, marginTop: 2 },

    sectionHeader: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      marginHorizontal: 16, marginBottom: 12,
    },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.text, textTransform: 'uppercase', letterSpacing: 0.5 },

    bookCard: {
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
      borderRadius: 12, marginHorizontal: 16, marginBottom: 8,
      padding: 14, flexDirection: 'row', gap: 14,
    },
    bookCover: { width: 56, height: 78, borderRadius: 8 },
    bookCoverPlaceholder: {
      width: 56, height: 78, borderRadius: 8,
      backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center',
    },
    bookInfo: { flex: 1, justifyContent: 'center' },
    bookTitle: { fontSize: 14, fontWeight: '700', color: colors.text, lineHeight: 20 },
    bookAuthor: { fontSize: 12, color: colors.textLight, marginTop: 2, marginBottom: 10 },
    bookProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    bookProgressBg: { flex: 1, height: 3, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden' },
    bookProgressFill: { height: '100%', backgroundColor: COLORS.action, borderRadius: 2 },
    bookProgressPercent: { fontSize: 12, fontWeight: '700', color: COLORS.action, width: 34, textAlign: 'right' },
    bookPages: { fontSize: 11, color: colors.textLight, marginTop: 5 },

    emptyBookCard: {
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
      borderStyle: 'dashed', borderRadius: 12, marginHorizontal: 16, marginTop: 4,
      padding: 28, alignItems: 'center', gap: 8,
    },
    emptyBookText: { fontSize: 14, fontWeight: '600', color: colors.text },
    emptyBookSub: { fontSize: 12, color: colors.textLight },
  });
}
