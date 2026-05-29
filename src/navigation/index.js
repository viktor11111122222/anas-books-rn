import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, AppState } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import { BASE_URL } from '../utils/api';

import { useAuth } from '../context/AuthContext';
import { colors } from '../utils/colors';

import { LoginScreen }      from '../screens/LoginScreen';
import { RegisterScreen }   from '../screens/RegisterScreen';
import { BooksScreen }      from '../screens/BooksScreen';
import { SearchScreen }     from '../screens/SearchScreen';
import { BookDetailScreen } from '../screens/BookDetailScreen';
import { AuthorBooksScreen } from '../screens/AuthorBooksScreen';
import { ProfileScreen }         from '../screens/ProfileScreen';
import { PrivacyPolicyScreen }  from '../screens/PrivacyPolicyScreen';
import { TermsOfServiceScreen } from '../screens/TermsOfServiceScreen';
import { UserProfileScreen }    from '../screens/UserProfileScreen';
import { InviteScreen }         from '../screens/InviteScreen';
import { ExchangeScreen }         from '../screens/ExchangeScreen';
import { ExchangeRequestsScreen } from '../screens/ExchangeRequestsScreen';
import { GiftsScreen }            from '../screens/GiftsScreen';
import { NotificationsScreen }    from '../screens/NotificationsScreen';

const linking = {
  prefixes: [Linking.createURL('/'), 'anasbooks://'],
  config: {
    screens: {
      Tabs: {
        screens: {},
      },
      Invite: 'invite/:token',
    },
  },
};

const SearchNav  = createNativeStackNavigator();
const HomeNav    = createNativeStackNavigator();
const ProfileNav = createNativeStackNavigator();
const AuthNav    = createNativeStackNavigator();
const RootNav    = createNativeStackNavigator();
const Tab        = createBottomTabNavigator();

// ── Individual stacks ─────────────────────────────────────────────────────────

function SearchStack() {
  return (
    <SearchNav.Navigator screenOptions={{ headerShown: false }}>
      <SearchNav.Screen name="SearchMain"   component={SearchScreen} />
      <SearchNav.Screen name="BookDetail"   component={BookDetailScreen} />
      <SearchNav.Screen name="AuthorBooks"  component={AuthorBooksScreen} />
      <SearchNav.Screen name="UserProfile"  component={UserProfileScreen} />
    </SearchNav.Navigator>
  );
}

function HomeStack() {
  return (
    <HomeNav.Navigator screenOptions={{ headerShown: false }}>
      <HomeNav.Screen name="HomeMain"        component={BooksScreen} />
      <HomeNav.Screen name="BookDetail"      component={BookDetailScreen} />
      <HomeNav.Screen name="AuthorBooks"     component={AuthorBooksScreen} />
      <HomeNav.Screen name="Exchange"        component={ExchangeScreen} />
      <HomeNav.Screen name="ExchangeRequests" component={ExchangeRequestsScreen} />
      <HomeNav.Screen name="UserProfile"     component={UserProfileScreen} />
      <HomeNav.Screen name="Gifts"           component={GiftsScreen} />
      <HomeNav.Screen name="Notifications"   component={NotificationsScreen} />
    </HomeNav.Navigator>
  );
}

function ProfileStack() {
  return (
    <ProfileNav.Navigator screenOptions={{ headerShown: false }}>
      <ProfileNav.Screen name="ProfileMain"       component={ProfileScreen} />
      <ProfileNav.Screen name="BookDetail"        component={BookDetailScreen} />
      <ProfileNav.Screen name="AuthorBooks"       component={AuthorBooksScreen} />
      <ProfileNav.Screen name="PrivacyPolicy"     component={PrivacyPolicyScreen} />
      <ProfileNav.Screen name="TermsOfService"    component={TermsOfServiceScreen} />
      <ProfileNav.Screen name="UserProfile"       component={UserProfileScreen} />
      <ProfileNav.Screen name="Exchange"          component={ExchangeScreen} />
      <ProfileNav.Screen name="ExchangeRequests"  component={ExchangeRequestsScreen} />
      <ProfileNav.Screen name="Gifts"             component={GiftsScreen} />
      <ProfileNav.Screen name="Notifications"     component={NotificationsScreen} />
    </ProfileNav.Navigator>
  );
}

// ── Custom tab bar ────────────────────────────────────────────────────────────

const TAB_ICONS = {
  Search:  { active: 'search', inactive: 'search-outline' },
  Home:    { active: 'home',   inactive: 'home-outline' },
  Profile: { active: 'person', inactive: 'person-outline' },
};

const TAB_LABELS = {
  Search:  'Pretraga',
  Home:    'Home',
  Profile: 'Profil',
};

function useUnreadCount(userSession) {
  const [count, setCount] = useState(0);
  const appState = useRef(AppState.currentState);

  async function fetchCount() {
    if (!userSession) { setCount(0); return; }
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const res = await fetch(`${BASE_URL}/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) { const d = await res.json(); setCount(d.count ?? 0); }
    } catch {}
  }

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    const sub = AppState.addEventListener('change', next => {
      if (appState.current !== 'active' && next === 'active') fetchCount();
      appState.current = next;
    });
    return () => { clearInterval(interval); sub.remove(); };
  }, [userSession]);

  return [count, () => setCount(0)];
}

function CustomTabBar({ state, navigation }) {
  const { userSession } = useAuth();
  const [unreadCount] = useUnreadCount(userSession);

  return (
    <View style={styles.tabBar}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const icons = TAB_ICONS[route.name];
        const showBadge = route.name === 'Profile' && unreadCount > 0;
        return (
          <TouchableOpacity
            key={route.key}
            style={styles.tabItem}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
            }}
            activeOpacity={0.7}
          >
            <View>
              <Ionicons
                name={isFocused ? icons.active : icons.inactive}
                size={24}
                color={isFocused ? colors.violet : '#C0C0D8'}
              />
              {showBadge && (
                <View style={styles.badgeDot}>
                  {unreadCount > 9
                    ? <Text style={styles.badgeDotText}>9+</Text>
                    : <Text style={styles.badgeDotText}>{unreadCount}</Text>}
                </View>
              )}
            </View>
            <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
              {TAB_LABELS[route.name] ?? route.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Tab navigator ─────────────────────────────────────────────────────────────

function TabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Search"  component={SearchStack} />
      <Tab.Screen name="Home"    component={HomeStack} />
      <Tab.Screen name="Profile" component={ProfileStack} />
    </Tab.Navigator>
  );
}

// ── Auth stack ────────────────────────────────────────────────────────────────

function AuthStack() {
  return (
    <AuthNav.Navigator screenOptions={{ headerShown: false }}>
      <AuthNav.Screen name="Login"    component={LoginScreen} />
      <AuthNav.Screen name="Register" component={RegisterScreen} />
    </AuthNav.Navigator>
  );
}

// ── Root (tabs + invite modal) ────────────────────────────────────────────────

function RootNavigator() {
  return (
    <RootNav.Navigator screenOptions={{ headerShown: false }}>
      <RootNav.Screen name="Tabs"   component={TabNavigator} />
      <RootNav.Screen name="Invite" component={InviteScreen}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
    </RootNav.Navigator>
  );
}

// ── App navigator ─────────────────────────────────────────────────────────────

export function AppNavigator() {
  const { userSession } = useAuth();
  return (
    <NavigationContainer linking={userSession ? linking : undefined}>
      {userSession ? <RootNavigator /> : <AuthStack />}
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
  tabLabel: { fontSize: 11, color: '#C0C0D8' },
  tabLabelActive: { color: colors.violet, fontWeight: '600' },
  badgeDot: {
    position: 'absolute', top: -4, right: -6,
    backgroundColor: '#E8445A', borderRadius: 8,
    minWidth: 16, height: 16,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5, borderColor: colors.white,
  },
  badgeDotText: { fontSize: 9, fontWeight: '700', color: colors.white },
});
