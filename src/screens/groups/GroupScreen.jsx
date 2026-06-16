import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Image, TextInput, Modal,
  KeyboardAvoidingView, Platform, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getUserGroups, joinGroupByCode } from '../../services/groupService';
import { COLORS } from '../../constants/colors';

export default function GroupScreen({ navigation }) {
  const { user, profile } = useAuth();
  const { colors } = useTheme();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const styles = makeStyles(colors);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => loadGroups());
    return unsubscribe;
  }, [navigation]);

  async function loadGroups(silent = false) {
    if (!silent) setLoading(true);
    const res = await getUserGroups(user.uid);
    if (res.success) setGroups(res.groups);
    if (!silent) setLoading(false);
  }

  async function onRefresh() {
    setIsRefreshing(true);
    await loadGroups(true);
    setIsRefreshing(false);
  }

  async function handleJoin() {
    if (!inviteCode.trim()) { Alert.alert('Atenção', 'Digite o código de convite.'); return; }
    setJoining(true);
    const res = await joinGroupByCode(user.uid, profile.name, profile.photoURL, inviteCode.trim());
    setJoining(false);
    if (!res.success) { Alert.alert('Erro', res.error); return; }
    setShowJoinModal(false);
    setInviteCode('');
    Alert.alert('Você entrou no grupo!');
    loadGroups();
  }

  const canCreateGroup = groups.filter(g => g.adminId === user.uid).length < 5;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Ionicons name="people" size={22} color={colors.text} />
          <Text style={styles.headerTitle}>Grupos</Text>
        </View>
        <Text style={styles.headerSub}>Leia e compita com amigos</Text>
      </View>

      <View style={styles.actionRow}>
        {canCreateGroup ? (
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('CreateGroup')}>
            <Ionicons name="add-circle-outline" size={18} color={COLORS.white} />
            <Text style={styles.actionButtonText}>Criar grupo</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.actionButton, { backgroundColor: colors.border }]}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.textLight} />
            <Text style={[styles.actionButtonText, { color: colors.textLight }]}>Limite (5/5)</Text>
          </View>
        )}
        <TouchableOpacity style={styles.actionButton} onPress={() => setShowJoinModal(true)}>
          <Ionicons name="enter-outline" size={18} color={COLORS.white} />
          <Text style={styles.actionButtonText}>Entrar com código</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.action} />
        </View>
      ) : groups.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={56} color={colors.textLight} />
          <Text style={styles.emptyTitle}>Nenhum grupo ainda</Text>
          <Text style={styles.emptyText}>Crie um grupo ou entre com um código de convite para competir com seus amigos!</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={COLORS.action} colors={[COLORS.action]} />}
        >
          {groups.map(group => (
            <TouchableOpacity
              key={group.id}
              style={styles.groupCard}
              onPress={() => navigation.navigate('GroupDetail', { groupId: group.id })}
            >
              {group.photoURL ? (
                <Image source={{ uri: group.photoURL }} style={styles.groupPhoto} />
              ) : (
                <View style={styles.groupPhotoPlaceholder}>
                  <Ionicons name="people" size={26} color={colors.textLight} />
                </View>
              )}
              <View style={styles.groupInfo}>
                <View style={styles.groupNameRow}>
                  <Text style={styles.groupName} numberOfLines={1}>{group.name}</Text>
                  {group.adminId === user.uid && (
                    <View style={styles.adminBadge}>
                      <Ionicons name="star" size={11} color={COLORS.action} />
                      <Text style={styles.adminBadgeText}>Admin</Text>
                    </View>
                  )}
                </View>
                {group.description ? <Text style={styles.groupBio} numberOfLines={1}>{group.description}</Text> : null}
                <View style={styles.groupMembersRow}>
                  <Ionicons name="people-outline" size={12} color={colors.textLight} />
                  <Text style={styles.groupMembers}>{group.members?.length ?? 0}/{group.maxMembers} membros</Text>
                </View>
                {group.goal && (
                  <View style={styles.goalTag}>
                    <Ionicons name="flag-outline" size={11} color={COLORS.action} />
                    <Text style={styles.goalTagText}>{getGoalLabel(group.goal)}</Text>
                  </View>
                )}
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <Modal visible={showJoinModal} animationType="slide" transparent onRequestClose={() => setShowJoinModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Entrar no grupo</Text>
              <TouchableOpacity onPress={() => setShowJoinModal(false)}>
                <Ionicons name="close" size={24} color={colors.textLight} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Código de convite</Text>
            <TextInput
              style={styles.modalInput}
              value={inviteCode}
              onChangeText={v => setInviteCode(v.toUpperCase())}
              placeholder="Ex: AB12CD"
              placeholderTextColor={colors.textLight}
              autoCapitalize="characters"
              maxLength={6}
            />

            <TouchableOpacity
              style={[styles.modalButton, joining && { opacity: 0.7 }]}
              onPress={handleJoin}
              disabled={joining}
            >
              {joining
                ? <ActivityIndicator color={colors.background} />
                : <Text style={styles.modalButtonText}>Entrar no grupo</Text>
              }
            </TouchableOpacity>
            <View style={{ height: 16 }} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function getGoalLabel(goal) {
  if (!goal) return '';
  if (goal.type === 'pages_day') return `${goal.target} págs/dia`;
  if (goal.type === 'pages_month') return `${goal.target} págs/mês`;
  if (goal.type === 'books_month') return `${goal.target} livros/mês`;
  if (goal.type === 'specific_book') return goal.bookTitle;
  return '';
}

function makeStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    header: { paddingTop: 56, paddingBottom: 20, paddingHorizontal: 24 },
    headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
    headerTitle: { fontSize: 24, fontWeight: '800', color: colors.text },
    headerSub: { fontSize: 13, color: colors.textLight },

    actionRow: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
    actionButton: {
      flex: 1, backgroundColor: COLORS.primary, borderRadius: 12,
      borderWidth: 1, borderColor: '#2A4A7F',
      paddingVertical: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6,
    },
    actionButtonText: { color: COLORS.white, fontWeight: '700', fontSize: 13 },

    listContent: { paddingHorizontal: 16, paddingBottom: 32, gap: 8 },
    groupCard: {
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
      borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14,
    },
    groupPhoto: { width: 52, height: 52, borderRadius: 26 },
    groupPhotoPlaceholder: {
      width: 52, height: 52, borderRadius: 26,
      backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center',
    },
    groupInfo: { flex: 1 },
    groupNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    groupName: { fontSize: 15, fontWeight: '700', color: colors.text },
    adminBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: 'rgba(214,158,46,0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
    },
    adminBadgeText: { fontSize: 11, color: COLORS.action, fontWeight: '700' },
    groupBio: { fontSize: 12, color: colors.textLight, marginTop: 3 },
    groupMembersRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    groupMembers: { fontSize: 12, color: colors.textLight },
    goalTag: {
      flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6,
      backgroundColor: 'rgba(214,158,46,0.1)', paddingHorizontal: 8, paddingVertical: 3,
      borderRadius: 8, alignSelf: 'flex-start',
    },
    goalTagText: { fontSize: 11, color: COLORS.action, fontWeight: '600' },

    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 10 },
    emptyTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
    emptyText: { fontSize: 14, color: colors.textLight, textAlign: 'center', lineHeight: 20 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
    modalSheet: {
      backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
      borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border,
      padding: 24,
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
    modalLabel: { fontSize: 13, fontWeight: '700', color: colors.textLight, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    modalInput: {
      backgroundColor: colors.background, borderRadius: 10,
      paddingHorizontal: 14, paddingVertical: 14,
      fontSize: 22, fontWeight: 'bold', color: COLORS.action,
      borderWidth: 1, borderColor: colors.border,
      textAlign: 'center', letterSpacing: 6,
    },
    modalButton: {
      backgroundColor: COLORS.action, borderRadius: 10,
      paddingVertical: 14, alignItems: 'center', marginTop: 16,
    },
    modalButtonText: { color: colors.background, fontSize: 15, fontWeight: '800' },
  });
}
