import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, AntDesign } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { InputField } from '../components/InputField';
import { colors } from '../utils/colors';

export function LoginScreen({ navigation }) {
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');

  async function handleSignIn() {
    await auth.signIn(email, password);
  }

  function handleForgotPassword() {
    setResetEmail(email);
    auth.clearError();
    Alert.prompt(
      'Reset Password',
      "We'll send you a link to reset your password.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Link',
          onPress: async (val) => {
            await auth.resetPassword(val || resetEmail);
          },
        },
      ],
      'plain-text',
      email,
      'email-address'
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.root} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Decorative circles */}
        <View style={[styles.circle, { width: 320, height: 320, left: -130, top: -160, backgroundColor: colors.violet + '1A' }]} />
        <View style={[styles.circle, { width: 250, height: 250, right: -90, top: -100, backgroundColor: colors.sky + '1A' }]} />
        <View style={[styles.circle, { width: 200, height: 200, left: -80, bottom: 60, backgroundColor: colors.mint + '1A' }]} />
        <View style={[styles.circle, { width: 180, height: 180, right: -70, bottom: 20, backgroundColor: colors.violet + '12' }]} />

        {/* Logo */}
        <View style={styles.logoSection}>
          <LinearGradient colors={[colors.violet, colors.sky]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logoBg}>
            <Ionicons name="library" size={36} color={colors.white} />
          </LinearGradient>
          <Text style={styles.appName}>AnasBooks</Text>
          <Text style={styles.tagline}>Rate. Share.</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <InputField
            icon="mail-outline"
            placeholder="Email address"
            value={email}
            onChangeText={v => { setEmail(v); auth.clearError(); }}
            accentColor={colors.violet}
          />
          <View style={{ height: 14 }} />
          <InputField
            icon="lock-closed-outline"
            placeholder="Password"
            value={password}
            onChangeText={v => { setPassword(v); auth.clearError(); }}
            isSecure
            accentColor={colors.violet}
          />
          <TouchableOpacity style={styles.forgotBtn} onPress={handleForgotPassword}>
            <Text style={styles.forgotText}>Forgot your password?</Text>
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
                : <Text style={styles.primaryBtnText}>Sign In</Text>}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.separator}>
            <View style={styles.sepLine} />
            <Text style={styles.sepText}>or</Text>
            <View style={styles.sepLine} />
          </View>

          <TouchableOpacity style={styles.appleBtn} activeOpacity={0.85}>
            <AntDesign name="apple1" size={18} color={colors.textDark} />
            <Text style={styles.appleBtnText}>Continue with Apple</Text>
          </TouchableOpacity>

          <View style={styles.signupRow}>
            <Text style={styles.signupPrompt}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => { auth.clearError(); navigation.navigate('Register'); }}>
              <Text style={styles.signupLink}>Sign up</Text>
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
  logoSection: { alignItems: 'center', paddingTop: 80, paddingBottom: 44 },
  logoBg: {
    width: 90, height: 90, borderRadius: 45,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
    shadowColor: colors.violet, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12,
  },
  appName: { fontSize: 34, fontWeight: '700', color: colors.textDark, marginBottom: 4 },
  tagline: { fontSize: 15, fontWeight: '500', color: colors.violet + 'BF' },
  form: { paddingHorizontal: 28 },
  forgotBtn: { alignSelf: 'flex-end', marginTop: 10 },
  forgotText: { fontSize: 13, color: colors.muted2 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  errorText: { fontSize: 13, color: colors.error, flex: 1 },
  buttons: { paddingHorizontal: 28, paddingBottom: 50, marginTop: 'auto', paddingTop: 24 },
  primaryBtn: {
    height: 54, borderRadius: 18, justifyContent: 'center', alignItems: 'center',
    shadowColor: colors.violet, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 10,
  },
  primaryBtnText: { color: colors.white, fontSize: 17, fontWeight: '700' },
  separator: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 12 },
  sepLine: { flex: 1, height: 1, backgroundColor: '#E0E0F0' },
  sepText: { fontSize: 13, color: colors.muted },
  appleBtn: {
    height: 54, borderRadius: 18, flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', gap: 10, backgroundColor: '#F4F4FB',
    borderWidth: 1.5, borderColor: '#E0E0F0',
  },
  appleBtnText: { fontSize: 16, fontWeight: '600', color: colors.textDark },
  signupRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  signupPrompt: { fontSize: 15, color: colors.muted },
  signupLink: { fontSize: 15, fontWeight: '700', color: colors.muted2 },
});
