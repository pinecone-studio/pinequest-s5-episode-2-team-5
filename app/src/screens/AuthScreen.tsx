import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../constants/theme';
import { useGame } from '../services/GameContext';
import { Tier, TIERS } from '../types';

const BLURBS: Record<Tier, string> = {
  Beginner: 'New to chemistry. Start with the basics.',
  Intermediate: 'Know the basics. Bonds, pH and the table.',
  Advanced: 'Ready for equations, moles and reactions.',
};

export function AuthScreen() {
  const { signUp, login } = useGame();
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [tier, setTier] = useState<Tier>('Beginner');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const err = mode === 'signup' ? signUp(nickname, password, tier) : login(nickname, password);
    setError(err);
  };

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.logo}>Chemy Lab</Text>
      <Text style={styles.sub}>A 2D virtual chemistry world</Text>

      <View style={styles.tabs}>
        {(['signup', 'login'] as const).map((m) => (
          <Pressable key={m} onPress={() => { setMode(m); setError(null); }} style={[styles.tab, mode === m && styles.tabOn]}>
            <Text style={styles.tabText}>{m === 'signup' ? 'Sign up' : 'Log in'}</Text>
          </Pressable>
        ))}
      </View>

      <TextInput
        style={styles.input}
        placeholder="Nickname"
        placeholderTextColor={colors.muted}
        value={nickname}
        onChangeText={setNickname}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor={colors.muted}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {mode === 'signup' && (
        <View style={{ width: '100%' }}>
          <Text style={styles.label}>Choose your starting class</Text>
          {TIERS.map((t) => (
            <Pressable key={t} onPress={() => setTier(t)} style={[styles.card, tier === t && styles.cardOn]}>
              <Text style={styles.cardTitle}>{t}</Text>
              <Text style={styles.cardText}>{BLURBS[t]}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable onPress={submit} style={styles.button}>
        <Text style={styles.buttonText}>{mode === 'signup' ? 'Create character' : 'Enter lab'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12, maxWidth: 480, alignSelf: 'center', width: '100%' },
  logo: { fontSize: 36, fontWeight: '900', color: colors.accent },
  sub: { color: colors.muted, marginBottom: 12 },
  tabs: { flexDirection: 'row', gap: 8, width: '100%' },
  tab: { flex: 1, padding: 10, borderRadius: 8, backgroundColor: colors.panel, alignItems: 'center' },
  tabOn: { backgroundColor: colors.panelLight },
  tabText: { color: colors.text, fontWeight: '700' },
  input: { width: '100%', backgroundColor: colors.panel, color: colors.text, padding: 12, borderRadius: 8 },
  label: { color: colors.muted, marginBottom: 6 },
  card: { backgroundColor: colors.panel, padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 2, borderColor: 'transparent' },
  cardOn: { borderColor: colors.accent },
  cardTitle: { color: colors.text, fontWeight: '800' },
  cardText: { color: colors.muted, fontSize: 12 },
  error: { color: colors.danger },
  button: { width: '100%', backgroundColor: colors.accent, padding: 14, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#06260f', fontWeight: '900' },
});
