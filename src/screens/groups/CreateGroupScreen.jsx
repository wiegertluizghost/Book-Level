import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Image,
  KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { createGroup } from '../../services/groupService';
import { COLORS } from '../../constants/colors';

export default function CreateGroupScreen({ navigation }) {
  const { user, profile } = useAuth();
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [maxMembers, setMaxMembers] = useState('20');
  const [photoURL, setPhotoURL] = useState(null);
  const [loading, setLoading] = useState(false);

  const styles = makeStyles(colors);

  async function handlePickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permissão negada', 'Precisamos de acesso à sua galeria.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoURL(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  }

  async function handleCreate() {
    if (!name.trim()) { Alert.alert('Atenção', 'Digite um nome para o grupo.'); return; }
    const max = parseInt(maxMembers);
    if (isNaN(max) || max < 2 || max > 100) { Alert.alert('Atenção', 'O limite de membros deve ser entre 2 e 100.'); return; }
    setLoading(true);
    const result = await createGroup(
      user.uid, profile.name, profile.photoURL,
      { name: name.trim(), description: description.trim(), photoURL, maxMembers: max }
    );
    setLoading(false);
    if (!result.success) { Alert.alert('Erro', result.error); return; }
    Alert.alert(
      '🎉 Grupo criado!',
      `Código de convite: ${result.inviteCode}\n\nCompartilhe com seus amigos!`,
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Criar Grupo</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          style={styles.body}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity style={styles.photoContainer} onPress={handlePickPhoto}>
            {photoURL ? (
              <Image source={{ uri: photoURL }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="camera" size={28} color={colors.textLight} />
              </View>
            )}
            <Text style={styles.photoLabel}>FOTO</Text>
          </TouchableOpacity>

          <Text style={styles.label}>NOME DO GRUPO *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Ex: Clube dos Leitores"
            placeholderTextColor={colors.textLight}
            maxLength={50}
          />
          <Text style={styles.counter}>{name.length}/50</Text>

          <Text style={styles.label}>BIOGRAFIA</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Descreva o seu grupo..."
            placeholderTextColor={colors.textLight}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={200}
          />
          <Text style={styles.counter}>{description.length}/200</Text>

          <Text style={styles.label}>LIMITE DE MEMBROS</Text>
          <TextInput
            style={styles.input}
            value={maxMembers}
            onChangeText={setMaxMembers}
            keyboardType="numeric"
            placeholder="20"
            placeholderTextColor={colors.textLight}
          />
          <Text style={styles.hint}>Mínimo 2, máximo 100</Text>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={18} color={colors.textLight} />
            <Text style={styles.infoText}>
              Após criar o grupo você receberá um código de convite para compartilhar com seus amigos.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && { opacity: 0.7 }]}
            onPress={handleCreate}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={colors.background} />
              : <><Ionicons name="people" size={20} color={colors.background} /><Text style={styles.buttonText}>Criar grupo</Text></>
            }
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      backgroundColor: colors.background, paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20,
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
    body: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
    photoContainer: { alignSelf: 'center', alignItems: 'center', marginVertical: 24 },
    photo: { width: 80, height: 80, borderRadius: 20 },
    photoPlaceholder: {
      width: 80, height: 80, borderRadius: 20,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
      justifyContent: 'center', alignItems: 'center',
    },
    photoLabel: { fontSize: 10, color: COLORS.action, marginTop: 8, letterSpacing: 0.8 },
    label: { fontSize: 10, color: colors.textLight, letterSpacing: 0.8, marginBottom: 6, marginTop: 20, textTransform: 'uppercase' },
    input: {
      backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
      fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.border,
    },
    textArea: { height: 100, paddingTop: 14 },
    counter: { fontSize: 11, color: colors.textLight, textAlign: 'right', marginTop: 4 },
    hint: { fontSize: 11, color: colors.textLight, marginTop: 4 },
    infoBox: {
      flexDirection: 'row', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
      borderRadius: 12, padding: 14, marginTop: 20, gap: 10, alignItems: 'flex-start',
    },
    infoText: { flex: 1, fontSize: 13, color: colors.textLight, lineHeight: 18 },
    button: {
      backgroundColor: COLORS.action, borderRadius: 12, paddingVertical: 16,
      flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 24,
    },
    buttonText: { color: colors.background, fontSize: 16, fontWeight: '700' },
  });
}
