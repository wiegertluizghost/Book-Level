import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { setGroupGoal } from '../../services/groupService';
import { COLORS } from '../../constants/colors';

const GOAL_TYPES = [
  { key: 'pages_day', label: 'Páginas por dia', icon: 'document-text', unit: 'páginas/dia' },
  { key: 'pages_month', label: 'Páginas por mês', icon: 'calendar', unit: 'páginas/mês' },
  { key: 'books_month', label: 'Livros por mês', icon: 'book', unit: 'livros/mês' },
  { key: 'specific_book', label: 'Terminar um livro juntos', icon: 'library', unit: 'páginas' },
];

function formatDate(value) {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 4) return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
  return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
}

function isValidDate(date) {
  const parts = date.split('/');
  if (parts.length !== 3) return false;
  const [day, month, year] = parts.map(Number);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return false;
  if (day < 1 || day > 31) return false;
  if (month < 1 || month > 12) return false;
  if (year < 2024 || year > 2100) return false;
  return true;
}

async function searchGoogleBooks(query) {
  try {
    const q = encodeURIComponent(`intitle:${query}`);
    const url = `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=15&orderBy=relevance&key=AIzaSyC87M6WjTRe2aag9UddQWAfpcO-JuFdjkc`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.items) return [];
    const queryLower = query.toLowerCase();
    const results = data.items.map(item => ({
      title: item.volumeInfo.title ?? 'Sem título',
      author: item.volumeInfo.authors?.join(', ') ?? 'Autor desconhecido',
      totalPages: item.volumeInfo.pageCount ?? 0,
      coverURL: item.volumeInfo.imageLinks?.thumbnail ?? null,
    }));
    results.sort((a, b) => {
      const aMatch = a.title.toLowerCase().includes(queryLower);
      const bMatch = b.title.toLowerCase().includes(queryLower);
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
      if (a.totalPages > 0 && b.totalPages === 0) return -1;
      if (a.totalPages === 0 && b.totalPages > 0) return 1;
      return 0;
    });
    return results.slice(0, 8);
  } catch (e) { return []; }
}

export default function SetGoalScreen({ navigation, route }) {
  const { groupId } = route.params;
  const { colors } = useTheme();
  const [goalType, setGoalType] = useState('pages_day');
  const [target, setTarget] = useState('');
  const [selectedBook, setSelectedBook] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [bookQuery, setBookQuery] = useState('');
  const [bookSuggestions, setBookSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);

  const styles = makeStyles(colors);

  async function handleBookSearch() {
    if (bookQuery.trim().length < 3) { Alert.alert('Atenção', 'Digite pelo menos 3 caracteres.'); return; }
    setSearching(true);
    setBookSuggestions([]);
    const results = await searchGoogleBooks(bookQuery.trim());
    setBookSuggestions(results);
    setSearching(false);
  }

  async function handleSave() {
    if (goalType !== 'specific_book' && (!target || parseInt(target) <= 0)) {
      Alert.alert('Atenção', 'Digite um valor válido para a meta.'); return;
    }
    if (!isValidDate(startDate)) { Alert.alert('Atenção', 'Data de início inválida. Use DD/MM/AAAA.'); return; }
    if (!isValidDate(endDate)) { Alert.alert('Atenção', 'Data de fim inválida. Use DD/MM/AAAA.'); return; }
    if (goalType === 'specific_book' && !selectedBook) {
      Alert.alert('Atenção', 'Selecione um livro para a meta.'); return;
    }

    setLoading(true);
    const res = await setGroupGoal(groupId, {
      type: goalType,
      target: goalType === 'specific_book' ? selectedBook.totalPages : parseInt(target),
      bookTitle: selectedBook?.title ?? null,
      bookAuthor: selectedBook?.author ?? null,
      bookCover: selectedBook?.coverURL ?? null,
      startDate,
      endDate,
    });
    setLoading(false);

    if (!res.success) { Alert.alert('Erro', res.error); return; }
    Alert.alert('✅ Meta definida!', '', [{ text: 'OK', onPress: () => navigation.goBack() }]);
  }

  const selectedType = GOAL_TYPES.find(g => g.key === goalType);

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
          <Text style={styles.headerTitle}>Definir Meta</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          <Text style={styles.label}>TIPO DE META</Text>
          <View style={styles.goalTypeGrid}>
            {GOAL_TYPES.map(g => (
              <TouchableOpacity
                key={g.key}
                style={[styles.goalTypeCard, goalType === g.key && styles.goalTypeCardActive]}
                onPress={() => { setGoalType(g.key); setSelectedBook(null); setBookQuery(''); setBookSuggestions([]); }}
              >
                <Ionicons name={g.icon} size={24} color={goalType === g.key ? COLORS.action : colors.textLight} />
                <Text style={[styles.goalTypeLabel, goalType === g.key && styles.goalTypeLabelActive]}>{g.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {goalType === 'specific_book' && (
            <>
              <Text style={styles.label}>BUSCAR LIVRO</Text>

              {selectedBook ? (
                <View style={styles.selectedBookCard}>
                  {selectedBook.coverURL ? (
                    <Image source={{ uri: selectedBook.coverURL }} style={styles.selectedBookCover} />
                  ) : (
                    <View style={styles.selectedBookCoverPlaceholder}>
                      <Ionicons name="book" size={20} color={COLORS.white} />
                    </View>
                  )}
                  <View style={styles.selectedBookInfo}>
                    <Text style={styles.selectedBookTitle} numberOfLines={2}>{selectedBook.title}</Text>
                    <Text style={styles.selectedBookAuthor}>{selectedBook.author}</Text>
                    <Text style={styles.selectedBookPages}>{selectedBook.totalPages} páginas</Text>
                  </View>
                  <TouchableOpacity onPress={() => { setSelectedBook(null); setBookQuery(''); setBookSuggestions([]); }}>
                    <Ionicons name="close-circle" size={22} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <View style={styles.searchRow}>
                    <View style={styles.searchBox}>
                      <Ionicons name="search-outline" size={18} color={colors.textLight} />
                      <TextInput
                        style={styles.searchInput}
                        value={bookQuery}
                        onChangeText={v => { setBookQuery(v); setBookSuggestions([]); }}
                        placeholder="Ex: Harry Potter..."
                        placeholderTextColor={colors.textLight}
                        returnKeyType="search"
                        onSubmitEditing={handleBookSearch}
                      />
                    </View>
                    <TouchableOpacity style={styles.searchButton} onPress={handleBookSearch} disabled={searching}>
                      {searching
                        ? <ActivityIndicator size="small" color={colors.background} />
                        : <Ionicons name="search" size={20} color={colors.background} />
                      }
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.hint}>Digite o nome e toque em 🔍 para buscar</Text>

                  {bookSuggestions.length > 0 && (
                    <View style={styles.suggestionsContainer}>
                      {bookSuggestions.map((book, i) => (
                        <TouchableOpacity
                          key={i}
                          style={styles.suggestionItem}
                          onPress={() => { setSelectedBook(book); setBookSuggestions([]); }}
                        >
                          {book.coverURL ? (
                            <Image source={{ uri: book.coverURL }} style={styles.suggestionCover} />
                          ) : (
                            <View style={styles.suggestionCoverPlaceholder}>
                              <Ionicons name="book" size={14} color={COLORS.white} />
                            </View>
                          )}
                          <View style={styles.suggestionInfo}>
                            <Text style={styles.suggestionTitle} numberOfLines={1}>{book.title}</Text>
                            <Text style={styles.suggestionAuthor} numberOfLines={1}>{book.author}</Text>
                            {book.totalPages > 0 && <Text style={styles.suggestionPages}>{book.totalPages} páginas</Text>}
                          </View>
                          <Ionicons name="add-circle-outline" size={22} color={COLORS.action} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {bookSuggestions.length === 0 && !searching && bookQuery.length >= 3 && (
                    <Text style={styles.noResults}>Nenhum livro encontrado. Tente outro termo.</Text>
                  )}
                </>
              )}
            </>
          )}

          {goalType !== 'specific_book' && (
            <>
              <Text style={styles.label}>META: QUANTAS {selectedType?.unit?.toUpperCase()}?</Text>
              <TextInput
                style={styles.input}
                value={target}
                onChangeText={v => setTarget(v.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
                placeholder="Ex: 30"
                placeholderTextColor={colors.textLight}
              />
            </>
          )}

          <Text style={styles.label}>PERÍODO</Text>
          <View style={styles.periodContainer}>
            <Ionicons name="calendar-outline" size={18} color={colors.textLight} style={{ marginLeft: 14 }} />
            <TextInput
              style={styles.periodInput}
              value={startDate}
              onChangeText={v => setStartDate(formatDate(v))}
              placeholder="DD/MM/AAAA"
              placeholderTextColor={colors.textLight}
              keyboardType="numeric"
              maxLength={10}
            />
            <Text style={styles.periodArrow}>→</Text>
            <TextInput
              style={styles.periodInput}
              value={endDate}
              onChangeText={v => setEndDate(formatDate(v))}
              placeholder="DD/MM/AAAA"
              placeholderTextColor={colors.textLight}
              keyboardType="numeric"
              maxLength={10}
            />
          </View>

          {isValidDate(startDate) && isValidDate(endDate) && (goalType === 'specific_book' ? selectedBook : target) && (
            <View style={styles.previewBox}>
              <Ionicons name="flag" size={20} color={COLORS.action} />
              <Text style={styles.previewText}>
                {goalType === 'specific_book' ? `Livro: ` : `Meta: `}
                <Text style={styles.previewBold}>
                  {goalType === 'specific_book' ? selectedBook.title : `${target} ${selectedType?.unit}`}
                </Text>
                {'\n'}De <Text style={styles.previewBold}>{startDate}</Text> até <Text style={styles.previewBold}>{endDate}</Text>
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, loading && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={colors.background} />
              : <><Ionicons name="checkmark-circle" size={20} color={colors.background} /><Text style={styles.buttonText}>Salvar meta</Text></>
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
    label: { fontSize: 10, color: colors.textLight, letterSpacing: 0.8, marginBottom: 8, marginTop: 20, textTransform: 'uppercase' },
    input: {
      backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
      fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.border,
    },
    periodContainer: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, height: 52,
    },
    periodInput: { flex: 1, paddingVertical: 14, paddingHorizontal: 8, fontSize: 14, color: colors.text, letterSpacing: 1, textAlign: 'center' },
    periodArrow: { color: colors.textLight, fontSize: 16, paddingHorizontal: 2 },
    goalTypeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    goalTypeCard: {
      width: '47%', backgroundColor: colors.surface, borderRadius: 12,
      paddingVertical: 16, paddingHorizontal: 12, alignItems: 'center', gap: 8,
      borderWidth: 1, borderColor: colors.border,
    },
    goalTypeCardActive: { backgroundColor: 'rgba(214,158,46,0.08)', borderColor: COLORS.action },
    goalTypeLabel: { fontSize: 12, color: colors.textLight, fontWeight: '500', textAlign: 'center' },
    goalTypeLabelActive: { color: COLORS.action, fontWeight: '600' },
    searchRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    searchBox: {
      flex: 1, flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
      gap: 8, borderWidth: 1, borderColor: colors.border,
    },
    searchInput: { flex: 1, fontSize: 15, color: colors.text },
    searchButton: { backgroundColor: COLORS.action, width: 46, height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    hint: { fontSize: 12, color: colors.textLight, marginTop: 6 },
    noResults: { fontSize: 13, color: colors.textLight, textAlign: 'center', marginTop: 12 },
    suggestionsContainer: { marginTop: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
    suggestionItem: {
      flexDirection: 'row', alignItems: 'center', padding: 12,
      backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 12,
    },
    suggestionCover: { width: 36, height: 50, borderRadius: 6 },
    suggestionCoverPlaceholder: { width: 36, height: 50, borderRadius: 6, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
    suggestionInfo: { flex: 1 },
    suggestionTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
    suggestionAuthor: { fontSize: 12, color: colors.textLight, marginTop: 2 },
    suggestionPages: { fontSize: 11, color: COLORS.action, marginTop: 2, fontWeight: '600' },
    selectedBookCard: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.surface, borderRadius: 12, padding: 12, gap: 12,
      borderWidth: 1, borderColor: COLORS.action,
    },
    selectedBookCover: { width: 50, height: 70, borderRadius: 8 },
    selectedBookCoverPlaceholder: { width: 50, height: 70, borderRadius: 8, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
    selectedBookInfo: { flex: 1 },
    selectedBookTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
    selectedBookAuthor: { fontSize: 12, color: colors.textLight, marginTop: 2 },
    selectedBookPages: { fontSize: 11, color: COLORS.action, marginTop: 4, fontWeight: '600' },
    previewBox: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 10,
      backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginTop: 20,
      borderWidth: 1, borderColor: colors.border,
    },
    previewText: { flex: 1, fontSize: 14, color: colors.text, lineHeight: 22 },
    previewBold: { fontWeight: 'bold', color: COLORS.action },
    button: {
      backgroundColor: COLORS.action, borderRadius: 12, paddingVertical: 16,
      flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 24,
    },
    buttonText: { color: colors.background, fontSize: 16, fontWeight: '700' },
  });
}
