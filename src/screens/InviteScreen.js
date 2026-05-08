import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { BASE_URL } from '../utils/api';
import { colors } from '../utils/colors';
import { useAuth } from '../context/AuthContext';

function AvatarCircle({ uri, initial, size = 90 }) {
  const [failed, setFailed] = React.useState(false);
  if (uri && !failed) {
    return (
      <ExpoImage
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <LinearGradient
      colors={[colors.violet, colors.sky]}
      style={{ width: size, height: size, borderRadius: size / 2, justifyContent: 'center', alignItems: 'center' }}
    >
      <Text style={{ fontSize: size * 0.38, fontWeight: '700', color: colors.white }}>{initial}</Text>
    </LinearGradient>
  );
}

export function InviteScreen({ route, navigation }) {
  const { token } = route.params ?? {};
  const { userSession } = useAuth();
  const insets = useSafeAreaInsets();

  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null); // 'sent' | 'accepted' | 'already_friends' | 'already_sent'
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    if (!token) { setLoadError('Nevažeći link.'); setLoading(false); return; }
    fetch(`${BASE_URL}/friends/preview/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.id) setPreview(data);
        else setLoadError(data.message || 'Nevažeći link.');
      })
      .catch(() => setLoadError('Greška pri učitavanju.'))
      .finally(() => setLoading(false));
  }, [token]);

  async function sendRequest() {
    if (!userSession) {
      Alert.alert('Nisi prijavljen', 'Potrebno je da se prijavi da bi poslao zahtev za prijateljstvo.');
      return;
    }
    setSending(true);
    try {
      const authToken = await SecureStore.getItemAsync('auth_token');
      const res = await fetch(`${BASE_URL}/friends/request/${token}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus(data.status === 'accepted' ? 'accepted' : 'sent');
      } else {
        if (data.message === 'Već ste prijatelji.') setStatus('already_friends');
        else if (data.message === 'Zahtev je već poslat.') setStatus('already_sent');
        else Alert.alert('Greška', data.message || 'Nije uspelo slanje zahteva.');
      }
    } catch {
      Alert.alert('Greška', 'Proverite internet vezu.');
    } finally {
      setSending(false);
    }
  }

  const containerStyle = [s.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }];

  if (loading) {
    return (
      <View style={containerStyle}>
        <ActivityIndicator color={colors.violet} size="large" style={{ flex: 1 }} />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={containerStyle}>
        <View style={s.errorBox}>
          <View style={s.errorIconBg}>
            <Ionicons name="link-outline" size={32} color={colors.muted} />
          </View>
          <Text style={s.errorTitle}>Link nije validan</Text>
          <Text style={s.errorSub}>{loadError}</Text>
          <TouchableOpacity style={s.closeBtn} onPress={() => navigation.goBack()}>
            <Text style={s.closeBtnText}>Zatvori</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const name = preview.display_name || 'Korisnik';
  const initial = name[0]?.toUpperCase() || '?';

  return (
    <View style={containerStyle}>
      <TouchableOpacity
        style={[s.xBtn, { top: insets.top + 12 }]}
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="close" size={20} color={colors.textDark} />
      </TouchableOpacity>

      <View style={s.card}>
        <View style={s.avatarWrap}>
          <AvatarCircle uri={preview.avatar_url} initial={initial} size={88} />
        </View>

        <Text style={s.nameText}>{name}</Text>
        <Text style={s.subText}>te poziva da budete prijatelji</Text>

        <View style={s.divider} />

        {status === 'sent' && (
          <View style={s.statusBox}>
            <Ionicons name="checkmark-circle" size={24} color={colors.mint} />
            <Text style={s.statusText}>Zahtev je poslat!</Text>
          </View>
        )}
        {status === 'accepted' && (
          <View style={s.statusBox}>
            <Ionicons name="people" size={24} color={colors.violet} />
            <Text style={s.statusText}>Sada ste prijatelji!</Text>
          </View>
        )}
        {status === 'already_friends' && (
          <View style={s.statusBox}>
            <Ionicons name="people" size={24} color={colors.violet} />
            <Text style={s.statusText}>Već ste prijatelji</Text>
          </View>
        )}
        {status === 'already_sent' && (
          <View style={s.statusBox}>
            <Ionicons name="time-outline" size={24} color={colors.muted} />
            <Text style={s.statusText}>Zahtev je već poslat</Text>
          </View>
        )}

        {!status && (
          <TouchableOpacity style={s.sendBtn} onPress={sendRequest} disabled={sending} activeOpacity={0.85}>
            <LinearGradient
              colors={[colors.violet, colors.sky]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.sendBtnGrad}
            >
              {sending ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <Ionicons name="person-add" size={18} color={colors.white} />
                  <Text style={s.sendBtnText}>Pošalji zahtev za prijateljstvo</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 14 }}>
          <Text style={s.laterText}>Možda kasnije</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  xBtn: {
    position: 'absolute',
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EBEBF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
  },
  avatarWrap: {
    marginBottom: 16,
    shadowColor: colors.violet,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
  },
  nameText: { fontSize: 22, fontWeight: '700', color: colors.textDark, textAlign: 'center' },
  subText: { fontSize: 15, color: colors.muted, marginTop: 6, textAlign: 'center' },
  divider: { width: '100%', height: 1, backgroundColor: colors.cardBorder, marginVertical: 20 },
  sendBtn: { width: '100%' },
  sendBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 54, borderRadius: 18,
  },
  sendBtnText: { fontSize: 16, fontWeight: '700', color: colors.white },
  laterText: { fontSize: 14, color: colors.muted },
  statusBox: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  statusText: { fontSize: 16, fontWeight: '600', color: colors.textDark },

  // Error state
  errorBox: { alignItems: 'center', gap: 12, paddingHorizontal: 20 },
  errorIconBg: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#F0EFF8', justifyContent: 'center', alignItems: 'center',
  },
  errorTitle: { fontSize: 18, fontWeight: '700', color: colors.textDark },
  errorSub: { fontSize: 14, color: colors.muted, textAlign: 'center' },
  closeBtn: {
    marginTop: 8, paddingHorizontal: 28, paddingVertical: 12,
    backgroundColor: colors.violet + '14', borderRadius: 16,
  },
  closeBtnText: { fontSize: 15, fontWeight: '600', color: colors.violet },
});
