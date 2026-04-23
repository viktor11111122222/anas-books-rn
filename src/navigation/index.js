import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import { colors } from '../utils/colors';

import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { BooksScreen } from '../screens/BooksScreen';
import { BookDetailScreen } from '../screens/BookDetailScreen';
import { AuthorBooksScreen } from '../screens/AuthorBooksScreen';
import { ProfileScreen } from '../screens/ProfileScreen';

const Stack = createNativeStackNavigator();

// ── Tab bar ───────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'Search',  label: 'Search',  icon: 'search',       iconOutline: 'search-outline' },
  { key: 'Home',    label: 'Home',    icon: 'home',          iconOutline: 'home-outline' },
  { key: 'Profile', label: 'Profile', icon: 'person',        iconOutline: 'person-outline' },
];

function BottomTabBar({ state, navigation }) {
  const activeKey = state.routeNames[state.index];
  return (
    <View style={styles.tabBar}>
      {TABS.map(tab => {
        const isActive = activeKey === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabItem}
            onPress={() => navigation.navigate(tab.key)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isActive ? tab.icon : tab.iconOutline}
              size={24}
              color={isActive ? colors.violet : '#C0C0D8'}
            />
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Tab navigator built manually ──────────────────────────────────────────────

function TabNavigator() {
  const [activeTab, setActiveTab] = React.useState('Home');

  const tabState = {
    routeNames: TABS.map(t => t.key),
    index: TABS.findIndex(t => t.key === activeTab),
  };

  const tabNav = { navigate: (key) => setActiveTab(key) };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        {activeTab === 'Search' && <SearchStack />}
        {activeTab === 'Home' && <HomeStack />}
        {activeTab === 'Profile' && <ProfileStack />}
      </View>
      <BottomTabBar state={tabState} navigation={tabNav} />
    </View>
  );
}

function SearchStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="BooksSearch" component={BooksScreen} />
      <Stack.Screen name="BookDetail" component={BookDetailScreen} />
      <Stack.Screen name="AuthorBooks" component={AuthorBooksScreen} />
    </Stack.Navigator>
  );
}

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="BooksHome" component={BooksScreen} />
      <Stack.Screen name="BookDetail" component={BookDetailScreen} />
      <Stack.Screen name="AuthorBooks" component={AuthorBooksScreen} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen name="BookDetail" component={BookDetailScreen} />
      <Stack.Screen name="AuthorBooks" component={AuthorBooksScreen} />
    </Stack.Navigator>
  );
}

// ── Auth stack ────────────────────────────────────────────────────────────────

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

// ── Root navigator ────────────────────────────────────────────────────────────

export function AppNavigator() {
  const { userSession } = useAuth();
  return (
    <NavigationContainer>
      {userSession ? <TabNavigator /> : <AuthStack />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingTop: 12,
    paddingBottom: 4,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    gap: 4,
  },
  tabIconWrap: {
    width: 28, height: 28, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  tabLabel: { fontSize: 11, color: '#C0C0D8' },
  tabLabelActive: { color: colors.violet, fontWeight: '600' },
});
