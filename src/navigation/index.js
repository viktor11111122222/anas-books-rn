import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';

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
      <HomeNav.Screen name="HomeMain"    component={BooksScreen} />
      <HomeNav.Screen name="BookDetail"  component={BookDetailScreen} />
      <HomeNav.Screen name="AuthorBooks" component={AuthorBooksScreen} />
    </HomeNav.Navigator>
  );
}

function ProfileStack() {
  return (
    <ProfileNav.Navigator screenOptions={{ headerShown: false }}>
      <ProfileNav.Screen name="ProfileMain"    component={ProfileScreen} />
      <ProfileNav.Screen name="BookDetail"     component={BookDetailScreen} />
      <ProfileNav.Screen name="AuthorBooks"    component={AuthorBooksScreen} />
      <ProfileNav.Screen name="PrivacyPolicy"  component={PrivacyPolicyScreen} />
      <ProfileNav.Screen name="TermsOfService" component={TermsOfServiceScreen} />
      <ProfileNav.Screen name="UserProfile"    component={UserProfileScreen} />
    </ProfileNav.Navigator>
  );
}

// ── Custom tab bar ────────────────────────────────────────────────────────────

const TAB_ICONS = {
  Search:  { active: 'search',  inactive: 'search-outline' },
  Home:    { active: 'home',    inactive: 'home-outline' },
  Profile: { active: 'person',  inactive: 'person-outline' },
};

function CustomTabBar({ state, navigation }) {
  return (
    <View style={styles.tabBar}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const icons = TAB_ICONS[route.name];
        return (
          <TouchableOpacity
            key={route.key}
            style={styles.tabItem}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            }}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isFocused ? icons.active : icons.inactive}
              size={24}
              color={isFocused ? colors.violet : '#C0C0D8'}
            />
            <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
              {route.name}
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
});
