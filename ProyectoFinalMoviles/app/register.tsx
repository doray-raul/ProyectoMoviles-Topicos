import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ApiError, getErrorMessage } from '@/api/client';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { ErrorBanner } from '@/components/States';
import { ShrimpIcon } from '@/components/Logo';
import { useAuth } from '@/context/AuthContext';
import { colors, spacing, radius } from '@/theme';

type FieldErrors = Partial<Record<'username' | 'email' | 'password' | 'confirmation', string>>;

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /** Validations that can be checked without asking the server. */
  function validate(): FieldErrors {
    const updated: FieldErrors = {};
    if (username.trim().length < 3) updated.username = 'Mínimo 3 caracteres.';
    if (email && !/^\S+@\S+\.\S+$/.test(email)) updated.email = 'El correo no es válido.';
    if (password.length < 8) updated.password = 'Mínimo 8 caracteres.';
    if (password !== confirmation) updated.confirmation = 'Las contraseñas no coinciden.';
    return updated;
  }

  async function handleRegister() {
    const found = validate();
    setErrors(found);
    setGeneralError('');
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      await signUp({ username: username.trim(), email: email.trim(), password });
    } catch (e) {
      // If the server rejects a field (for example, a repeated username) it is shown under that field
      if (e instanceof ApiError && Object.keys(e.fields).length > 0) {
        setErrors({
          username: e.fields.username?.[0],
          email: e.fields.email?.[0],
          password: e.fields.password?.[0],
        });
      } else {
        setGeneralError(getErrorMessage(e));
      }
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <View style={styles.header}>
          <ShrimpIcon size={56} />
          <View style={styles.headerText}>
            <Text style={styles.title}>Crea tu cuenta</Text>
            <Text style={styles.subtitle}>Así podrás guardar tus favoritos y ajustar la app a tu gusto.</Text>
          </View>
        </View>

        {generalError ? <ErrorBanner message={generalError} /> : null}

        <TextField
          label="Usuario"
          help="Con este nombre vas a entrar a la app."
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          error={errors.username}
        />
        <TextField
          label="Correo (opcional)"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="tucorreo@ejemplo.com"
          error={errors.email}
        />
        <TextField
          label="Contraseña"
          help="Mínimo 8 caracteres."
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          error={errors.password}
        />
        <TextField
          label="Repite la contraseña"
          value={confirmation}
          onChangeText={setConfirmation}
          secureTextEntry
          error={errors.confirmation}
          onSubmitEditing={handleRegister}
        />

        <Button text="Crear mi cuenta" icon="checkmark" onPress={handleRegister} loading={submitting} />
        <Button text="Ya tengo cuenta, iniciar sesión" variant="outline" onPress={() => router.back()} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.l,
    padding: spacing.xl,
    gap: spacing.l,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
  },
});
