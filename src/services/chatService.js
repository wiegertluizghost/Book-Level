import {
  collection, addDoc, onSnapshot, query,
  orderBy, serverTimestamp, deleteDoc, doc,
  updateDoc, arrayUnion, getDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';

export async function sendMessage(groupId, user, profile, text, photoURL = null, type = 'text') {
  try {
    await addDoc(collection(db, 'groups', groupId, 'messages'), {
      text: text ?? '',
      photoURL: photoURL ?? null,
      type,
      senderId: user.uid,
      senderName: profile.name,
      senderPhoto: profile.photoURL ?? null,
      reactions: [],
      readBy: [user.uid],
      createdAt: serverTimestamp(),
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export function listenMessages(groupId, callback) {
  const q = query(
    collection(db, 'groups', groupId, 'messages'),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(q, snap => {
    const messages = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(messages);
  });
}

export async function deleteMessage(groupId, messageId) {
  try {
    await deleteDoc(doc(db, 'groups', groupId, 'messages', messageId));
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function toggleReaction(groupId, messageId, userId, emoji) {
  try {
    const ref = doc(db, 'groups', groupId, 'messages', messageId);
    const snap = await getDoc(ref);
    const reactions = snap.data()?.reactions ?? [];

    const existingIndex = reactions.findIndex(r => r.userId === userId && r.emoji === emoji);

    let updatedReactions;
    if (existingIndex >= 0) {
      updatedReactions = reactions.filter((_, i) => i !== existingIndex);
    } else {
      updatedReactions = reactions.filter(r => !(r.userId === userId && r.emoji !== emoji));
      updatedReactions.push({ userId, emoji });
    }

    await updateDoc(ref, { reactions: updatedReactions });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function markAsRead(groupId, messageId, userId) {
  try {
    await updateDoc(doc(db, 'groups', groupId, 'messages', messageId), {
      readBy: arrayUnion(userId),
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function sendAchievement(groupId, userName, text) {
  try {
    await addDoc(collection(db, 'groups', groupId, 'messages'), {
      text,
      photoURL: null,
      type: 'achievement',
      senderId: 'system',
      senderName: userName,
      senderPhoto: null,
      reactions: [],
      readBy: [],
      createdAt: serverTimestamp(),
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}