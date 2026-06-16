import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView,
  Platform, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { login } from '../../services/authService';
import { COLORS } from '../../constants/colors';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Atenção', 'Preencha todos os campos.');
      return;
    }
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (!result.success) {
      Alert.alert('Erro ao entrar', traduzirErro(result.error));
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >

      {/* ── Header: seta + título ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Insira os seus dados</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* ── Formulário ── */}
      <View style={styles.body}>

        {/* Card com os dois campos agrupados */}
        <View style={styles.inputCard}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="E-mail"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputSeparator} />

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Senha"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(v => !v)}
              style={styles.eyeBtn}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color="rgba(255,255,255,0.35)"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Botão ENTRAR */}
        <TouchableOpacity
          style={[styles.buttonPrimary, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color={COLORS.primary} />
            : <Text style={styles.buttonPrimaryText}>ENTRAR</Text>
          }
        </TouchableOpacity>

        {/* Link esqueci a senha */}
        <TouchableOpacity style={styles.forgotButton}>
          <Text style={styles.forgotText}>ESQUECI A SENHA</Text>
        </TouchableOpacity>

      </View>

    </KeyboardAvoidingView>
  );
}

function traduzirErro(error) {
  if (error.includes('user-not-found')) return 'Usuário não encontrado.';
  if (error.includes('wrong-password')) return 'Senha incorreta.';
  if (error.includes('invalid-email')) return 'E-mail inválido.';
  if (error.includes('too-many-requests')) return 'Muitas tentativas. Tente mais tarde.';
  return 'Erro ao fazer login. Tente novamente.';
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0D1117',
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  headerSpacer: {
    width: 40,
  },

  /* Body */
  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },

  /* Card de inputs */
  inputCard: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 16,
  },
  inputSeparator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 16,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    paddingVertical: 0,
  },
  eyeBtn: {
    paddingLeft: 12,
    paddingVertical: 16,
  },

  /* Botão ENTRAR */
  buttonPrimary: {
    backgroundColor: COLORS.action,
    borderRadius: 14,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.action,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonPrimaryText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1.4,
  },

  /* Esqueci a senha */
  forgotButton: {
    alignItems: 'center',
    paddingTop: 24,
  },
  forgotText: {
    color: COLORS.action,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
});
