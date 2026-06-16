import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, ActivityIndicator, Alert, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { register } from '../../services/authService';
import { COLORS } from '../../constants/colors';

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleRegister() {
    if (!name || !email || !password || !confirm) {
      Alert.alert('Atenção', 'Preencha todos os campos.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Atenção', 'As senhas não coincidem.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Atenção', 'A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setLoading(true);
    const result = await register(name, email, password);
    setLoading(false);
    if (!result.success) {
      Alert.alert('Erro ao cadastrar', traduzirErro(result.error));
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >

      {/* ── Header fixo (estilo Duolingo: seta + título) ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Criar conta</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* ── Logo + slogan ── */}
        <View style={styles.logoSection}>
          <Image
            source={require('../../../assets/logo_transparent.png')}
            style={styles.logo}
          />
          <Text style={styles.slogan}>Transforme páginas em conquistas.</Text>
        </View>

        {/* ── Card de inputs agrupados (estilo Duolingo) ── */}
        <View style={styles.inputCard}>

          {/* Nome */}
          <View style={styles.inputRow}>
            <Ionicons
              name="person-outline"
              size={18}
              color="rgba(255,255,255,0.35)"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Nome completo"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputSeparator} />

          {/* E-mail */}
          <View style={styles.inputRow}>
            <Ionicons
              name="mail-outline"
              size={18}
              color="rgba(255,255,255,0.35)"
              style={styles.inputIcon}
            />
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

          {/* Senha */}
          <View style={styles.inputRow}>
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color="rgba(255,255,255,0.35)"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Senha (mínimo 6 caracteres)"
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

          <View style={styles.inputSeparator} />

          {/* Confirmar senha */}
          <View style={styles.inputRow}>
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color="rgba(255,255,255,0.35)"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Confirmar senha"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry={!showConfirm}
            />
            <TouchableOpacity
              onPress={() => setShowConfirm(v => !v)}
              style={styles.eyeBtn}
            >
              <Ionicons
                name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color="rgba(255,255,255,0.35)"
              />
            </TouchableOpacity>
          </View>

        </View>

        {/* Barra de força da senha */}
        {password.length > 0 && <PasswordStrength password={password} />}

        {/* Botão primário */}
        <TouchableOpacity
          style={[styles.buttonPrimary, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color={COLORS.primary} />
            : <Text style={styles.buttonPrimaryText}>CRIAR CONTA</Text>
          }
        </TouchableOpacity>

        {/* Link já tem conta */}
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.linkText}>
            Já tem conta?{'  '}
            <Text style={styles.linkTextBold}>Entrar</Text>
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function PasswordStrength({ password }) {
  function getStrength() {
    if (password.length < 6)  return { label: 'Fraca',  color: '#EF4444',    width: '30%'  };
    if (password.length < 10) return { label: 'Média',  color: COLORS.action, width: '60%' };
    return                           { label: 'Forte',  color: '#22C55E',    width: '100%' };
  }
  const { label, color, width } = getStrength();
  return (
    <View style={styles.strengthContainer}>
      <View style={styles.strengthBar}>
        <View style={[styles.strengthFill, { width, backgroundColor: color }]} />
      </View>
      <Text style={[styles.strengthLabel, { color }]}>{label}</Text>
    </View>
  );
}

function traduzirErro(error) {
  if (error.includes('email-already-in-use')) return 'Este e-mail já está cadastrado.';
  if (error.includes('invalid-email')) return 'E-mail inválido.';
  if (error.includes('weak-password')) return 'Senha muito fraca.';
  return 'Erro ao criar conta. Tente novamente.';
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0D1117',
  },

  /* Header fixo */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 12,
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
    fontSize: 17,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 0.2,
  },
  headerSpacer: {
    width: 40,
  },

  /* ScrollView */
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
  },

  /* Logo */
  logoSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logo: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
    marginBottom: 12,
  },
  slogan: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.2,
  },

  /* Card de inputs agrupados */
  inputCard: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
  },
  inputSeparator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 16,
  },
  inputIcon: {
    marginLeft: 16,
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    paddingVertical: 0,
  },
  eyeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },

  /* Força da senha */
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  strengthBar: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '600',
    width: 40,
  },

  /* Botão primário */
  buttonPrimary: {
    backgroundColor: COLORS.action,
    borderRadius: 16,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.action,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonPrimaryText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1.2,
  },

  /* Link */
  linkButton: {
    alignItems: 'center',
    paddingTop: 24,
  },
  linkText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
  },
  linkTextBold: {
    color: COLORS.action,
    fontWeight: '700',
  },
});
