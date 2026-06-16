import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Alert, ActivityIndicator, Modal, TextInput,
  KeyboardAvoidingView, Platform, Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { logout } from '../../services/authService';
import { COLORS } from '../../constants/colors';
import { LEVELS, TIERS } from '../../utils/levelSystem';
import { doc, updateDoc, getDocs, getDoc, collection, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useFriendship } from '../../context/FriendshipContext';

async function searchGoogleBooks(q) {
  try {
    const encoded = encodeURIComponent(`intitle:${q}`);
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encoded}&maxResults=12&orderBy=relevance&key=AIzaSyC87M6WjTRe2aag9UddQWAfpcO-JuFdjkc`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.items) return [];
    const qLower = q.toLowerCase();
    const results = data.items.map(item => ({
      title: item.volumeInfo.title ?? 'Sem título',
      author: item.volumeInfo.authors?.join(', ') ?? '',
      coverURL: item.volumeInfo.imageLinks?.thumbnail ?? null,
    }));
    results.sort((a, b) => {
      const aMatch = a.title.toLowerCase().includes(qLower);
      const bMatch = b.title.toLowerCase().includes(qLower);
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
      return 0;
    });
    return results.slice(0, 6);
  } catch (e) { return []; }
}

export default function ProfileScreen({ navigation }) {
  const { user, profile, refreshProfile } = useAuth();
  const { colors, mode, toggleTheme } = useTheme();
  const { pendingRequests, friends, reloadFriendship } = useFriendship();
  const [loggingOut, setLoggingOut] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editName, setEditName] = useState('');
  const [editFavoriteBook, setEditFavoriteBook] = useState('');
  const [editFavoriteBookCover, setEditFavoriteBookCover] = useState(null);
  const [editFavoriteGenre, setEditFavoriteGenre] = useState('');
  const [editBio, setEditBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [bookQuery, setBookQuery] = useState('');
  const [bookSuggestions, setBookSuggestions] = useState([]);
  const [searchingBook, setSearchingBook] = useState(false);
  const styles = makeStyles(colors);

  if (!profile) return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={COLORS.action} />
    </View>
  );

  const currentLevel = LEVELS.find(l => l.level === profile.level) ?? LEVELS[0];
  const nextLevel = LEVELS.find(l => l.level === profile.level + 1);
  const xpForNext = nextLevel ? nextLevel.minXP : null;
  const xpProgress = nextLevel ? (profile.xp - currentLevel.minXP) / (xpForNext - currentLevel.minXP) : 1;

  function openEditModal() {
    setEditName(profile.name ?? '');
    setEditFavoriteBook(profile.favoriteBook ?? '');
    setEditFavoriteBookCover(profile.favoriteBookCover ?? null);
    setEditFavoriteGenre(profile.favoriteGenre ?? '');
    setEditBio(profile.bio ?? '');
    setBookQuery('');
    setBookSuggestions([]);
    setShowEditModal(true);
  }

  async function handleBookSearch() {
    if (bookQuery.trim().length < 3) { Alert.alert('Atenção', 'Digite pelo menos 3 caracteres.'); return; }
    setSearchingBook(true);
    setBookSuggestions([]);
    const results = await searchGoogleBooks(bookQuery.trim());
    setBookSuggestions(results);
    setSearchingBook(false);
  }

  function handleSelectBook(book) {
    setEditFavoriteBook(book.title);
    setEditFavoriteBookCover(book.coverURL);
    setBookQuery(book.title);
    setBookSuggestions([]);
  }

  async function handleSaveProfile() {
    if (!editName.trim()) { Alert.alert('Atenção', 'O nome não pode ser vazio.'); return; }
    if (editName.trim().length < 3) { Alert.alert('Atenção', 'O nome deve ter pelo menos 3 caracteres.'); return; }
    setSaving(true);
    if (editName.trim().toLowerCase() !== profile.name?.toLowerCase()) {
      const q = query(collection(db, 'users'), where('nameLower', '==', editName.trim().toLowerCase()));
      const snap = await getDocs(q);
      const taken = snap.docs.some(d => d.id !== user.uid);
      if (taken) {
        setSaving(false);
        Alert.alert('Nome indisponível', 'Este nome já está sendo usado por outra conta. Escolha outro.');
        return;
      }
    }
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        name: editName.trim(),
        nameLower: editName.trim().toLowerCase(),
        favoriteBook: editFavoriteBook.trim(),
        favoriteBookCover: editFavoriteBookCover ?? null,
        favoriteGenre: editFavoriteGenre.trim(),
        bio: editBio.trim(),
      });
      await refreshProfile();
      setShowEditModal(false);
      Alert.alert('Perfil atualizado!');
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível salvar. Tente novamente.');
    }
    setSaving(false);
  }

  async function handlePickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permissão negada'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      setUploadingPhoto(true);
      try {
        await updateDoc(doc(db, 'users', user.uid), { photoURL: `data:image/jpeg;base64,${result.assets[0].base64}` });
        await refreshProfile();
      } catch (e) { Alert.alert('Erro', 'Não foi possível atualizar a foto.'); }
      setUploadingPhoto(false);
    }
  }

  async function handleLogout() {
    Alert.alert('Sair', 'Tem certeza que deseja sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: async () => { setLoggingOut(true); await logout(); } },
    ]);
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={{ width: 40 }} />
        <Text style={styles.topBarName} numberOfLines={1}>{profile.name}</Text>
        <TouchableOpacity style={styles.menuBtn} onPress={() => setShowSettings(true)}>
          <Ionicons name="menu" size={26} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Profile row (Instagram style) */}
      <View style={styles.profileRow}>
        <TouchableOpacity style={styles.avatarWrap} onPress={handlePickPhoto} disabled={uploadingPhoto}>
          {uploadingPhoto ? (
            <View style={styles.avatarPlaceholder}><ActivityIndicator color={COLORS.action} /></View>
          ) : profile.photoURL ? (
            <Image source={{ uri: profile.photoURL }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>{profile.name?.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.addPhotoBtn}>
            <Ionicons name="add" size={13} color="#fff" />
          </View>
        </TouchableOpacity>

        <View style={styles.statsArea}>
          <StatCol value={profile.totalBooksFinished} label="livros" colors={colors} styles={styles} />
          <StatCol value={profile.totalPagesRead} label="páginas" colors={colors} styles={styles} />
          <StatCol value={profile.streak} label="streak" colors={colors} styles={styles} />
          <StatCol value={friends.length} label="amigos" colors={colors} styles={styles} />
        </View>
      </View>

      {/* Name + level + bio + tags */}
      <View style={styles.infoSection}>
        <Text style={styles.displayName}>{profile.name}</Text>
        <View style={styles.levelPill}>
          <Ionicons name="flash" size={11} color={COLORS.action} />
          <Text style={styles.levelPillText}>{currentLevel.title} · Nível {profile.level}</Text>
        </View>
        {profile.bio ? <Text style={styles.bioText}>{profile.bio}</Text> : null}
        {(profile.favoriteBook || profile.favoriteGenre) && (
          <View style={styles.tagsRow}>
            {profile.favoriteBook && (
              <View style={styles.tag}>
                {profile.favoriteBookCover
                  ? <Image source={{ uri: profile.favoriteBookCover }} style={styles.tagCover} />
                  : <Ionicons name="book" size={11} color={colors.textLight} />
                }
                <Text style={styles.tagText} numberOfLines={1}>{profile.favoriteBook}</Text>
              </View>
            )}
            {profile.favoriteGenre && (
              <View style={styles.tag}>
                <Ionicons name="library" size={11} color={colors.textLight} />
                <Text style={styles.tagText} numberOfLines={1}>{profile.favoriteGenre}</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Action button */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.editProfileBtn} onPress={openEditModal}>
          <Text style={styles.editProfileBtnText}>Editar perfil</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      {/* XP Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="flash" size={15} color={COLORS.action} />
          <Text style={styles.cardTitle}>Experiência</Text>
          <Text style={styles.xpBadge}>{profile.xp} XP</Text>
        </View>
        <View style={styles.xpBar}>
          <View style={[styles.xpBarFill, { width: `${Math.min(xpProgress * 100, 100)}%` }]} />
        </View>
        <Text style={styles.xpLabel}>
          {nextLevel ? `${profile.xp} / ${xpForNext} XP para ${nextLevel.title}` : 'Nível máximo atingido!'}
        </Text>
      </View>

      {/* Stats grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statsRow}>
          <GridStat value={profile.streak} label="STREAK" icon="flame" iconColor="#EF4444" colors={colors} styles={styles} />
          <View style={styles.statDividerV} />
          <GridStat value={profile.bestStreak} label="RECORDE" icon="trophy" iconColor={COLORS.action} colors={colors} styles={styles} />
          <View style={styles.statDividerV} />
          <GridStat value={profile.level} label="NÍVEL" icon="flash" iconColor={COLORS.primary} colors={colors} styles={styles} />
        </View>
      </View>

      {/* Jornada */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="map-outline" size={15} color={COLORS.action} />
          <Text style={styles.cardTitle}>Jornada de Ranks</Text>
        </View>
        {TIERS.map(tier => {
          const tierLevels = tier.levels.map(l => LEVELS.find(lv => lv.level === l));
          const isCurrentTier = tier.levels.includes(profile.level);
          const unlockedCount = tierLevels.filter(l => profile.xp >= l.minXP).length;
          const fullyUnlocked = unlockedCount === tierLevels.length;
          return (
            <View key={tier.name} style={[styles.tierRow, isCurrentTier && { backgroundColor: `${tier.color}12`, borderRadius: 8, paddingHorizontal: 8 }]}>
              <View style={[styles.tierDot, { backgroundColor: unlockedCount > 0 ? tier.color : colors.border }]}>
                {fullyUnlocked
                  ? <Ionicons name="checkmark" size={12} color="#fff" />
                  : <Text style={[styles.tierDotText, unlockedCount > 0 && { color: '#fff' }]}>{unlockedCount}</Text>
                }
              </View>
              <View style={styles.tierInfo}>
                <Text style={[styles.tierName, { color: unlockedCount > 0 ? tier.color : colors.textLight }]}>{tier.name}</Text>
                {isCurrentTier && <Text style={[styles.tierCurrent, { color: tier.color }]}>você está aqui</Text>}
              </View>
              <View style={styles.tierSubDots}>
                {tierLevels.map(l => {
                  const isUnlocked = profile.xp >= l.minXP;
                  const isCurrent = profile.level === l.level;
                  return (
                    <View key={l.level} style={[styles.subDot, isUnlocked && { backgroundColor: tier.color }, isCurrent && styles.subDotCurrent]} />
                  );
                })}
              </View>
              {isCurrentTier && <Ionicons name="location" size={13} color={tier.color} />}
            </View>
          );
        })}
      </View>

      {/* Pedidos de amizade */}
      {pendingRequests.length > 0 && (
        <View style={[styles.card, { marginTop: 16 }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="person-add" size={15} color="#EF4444" />
            <Text style={[styles.cardTitle, { color: '#EF4444' }]}>Pedidos de amizade</Text>
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>{pendingRequests.length}</Text>
            </View>
          </View>
          {pendingRequests.map(req => (
            <FriendRequestRow
              key={req.docId}
              fromId={req.fromId}
              colors={colors}
              styles={styles}
              onAccept={async () => {
                const { acceptFriendRequest } = await import('../../services/friendshipService');
                await acceptFriendRequest(user.uid, req.fromId);
                reloadFriendship();
              }}
              onReject={async () => {
                const { rejectFriendRequest } = await import('../../services/friendshipService');
                await rejectFriendRequest(user.uid, req.fromId);
                reloadFriendship();
              }}
              onPress={() => navigation.navigate('UserProfile', { userId: req.fromId })}
            />
          ))}
        </View>
      )}

      {/* Amigos */}
      <View style={[styles.card, { marginTop: 16 }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="people" size={15} color={COLORS.primary} />
          <Text style={styles.cardTitle}>Amigos ({friends.length})</Text>
        </View>
        {friends.length === 0 ? (
          <Text style={[styles.emptyFriends, { color: colors.textLight }]}>
            Nenhum amigo ainda. Use a busca 🔍 no Ranking para encontrar pessoas.
          </Text>
        ) : (
          friends.map(f => (
            <TouchableOpacity
              key={f.id}
              style={[styles.friendRow, { borderTopColor: colors.border }]}
              onPress={() => navigation.navigate('UserProfile', { userId: f.id })}
              activeOpacity={0.75}
            >
              {f.photoURL ? (
                <Image source={{ uri: f.photoURL }} style={styles.friendAvatar} />
              ) : (
                <View style={[styles.friendAvatarPlaceholder, { backgroundColor: COLORS.primary }]}>
                  <Text style={styles.friendAvatarText}>{f.name?.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={[styles.friendName, { color: colors.text }]} numberOfLines={1}>{f.name}</Text>
                <Text style={[styles.friendLevel, { color: colors.textLight }]}>Nível {f.level ?? 1} · {f.xp ?? 0} XP</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.border} />
            </TouchableOpacity>
          ))
        )}
      </View>

      <View style={{ height: 32 }} />

      {/* Settings Modal */}
      <Modal visible={showSettings} animationType="slide" onRequestClose={() => setShowSettings(false)}>
        <View style={[styles.settingsContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.settingsTopBar, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowSettings(false)} style={styles.settingsBack}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.settingsTitle, { color: colors.text }]}>Configurações</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>

            <Text style={[styles.settingsSection, { color: colors.textLight }]}>PREFERÊNCIAS</Text>
            <View style={[styles.settingsGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.settingsItem}>
                <View style={styles.settingsItemLeft}>
                  <View style={[styles.settingsIconWrap, { backgroundColor: '#3B82F620' }]}>
                    <Ionicons name="moon-outline" size={18} color="#3B82F6" />
                  </View>
                  <Text style={[styles.settingsItemLabel, { color: colors.text }]}>Tema escuro</Text>
                </View>
                <Switch
                  value={mode === 'dark'}
                  onValueChange={toggleTheme}
                  trackColor={{ false: colors.border, true: COLORS.action }}
                  thumbColor="#fff"
                />
              </View>
              <View style={[styles.settingsItemDivider, { backgroundColor: colors.border }]} />
              <View style={styles.settingsItem}>
                <View style={styles.settingsItemLeft}>
                  <View style={[styles.settingsIconWrap, { backgroundColor: '#8B5CF620' }]}>
                    <Ionicons name={profile?.isPrivate ? 'lock-closed-outline' : 'earth-outline'} size={18} color="#8B5CF6" />
                  </View>
                  <View>
                    <Text style={[styles.settingsItemLabel, { color: colors.text }]}>Perfil privado</Text>
                    <Text style={[styles.settingsItemSub, { color: colors.textLight }]}>
                      {profile?.isPrivate ? 'Só amigos veem seus dados' : 'Qualquer um pode ver seu perfil'}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={profile?.isPrivate === true}
                  onValueChange={async (val) => {
                    try {
                      await updateDoc(doc(db, 'users', user.uid), { isPrivate: val });
                      await refreshProfile();
                    } catch {}
                  }}
                  trackColor={{ false: colors.border, true: COLORS.action }}
                  thumbColor="#fff"
                />
              </View>
            </View>

            <View style={[styles.settingsGroup, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 24 }]}>
              <TouchableOpacity
                style={styles.settingsItem}
                onPress={() => { setShowSettings(false); setTimeout(handleLogout, 300); }}
                disabled={loggingOut}
              >
                <View style={styles.settingsItemLeft}>
                  <View style={[styles.settingsIconWrap, { backgroundColor: '#EF444420' }]}>
                    {loggingOut
                      ? <ActivityIndicator size="small" color="#EF4444" />
                      : <Ionicons name="log-out-outline" size={18} color="#EF4444" />
                    }
                  </View>
                  <Text style={[styles.settingsItemLabel, { color: '#EF4444' }]}>Sair da conta</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
      {/* Edit Profile Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent onRequestClose={() => setShowEditModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar Perfil</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color={colors.textLight} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              <Text style={styles.modalLabel}>Nome completo *</Text>
              <TextInput
                style={styles.modalInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Seu nome completo"
                placeholderTextColor={colors.textLight}
                maxLength={50}
              />
              <View style={styles.hintRow}>
                <Ionicons name="information-circle-outline" size={13} color={colors.textLight} />
                <Text style={styles.modalHint}>O nome deve ser único — nenhuma outra conta pode ter o mesmo.</Text>
              </View>

              <Text style={styles.modalLabel}>Livro favorito</Text>
              {editFavoriteBook && editFavoriteBookCover ? (
                <View style={styles.selectedBookCard}>
                  <Image source={{ uri: editFavoriteBookCover }} style={styles.selectedBookCover} />
                  <View style={styles.selectedBookInfo}>
                    <Text style={styles.selectedBookTitle} numberOfLines={2}>{editFavoriteBook}</Text>
                  </View>
                  <TouchableOpacity onPress={() => { setEditFavoriteBook(''); setEditFavoriteBookCover(null); setBookQuery(''); }}>
                    <Ionicons name="close-circle" size={22} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <View style={styles.searchRow}>
                    <View style={styles.searchBox}>
                      <Ionicons name="search-outline" size={17} color={colors.textLight} />
                      <TextInput
                        style={styles.searchInput}
                        value={bookQuery}
                        onChangeText={v => { setBookQuery(v); setBookSuggestions([]); }}
                        placeholder="Ex: O Senhor dos Anéis..."
                        placeholderTextColor={colors.textLight}
                        returnKeyType="search"
                        onSubmitEditing={handleBookSearch}
                      />
                    </View>
                    <TouchableOpacity style={styles.searchButton} onPress={handleBookSearch} disabled={searchingBook}>
                      {searchingBook
                        ? <ActivityIndicator size="small" color={colors.background} />
                        : <Ionicons name="search" size={20} color={colors.background} />
                      }
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.modalHint}>Digite o nome e toque em buscar</Text>
                  {bookSuggestions.length > 0 && (
                    <View style={styles.suggestionsContainer}>
                      {bookSuggestions.map((book, i) => (
                        <TouchableOpacity key={i} style={styles.suggestionItem} onPress={() => handleSelectBook(book)}>
                          {book.coverURL
                            ? <Image source={{ uri: book.coverURL }} style={styles.suggestionCover} />
                            : <View style={styles.suggestionCoverPlaceholder}><Ionicons name="book" size={14} color={colors.textLight} /></View>
                          }
                          <View style={styles.suggestionInfo}>
                            <Text style={styles.suggestionTitle} numberOfLines={1}>{book.title}</Text>
                            <Text style={styles.suggestionAuthor} numberOfLines={1}>{book.author}</Text>
                          </View>
                          <Ionicons name="add-circle-outline" size={22} color={COLORS.action} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </>
              )}

              <Text style={styles.modalLabel}>Gênero literário favorito</Text>
              <TextInput
                style={styles.modalInput}
                value={editFavoriteGenre}
                onChangeText={setEditFavoriteGenre}
                placeholder="Ex: Fantasia, Romance, Terror..."
                placeholderTextColor={colors.textLight}
                maxLength={50}
              />

              <Text style={styles.modalLabel}>Sobre mim</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                value={editBio}
                onChangeText={setEditBio}
                placeholder="Escreva algo sobre você..."
                placeholderTextColor={colors.textLight}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={200}
              />
              <Text style={styles.modalCounter}>{editBio.length}/200</Text>

              <TouchableOpacity
                style={[styles.modalButton, saving && { opacity: 0.7 }]}
                onPress={handleSaveProfile}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color={colors.background} />
                  : <Text style={styles.modalButtonText}>Salvar alterações</Text>
                }
              </TouchableOpacity>
              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </ScrollView>
  );
}

function FriendRequestRow({ fromId, colors, styles, onAccept, onReject, onPress }) {
  const [requester, setRequester] = React.useState(null);
  React.useEffect(() => {
    import('../../config/firebase').then(({ db }) => {
      import('firebase/firestore').then(({ doc, getDoc }) => {
        getDoc(doc(db, 'users', fromId)).then(snap => {
          if (snap.exists()) setRequester(snap.data());
        });
      });
    });
  }, [fromId]);
  return (
    <TouchableOpacity style={[styles.friendRequestRow, { borderTopColor: colors.border }]} onPress={onPress} activeOpacity={0.8}>
      {requester?.photoURL ? (
        <Image source={{ uri: requester.photoURL }} style={styles.friendRequestAvatar} />
      ) : (
        <View style={[styles.friendRequestAvatarPlaceholder, { backgroundColor: COLORS.primary }]}>
          <Text style={styles.friendRequestAvatarText}>{requester?.name?.charAt(0).toUpperCase() ?? '?'}</Text>
        </View>
      )}
      <Text style={[styles.friendName, { color: colors.text, flex: 1 }]} numberOfLines={1}>
        {requester?.name ?? '...'}
      </Text>
      <View style={styles.friendRequestActions}>
        <TouchableOpacity style={styles.friendRequestAccept} onPress={onAccept}>
          <Text style={styles.friendRequestActionText}>Aceitar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.friendRequestReject, { borderColor: colors.border }]} onPress={onReject}>
          <Text style={[styles.friendRequestActionText, { color: colors.text }]}>Recusar</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function StatCol({ value, label, colors, styles }) {
  return (
    <View style={styles.statCol}>
      <Text style={styles.statColValue}>{value ?? 0}</Text>
      <Text style={styles.statColLabel}>{label}</Text>
    </View>
  );
}

function GridStat({ value, label, icon, iconColor, colors, styles }) {
  return (
    <View style={styles.gridStat}>
      <Ionicons name={icon} size={16} color={iconColor} style={{ marginBottom: 4 }} />
      <Text style={styles.gridStatValue}>{value ?? 0}</Text>
      <Text style={styles.gridStatLabel}>{label}</Text>
    </View>
  );
}

function SettingsItem({ icon, iconBg, iconColor, label, value, onPress, colors, styles }) {
  return (
    <TouchableOpacity style={styles.settingsItem} onPress={onPress}>
      <View style={styles.settingsItemLeft}>
        <View style={[styles.settingsIconWrap, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
        <Text style={[styles.settingsItemLabel, { color: colors.text }]}>{label}</Text>
      </View>
      <View style={styles.settingsItemRight}>
        {value ? <Text style={[styles.settingsItemValue, { color: colors.textLight }]}>{value}</Text> : null}
        <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
      </View>
    </TouchableOpacity>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },

    // Top bar
    topBar: {
      paddingTop: 56, paddingBottom: 12, paddingHorizontal: 16,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    topBarName: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: colors.text },
    menuBtn: { width: 40, alignItems: 'flex-end' },

    // Profile row
    profileRow: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 20, paddingTop: 12, gap: 24,
    },
    avatarWrap: { position: 'relative' },
    avatar: { width: 86, height: 86, borderRadius: 43, borderWidth: 2.5, borderColor: COLORS.action },
    avatarPlaceholder: {
      width: 86, height: 86, borderRadius: 43,
      backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border,
      justifyContent: 'center', alignItems: 'center',
    },
    avatarInitial: { fontSize: 32, fontWeight: '800', color: colors.text },
    addPhotoBtn: {
      position: 'absolute', bottom: 2, right: 2,
      width: 24, height: 24, borderRadius: 12,
      backgroundColor: COLORS.action, borderWidth: 2, borderColor: colors.background,
      justifyContent: 'center', alignItems: 'center',
    },
    statsArea: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
    statCol: { alignItems: 'center', gap: 3 },
    statColValue: { fontSize: 19, fontWeight: '800', color: colors.text },
    statColLabel: { fontSize: 12, color: colors.textLight, fontWeight: '500' },

    // Info section
    infoSection: { paddingHorizontal: 20, paddingTop: 14, gap: 5 },
    displayName: { fontSize: 15, fontWeight: '700', color: colors.text },
    levelPill: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: `${COLORS.action}18`, paddingHorizontal: 10, paddingVertical: 3,
      borderRadius: 12, alignSelf: 'flex-start',
    },
    levelPillText: { fontSize: 12, color: COLORS.action, fontWeight: '700' },
    bioText: { fontSize: 13, color: colors.text, lineHeight: 18, marginTop: 2 },
    tagsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 4 },
    tag: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
      paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, maxWidth: 160,
    },
    tagCover: { width: 14, height: 20, borderRadius: 2 },
    tagText: { fontSize: 11, color: colors.textLight, fontWeight: '600' },

    // Action buttons
    actionRow: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 16 },
    editProfileBtn: {
      paddingVertical: 9, borderRadius: 8,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
      alignItems: 'center',
    },
    editProfileBtnText: { fontSize: 14, fontWeight: '600', color: colors.text },

    divider: { height: 1, backgroundColor: colors.border },

    // XP card
    card: {
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
      borderRadius: 12, padding: 20, marginHorizontal: 16, marginTop: 12,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    cardTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.text, textTransform: 'uppercase', letterSpacing: 0.5 },
    xpBadge: { fontSize: 15, fontWeight: '800', color: COLORS.action },
    xpBar: { height: 3, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden' },
    xpBarFill: { height: '100%', backgroundColor: COLORS.action, borderRadius: 2 },
    xpLabel: { fontSize: 12, color: colors.textLight, marginTop: 6 },

    // Stats grid
    statsGrid: {
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
      borderRadius: 12, marginHorizontal: 16, marginTop: 12, overflow: 'hidden',
    },
    statsRow: { flexDirection: 'row', alignItems: 'center' },
    gridStat: { flex: 1, alignItems: 'center', paddingVertical: 18 },
    gridStatValue: { fontSize: 20, fontWeight: '800', color: colors.text },
    gridStatLabel: { fontSize: 10, color: colors.textLight, textTransform: 'uppercase', marginTop: 2, letterSpacing: 0.5 },
    statDividerV: { width: 1, height: 50, backgroundColor: colors.border },

    // Journey
    tierRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
    tierDot: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    tierDotText: { fontSize: 11, fontWeight: '800', color: colors.textLight },
    tierInfo: { flex: 1 },
    tierName: { fontSize: 14, fontWeight: '700' },
    tierCurrent: { fontSize: 11, marginTop: 1 },
    tierSubDots: { flexDirection: 'row', gap: 5 },
    subDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.border },
    subDotCurrent: { transform: [{ scale: 1.3 }] },

    // Settings modal
    settingsContainer: { flex: 1 },
    settingsTopBar: {
      flexDirection: 'row', alignItems: 'center',
      paddingTop: 56, paddingBottom: 16, paddingHorizontal: 16,
      borderBottomWidth: 1,
    },
    settingsBack: { width: 40 },
    settingsTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700' },
    settingsSection: {
      paddingHorizontal: 16, paddingTop: 24, paddingBottom: 8,
      fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6,
    },
    settingsGroup: {
      borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border,
    },
    settingsItem: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 14,
    },
    settingsItemDivider: { height: 1, marginLeft: 64 },
    settingsItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
    settingsItemRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    settingsIconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    settingsItemLabel: { fontSize: 15, fontWeight: '500' },
    settingsItemSub: { fontSize: 11, marginTop: 1 },
    settingsItemValue: { fontSize: 14 },
    pendingBadge: { marginLeft: 'auto', backgroundColor: '#EF4444', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
    pendingBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
    friendRequestRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1 },
    friendRequestAvatar: { width: 40, height: 40, borderRadius: 20 },
    friendRequestAvatarPlaceholder: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    friendRequestAvatarText: { fontSize: 16, fontWeight: '700', color: '#fff' },
    friendRequestActions: { flexDirection: 'row', gap: 6 },
    friendRequestAccept: { backgroundColor: COLORS.action, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    friendRequestReject: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
    friendRequestActionText: { fontSize: 12, fontWeight: '700', color: '#fff' },
    emptyFriends: { fontSize: 13, paddingVertical: 12, textAlign: 'center', lineHeight: 20 },
    friendRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1 },
    friendAvatar: { width: 40, height: 40, borderRadius: 20 },
    friendAvatarPlaceholder: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    friendAvatarText: { fontSize: 16, fontWeight: '700', color: '#fff' },
    friendName: { fontSize: 14, fontWeight: '600' },
    friendLevel: { fontSize: 12, marginTop: 1 },

    // Edit profile modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
    modalSheet: {
      backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
      borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border,
      padding: 24, maxHeight: '90%',
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
    modalLabel: {
      fontSize: 13, fontWeight: '700', color: colors.textLight,
      marginBottom: 8, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.5,
    },
    modalInput: {
      backgroundColor: colors.background, borderRadius: 10,
      paddingHorizontal: 14, paddingVertical: 12,
      fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.border,
    },
    modalTextArea: { height: 100, paddingTop: 12 },
    hintRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 6 },
    modalHint: { flex: 1, fontSize: 12, color: colors.textLight },
    modalCounter: { fontSize: 11, color: colors.textLight, textAlign: 'right', marginTop: 4 },
    modalButton: {
      backgroundColor: COLORS.action, borderRadius: 10,
      paddingVertical: 14, alignItems: 'center', marginTop: 20,
    },
    modalButtonText: { color: colors.background, fontSize: 15, fontWeight: '800' },
    searchRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    searchBox: {
      flex: 1, flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.background, borderRadius: 10,
      paddingHorizontal: 14, paddingVertical: 10, gap: 8,
      borderWidth: 1, borderColor: colors.border,
    },
    searchInput: { flex: 1, fontSize: 15, color: colors.text },
    searchButton: {
      backgroundColor: COLORS.action, width: 46, height: 46,
      borderRadius: 10, justifyContent: 'center', alignItems: 'center',
    },
    suggestionsContainer: {
      marginTop: 8, borderRadius: 10, borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
    },
    suggestionItem: {
      flexDirection: 'row', alignItems: 'center', padding: 12,
      backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 12,
    },
    suggestionCover: { width: 36, height: 50, borderRadius: 6 },
    suggestionCoverPlaceholder: {
      width: 36, height: 50, borderRadius: 6,
      backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center',
    },
    suggestionInfo: { flex: 1 },
    suggestionTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
    suggestionAuthor: { fontSize: 12, color: colors.textLight, marginTop: 2 },
    selectedBookCard: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.background, borderRadius: 10, padding: 12,
      gap: 12, borderWidth: 1, borderColor: COLORS.action,
    },
    selectedBookCover: { width: 44, height: 60, borderRadius: 8 },
    selectedBookInfo: { flex: 1 },
    selectedBookTitle: { fontSize: 14, fontWeight: '700', color: colors.text },

    infoCard: {
      borderRadius: 14, borderWidth: 1, padding: 20, alignItems: 'center', marginBottom: 20,
    },
    infoCardIcon: {
      width: 56, height: 56, borderRadius: 28,
      backgroundColor: 'rgba(139,92,246,0.12)', justifyContent: 'center', alignItems: 'center', marginBottom: 12,
    },
    infoCardTitle: { fontSize: 17, fontWeight: '800', marginBottom: 6, textAlign: 'center' },
    infoCardText: { fontSize: 13, lineHeight: 19, textAlign: 'center' },

    privacyItem: {
      flexDirection: 'row', gap: 14, paddingVertical: 16,
      borderBottomWidth: 1, alignItems: 'flex-start',
    },
    privacyIcon: {
      width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', flexShrink: 0,
    },
    privacyTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
    privacyText: { fontSize: 13, lineHeight: 18 },

    faqItem: {
      borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 10,
    },
    faqQuestion: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
    faqAnswer: { fontSize: 13, lineHeight: 19 },
  });
}
