import React from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet, Platform,
} from 'react-native';
import { COLORS } from '../../constants/colors';

export default function WelcomeScreen({ navigation }) {
  return (
    <View style={styles.root}>

      {/* ── Bloco central: logo + nome + slogan ── */}
      <View style={styles.brandBlock}>
        <Image
          source={require('../../../assets/logo_transparent.png')}
          style={styles.logo}
        />
        <Text style={styles.appName}>BookLevel</Text>
        <Text style={styles.slogan}>Transforme páginas em conquistas.</Text>
      </View>

      {/* ── Espaço flexível (empurra botões para baixo) ── */}
      <View style={styles.spacer} />

      {/* ── Botões na parte inferior ── */}
      <View style={styles.buttonsBlock}>
        <TouchableOpacity
          style={styles.buttonPrimary}
          onPress={() => navigation.navigate('Register')}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonPrimaryText}>COMEÇAR</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.buttonSecondary}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonSecondaryText}>JÁ TENHO UMA CONTA</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0D1117',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 80 : 60,
    paddingBottom: 48,
  },

  /* Marca */
  brandBlock: {
    alignItems: 'center',
  },
  logo: {
    width: 160,
    height: 160,
    resizeMode: 'contain',
  },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.action,
    textAlign: 'center',
    marginTop: 16,
    letterSpacing: 0.5,
  },
  slogan: {
    fontSize: 18,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 26,
  },

  /* Espaço entre marca e botões */
  spacer: {
    flex: 1,
  },

  /* Botões */
  buttonsBlock: {
    gap: 12,
  },
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
  buttonPrimaryText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  buttonSecondary: {
    borderRadius: 14,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'transparent',
  },
  buttonSecondaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
});
