import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Image, Share
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getGroup, updateGroup, removeMember, leaveGroup, deleteGroup } from '../../services/groupService';
import { listenMessages } from '../../services/chatService';
import { COLORS } from '../../constants/colors';

export default function GroupDetailScreen({ navigation, route }) {
  const { groupId } = route.params;
  const { user, profile } = useAuth();
  const { colors } = useTheme();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const styles = makeStyles(colors);

  useEffect(() => { loadGroup(); }, []);

  useEffect(() => {
    const unsub = listenMessages(groupId, messages => {
      const unread = messages.filter(m =>
        m.senderId !== user.uid && !m.readBy?.includes(user.uid)
      ).length;
      setUnreadCount(unread);
    });
    return () => unsub();
  }, []);

  async function loadGroup() {
    setLoading(true);
    const res = await getGroup(groupId);
    if (res.success) setGroup(res.group);
    setLoading(false);
  }

  const isAdmin = group?.adminId === user?.uid;

  async function handleShare() {
    await Share.share({
      message:
`📚 *Book Level* — Convite para grupo de leitura!

Olá! Você foi convidado(a) para entrar no grupo *"${group.name}"* no app Book Level.

🔑 Código de convite: *${group.inviteCode}*

Como entrar:
1. Baixe o app Book Level
2. Vá em Grupos → "Entrar com código"
3. Digite o código: *${group.inviteCode}*

Vamos ler juntos! 📖🏆`,
    });
  }

  async function handleLeave() {
    Alert.alert('Sair do grupo', 'Tem certeza que deseja sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: async () => { await leaveGroup(groupId, user.uid); navigation.goBack(); } }
    ]);
  }

  async function handleDeleteGroup() {
    Alert.alert('Excluir grupo', 'Isso não pode ser desfeito. Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => { await deleteGroup(groupId); navigation.goBack(); } }
    ]);
  }

  async function handleRemoveMember(member) {
    Alert.alert('Expulsar membro', `Expulsar ${member.name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Expulsar', style: 'destructive', onPress: async () => { await removeMember(groupId, member); loadGroup(); } }
    ]);
  }

  async function handleEditPhoto() {
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
      const photoURL = `data:image/jpeg;base64,${result.assets[0].base64}`;
      await updateGroup(groupId, { photoURL });
      loadGroup();
    }
  }

  if (loading) return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={COLORS.action} />
    </View>
  );
  if (!group) return (
    <View style={styles.loadingContainer}>
      <Text style={{ color: colors.textLight }}>Grupo não encontrado.</Text>
    </View>
  );

  const rankedMembers = [...(group.members ?? [])].sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0));
  const totalProgress = group.members?.reduce((s, m) => s + (m.progress ?? 0), 0) ?? 0;
  const goalTarget = group.goal ? group.members.length * group.goal.target : 0;
  const collectiveProgress = goalTarget > 0 ? Math.min(totalProgress / goalTarget, 1) : 0;

  return (
    <View style={styles.container}>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{group.name}</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.chatButton}
            onPress={() => navigation.navigate('GroupChat', {
              groupId,
              groupName: group.name,
              isAdmin,
            })}
          >
            <Ionicons name="chatbubbles-outline" size={24} color={colors.text} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare}>
            <Ionicons name="share-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        <View style={styles.groupInfoSection}>
          <TouchableOpacity onPress={isAdmin ? handleEditPhoto : null}>
            {group.photoURL ? (
              <Image source={{ uri: group.photoURL }} style={styles.groupPhoto} />
            ) : (
              <View style={styles.groupPhotoPlaceholder}>
                <Ionicons name="people" size={38} color={colors.textLight} />
              </View>
            )}
            {isAdmin && (
              <View style={styles.editPhotoBadge}>
                <Ionicons name="camera" size={12} color={colors.background} />
              </View>
            )}
          </TouchableOpacity>

          <Text style={styles.groupName}>{group.name}</Text>
          {group.description ? <Text style={styles.groupBio}>{group.description}</Text> : null}
          <Text style={styles.memberCount}>{group.members?.length ?? 0} / {group.maxMembers} membros</Text>

          <TouchableOpacity style={styles.inviteBox} onPress={handleShare}>
            <Ionicons name="key-outline" size={15} color={COLORS.action} />
            <Text style={styles.inviteCode}>Código: <Text style={styles.inviteCodeBold}>{group.inviteCode}</Text></Text>
            <Ionicons name="share-outline" size={15} color={COLORS.action} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.chatBannerButton}
          onPress={() => navigation.navigate('GroupChat', { groupId, groupName: group.name, isAdmin })}
        >
          <View style={styles.chatBannerLeft}>
            <View style={styles.chatBannerIcon}>
              <Ionicons name="chatbubbles" size={20} color={colors.background} />
            </View>
            <View>
              <Text style={styles.chatBannerTitle}>Chat do Grupo</Text>
              <Text style={styles.chatBannerSub}>
                {unreadCount > 0 ? `${unreadCount} mensagem(ns) não lida(s)` : 'Converse com o grupo'}
              </Text>
            </View>
          </View>
          {unreadCount > 0 && (
            <View style={styles.chatBannerBadge}>
              <Text style={styles.chatBannerBadgeText}>{unreadCount}</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={18} color={COLORS.action} />
        </TouchableOpacity>

        {group.goal ? (
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="flag-outline" size={15} color={COLORS.action} />
              <Text style={styles.cardTitle}>Meta do Grupo</Text>
            </View>
            <Text style={styles.goalText}>{getGoalLabel(group.goal)}</Text>
            {group.goal.startDate && (
              <Text style={styles.goalDate}>{group.goal.startDate} → {group.goal.endDate}</Text>
            )}
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${collectiveProgress * 100}%` }]} />
            </View>
            <Text style={styles.progressLabel}>{Math.round(collectiveProgress * 100)}% concluído pelo grupo</Text>
          </View>
        ) : (
          isAdmin && (
            <TouchableOpacity style={styles.addGoalButton} onPress={() => navigation.navigate('SetGoal', { groupId, group })}>
              <Ionicons name="flag-outline" size={18} color={COLORS.action} />
              <Text style={styles.addGoalText}>Definir meta para o grupo</Text>
            </TouchableOpacity>
          )
        )}

        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="trophy-outline" size={15} color={COLORS.action} />
            <Text style={styles.cardTitle}>Ranking do Grupo</Text>
          </View>
          {rankedMembers.map((member, i) => (
            <TouchableOpacity
              key={member.userId}
              style={[styles.memberRow, member.userId === user.uid && styles.memberRowMe]}
              onPress={() => navigation.navigate('UserProfile', { userId: member.userId })}
              activeOpacity={0.75}
            >
              <View style={[styles.rankBadge, i < 3 && styles.rankBadgeTop]}>
                <Text style={[styles.rankText, i < 3 && styles.rankTextTop]}>
                  {i + 1}
                </Text>
              </View>
              {member.photoURL ? (
                <Image source={{ uri: member.photoURL }} style={styles.memberAvatar} />
              ) : (
                <View style={styles.memberAvatarPlaceholder}>
                  <Text style={styles.memberAvatarText}>{member.name?.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <View style={styles.memberInfo}>
                <View style={styles.memberNameRow}>
                  <Text style={styles.memberName}>
                    {member.name}{member.userId === user.uid ? ' (você)' : ''}
                  </Text>
                  {group.adminId === member.userId && (
                    <Ionicons name="star" size={12} color={COLORS.action} />
                  )}
                </View>
                <Text style={styles.memberProgress}>
                  {member.progress ?? 0} / {group.goal?.target ?? 0} {getGoalUnit(group.goal)}
                </Text>
              </View>
              {group.goal && (member.progress ?? 0) >= group.goal.target && (
                <Ionicons name="trophy" size={18} color={COLORS.action} />
              )}
              {isAdmin && member.userId !== user.uid && (
                <TouchableOpacity onPress={(e) => { e.stopPropagation?.(); handleRemoveMember(member); }} style={styles.removeButton}>
                  <Ionicons name="close-circle" size={20} color={COLORS.error} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="settings-outline" size={15} color={COLORS.action} />
            <Text style={styles.cardTitle}>Ações</Text>
          </View>
          <TouchableOpacity style={styles.actionRow} onPress={handleShare}>
            <Ionicons name="share-outline" size={20} color={colors.textLight} />
            <Text style={styles.actionText}>Compartilhar convite</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
          </TouchableOpacity>
          {isAdmin && (
            <>
              <TouchableOpacity style={styles.actionRow} onPress={() => navigation.navigate('SetGoal', { groupId, group })}>
                <Ionicons name="flag-outline" size={20} color={colors.textLight} />
                <Text style={styles.actionText}>Definir/editar meta</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionRow} onPress={handleDeleteGroup}>
                <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                <Text style={[styles.actionText, { color: COLORS.error }]}>Excluir grupo</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
              </TouchableOpacity>
            </>
          )}
          {!isAdmin && (
            <TouchableOpacity style={styles.actionRow} onPress={handleLeave}>
              <Ionicons name="exit-outline" size={20} color={COLORS.error} />
              <Text style={[styles.actionText, { color: COLORS.error }]}>Sair do grupo</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

function getGoalLabel(goal) {
  if (!goal) return '';
  if (goal.type === 'pages_day') return `${goal.target} páginas por dia`;
  if (goal.type === 'pages_month') return `${goal.target} páginas por mês`;
  if (goal.type === 'books_month') return `${goal.target} livros por mês`;
  if (goal.type === 'specific_book') return `Terminar: ${goal.bookTitle}`;
  return '';
}

function getGoalUnit(goal) {
  if (!goal) return '';
  if (goal.type === 'pages_day' || goal.type === 'pages_month') return 'págs.';
  if (goal.type === 'books_month') return 'livros';
  if (goal.type === 'specific_book') return 'págs.';
  return '';
}

function makeStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },

    header: {
      paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    headerTitle: {
      flex: 1, fontSize: 17, fontWeight: '700', color: colors.text,
      textAlign: 'center', marginHorizontal: 12,
    },
    headerButtons: { flexDirection: 'row', alignItems: 'center', gap: 18 },
    chatButton: { position: 'relative' },
    badge: {
      position: 'absolute', top: -6, right: -6, backgroundColor: COLORS.error,
      borderRadius: 10, minWidth: 18, height: 18,
      justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4,
      borderWidth: 1.5, borderColor: colors.background,
    },
    badgeText: { fontSize: 10, fontWeight: 'bold', color: COLORS.white },

    groupInfoSection: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 16 },
    groupPhoto: { width: 88, height: 88, borderRadius: 44, borderWidth: 2, borderColor: colors.border },
    groupPhotoPlaceholder: {
      width: 88, height: 88, borderRadius: 44,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
      justifyContent: 'center', alignItems: 'center',
    },
    editPhotoBadge: {
      position: 'absolute', bottom: 0, right: 0,
      backgroundColor: COLORS.action, width: 26, height: 26, borderRadius: 13,
      justifyContent: 'center', alignItems: 'center',
      borderWidth: 2, borderColor: colors.background,
    },
    groupName: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 12 },
    groupBio: { fontSize: 13, color: colors.textLight, textAlign: 'center', marginTop: 6, lineHeight: 20 },
    memberCount: { fontSize: 13, color: colors.textLight, marginTop: 6 },
    inviteBox: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: 'rgba(214,158,46,0.1)', paddingHorizontal: 16, paddingVertical: 10,
      borderRadius: 20, marginTop: 14, borderWidth: 1, borderColor: 'rgba(214,158,46,0.3)',
    },
    inviteCode: { fontSize: 13, color: colors.textLight },
    inviteCodeBold: { fontWeight: '800', fontSize: 15, color: COLORS.action },

    chatBannerButton: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.surface, marginHorizontal: 16, borderRadius: 12, padding: 14, gap: 12,
      borderWidth: 1.5, borderColor: COLORS.action, marginBottom: 8,
    },
    chatBannerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
    chatBannerIcon: {
      width: 40, height: 40, borderRadius: 10,
      backgroundColor: COLORS.action, justifyContent: 'center', alignItems: 'center',
    },
    chatBannerTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
    chatBannerSub: { fontSize: 12, color: colors.textLight, marginTop: 2 },
    chatBannerBadge: {
      backgroundColor: COLORS.error, borderRadius: 12,
      minWidth: 24, height: 24, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6,
    },
    chatBannerBadgeText: { fontSize: 12, fontWeight: 'bold', color: COLORS.white },

    card: {
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
      borderRadius: 12, padding: 20, marginHorizontal: 16, marginTop: 12,
    },
    cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
    cardTitle: { fontSize: 14, fontWeight: '700', color: colors.text, textTransform: 'uppercase', letterSpacing: 0.5 },
    goalText: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 4 },
    goalDate: { fontSize: 12, color: colors.textLight, marginBottom: 12 },
    progressBarBg: { height: 3, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden' },
    progressBarFill: { height: '100%', backgroundColor: COLORS.action, borderRadius: 2 },
    progressLabel: { fontSize: 12, color: colors.textLight, marginTop: 6, textAlign: 'right' },

    addGoalButton: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: colors.surface, marginHorizontal: 16, marginTop: 12, padding: 16,
      borderRadius: 12, borderWidth: 1, borderColor: COLORS.action, borderStyle: 'dashed',
    },
    addGoalText: { fontSize: 14, color: COLORS.action, fontWeight: '600' },

    memberRow: {
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 12,
    },
    memberRowMe: {
      backgroundColor: 'rgba(214,158,46,0.06)', borderRadius: 10, paddingHorizontal: 8,
    },
    rankBadge: {
      width: 28, height: 28, borderRadius: 14,
      backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center',
    },
    rankBadgeTop: { backgroundColor: COLORS.action },
    rankText: { fontSize: 12, fontWeight: '800', color: colors.textLight },
    rankTextTop: { color: colors.background },
    memberAvatar: { width: 38, height: 38, borderRadius: 19 },
    memberAvatarPlaceholder: {
      width: 38, height: 38, borderRadius: 19,
      backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center',
    },
    memberAvatarText: { fontSize: 15, fontWeight: 'bold', color: colors.text },
    memberInfo: { flex: 1 },
    memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    memberName: { fontSize: 14, fontWeight: '600', color: colors.text },
    memberProgress: { fontSize: 12, color: colors.textLight, marginTop: 2 },
    removeButton: { padding: 4 },

    actionRow: {
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 12,
    },
    actionText: { flex: 1, fontSize: 15, color: colors.text },
  });
}
