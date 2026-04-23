import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { InputField } from '../components/InputField';
import { colors } from '../utils/colors';

export function RegisterScreen({ navigation }) {
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.root} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Decorative circles */}
        <View style={[styles.circle, { width: 300, height: 300, right: -100, top: -160, backgroundColor: colors.mint + '1A' }]} />
        <View style={[styles.circle, { width: 250, height: 250, left: -120, top: -100, backgroundColor: colors.sky + '1A' }]} />
        <View style={[styles.circle, { width: 200, height: 200, right: -80, bottom: 40, backgroundColor: colors.violet + '14' }]} />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => { auth.clearError(); navigation.goBack(); }}>
            <Ionicons name="close" size={18} color={colors.textDark} />
          </TouchableOpacity>
        </View>

        {/* Logo */}
        <View style={styles.logoSection}>
          <LinearGradient colors={[colors.mint, colors.sky]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logoBg}>
            <Ionicons name="person-add" size={32} color={colors.white} />
          </LinearGradient>
          <Text style={styles.appName}>Create Account</Text>
          <Text style={styles.tagline}>Join the AnasBooks community</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <InputField
            icon="mail-outline"
            placeholder="Email address"
            value={email}
            onChangeText={v => { setEmail(v); auth.clearError(); }}
            accentColor={colors.mint}
          />
          <View style={{ height: 14 }} />
          <InputField
            icon="lock-closed-outline"
            placeholder="Password (min. 6 characters)"
            value={password}
            onChangeText={v => { setPassword(v); auth.clearError(); }}
            isSecure
            accentColor={colors.mint}
          />
          <View style={{ height: 14 }} />
          <InputField
            icon="lock-closed"
            placeholder="Confirm password"
            value={confirmPassword}
            onChangeText={v => { setConfirmPassword(v); auth.clearError(); }}
            isSecure
            accentColor={colors.mint}
          />

          {auth.errorMessage ? (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={15} color={colors.error} />
              <Text style={styles.errorText}>{auth.errorMessage}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.buttons}>
          <TouchableOpacity
            onPress={() => auth.signUp(email, password, confirmPassword)}
            disabled={auth.isLoading}
            activeOpacity={0.85}
          >
            <LinearGradient colors={[colors.mint, colors.sky]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryBtn}>
              {auth.isLoading
                ? <ActivityIndicator color={colors.white} />
                : <Text style={styles.primaryBtnText}>Sign Up</Text>}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.signinRow}>
            <Text style={styles.signinPrompt}>Already have an account? </Text>
            <TouchableOpacity onPress={() => { auth.clearError(); navigation.goBack(); }}>
              <Text style={styles.signinLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  scroll: { flexGrow: 1, overflow: 'hidden' },
  circle: { position: 'absolute', borderRadius: 999 },
  header: { paddingHorizontal: 28, paddingTop: 20 },
  closeBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F4F4FB', justifyContent: 'center', alignItems: 'center',
  },
  logoSection: { alignItems: 'center', paddingTop: 20, paddingBottom: 40 },
  logoBg: {
    width: 80, height: 80, borderRadius: 40,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
    shadowColor: colors.mint, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 10,
  },
  appName: { fontSize: 30, fontWeight: '700', color: colors.textDark, marginBottom: 4 },
  tagline: { fontSize: 14, fontWeight: '500', color: colors.muted2 },
  form: { paddingHorizontal: 28 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  errorText: { fontSize: 13, color: colors.error, flex: 1 },
  buttons: { paddingHorizontal: 28, paddingBottom: 50, marginTop: 'auto', paddingTop: 24 },
  primaryBtn: {
    height: 54, borderRadius: 18, justifyContent: 'center', alignItems: 'center',
    shadowColor: colors.mint, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 10,
  },
  primaryBtnText: { color: colors.white, fontSize: 17, fontWeight: '700' },
  signinRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  signinPrompt: { fontSize: 15, color: colors.muted },
  signinLink: { fontSize: 15, fontWeight: '700', color: colors.muted2 },
});
