import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, Image, RefreshControl, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, query, where, documentId } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { COLORS } from '../../constants/colors';
import { LEVELS } from '../../utils/levelSystem';
import { getFriendIds } from '../../services/friendshipService';

export default function RankingScreen({ navigation }) {
  const { profile, user } = useAuth();
  const { colors } = useTheme();
  const [tab, setTab] = useState('xp');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimeout = useRef(null);
  const styles = makeStyles(colors);

  useEffect(() => { loadRanking(); }, [tab]);

  async function loadRanking(silent = false) {
    if (!silent) setLoading(true);
    try {
      const friendIds = await getFriendIds(user.uid);
      const ids = [...new Set([...friendIds, user.uid])];

      if (ids.length === 0) { setUsers([]); setLoading(false); return; }

      const allUsers = [];
      for (let i = 0; i < ids.length; i += 30) {
        const chunk = ids.slice(i, i + 30);
        const q = query(collection(db, 'users'), where(documentId(), 'in', chunk));
        const snap = await getDocs(q);
        snap.docs.forEach(d => allUsers.push({ id: d.id, ...d.data() }));
      }

      const field = tab === 'xp' ? 'xp' : tab === 'pages' ? 'totalPagesRead' : 'streak';
      allUsers.sort((a, b) => (b[field] ?? 0) - (a[field] ?? 0));
      setUsers(allUsers);
    } catch (e) { console.error(e); }
    if (!silent) setLoading(false);
  }

  async function onRefresh() {
    setIsRefreshing(true);
    await loadRanking(true);
    setIsRefreshing(false);
  }

  function onSearchChange(text) {
    setSearchQuery(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (text.trim().length < 2) { setSearchResults([]); return; }
    searchTimeout.current = setTimeout(() => doSearch(text.trim()), 400);
  }

  async function doSearch(q) {
    setSearchLoading(true);
    try {
      const lower = q.toLowerCase();
      const snap = await getDocs(
        query(collection(db, 'users'),
          where('nameLower', '>=', lower),
          where('nameLower', '<=', lower + ''),
        )
      );
      setSearchResults(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { setSearchResults([]); }
    setSearchLoading(false);
  }

  function openSearch() { setSearching(true); setSearchQuery(''); setSearchResults([]); }
  function closeSearch() { setSearching(false); setSearchQuery(''); setSearchResults([]); }

  const myPosition = users.findIndex(u => u.id === user?.uid) + 1;
  const myData = users.find(u => u.id === user?.uid);
  const getValue = (u) => tab === 'xp' ? `${u.xp ?? 0} XP` : tab === 'pages' ? `${u.totalPagesRead ?? 0} pág.` : `${u.streak ?? 0} dias`;
  const getIcon = () => tab === 'xp' ? 'flash' : tab === 'pages' ? 'document-text' : 'flame';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {searching ? (
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color="rgba(255,255,255,0.7)" />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar usuário..."
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={searchQuery}
              onChangeText={onSearchChange}
              autoFocus
            />
            <TouchableOpacity onPress={closeSearch}>
              <Ionicons name="close" size={20} color="rgba(255,255,255,0.9)" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>🏆 Ranking</Text>
              <Text style={styles.headerSub}>Seus amigos</Text>
            </View>
            <TouchableOpacity onPress={openSearch} style={styles.searchIcon}>
              <Ionicons name="search" size={22} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Search results */}
      {searching ? (
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {searchLoading && <View style={styles.loadingBox}><ActivityIndicator size="small" color={COLORS.action} /></View>}
          {!searchLoading && searchQuery.length >= 2 && searchResults.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="person-outline" size={36} color={colors.textLight} />
              <Text style={styles.emptyText}>Nenhum usuário encontrado.</Text>
            </View>
          )}
          {!searchLoading && searchQuery.length < 2 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Digite pelo menos 2 letras para buscar.</Text>
            </View>
          )}
          {searchResults.map(u => (
            <RankItem
              key={u.id}
              user={u}
              position={null}
              isMe={u.id === user?.uid}
              value={getValue(u)}
              icon={getIcon()}
              styles={styles}
              colors={colors}
              onPress={() => navigation.navigate('UserProfile', { userId: u.id })}
            />
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      ) : (
        <>
          {/* Podium */}
          {!loading && users.length >= 3 && (
            <View style={styles.podiumArea}>
              <PodiumItem user={users[1]} position={2} tab={tab} styles={styles} onPress={() => navigation.navigate('UserProfile', { userId: users[1].id })} />
              <PodiumItem user={users[0]} position={1} tab={tab} styles={styles} onPress={() => navigation.navigate('UserProfile', { userId: users[0].id })} />
              <PodiumItem user={users[2]} position={3} tab={tab} styles={styles} onPress={() => navigation.navigate('UserProfile', { userId: users[2].id })} />
            </View>
          )}

          {/* Tabs */}
          <View style={styles.tabRow}>
            {[{ key: 'xp', label: '⚡ XP' }, { key: 'pages', label: '📄 Páginas' }, { key: 'streak', label: '🔥 Streak' }].map(t => (
              <TouchableOpacity key={t.key} style={[styles.tabChip, tab === t.key && styles.tabChipActive]} onPress={() => setTab(t.key)}>
                <Text style={[styles.tabChipText, tab === t.key && styles.tabChipTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* My position banner */}
          {myPosition > 0 && myData && (
            <View style={styles.myPosition}>
              <View style={styles.myPositionLeft}>
                <Text style={styles.myPositionRank}>#{myPosition}</Text>
                <View style={styles.myAvatar}><Text style={styles.myAvatarText}>{profile?.name?.charAt(0).toUpperCase()}</Text></View>
                <View>
                  <Text style={styles.myPositionName}>Você</Text>
                  <Text style={styles.myPositionLevel}>{LEVELS.find(l => l.level === profile?.level)?.title}</Text>
                </View>
              </View>
              <View style={styles.myPositionRight}>
                <Ionicons name={getIcon()} size={14} color={COLORS.action} />
                <Text style={styles.myPositionValue}>{getValue(myData)}</Text>
              </View>
            </View>
          )}

          <ScrollView
            style={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={COLORS.action} colors={[COLORS.action]} />}
          >
            {loading ? (
              <View style={styles.loadingBox}><ActivityIndicator size="large" color={COLORS.primary} /></View>
            ) : users.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={40} color={colors.textLight} />
                <Text style={styles.emptyText}>Adicione amigos para ver o ranking!</Text>
                <Text style={[styles.emptyText, { fontSize: 12, marginTop: 4 }]}>Use a busca 🔍 para encontrar pessoas.</Text>
              </View>
            ) : (
              users.map((u, i) => (
                <RankItem
                  key={u.id}
                  user={u}
                  position={i + 1}
                  isMe={u.id === user?.uid}
                  value={getValue(u)}
                  icon={getIcon()}
                  styles={styles}
                  colors={colors}
                  onPress={u.id !== user?.uid ? () => navigation.navigate('UserProfile', { userId: u.id }) : undefined}
                />
              ))
            )}
            <View style={{ height: 32 }} />
          </ScrollView>
        </>
      )}
    </View>
  );
}

function PodiumItem({ user, position, tab, styles, onPress }) {
  const medalColors = { 1: '#F59E0B', 2: '#94A3B8', 3: '#CD7F32' };
  const emojis = { 1: '🥇', 2: '🥈', 3: '🥉' };
  const heights = { 1: 90, 2: 70, 3: 56 };
  const value = tab === 'xp' ? `${user?.xp ?? 0} XP` : tab === 'pages' ? `${user?.totalPagesRead ?? 0}p` : `${user?.streak ?? 0}d`;
  return (
    <TouchableOpacity style={styles.podiumItem} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.podiumEmoji}>{emojis[position]}</Text>
      <View style={[styles.podiumAvatar, { borderColor: medalColors[position] }]}>
        {user?.photoURL ? <Image source={{ uri: user.photoURL }} style={styles.podiumAvatarImg} /> : <Text style={styles.podiumAvatarText}>{user?.name?.charAt(0).toUpperCase() ?? '?'}</Text>}
      </View>
      <Text style={styles.podiumName} numberOfLines={1}>{user?.name?.split(' ')[0] ?? '—'}</Text>
      <Text style={[styles.podiumValue, { color: medalColors[position] }]}>{value}</Text>
      <View style={[styles.podiumBlock, { height: heights[position], backgroundColor: medalColors[position] }]}><Text style={styles.podiumPosition}>{position}</Text></View>
    </TouchableOpacity>
  );
}

function RankItem({ user, position, isMe, value, icon, styles, colors, onPress }) {
  const levelTitle = LEVELS.find(l => l.level === user.level)?.title ?? '';
  const positionColor = position === 1 ? '#F59E0B' : position === 2 ? '#94A3B8' : position === 3 ? '#CD7F32' : colors.textLight;
  return (
    <TouchableOpacity
      style={[styles.rankItem, isMe && styles.rankItemMe]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <Text style={[styles.rankPosition, { color: positionColor }]}>
        {position === null ? '' : position <= 3 ? ['🥇', '🥈', '🥉'][position - 1] : `#${position}`}
      </Text>
      <View style={[styles.rankAvatar, isMe && styles.rankAvatarMe]}>
        {user.photoURL
          ? <Image source={{ uri: user.photoURL }} style={styles.rankAvatarImg} />
          : <Text style={[styles.rankAvatarText, isMe && { color: COLORS.white }]}>{user.name?.charAt(0).toUpperCase() ?? '?'}</Text>
        }
      </View>
      <View style={styles.rankInfo}>
        <Text style={[styles.rankName, isMe && { color: COLORS.primary }]} numberOfLines={1}>
          {user.name ?? 'Usuário'}{isMe ? ' (você)' : ''}
        </Text>
        <Text style={styles.rankLevel}>{levelTitle}</Text>
      </View>
      <View style={styles.rankValueBox}>
        <Ionicons name={icon} size={13} color={COLORS.action} />
        <Text style={styles.rankValue}>{value}</Text>
      </View>
      {onPress && <Ionicons name="chevron-forward" size={16} color={colors.border} />}
    </TouchableOpacity>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { backgroundColor: COLORS.primary, paddingTop: 56, paddingBottom: 20, paddingHorizontal: 24 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.white },
    headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
    searchIcon: { padding: 4, marginTop: 4 },
    searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
    searchInput: { flex: 1, fontSize: 15, color: COLORS.white },
    podiumArea: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', backgroundColor: COLORS.primary, paddingBottom: 24, paddingHorizontal: 16, gap: 8 },
    podiumItem: { flex: 1, alignItems: 'center', gap: 4 },
    podiumEmoji: { fontSize: 20 },
    podiumAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.support, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
    podiumAvatarImg: { width: 48, height: 48, borderRadius: 24 },
    podiumAvatarText: { fontSize: 18, fontWeight: 'bold', color: COLORS.white },
    podiumName: { fontSize: 12, fontWeight: '600', color: COLORS.white, maxWidth: 80, textAlign: 'center' },
    podiumValue: { fontSize: 11, fontWeight: 'bold' },
    podiumBlock: { width: '100%', borderTopLeftRadius: 8, borderTopRightRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
    podiumPosition: { fontSize: 20, fontWeight: 'bold', color: COLORS.white },
    tabRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
    tabChip: { flex: 1, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.background, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    tabChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    tabChipText: { fontSize: 13, fontWeight: '600', color: colors.textLight },
    tabChipTextActive: { color: COLORS.white },
    myPosition: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#EFF6FF', borderLeftWidth: 4, borderLeftColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 12 },
    myPositionLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    myPositionRank: { fontSize: 15, fontWeight: 'bold', color: COLORS.primary, width: 32 },
    myAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
    myAvatarText: { fontSize: 14, fontWeight: 'bold', color: COLORS.white },
    myPositionName: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
    myPositionLevel: { fontSize: 11, color: colors.textLight, marginTop: 1 },
    myPositionRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    myPositionValue: { fontSize: 14, fontWeight: 'bold', color: colors.text },
    list: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
    loadingBox: { paddingVertical: 40, alignItems: 'center' },
    emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
    emptyText: { fontSize: 14, color: colors.textLight, textAlign: 'center' },
    rankItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginTop: 8, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    rankItemMe: { borderWidth: 2, borderColor: COLORS.primary, backgroundColor: '#EFF6FF' },
    rankPosition: { fontSize: 15, fontWeight: 'bold', width: 36, textAlign: 'center' },
    rankAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center' },
    rankAvatarMe: { backgroundColor: COLORS.primary },
    rankAvatarImg: { width: 40, height: 40, borderRadius: 20 },
    rankAvatarText: { fontSize: 16, fontWeight: 'bold', color: colors.textLight },
    rankInfo: { flex: 1 },
    rankName: { fontSize: 14, fontWeight: '600', color: colors.text },
    rankLevel: { fontSize: 11, color: colors.textLight, marginTop: 2 },
    rankValueBox: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFFBEB', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
    rankValue: { fontSize: 13, fontWeight: 'bold', color: colors.text },
  });
}
