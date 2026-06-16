import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from '../screens/home/HomeScreen';
import BookListScreen from '../screens/books/BookListScreen';
import AddReadingScreen from '../screens/books/AddReadingScreen';
import ProgressScreen from '../screens/progress/ProgressScreen';
import RankingScreen from '../screens/ranking/RankingScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import UserProfileScreen from '../screens/profile/UserProfileScreen';
import GroupScreen from '../screens/groups/GroupScreen';
import CreateGroupScreen from '../screens/groups/CreateGroupScreen';
import GroupDetailScreen from '../screens/groups/GroupDetailScreen';
import SetGoalScreen from '../screens/groups/SetGoalScreen';
import GroupChatScreen from '../screens/groups/GroupChatScreen';
import { COLORS } from '../constants/colors';
import { useTheme } from '../context/ThemeContext';
import { useFriendship } from '../context/FriendshipContext';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function BooksStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="BookList" component={BookListScreen} />
      <Stack.Screen name="AddReading" component={AddReadingScreen} />
    </Stack.Navigator>
  );
}

function GroupsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="GroupList" component={GroupScreen} />
      <Stack.Screen name="CreateGroup" component={CreateGroupScreen} />
      <Stack.Screen name="GroupDetail" component={GroupDetailScreen} />
      <Stack.Screen name="SetGoal" component={SetGoalScreen} />
      <Stack.Screen name="GroupChat" component={GroupChatScreen} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} />
    </Stack.Navigator>
  );
}

function ProgressStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProgressMain" component={ProgressScreen} />
      <Stack.Screen name="Ranking" component={RankingScreen} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} />
    </Stack.Navigator>
  );
}

function ProfileTabIcon({ focused, color, size }) {
  const { pendingCount } = useFriendship();
  return (
    <View>
      <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />
      {pendingCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{pendingCount > 9 ? '9+' : pendingCount}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute', top: -4, right: -8,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: '#EF4444',
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
});

const TABS = [
  { name: 'Home',     component: HomeScreen,    icon: 'home',      label: 'Início'    },
  { name: 'Books',    component: BooksStack,    icon: 'book',      label: 'Livros'    },
  { name: 'Groups',   component: GroupsStack,   icon: 'people',    label: 'Grupos'    },
  { name: 'Progress', component: ProgressStack, icon: 'bar-chart', label: 'Progresso' },
  { name: 'Profile',  component: ProfileStack,  icon: 'person',    label: 'Perfil'    },
];

export default function AppNavigator() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: COLORS.action,
        tabBarInactiveTintColor: colors.textLight,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 6,
          height: 68,
        },
        tabBarIcon: ({ focused, color, size }) => {
          if (route.name === 'Profile') {
            return <ProfileTabIcon focused={focused} color={color} size={size} />;
          }
          const tab = TABS.find(t => t.name === route.name);
          const iconName = focused ? tab.icon : `${tab.icon}-outline`;
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      {TABS.map(tab => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={{ tabBarLabel: tab.label }}
          listeners={tab.name === 'Books' ? ({ navigation }) => ({
            tabPress: e => {
              e.preventDefault();
              navigation.navigate('Books', { screen: 'BookList' });
            },
          }) : tab.name === 'Profile' ? ({ navigation }) => ({
            tabPress: e => {
              e.preventDefault();
              navigation.navigate('Profile', { screen: 'ProfileMain' });
            },
          }) : undefined}
        />
      ))}
    </Tab.Navigator>
  );
}
