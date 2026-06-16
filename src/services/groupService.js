import {
  collection, doc, addDoc, getDoc, getDocs,
  updateDoc, deleteDoc, serverTimestamp,
  query, where, arrayUnion, arrayRemove
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Gera código de convite aleatório
function generateInviteCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Criar grupo
export async function createGroup(userId, userName, userPhoto, groupData) {
  try {
    const inviteCode = generateInviteCode();
    const ref = await addDoc(collection(db, 'groups'), {
      name: groupData.name,
      description: groupData.description ?? '',
      photoURL: groupData.photoURL ?? null,
      adminId: userId,
      members: [{
        userId,
        name: userName,
        photoURL: userPhoto ?? null,
        joinedAt: new Date().toISOString(),
      }],
      inviteCode,
      maxMembers: groupData.maxMembers ?? 20,
      goal: groupData.goal ?? null,
      createdAt: serverTimestamp(),
    });
    return { success: true, groupId: ref.id, inviteCode };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Buscar grupos do usuário
export async function getUserGroups(userId) {
  try {
    const snap = await getDocs(collection(db, 'groups'));
    const groups = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(g => g.members?.some(m => m.userId === userId));
    return { success: true, groups };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Buscar grupo por ID
export async function getGroup(groupId) {
  try {
    const snap = await getDoc(doc(db, 'groups', groupId));
    if (snap.exists()) return { success: true, group: { id: snap.id, ...snap.data() } };
    return { success: false, error: 'Grupo não encontrado' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Entrar no grupo por código
export async function joinGroupByCode(userId, userName, userPhoto, inviteCode) {
  try {
    const snap = await getDocs(collection(db, 'groups'));
    const groupDoc = snap.docs.find(d => d.data().inviteCode === inviteCode.toUpperCase());

    if (!groupDoc) return { success: false, error: 'Código inválido.' };

    const group = { id: groupDoc.id, ...groupDoc.data() };

    if (group.members?.some(m => m.userId === userId)) {
      return { success: false, error: 'Você já está neste grupo.' };
    }

    if (group.members?.length >= group.maxMembers) {
      return { success: false, error: 'Grupo cheio.' };
    }

    await updateDoc(doc(db, 'groups', group.id), {
      members: arrayUnion({
        userId,
        name: userName,
        photoURL: userPhoto ?? null,
        joinedAt: new Date().toISOString(),
      }),
    });

    return { success: true, groupId: group.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Atualizar grupo (admin)
export async function updateGroup(groupId, data) {
  try {
    await updateDoc(doc(db, 'groups', groupId), data);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Expulsar membro (admin)
export async function removeMember(groupId, memberToRemove) {
  try {
    const { group } = await getGroup(groupId);
    const updatedMembers = group.members.filter(m => m.userId !== memberToRemove.userId);
    await updateDoc(doc(db, 'groups', groupId), { members: updatedMembers });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Sair do grupo
export async function leaveGroup(groupId, userId) {
  try {
    const { group } = await getGroup(groupId);
    const updatedMembers = group.members.filter(m => m.userId !== userId);
    await updateDoc(doc(db, 'groups', groupId), { members: updatedMembers });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Deletar grupo (admin)
export async function deleteGroup(groupId) {
  try {
    await deleteDoc(doc(db, 'groups', groupId));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Adicionar meta ao grupo
export async function setGroupGoal(groupId, goal) {
  try {
    await updateDoc(doc(db, 'groups', groupId), {
      goal: {
        type: goal.type, // 'pages_day' | 'pages_month' | 'books_month' | 'specific_book'
        target: goal.target,
        bookTitle: goal.bookTitle ?? null,
        startDate: goal.startDate,
        endDate: goal.endDate,
        createdAt: new Date().toISOString(),
      }
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}