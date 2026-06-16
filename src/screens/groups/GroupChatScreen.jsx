import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Image,
  KeyboardAvoidingView, Platform, Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { listenMessages, sendMessage, deleteMessage, toggleReaction, markAsRead } from '../../services/chatService';
import { COLORS } from '../../constants/colors';

const EMOJIS = ['❤️', '😂', '😮', '😢', '😡', '👍', '👏', '🔥', '🎉', '📚'];

export default function GroupChatScreen({ navigation, route }) {
  const { groupId, groupName, isAdmin } = route.params;
  const { user, profile } = useAuth();
  const { colors } = useTheme();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const flatListRef = useRef(null);

  const styles = makeStyles(colors);

  useEffect(() => {
    const unsub = listenMessages(groupId, msgs => {
      setMessages(msgs);
      setLoading(false);
      msgs.forEach(m => {
        if (m.senderId !== user.uid && !m.readBy?.includes(user.uid)) {
          markAsRead(groupId, m.id, user.uid);
        }
      });
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  async function handleSend() {
    if (!text.trim()) return;
    setSending(true);
    await sendMessage(groupId, user, profile, text.trim());
    setText('');
    setSending(false);
  }

  async function handlePickImage() {
    Alert.alert('Enviar foto', 'Escolha uma opção', [
      {
        text: 'Tirar foto', onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') { Alert.alert('Permissão negada'); return; }
          const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true, quality: 0.6, base64: true,
          });
          if (!result.canceled && result.assets[0]) {
            setSending(true);
            await sendMessage(groupId, user, profile, '', `data:image/jpeg;base64,${result.assets[0].base64}`, 'photo');
            setSending(false);
          }
        }
      },
      {
        text: 'Galeria', onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') { Alert.alert('Permissão negada'); return; }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.6, base64: true,
          });
          if (!result.canceled && result.assets[0]) {
            setSending(true);
            await sendMessage(groupId, user, profile, '', `data:image/jpeg;base64,${result.assets[0].base64}`, 'photo');
            setSending(false);
          }
        }
      },
      { text: 'Cancelar', style: 'cancel' }
    ]);
  }

  async function handleDelete(messageId, senderId) {
    if (senderId !== user.uid && !isAdmin) return;
    Alert.alert('Apagar mensagem', 'Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: async () => await deleteMessage(groupId, messageId) }
    ]);
  }

  async function handleReact(messageId, emoji) {
    await toggleReaction(groupId, messageId, user.uid, emoji);
    setShowEmojiPicker(false);
    setSelectedMessageId(null);
  }

  function openEmojiPicker(messageId) {
    setSelectedMessageId(messageId);
    setShowEmojiPicker(true);
  }

  const renderMessage = ({ item, index }) => {
    const isMe = item.senderId === user.uid;
    const isSystem = item.type === 'achievement';
    const prevMsg = messages[index - 1];
    const showHeader = !prevMsg || prevMsg.senderId !== item.senderId;

    const reactionGroups = {};
    if (item.reactions) {
      item.reactions.forEach(r => {
        if (!r || typeof r !== 'object') return;
        const emoji = r.emoji;
        const userId = r.userId;
        if (!emoji || !userId) return;
        if (!reactionGroups[emoji]) reactionGroups[emoji] = [];
        reactionGroups[emoji].push(userId);
      });
    }

    if (isSystem) {
      return (
        <View style={styles.achievementBox}>
          <Text style={styles.achievementEmoji}>🏆</Text>
          <Text style={styles.achievementText}>{item.text}</Text>
        </View>
      );
    }

    return (
      <View style={[styles.messageWrapper, isMe && styles.messageWrapperMe]}>
        {!isMe && showHeader && (
          <View style={styles.senderRow}>
            {item.senderPhoto ? (
              <Image source={{ uri: item.senderPhoto }} style={styles.senderAvatar} />
            ) : (
              <View style={styles.senderAvatarPlaceholder}>
                <Text style={styles.senderAvatarText}>{item.senderName?.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <Text style={styles.senderName}>{item.senderName}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}
          onLongPress={() => handleDelete(item.id, item.senderId)}
          activeOpacity={0.85}
        >
          {item.type === 'photo' && item.photoURL ? (
            <Image source={{ uri: item.photoURL }} style={styles.messagePhoto} />
          ) : (
            <Text style={[styles.messageText, isMe && styles.messageTextMe]}>{item.text}</Text>
          )}
          <View style={styles.messageMeta}>
            <Text style={[styles.messageTime, isMe && styles.messageTimeMe]}>
              {formatTime(item.createdAt)}
            </Text>
            {isMe && (
              <Ionicons
                name={item.readBy?.length > 1 ? 'checkmark-done' : 'checkmark'}
                size={14}
                color={item.readBy?.length > 1 ? '#60A5FA' : 'rgba(255,255,255,0.6)'}
              />
            )}
          </View>
        </TouchableOpacity>

        <View style={[styles.reactionsRow, isMe && styles.reactionsRowMe]}>
          {Object.entries(reactionGroups).map(([emoji, users]) => (
            <TouchableOpacity
              key={emoji}
              style={[styles.reactionChip, users.includes(user.uid) && styles.reactionChipActive]}
              onPress={() => handleReact(item.id, emoji)}
            >
              <Text style={styles.reactionEmoji}>{emoji}</Text>
              <Text style={styles.reactionCount}>{users.length}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.addReactionButton} onPress={() => openEmojiPicker(item.id)}>
            <Text style={styles.addReactionText}>+😊</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <View style={styles.container}>

        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>{groupName}</Text>
            <Text style={styles.headerSub}>Chat do grupo</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={56} color={colors.textLight} />
            <Text style={styles.emptyTitle}>Nenhuma mensagem ainda</Text>
            <Text style={styles.emptyText}>Seja o primeiro a enviar uma mensagem!</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
        )}

        <View style={styles.inputArea}>
          <TouchableOpacity style={styles.photoButton} onPress={handlePickImage} disabled={sending}>
            <Ionicons name="camera-outline" size={24} color={colors.textLight} />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Digite uma mensagem..."
            placeholderTextColor={colors.textLight}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!text.trim() || sending) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!text.trim() || sending}
          >
            {sending
              ? <ActivityIndicator size="small" color={COLORS.white} />
              : <Ionicons name="send" size={20} color={COLORS.white} />
            }
          </TouchableOpacity>
        </View>

      </View>

      <Modal visible={showEmojiPicker} animationType="slide" transparent onRequestClose={() => setShowEmojiPicker(false)}>
        <TouchableOpacity style={styles.emojiOverlay} onPress={() => setShowEmojiPicker(false)} activeOpacity={1}>
          <View style={styles.emojiSheet}>
            <Text style={styles.emojiTitle}>Reagir com</Text>
            <View style={styles.emojiGrid}>
              {EMOJIS.map(emoji => (
                <TouchableOpacity
                  key={emoji}
                  style={styles.emojiButton}
                  onPress={() => handleReact(selectedMessageId, emoji)}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

    </KeyboardAvoidingView>
  );
}

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function makeStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    header: {
      backgroundColor: COLORS.primary, paddingTop: 56, paddingBottom: 16,
      paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center',
      gap: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    headerInfo: { flex: 1 },
    headerTitle: { fontSize: 17, fontWeight: 'bold', color: COLORS.white },
    headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 1 },

    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 40 },
    emptyTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text },
    emptyText: { fontSize: 13, color: colors.textLight, textAlign: 'center' },

    messagesList: { paddingHorizontal: 12, paddingVertical: 16, gap: 4 },
    messageWrapper: { alignItems: 'flex-start', marginBottom: 14 },
    messageWrapperMe: { alignItems: 'flex-end' },

    senderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, marginLeft: 4 },
    senderAvatar: { width: 22, height: 22, borderRadius: 11 },
    senderAvatarPlaceholder: {
      width: 22, height: 22, borderRadius: 11,
      backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
    },
    senderAvatarText: { fontSize: 10, fontWeight: 'bold', color: COLORS.white },
    senderName: { fontSize: 12, fontWeight: '600', color: colors.textLight },

    bubble: { maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 10 },
    bubbleMe: {
      backgroundColor: COLORS.primary,
      borderRadius: 18, borderBottomRightRadius: 4,
    },
    bubbleThem: {
      backgroundColor: colors.surface,
      borderWidth: 1, borderColor: colors.border,
      borderRadius: 18, borderBottomLeftRadius: 4,
    },

    messageText: { fontSize: 15, color: colors.text, lineHeight: 21 },
    messageTextMe: { color: COLORS.white },
    messagePhoto: { width: 200, height: 200, borderRadius: 12 },
    messageMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, justifyContent: 'flex-end' },
    messageTime: { fontSize: 11, color: colors.textLight },
    messageTimeMe: { fontSize: 11, color: 'rgba(255,255,255,0.5)' },

    reactionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: -6, marginLeft: 8 },
    reactionsRowMe: { marginLeft: 0, marginRight: 8, justifyContent: 'flex-end' },
    reactionChip: {
      flexDirection: 'row', alignItems: 'center', gap: 3,
      backgroundColor: colors.surface, paddingHorizontal: 8, paddingVertical: 3,
      borderRadius: 12, borderWidth: 1, borderColor: colors.border,
    },
    reactionChipActive: { backgroundColor: 'rgba(26,54,93,0.2)', borderColor: COLORS.action },
    reactionEmoji: { fontSize: 13 },
    reactionCount: { fontSize: 12, fontWeight: '600', color: COLORS.action },
    addReactionButton: {
      backgroundColor: colors.surface, paddingHorizontal: 8, paddingVertical: 3,
      borderRadius: 12, borderWidth: 1, borderColor: colors.border,
    },
    addReactionText: { fontSize: 13, color: colors.textLight },

    achievementBox: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: 'rgba(214,158,46,0.1)', borderRadius: 16,
      paddingHorizontal: 16, paddingVertical: 10, marginVertical: 8,
      alignSelf: 'center', borderWidth: 1, borderColor: 'rgba(214,158,46,0.3)',
    },
    achievementEmoji: { fontSize: 20 },
    achievementText: { fontSize: 13, fontWeight: '600', color: COLORS.action, flex: 1 },

    inputArea: {
      flexDirection: 'row', alignItems: 'flex-end',
      paddingHorizontal: 12, paddingVertical: 10,
      backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, gap: 8,
    },
    photoButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    input: {
      flex: 1, backgroundColor: colors.background, borderRadius: 22,
      paddingHorizontal: 16, paddingVertical: 10,
      fontSize: 15, color: colors.text,
      borderWidth: 1, borderColor: colors.border, maxHeight: 100,
    },
    sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.action, justifyContent: 'center', alignItems: 'center' },
    sendButtonDisabled: { backgroundColor: colors.textLight },

    emojiOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    emojiSheet: {
      backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      padding: 24, borderTopWidth: 1, borderTopColor: colors.border,
    },
    emojiTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 16, textAlign: 'center' },
    emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 },
    emojiButton: {
      width: 52, height: 52, borderRadius: 26,
      backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center',
      borderWidth: 1, borderColor: colors.border,
    },
    emojiText: { fontSize: 28 },
  });
}
