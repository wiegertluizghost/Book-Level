import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getPendingRequests, getFriendUsers } from '../services/friendshipService';

const FriendshipContext = createContext({
  pendingRequests: [],
  pendingCount: 0,
  friends: [],
  reloadFriendship: () => {},
});

export function FriendshipProvider({ children }) {
  const { user } = useAuth();
  const [pendingRequests, setPendingRequests] = useState([]);
  const [friends, setFriends] = useState([]);

  const reloadFriendship = useCallback(async () => {
    if (!user?.uid) { setPendingRequests([]); setFriends([]); return; }
    const [reqs, friendList] = await Promise.all([
      getPendingRequests(user.uid),
      getFriendUsers(user.uid),
    ]);
    setPendingRequests(reqs);
    setFriends(friendList);
  }, [user?.uid]);

  useEffect(() => { reloadFriendship(); }, [reloadFriendship]);

  return (
    <FriendshipContext.Provider value={{
      pendingRequests,
      pendingCount: pendingRequests.length,
      friends,
      reloadFriendship,
    }}>
      {children}
    </FriendshipContext.Provider>
  );
}

export function useFriendship() {
  return useContext(FriendshipContext);
}
