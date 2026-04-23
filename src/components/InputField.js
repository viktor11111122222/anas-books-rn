import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../utils/colors';

export function InputField({ icon, placeholder, value, onChangeText, isSecure = false, accentColor = colors.violet }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={[styles.container, { borderColor: accentColor + '33' }]}>
      <Ionicons name={icon} size={18} color={accentColor + 'B3'} style={styles.icon} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={isSecure && !showPassword}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={icon === 'mail-outline' || icon === 'mail' ? 'email-address' : 'default'}
      />
      {isSecure && (
        <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eye}>
          <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={18} color={colors.muted} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  icon: { marginRight: 12 },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.textDark,
  },
  eye: { padding: 4 },
});
