import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { COLORS } from '../../constants/colors';
import { LEVELS } from '../../utils/levelSystem';
import { ACHIEVEMENTS } from '../../services/achievementService';
import {
  getFriendshipStatus, sendFriendRequest,
  acceptFriendRequest, rejectFriendRequest, removeFriend,
} from '../../services/friendshipService';

export default function UserProfileScreen({ route, navigation }) {
  const { userId } = route.params;
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [profile, setProfile] = useState(null);
  const [books, setBooks] = useState([]);
  const [friendStatus, setFriendStatus] = useState('none');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const isSelf = userId === user?.uid;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, 'users', userId));
      if (!snap.exists()) { setLoading(false); return; }
      setProfile(snap.data());

      const [status, booksSnap] = await Promise.all([
        isSelf ? Promise.resolve('self') : getFriendshipStatus(user.uid, userId),
        getDocs(collection(db, 'userBooks', userId, 'books')),
      ]);
      setFriendStatus(status);
      setBooks(booksSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  async function handleFriendAction() {
    setActionLoading(true);
    try {
      if (friendStatus === 'none') {
        await sendFriendRequest(user.uid, userId);
        setFriendStatus('pending_sent');
      } else if (friendStatus === 'pending_received') {
        await acceptFriendRequest(user.uid, profile?.initiatedBy ?? userId);
        setFriendStatus('friends');
      } else if (friendStatus === 'friends') {
        Alert.alert('Remover amigo', `Remover ${profile?.name} dos seus amigos?`, [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Remover', style: 'destructive', onPress: async () => {
              await removeFriend(user.uid, userId);
              setFriendStatus('none');
            },
          },
        ]);
      } else if (friendStatus === 'pending_sent') {
        Alert.alert('Pedido enviado', 'Seu pedido já foi enviado. Aguardando resposta.');
      }
    } catch (e) { Alert.alert('Erro', 'Tente novamente.'); }
    setActionLoading(false);
  }

  async function handleReject() {
    setActionLoading(true);
    await rejectFriendRequest(user.uid, userId);
    setFriendStatus('none');
    setActionLoading(false);
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={COLORS.action} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textLight }}>Usuário não encontrado.</Text>
      </View>
    );
  }

  const isPrivate = profile.isPrivate === true;
  const canSeeDetails = !isPrivate || friendStatus === 'friends' || isSelf;

  const currentLevel = LEVELS.find(l => l.level === (profile.level ?? 1)) ?? LEVELS[0];
  const nextLevel = LEVELS.find(l => l.level === (profile.level ?? 1) + 1);
  const xpForNext = nextLevel ? nextLevel.minXP : currentLevel.minXP;
  const xpProgress = nextLevel
    ? (profile.xp - currentLevel.minXP) / (xpForNext - currentLevel.minXP)
    : 1;

  const unlockedAchievements = ACHIEVEMENTS.filter(a =>
    (profile.achievements ?? []).includes(a.id)
  );

  const finishedBooks = books.filter(b => b.status === 'finished');
  const readingBooks = books.filter(b => b.status === 'reading');

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {profile.name}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Avatar + name */}
        <View style={styles.heroSection}>
          {profile.photoURL ? (
            <Image source={{ uri: profile.photoURL }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: COLORS.primary }]}>
              <Text style={styles.avatarText}>{profile.name?.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <Text style={[styles.name, { color: colors.text }]}>{profile.name}</Text>
          <View style={[styles.levelBadge, { backgroundColor: `${COLORS.action}20` }]}>
            <Text style={[styles.levelText, { color: COLORS.action }]}>
              Nível {profile.level ?? 1} · {currentLevel.title}
            </Text>
          </View>
          {profile.bio ? (
            <Text style={[styles.bio, { color: colors.textLight }]}>{profile.bio}</Text>
          ) : null}
        </View>

        {/* Friend action buttons */}
        {!isSelf && (
          <View style={styles.friendRow}>
            {friendStatus === 'pending_received' ? (
              <>
                <TouchableOpacity
                  style={[styles.friendBtn, { backgroundColor: COLORS.action }]}
                  onPress={handleFriendAction}
                  disabled={actionLoading}
                >
                  <Ionicons name="checkmark" size={18} color="#fff" />
                  <Text style={styles.friendBtnText}>Aceitar pedido</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.friendBtn, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}
                  onPress={handleReject}
                  disabled={actionLoading}
                >
                  <Ionicons name="close" size={18} color={colors.text} />
                  <Text style={[styles.friendBtnText, { color: colors.text }]}>Recusar</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[
                  styles.friendBtn,
                  friendStatus === 'friends'
                    ? { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }
                    : friendStatus === 'pending_sent'
                    ? { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }
                    : { backgroundColor: COLORS.action },
                ]}
                onPress={handleFriendAction}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color={friendStatus === 'none' ? '#fff' : colors.text} />
                ) : (
                  <>
                    <Ionicons
                      name={
                        friendStatus === 'friends' ? 'people' :
                        friendStatus === 'pending_sent' ? 'hourglass-outline' : 'person-add'
                      }
                      size={18}
                      color={friendStatus === 'none' ? '#fff' : colors.text}
                    />
                    <Text style={[
                      styles.friendBtnText,
                      { color: friendStatus === 'none' ? '#fff' : colors.text },
                    ]}>
                      {friendStatus === 'friends' ? 'Amigos'
                       : friendStatus === 'pending_sent' ? 'Pedido enviado'
                       : 'Adicionar amigo'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Private profile lock */}
        {isPrivate && !canSeeDetails && (
          <View style={[styles.privateCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="lock-closed" size={28} color={colors.textLight} />
            <Text style={[styles.privateTitle, { color: colors.text }]}>Perfil privado</Text>
            <Text style={[styles.privateText, { color: colors.textLight }]}>
              Adicione {profile.name} como amigo para ver o perfil completo.
            </Text>
          </View>
        )}

        {canSeeDetails && (
          <>
            {/* Stats */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textLight }]}>ESTATÍSTICAS</Text>
              <View style={[styles.statsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <StatItem icon="flash" color={COLORS.action} label="XP Total" value={`${profile.xp ?? 0}`} />
                <StatItem icon="flame" color="#E53E3E" label="Streak" value={`${profile.streak ?? 0} dias`} />
                <StatItem icon="book" color={COLORS.primary} label="Livros lidos" value={`${profile.totalBooksFinished ?? 0}`} />
                <StatItem icon="document-text" color="#38A169" label="Páginas" value={`${profile.totalPagesRead ?? 0}`} />
              </View>

              {/* XP bar */}
              {nextLevel && (
                <View style={[styles.xpBarCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.xpBarHeader}>
                    <Text style={[styles.xpBarLabel, { color: colors.textLight }]}>Progresso para nível {nextLevel.level}</Text>
                    <Text style={[styles.xpBarValue, { color: COLORS.action }]}>{profile.xp ?? 0} / {xpForNext} XP</Text>
                  </View>
                  <View style={[styles.xpBarTrack, { backgroundColor: colors.border }]}>
                    <View style={[styles.xpBarFill, { width: `${Math.max(xpProgress * 100, 2)}%` }]} />
                  </View>
                </View>
              )}
            </View>

            {/* Favorite book */}
            {profile.favoriteBook ? (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textLight }]}>LIVRO FAVORITO</Text>
                <View style={[styles.favBookCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {profile.favoriteBookCover ? (
                    <Image source={{ uri: profile.favoriteBookCover }} style={styles.favBookCover} />
                  ) : (
                    <View style={[styles.favBookCoverPlaceholder, { backgroundColor: COLORS.primary }]}>
                      <Ionicons name="book" size={20} color="#fff" />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.favBookTitle, { color: colors.text }]} numberOfLines={2}>
                      {profile.favoriteBook}
                    </Text>
                    {profile.favoriteGenre ? (
                      <Text style={[styles.favBookGenre, { color: colors.textLight }]}>{profile.favoriteGenre}</Text>
                    ) : null}
                  </View>
                </View>
              </View>
            ) : null}

            {/* Achievements */}
            {unlockedAchievements.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textLight }]}>
                  CONQUISTAS ({unlockedAchievements.length})
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.achievRow}>
                  {unlockedAchievements.map(a => (
                    <View key={a.id} style={[styles.achievChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <View style={[styles.achievIcon, { backgroundColor: `${a.color}20` }]}>
                        <Ionicons name={a.icon} size={20} color={a.color} />
                      </View>
                      <Text style={[styles.achievTitle, { color: colors.text }]}>{a.title}</Text>
                      <Text style={[styles.achievDesc, { color: colors.textLight }]}>{a.desc}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Books */}
            {(readingBooks.length > 0 || finishedBooks.length > 0) && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textLight }]}>LIVROS</Text>
                {readingBooks.length > 0 && (
                  <>
                    <Text style={[styles.bookGroupLabel, { color: colors.textLight }]}>Lendo agora</Text>
                    {readingBooks.map(b => <BookRow key={b.id} book={b} colors={colors} styles={styles} />)}
                  </>
                )}
                {finishedBooks.length > 0 && (
                  <>
                    <Text style={[styles.bookGroupLabel, { color: colors.textLight }]}>Concluídos</Text>
                    {finishedBooks.slice(0, 5).map(b => <BookRow key={b.id} book={b} colors={colors} styles={styles} />)}
                    {finishedBooks.length > 5 && (
                      <Text style={[styles.moreBooks, { color: colors.textLight }]}>
                        +{finishedBooks.length - 5} livros concluídos
                      </Text>
                    )}
                  </>
                )}
              </View>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function StatItem({ icon, color, label, value }) {
  return (
    <View style={statStyles.item}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}
const statStyles = StyleSheet.create({
  item: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  value: { fontSize: 16, fontWeight: '700', color: '#2D3748', marginTop: 4 },
  label: { fontSize: 11, color: '#718096', marginTop: 2 },
});

function BookRow({ book, colors, styles }) {
  return (
    <View style={[styles.bookRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {book.coverURL ? (
        <Image source={{ uri: book.coverURL }} style={styles.bookCover} />
      ) : (
        <View style={[styles.bookCoverPlaceholder, { backgroundColor: COLORS.primary }]}>
          <Ionicons name="book" size={14} color="#fff" />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={[styles.bookTitle, { color: colors.text }]} numberOfLines={1}>{book.title}</Text>
        {book.author ? <Text style={[styles.bookAuthor, { color: colors.textLight }]} numberOfLines={1}>{book.author}</Text> : null}
      </View>
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1,
    },
    backBtn: { width: 40, alignItems: 'flex-start' },
    headerTitle: { fontSize: 17, fontWeight: '700', flex: 1, textAlign: 'center' },
    heroSection: { alignItems: 'center', paddingTop: 28, paddingBottom: 16, paddingHorizontal: 20 },
    avatar: { width: 88, height: 88, borderRadius: 44, marginBottom: 12 },
    avatarPlaceholder: { width: 88, height: 88, borderRadius: 44, marginBottom: 12, justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontSize: 34, fontWeight: '700', color: '#fff' },
    name: { fontSize: 22, fontWeight: '800', marginBottom: 6 },
    levelBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginBottom: 8 },
    levelText: { fontSize: 13, fontWeight: '600' },
    bio: { fontSize: 14, textAlign: 'center', marginTop: 6, lineHeight: 20 },
    friendRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 8 },
    friendBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 8, paddingVertical: 12, borderRadius: 12,
    },
    friendBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
    privateCard: {
      margin: 20, padding: 28, borderRadius: 16, borderWidth: 1,
      alignItems: 'center', gap: 8,
    },
    privateTitle: { fontSize: 16, fontWeight: '700', marginTop: 4 },
    privateText: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
    section: { paddingHorizontal: 20, marginTop: 20 },
    sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 10 },
    statsCard: {
      flexDirection: 'row', borderRadius: 16, borderWidth: 1,
      overflow: 'hidden', marginBottom: 10,
    },
    xpBarCard: { borderRadius: 16, borderWidth: 1, padding: 14 },
    xpBarHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    xpBarLabel: { fontSize: 12 },
    xpBarValue: { fontSize: 12, fontWeight: '700' },
    xpBarTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
    xpBarFill: { height: 6, borderRadius: 3, backgroundColor: COLORS.action },
    favBookCard: {
      flexDirection: 'row', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1, alignItems: 'center',
    },
    favBookCover: { width: 48, height: 68, borderRadius: 6 },
    favBookCoverPlaceholder: { width: 48, height: 68, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
    favBookTitle: { fontSize: 14, fontWeight: '700', lineHeight: 20 },
    favBookGenre: { fontSize: 12, marginTop: 4 },
    achievRow: { gap: 10, paddingRight: 4 },
    achievChip: { width: 110, padding: 12, borderRadius: 14, borderWidth: 1, alignItems: 'center', gap: 6 },
    achievIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    achievTitle: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
    achievDesc: { fontSize: 10, textAlign: 'center', lineHeight: 14 },
    bookGroupLabel: { fontSize: 12, fontWeight: '600', marginBottom: 8, marginTop: 4 },
    bookRow: {
      flexDirection: 'row', gap: 12, padding: 10, borderRadius: 12, borderWidth: 1,
      marginBottom: 8, alignItems: 'center',
    },
    bookCover: { width: 36, height: 50, borderRadius: 4 },
    bookCoverPlaceholder: { width: 36, height: 50, borderRadius: 4, justifyContent: 'center', alignItems: 'center' },
    bookTitle: { fontSize: 13, fontWeight: '600' },
    bookAuthor: { fontSize: 12, marginTop: 2 },
    moreBooks: { fontSize: 12, textAlign: 'center', marginTop: 4 },
  });
}
