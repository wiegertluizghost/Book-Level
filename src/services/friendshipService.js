import {
  collection, doc, getDoc, getDocs, setDoc,
  updateDoc, deleteDoc, query, where, serverTimestamp, documentId,
} from 'firebase/firestore';
import { db } from '../config/firebase';

function fid(uid1, uid2) {
  return [uid1, uid2].sort().join('_');
}

export async function sendFriendRequest(fromId, toId) {
  try {
    const ref = doc(db, 'friendships', fid(fromId, toId));
    const existing = await getDoc(ref);
    if (existing.exists()) return { success: false, error: 'Já existe um pedido ou amizade.' };
    await setDoc(ref, {
      userIds: [fromId, toId].sort(),
      initiatedBy: fromId,
      status: 'pending',
      createdAt: serverTimestamp(),
    });
    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
}

export async function acceptFriendRequest(currentUserId, fromId) {
  try {
    await updateDoc(doc(db, 'friendships', fid(currentUserId, fromId)), { status: 'accepted' });
    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
}

export async function rejectFriendRequest(currentUserId, fromId) {
  try {
    await deleteDoc(doc(db, 'friendships', fid(currentUserId, fromId)));
    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
}

export async function removeFriend(uid1, uid2) {
  try {
    await deleteDoc(doc(db, 'friendships', fid(uid1, uid2)));
    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
}

export async function getFriendshipStatus(currentUserId, otherUserId) {
  try {
    const snap = await getDoc(doc(db, 'friendships', fid(currentUserId, otherUserId)));
    if (!snap.exists()) return 'none';
    const data = snap.data();
    if (data.status === 'accepted') return 'friends';
    if (data.status === 'pending') {
      return data.initiatedBy === currentUserId ? 'pending_sent' : 'pending_received';
    }
    return 'none';
  } catch { return 'none'; }
}

export async function getFriendIds(userId) {
  try {
    const q = query(
      collection(db, 'friendships'),
      where('userIds', 'array-contains', userId),
      where('status', '==', 'accepted'),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data().userIds.find(id => id !== userId));
  } catch { return []; }
}

export async function getPendingRequests(userId) {
  try {
    const q = query(
      collection(db, 'friendships'),
      where('userIds', 'array-contains', userId),
      where('status', '==', 'pending'),
    );
    const snap = await getDocs(q);
    return snap.docs
      .filter(d => d.data().initiatedBy !== userId)
      .map(d => ({ docId: d.id, fromId: d.data().initiatedBy, ...d.data() }));
  } catch { return []; }
}

export async function getFriendUsers(userId) {
  try {
    const friendIds = await getFriendIds(userId);
    if (friendIds.length === 0) return [];
    const chunks = [];
    for (let i = 0; i < friendIds.length; i += 30) chunks.push(friendIds.slice(i, i + 30));
    const users = [];
    for (const chunk of chunks) {
      const q = query(collection(db, 'users'), where(documentId(), 'in', chunk));
      const snap = await getDocs(q);
      snap.docs.forEach(d => users.push({ id: d.id, ...d.data() }));
    }
    return users;
  } catch { return []; }
}

export async function searchUsers(nameQuery) {
  try {
    const lower = nameQuery.trim().toLowerCase();
    if (lower.length < 2) return [];
    const q = query(
      collection(db, 'users'),
      where('nameLower', '>=', lower),
      where('nameLower', '<=', lower + ''),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch { return []; }
}
