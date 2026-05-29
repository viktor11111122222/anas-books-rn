import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Keyboard, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const LOGO = require('../../assets/logo.png');
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { InputField } from '../components/InputField';
import { colors } from '../utils/colors';

export function LoginScreen({ navigation }) {
  const auth = useAuth();
  const insets = useSafeAreaInsets();
  const passwordRef = useRef(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  async function handleSignIn() {
    Keyboard.dismiss();
    await auth.signIn(email, password);
  }

  async function handleReset() {
    Keyboard.dismiss();
    await auth.resetPassword(resetEmail || email);
  }

  function openForgot() {
    auth.clearError();
    setResetEmail(email);
    setShowForgot(true);
  }

  if (showForgot) {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.root}
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.circle, { width: 320, height: 320, left: -130, top: -160, backgroundColor: colors.sky + '1A' }]} />
          <View style={[styles.circle, { width: 200, height: 200, right: -80, bottom: 60, backgroundColor: colors.violet + '12' }]} />

          <View style={styles.logoSection}>
            <Image source={LOGO} style={styles.logoImg} resizeMode="contain" />
            <Text style={styles.appName}>Resetuj lozinku</Text>
            <Text style={styles.tagline}>Pošaljemo ti link za reset</Text>
          </View>

          <View style={styles.form}>
            <InputField
              icon="mail-outline"
              placeholder="Email adresa"
              value={resetEmail}
              onChangeText={v => { setResetEmail(v); auth.clearError(); }}
              accentColor={colors.violet}
            />

            {auth.errorMessage ? (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle" size={15} color={colors.error} />
                <Text style={styles.errorText}>{auth.errorMessage}</Text>
              </View>
            ) : null}

            {auth.resetEmailSent ? (
              <View style={styles.successRow}>
                <Ionicons name="checkmark-circle" size={15} color={colors.mint} />
                <Text style={styles.successText}>
                  Ako nalog postoji, poslali smo ti uputstvo na email.
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.buttons}>
            {!auth.resetEmailSent && (
              <TouchableOpacity onPress={handleReset} disabled={auth.isLoading} activeOpacity={0.85}>
                <LinearGradient colors={[colors.violet, colors.sky]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryBtn}>
                  {auth.isLoading
                    ? <ActivityIndicator color={colors.white} />
                    : <Text style={styles.primaryBtnText}>Pošalji link</Text>}
                </LinearGradient>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.backRow}
              onPress={() => { auth.clearError(); auth.setResetEmailSent(false); setShowForgot(false); }}
            >
              <Ionicons name="arrow-back" size={16} color={colors.violet} />
              <Text style={styles.backText}>Nazad na prijavu</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.root}
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Decorative circles */}
        <View style={[styles.circle, { width: 320, height: 320, left: -130, top: -160, backgroundColor: colors.violet + '1A' }]} />
        <View style={[styles.circle, { width: 250, height: 250, right: -90, top: -100, backgroundColor: colors.sky + '1A' }]} />
        <View style={[styles.circle, { width: 200, height: 200, left: -80, bottom: 60, backgroundColor: colors.mint + '1A' }]} />
        <View style={[styles.circle, { width: 180, height: 180, right: -70, bottom: 20, backgroundColor: colors.violet + '12' }]} />

        {/* Logo */}
        <View style={styles.logoSection}>
          <Image source={LOGO} style={styles.logoImg} resizeMode="contain" />
          <Text style={styles.appName}>AnasBooks</Text>
          <Text style={styles.tagline}>Pronađi i uporedi cene knjiga</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <InputField
            icon="mail-outline"
            placeholder="Email adresa"
            value={email}
            onChangeText={v => { setEmail(v); auth.clearError(); }}
            accentColor={colors.violet}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
          <View style={{ height: 14 }} />
          <InputField
            ref={passwordRef}
            icon="lock-closed-outline"
            placeholder="Lozinka"
            value={password}
            onChangeText={v => { setPassword(v); auth.clearError(); }}
            isSecure
            accentColor={colors.violet}
            returnKeyType="done"
            onSubmitEditing={handleSignIn}
          />
          <TouchableOpacity style={styles.forgotBtn} onPress={openForgot}>
            <Text style={styles.forgotText}>Zaboravili ste lozinku?</Text>
          </TouchableOpacity>

          {auth.errorMessage ? (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={15} color={colors.error} />
              <Text style={styles.errorText}>{auth.errorMessage}</Text>
            </View>
          ) : null}
        </View>

        {/* Buttons */}
        <View style={styles.buttons}>
          <TouchableOpacity onPress={handleSignIn} disabled={auth.isLoading} activeOpacity={0.85}>
            <LinearGradient colors={[colors.violet, colors.sky]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryBtn}>
              {auth.isLoading
                ? <ActivityIndicator color={colors.white} />
                : <Text style={styles.primaryBtnText}>Prijavi se</Text>}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.signupRow}>
            <Text style={styles.signupPrompt}>Nemaš nalog? </Text>
            <TouchableOpacity onPress={() => { auth.clearError(); navigation.navigate('Register'); }}>
              <Text style={styles.signupLink}>Registruj se</Text>
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
  logoSection: { alignItems: 'center', paddingTop: 32, paddingBottom: 36 },
  logoImg: {
    width: 220, height: 124,
    marginBottom: 10,
  },
  appName: { fontSize: 34, fontWeight: '700', color: colors.textDark, marginBottom: 4 },
  tagline: { fontSize: 14, fontWeight: '500', color: colors.muted },
  form: { paddingHorizontal: 28 },
  forgotBtn: { alignSelf: 'flex-end', marginTop: 10 },
  forgotText: { fontSize: 13, color: colors.violet },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  errorText: { fontSize: 13, color: colors.error, flex: 1 },
  successRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 12 },
  successText: { fontSize: 13, color: colors.mint, flex: 1, lineHeight: 18 },
  buttons: { paddingHorizontal: 28, paddingBottom: 50, marginTop: 'auto', paddingTop: 24 },
  primaryBtn: {
    height: 54, borderRadius: 18, justifyContent: 'center', alignItems: 'center',
    shadowColor: colors.violet, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 10,
  },
  primaryBtnText: { color: colors.white, fontSize: 17, fontWeight: '700' },
  signupRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 22 },
  signupPrompt: { fontSize: 15, color: colors.muted },
  signupLink: { fontSize: 15, fontWeight: '700', color: colors.violet },
  backRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20 },
  backText: { fontSize: 15, fontWeight: '600', color: colors.violet },
});
