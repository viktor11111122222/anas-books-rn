import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform,
  ActivityIndicator, Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { InputField } from '../components/InputField';
import { colors } from '../utils/colors';

export function RegisterScreen({ navigation }) {
  const auth = useAuth();
  const insets = useSafeAreaInsets();
  const emailRef    = useRef(null);
  const passwordRef = useRef(null);
  const confirmRef  = useRef(null);

  const [displayName, setDisplayName]         = useState('');
  const [email, setEmail]                     = useState('');
  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  async function handleSignUp() {
    Keyboard.dismiss();
    await auth.signUp(email, password, confirmPassword, displayName);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.root}
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Decorative circles */}
        <View style={[styles.circle, { width: 300, height: 300, right: -100, top: -160, backgroundColor: colors.mint + '1A' }]} />
        <View style={[styles.circle, { width: 250, height: 250, left: -120, top: -100, backgroundColor: colors.sky + '1A' }]} />
        <View style={[styles.circle, { width: 200, height: 200, right: -80, bottom: 40, backgroundColor: colors.violet + '14' }]} />

        {/* Header */}
        <View style={[styles.header, { paddingTop: 4 }]}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => { auth.clearError(); navigation.goBack(); }}>
            <Ionicons name="arrow-back" size={18} color={colors.textDark} />
          </TouchableOpacity>
        </View>

        {/* Logo */}
        <View style={styles.logoSection}>
          <LinearGradient colors={[colors.mint, colors.sky]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logoBg}>
            <Ionicons name="person-add" size={32} color={colors.white} />
          </LinearGradient>
          <Text style={styles.appName}>Napravi nalog</Text>
          <Text style={styles.tagline}>Pridruži se AnasBooks zajednici</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <InputField
            icon="person-outline"
            placeholder="Ime ili nadimak"
            value={displayName}
            onChangeText={v => { setDisplayName(v); auth.clearError(); }}
            accentColor={colors.mint}
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
          />
          <View style={{ height: 14 }} />
          <InputField
            ref={emailRef}
            icon="mail-outline"
            placeholder="Email adresa"
            value={email}
            onChangeText={v => { setEmail(v); auth.clearError(); }}
            accentColor={colors.mint}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
          <View style={{ height: 14 }} />
          <InputField
            ref={passwordRef}
            icon="lock-closed-outline"
            placeholder="Lozinka (min. 6 karaktera)"
            value={password}
            onChangeText={v => { setPassword(v); auth.clearError(); }}
            isSecure
            accentColor={colors.mint}
            returnKeyType="next"
            onSubmitEditing={() => confirmRef.current?.focus()}
          />
          <View style={{ height: 14 }} />
          <InputField
            ref={confirmRef}
            icon="lock-closed"
            placeholder="Potvrdi lozinku"
            value={confirmPassword}
            onChangeText={v => { setConfirmPassword(v); auth.clearError(); }}
            isSecure
            accentColor={colors.mint}
            returnKeyType="done"
            onSubmitEditing={handleSignUp}
          />

          {auth.errorMessage ? (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={15} color={colors.error} />
              <Text style={styles.errorText}>{auth.errorMessage}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.buttons}>
          <TouchableOpacity onPress={handleSignUp} disabled={auth.isLoading} activeOpacity={0.85}>
            <LinearGradient colors={[colors.mint, colors.sky]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryBtn}>
              {auth.isLoading
                ? <ActivityIndicator color={colors.white} />
                : <Text style={styles.primaryBtnText}>Registruj se</Text>}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.signinRow}>
            <Text style={styles.signinPrompt}>Već imaš nalog? </Text>
            <TouchableOpacity onPress={() => { auth.clearError(); navigation.goBack(); }}>
              <Text style={styles.signinLink}>Prijavi se</Text>
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
  header: { paddingHorizontal: 28 },
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
  tagline: { fontSize: 14, fontWeight: '500', color: colors.muted },
  form: { paddingHorizontal: 28 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  errorText: { fontSize: 13, color: colors.error, flex: 1 },
  buttons: { paddingHorizontal: 28, paddingBottom: 50, marginTop: 'auto', paddingTop: 24 },
  primaryBtn: {
    height: 54, borderRadius: 18, justifyContent: 'center', alignItems: 'center',
    shadowColor: colors.mint, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 10,
  },
  primaryBtnText: { color: colors.white, fontSize: 17, fontWeight: '700' },
  signinRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 22 },
  signinPrompt: { fontSize: 15, color: colors.muted },
  signinLink: { fontSize: 15, fontWeight: '700', color: colors.mint },
});
