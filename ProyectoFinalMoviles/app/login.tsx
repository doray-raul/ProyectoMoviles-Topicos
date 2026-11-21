import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getErrorMessage } from '@/api/client';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { ErrorBanner } from '@/components/States';
import { FullLogo } from '@/components/Logo';
import { useAuth } from '@/context/AuthContext';
import { colors, spacing, radius } from '@/theme';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleLogin() {
    if (!username.trim() || !password) {
      setError('Escribe tu usuario y tu contraseña para entrar.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await signIn(username.trim(), password);
      // No need to navigate: once there is a token, the layout switches to the tabs automatically
    } catch (e) {
      setError(getErrorMessage(e));
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <FullLogo width={240} />
          <Text style={styles.subtitle}>TOSTADAS Y TOSTITOS ESTILO JEREZ</Text>
        </View>

        <View style={styles.card}>
          <View>
            <Text style={styles.cardTitle}>Iniciar sesión</Text>
            <Text style={styles.cardText}>Entra para ver el menú y guardar tus platillos favoritos.</Text>
          </View>

          {error ? <ErrorBanner message={error} /> : null}

          <TextField
            label="Usuario"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Ejemplo: cliente"
          />
          <TextField
            label="Contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Escribe tu contraseña"
            onSubmitEditing={handleLogin}
          />

          <Button text="Entrar" icon="log-in-outline" onPress={handleLogin} loading={submitting} />

          <View style={styles.separator}>
            <View style={styles.line} />
            <Text style={styles.separatorText}>¿Primera vez aquí?</Text>
            <View style={styles.line} />
          </View>

          <Button
            text="Crear una cuenta nueva"
            icon="person-add-outline"
            variant="outline"
            onPress={() => router.push('/register')}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.dark,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.l,
  },
  subtitle: {
    marginTop: spacing.s,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: colors.primary,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.l,
    padding: spacing.xl,
    gap: spacing.l,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  cardText: {
    marginTop: 4,
    fontSize: 14,
    color: colors.textMuted,
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  separatorText: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
