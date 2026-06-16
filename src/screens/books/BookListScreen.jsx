import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Modal, ActivityIndicator, Alert, ScrollView,
  Image, KeyboardAvoidingView, Platform, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getUserLibrary, addBook, addBookToLibrary, updateCurrentPage, updateBookStatus, removeBookFromLibrary } from '../../services/bookService';
import { getReadingHistory, logReading } from '../../services/readingService';
import { recordFinishedBook, removeBookStats, subtractProgress, addFinishBonus } from '../../services/userService';
import { COLORS } from '../../constants/colors';

const STATUS_FILTERS = [
  { key: 'all',      label: 'Todos'    },
  { key: 'reading',  label: 'Lendo'    },
  { key: 'finished', label: 'Lidos'    },
  { key: 'wishlist', label: 'Quero Ler'},
  { key: 'history',  label: 'Histórico'},
];

const STATUS_OPTIONS = [
  { key: 'reading',  label: 'Lendo agora', color: '#38A169' },
  { key: 'wishlist', label: 'Quero ler',   color: '#9F85C5' },
  { key: 'finished', label: 'Já li',       color: '#4A9ECC' },
];

function fixCoverURL(url) {
  if (!url) return null;
  return url.replace('http://', 'https://').replace('&edge=curl', '');
}

async function searchGoogleBooks(query) {
  try {
    const q = encodeURIComponent(`intitle:${query}`);
    const url = `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=20&orderBy=relevance&key=AIzaSyC87M6WjTRe2aag9UddQWAfpcO-JuFdjkc`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.items) return [];
    const queryLower = query.toLowerCase();
    const results = data.items.map(item => ({
      googleId: item.id,
      title: item.volumeInfo.title ?? 'Sem título',
      author: item.volumeInfo.authors?.join(', ') ?? 'Autor desconhecido',
      totalPages: item.volumeInfo.pageCount ?? 0,
      genre: item.volumeInfo.categories?.[0] ?? '',
      coverURL: fixCoverURL(item.volumeInfo.imageLinks?.thumbnail ?? null),
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
    return results.slice(0, 10);
  } catch (e) { return []; }
}

function formatLogDate(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
  const now = new Date();
  const diff = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Ontem';
  if (diff < 7) return `${diff} dias atrás`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export default function BookListScreen({ navigation }) {
  const { user, profile, refreshProfile } = useAuth();
  const { colors } = useTheme();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('reading');
  const [initialPages, setInitialPages] = useState('');

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailBook, setDetailBook] = useState(null);
  const [newPage, setNewPage] = useState('');
  const [updatingPage, setUpdatingPage] = useState(false);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const [readingLogs, setReadingLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const searchTimerRef = useRef(null);
  const styles = makeStyles(colors);

  useEffect(() => { loadBooks(); }, []);

  useEffect(() => {
    if (filter === 'history' && readingLogs.length === 0) loadLogs();
  }, [filter]);

  useEffect(() => {
    if (searchQuery.trim().length < 2) { setSuggestions([]); return; }
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => doSearch(searchQuery.trim()), 600);
    return () => clearTimeout(searchTimerRef.current);
  }, [searchQuery]);

  async function doSearch(q) {
    setSearching(true);
    const results = await searchGoogleBooks(q);
    setSuggestions(results);
    setSearching(false);
  }

  async function loadBooks(silent = false) {
    if (!silent) setLoading(true);
    const res = await getUserLibrary(user.uid);
    if (res.success) setBooks(res.books);
    if (!silent) setLoading(false);
  }

  async function loadLogs() {
    setLogsLoading(true);
    const res = await getReadingHistory(user.uid);
    if (res.success) setReadingLogs(res.logs);
    setLogsLoading(false);
  }

  async function onRefresh() {
    setIsRefreshing(true);
    await loadBooks(true);
    if (filter === 'history') await loadLogs();
    setIsRefreshing(false);
  }

  const filteredBooks = books.filter(b => {
    if (filter === 'history') return false;
    const matchFilter = filter === 'all' || b.status === filter;
    const matchSearch = !search || b.title?.toLowerCase().includes(search.toLowerCase()) ||
      b.author?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const counts = {
    all: books.length,
    reading: books.filter(b => b.status === 'reading').length,
    finished: books.filter(b => b.status === 'finished').length,
    wishlist: books.filter(b => b.status === 'wishlist').length,
  };

  function closeAddModal() {
    setShowAddModal(false);
    setSearchQuery('');
    setSelectedBook(null);
    setSuggestions([]);
    setSelectedStatus('reading');
    setInitialPages('');
  }

  async function handleAddBook() {
    if (!selectedBook) { Alert.alert('Atenção', 'Selecione um livro.'); return; }
    if (!selectedBook.totalPages || selectedBook.totalPages === 0) {
      Alert.alert('Atenção', 'Este livro não tem número de páginas. Tente outro.'); return;
    }
    const pages = parseInt(initialPages) || 0;
    if (pages > selectedBook.totalPages) {
      Alert.alert('Atenção', `O livro tem apenas ${selectedBook.totalPages} páginas.`); return;
    }
    setAddLoading(true);
    try {
      const bookRes = await addBook({
        title: selectedBook.title,
        author: selectedBook.author,
        totalPages: selectedBook.totalPages,
        genre: selectedBook.genre ?? '',
        coverURL: selectedBook.coverURL ?? null,
      });
      if (!bookRes.success) {
        Alert.alert('Erro ao adicionar', bookRes.error ?? 'Tente novamente.');
        setAddLoading(false);
        return;
      }

      const libRes = await addBookToLibrary(
        user.uid, bookRes.bookId,
        {
          title: selectedBook.title,
          author: selectedBook.author,
          totalPages: selectedBook.totalPages,
          genre: selectedBook.genre ?? '',
          coverURL: selectedBook.coverURL ?? null,
        },
        selectedStatus, pages, 0
      );
      if (!libRes.success) {
        Alert.alert('Erro ao salvar na biblioteca', libRes.error ?? 'Tente novamente.');
        setAddLoading(false);
        return;
      }

      let xpMsg = '';

      if (selectedStatus === 'finished') {
        // Livro já lido: XP completo via recordFinishedBook
        const result = await recordFinishedBook(user.uid, selectedBook.totalPages, bookRes.bookId);
        await refreshProfile();
        xpMsg = `\n+${result.xpEarned} XP ganhos!`;
      } else if (selectedStatus === 'reading' && pages > 0) {
        // Lendo com páginas já lidas: usa logReading para computar corretamente
        const result = await logReading(
          user.uid,
          bookRes.bookId,
          selectedBook.title,
          pages,
          pages,
          selectedBook.totalPages
        );
        await refreshProfile();
        if (result.success) xpMsg = `\n+${result.xpEarned} XP pelas páginas já lidas!`;
      }

      setAddLoading(false);
      closeAddModal();
      await loadBooks();
      Alert.alert('Livro adicionado à biblioteca!' + xpMsg);
    } catch (e) {
      Alert.alert('Erro inesperado', e.message);
      setAddLoading(false);
    }
  }

  function openDetail(book) {
    setDetailBook(book);
    setNewPage(String(book.currentPage ?? 0));
    setShowDetailModal(true);
  }

  async function handleUpdatePage() {
    const page = parseInt(newPage);
    if (isNaN(page) || page < 0) { Alert.alert('Atenção', 'Página inválida.'); return; }
    if (page > detailBook.totalPages) {
      Alert.alert('Atenção', `O livro tem apenas ${detailBook.totalPages} páginas.`); return;
    }

    const currentPage = detailBook.currentPage ?? 0;
    const delta = page - currentPage;

    setUpdatingPage(true);

    if (delta > 0) {
      // Para frente: ganha XP + streak + conquistas
      await logReading(user.uid, detailBook.id, detailBook.title, delta, page, detailBook.totalPages);
      await refreshProfile();
    } else if (delta < 0) {
      // Para trás: subtrai XP proporcional + páginas
      const pagesBack = Math.abs(delta);
      const wasFinished = detailBook.status === 'finished' && page < detailBook.totalPages;
      await subtractProgress(user.uid, detailBook.id, pagesBack, wasFinished);
      await updateCurrentPage(user.uid, detailBook.id, page, detailBook.totalPages);
      await refreshProfile();
    }
    // delta === 0: nenhuma mudança

    setUpdatingPage(false);
    setShowDetailModal(false);
    loadBooks();
    if (delta > 0 && page >= detailBook.totalPages) Alert.alert('Parabéns!', 'Você concluiu este livro!');
  }

  async function handleChangeStatus(bookId, status) {
    if (status === 'finished' && detailBook?.status !== 'finished') {
      const remainingPages = detailBook.totalPages - (detailBook.currentPage ?? 0);
      if (remainingPages > 0) {
        // Lê as páginas restantes + ganha bônus de conclusão via logReading
        await logReading(user.uid, bookId, detailBook.title, remainingPages, detailBook.totalPages, detailBook.totalPages);
      } else {
        // Já está na última página — só adiciona o bônus de conclusão
        await addFinishBonus(user.uid, bookId);
      }
      await refreshProfile();
    }
    await updateBookStatus(user.uid, bookId, status);
    setShowDetailModal(false);
    loadBooks();
  }

  async function handleRemove(bookId) {
    Alert.alert('Remover livro', 'Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover', style: 'destructive', onPress: async () => {
          try {
            await removeBookStats(user.uid, bookId, {
              currentPage: detailBook?.currentPage ?? 0,
              totalPages: detailBook?.totalPages ?? 0,
              status: detailBook?.status,
              startingXP: detailBook?.startingXP ?? 0,
            });
            await refreshProfile();
            await removeBookFromLibrary(user.uid, bookId);
            setShowDetailModal(false);
            loadBooks();
          } catch (e) {
            Alert.alert('Erro ao remover', e.message);
          }
        }
      },
    ]);
  }

  if (loading) return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={COLORS.action} />
    </View>
  );

  return (
    <View style={styles.container}>

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Minha Biblioteca</Text>
          <Text style={styles.headerSub}>{books.length} livros cadastrados</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={22} color={COLORS.action} />
        </TouchableOpacity>
      </View>

      {filter !== 'history' && (
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={17} color={colors.textLight} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por título ou autor..."
            placeholderTextColor={colors.textLight}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={17} color={colors.textLight} />
            </TouchableOpacity>
          )}
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll} contentContainerStyle={styles.filtersContent}>
        {STATUS_FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterChipText, filter === f.key && styles.filterChipTextActive]}>
              {f.label}{f.key !== 'history' && counts[f.key] !== undefined ? ` (${counts[f.key]})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {filter === 'history' ? (
        logsLoading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={COLORS.action} />
          </View>
        ) : readingLogs.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={48} color={colors.textLight} />
            <Text style={styles.emptyTitle}>Nenhuma sessão registrada</Text>
            <Text style={styles.emptyText}>Registre sua primeira leitura para ver o histórico.</Text>
          </View>
        ) : (
          <FlatList
            data={readingLogs}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={COLORS.action} colors={[COLORS.action]} />}
            renderItem={({ item }) => (
              <View style={styles.logCard}>
                <View style={styles.logIconWrap}>
                  <Ionicons name="book" size={18} color={COLORS.action} />
                </View>
                <View style={styles.logInfo}>
                  <Text style={styles.logBook} numberOfLines={1}>{item.bookTitle}</Text>
                  <Text style={styles.logMeta}>{item.pagesRead} páginas lidas</Text>
                </View>
                <View style={styles.logRight}>
                  <Text style={styles.logXP}>+{item.xpEarned} XP</Text>
                  <Text style={styles.logDate}>{formatLogDate(item.date)}</Text>
                </View>
              </View>
            )}
          />
        )
      ) : filteredBooks.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="book-outline" size={48} color={colors.textLight} />
          <Text style={styles.emptyTitle}>{search ? 'Nenhum livro encontrado' : 'Nenhum livro aqui ainda'}</Text>
          <Text style={styles.emptyText}>{search ? 'Tente outro termo.' : 'Toque no + para adicionar!'}</Text>
          {!search && (
            <TouchableOpacity style={styles.emptyButton} onPress={() => setShowAddModal(true)}>
              <Text style={styles.emptyButtonText}>Adicionar livro</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredBooks}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <BookCard book={item} onPress={() => openDetail(item)} styles={styles} colors={colors} />}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={COLORS.action} colors={[COLORS.action]} />}
        />
      )}

      {/* Modal: Adicionar Livro */}
      <Modal visible={showAddModal} animationType="slide" transparent onRequestClose={closeAddModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Adicionar Livro</Text>
              <TouchableOpacity onPress={closeAddModal}>
                <Ionicons name="close" size={24} color={colors.textLight} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              <Text style={styles.modalLabel}>Buscar livro</Text>
              <View style={styles.modalSearchBox}>
                <Ionicons name="search-outline" size={17} color={searching ? COLORS.action : colors.textLight} />
                <TextInput
                  style={styles.modalSearchInput}
                  value={searchQuery}
                  onChangeText={v => { setSearchQuery(v); setSelectedBook(null); if (v.trim().length < 2) setSuggestions([]); }}
                  placeholder="Digite o nome do livro..."
                  placeholderTextColor={colors.textLight}
                  returnKeyType="search"
                  onSubmitEditing={() => searchQuery.trim().length >= 2 && doSearch(searchQuery.trim())}
                  autoFocus={false}
                />
                {searching
                  ? <ActivityIndicator size="small" color={COLORS.action} />
                  : searchQuery.length > 0
                    ? <TouchableOpacity onPress={() => { setSearchQuery(''); setSuggestions([]); setSelectedBook(null); }}>
                        <Ionicons name="close-circle" size={17} color={colors.textLight} />
                      </TouchableOpacity>
                    : null
                }
              </View>
              {searchQuery.length >= 2 && !searching && suggestions.length === 0 && !selectedBook && (
                <Text style={styles.hint}>Nenhum resultado encontrado. Tente outro título.</Text>
              )}
              {searchQuery.length < 2 && !selectedBook && (
                <Text style={styles.hint}>Digite pelo menos 2 caracteres para buscar</Text>
              )}

              {suggestions.length > 0 && !selectedBook && (
                <View style={styles.suggestionsContainer}>
                  {suggestions.map((book, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[styles.suggestionItem, i === suggestions.length - 1 && { borderBottomWidth: 0 }]}
                      onPress={() => { setSelectedBook(book); setSuggestions([]); setSearchQuery(book.title); }}
                    >
                      {book.coverURL
                        ? <Image source={{ uri: book.coverURL }} style={styles.suggestionCover} />
                        : <View style={styles.suggestionCoverPlaceholder}><Ionicons name="book" size={14} color={colors.textLight} /></View>
                      }
                      <View style={styles.suggestionInfo}>
                        <Text style={styles.suggestionTitle} numberOfLines={2}>{book.title}</Text>
                        <Text style={styles.suggestionAuthor} numberOfLines={1}>{book.author}</Text>
                        {book.totalPages > 0 && <Text style={styles.suggestionPages}>{book.totalPages} páginas</Text>}
                        {book.totalPages === 0 && <Text style={[styles.suggestionPages, { color: COLORS.error }]}>Páginas não disponíveis</Text>}
                      </View>
                      <Ionicons name="add-circle-outline" size={22} color={COLORS.action} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {selectedBook && (
                <>
                  <View style={styles.selectedBookCard}>
                    {selectedBook.coverURL
                      ? <Image source={{ uri: selectedBook.coverURL }} style={styles.selectedBookCover} />
                      : <View style={styles.selectedBookCoverPlaceholder}><Ionicons name="book" size={24} color={colors.textLight} /></View>
                    }
                    <View style={styles.selectedBookInfo}>
                      <Text style={styles.selectedBookTitle}>{selectedBook.title}</Text>
                      <Text style={styles.selectedBookAuthor}>{selectedBook.author}</Text>
                      <Text style={styles.selectedBookPages}>{selectedBook.totalPages} páginas</Text>
                    </View>
                    <TouchableOpacity onPress={() => { setSelectedBook(null); setSearchQuery(''); }}>
                      <Ionicons name="close-circle" size={22} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.modalLabel}>Status de leitura</Text>
                  <View style={styles.statusOptions}>
                    {STATUS_OPTIONS.map(s => (
                      <TouchableOpacity
                        key={s.key}
                        style={[styles.statusOption, selectedStatus === s.key && { borderColor: s.color, backgroundColor: `${s.color}18` }]}
                        onPress={() => setSelectedStatus(s.key)}
                      >
                        <Text style={[styles.statusOptionText, selectedStatus === s.key && { color: s.color, fontWeight: '700' }]}>{s.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {selectedStatus === 'reading' && (
                    <>
                      <Text style={styles.modalLabel}>Páginas já lidas (opcional)</Text>
                      <View style={styles.pageInputRow}>
                        <TouchableOpacity style={styles.pageBtn} onPress={() => setInitialPages(p => String(Math.max(0, (parseInt(p) || 0) - 1)))}>
                          <Ionicons name="remove" size={20} color={COLORS.action} />
                        </TouchableOpacity>
                        <TextInput
                          style={styles.pageInput}
                          value={initialPages}
                          onChangeText={v => setInitialPages(v.replace(/[^0-9]/g, ''))}
                          keyboardType="numeric"
                          placeholder="0"
                          placeholderTextColor={colors.textLight}
                          textAlign="center"
                        />
                        <TouchableOpacity style={styles.pageBtn} onPress={() => setInitialPages(p => String(Math.min(selectedBook.totalPages, (parseInt(p) || 0) + 1)))}>
                          <Ionicons name="add" size={20} color={COLORS.action} />
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.hint}>de {selectedBook.totalPages} páginas no total</Text>
                    </>
                  )}

                  <TouchableOpacity
                    style={[styles.modalButton, addLoading && { opacity: 0.7 }]}
                    onPress={handleAddBook}
                    disabled={addLoading}
                  >
                    {addLoading
                      ? <ActivityIndicator color={COLORS.white} />
                      : <Text style={styles.modalButtonText}>Adicionar à biblioteca</Text>
                    }
                  </TouchableOpacity>
                </>
              )}

              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal: Detalhes */}
      <Modal visible={showDetailModal} animationType="slide" transparent onRequestClose={() => setShowDetailModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detalhes do Livro</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={24} color={colors.textLight} />
              </TouchableOpacity>
            </View>

            {detailBook && (
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                <View style={styles.detailBookRow}>
                  {detailBook.coverURL
                    ? <Image source={{ uri: detailBook.coverURL }} style={styles.detailBookCover} />
                    : <View style={styles.detailBookCoverPlaceholder}><Ionicons name="book" size={32} color={colors.textLight} /></View>
                  }
                  <View style={styles.detailBookInfo}>
                    <Text style={styles.detailBookTitle}>{detailBook.title}</Text>
                    <Text style={styles.detailBookAuthor}>{detailBook.author}</Text>
                    <Text style={styles.detailBookPages}>{detailBook.totalPages} páginas</Text>
                    {detailBook.genre ? <Text style={styles.detailBookGenre}>{detailBook.genre}</Text> : null}
                  </View>
                </View>

                {detailBook.status === 'reading' && (
                  <View style={styles.progressCard}>
                    <View style={styles.cardTitleRow}>
                      <Ionicons name="book-outline" size={15} color={COLORS.action} />
                      <Text style={styles.progressCardTitle}>Progresso de leitura</Text>
                    </View>
                    <View style={styles.progressBarBg}>
                      <View style={[styles.progressBarFill, { width: `${Math.min(((parseInt(newPage) || 0) / detailBook.totalPages) * 100, 100)}%` }]} />
                    </View>
                    <Text style={styles.progressPercent}>
                      {Math.round(((parseInt(newPage) || 0) / detailBook.totalPages) * 100)}% — Página {newPage} de {detailBook.totalPages}
                    </Text>
                    <View style={styles.pageInputRow}>
                      <TouchableOpacity style={styles.pageBtn} onPress={() => setNewPage(p => String(Math.max(0, (parseInt(p) || 0) - 1)))}>
                        <Ionicons name="remove" size={20} color={COLORS.action} />
                      </TouchableOpacity>
                      <TextInput
                        style={styles.pageInput}
                        value={newPage}
                        onChangeText={v => setNewPage(v.replace(/[^0-9]/g, ''))}
                        keyboardType="numeric"
                        textAlign="center"
                      />
                      <TouchableOpacity style={styles.pageBtn} onPress={() => setNewPage(p => String(Math.min(detailBook.totalPages, (parseInt(p) || 0) + 1)))}>
                        <Ionicons name="add" size={20} color={COLORS.action} />
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                      style={[styles.modalButton, updatingPage && { opacity: 0.7 }]}
                      onPress={handleUpdatePage}
                      disabled={updatingPage}
                    >
                      {updatingPage
                        ? <ActivityIndicator color={COLORS.white} />
                        : <Text style={styles.modalButtonText}>Salvar progresso</Text>
                      }
                    </TouchableOpacity>
                  </View>
                )}

                <Text style={styles.modalLabel}>Mover para</Text>
                <View style={styles.statusOptions}>
                  {STATUS_OPTIONS.filter(s => s.key !== detailBook.status).map(s => (
                    <TouchableOpacity
                      key={s.key}
                      style={[styles.statusOption, { borderColor: s.color }]}
                      onPress={() => handleChangeStatus(detailBook.id, s.key)}
                    >
                      <Text style={[styles.statusOptionText, { color: s.color }]}>{s.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity style={styles.removeButton} onPress={() => handleRemove(detailBook.id)}>
                  <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                  <Text style={styles.removeButtonText}>Remover da biblioteca</Text>
                </TouchableOpacity>

                <View style={{ height: 24 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

    </View>
  );
}

function BookCard({ book, onPress, styles, colors }) {
  const progress = book.totalPages > 0 ? (book.currentPage || 0) / book.totalPages : 0;
  const statusConfig = {
    reading:  { label: 'Lendo',     color: '#38A169', bg: 'rgba(56,161,105,0.15)' },
    finished: { label: 'Concluído', color: '#4A9ECC', bg: 'rgba(74,158,204,0.15)' },
    wishlist: { label: 'Quero ler', color: '#9F85C5', bg: 'rgba(159,133,197,0.15)' },
  };
  const status = statusConfig[book.status] ?? statusConfig.wishlist;

  return (
    <TouchableOpacity style={styles.bookCard} onPress={onPress} activeOpacity={0.85}>
      {book.coverURL
        ? <Image source={{ uri: book.coverURL }} style={styles.bookCoverImage} />
        : <View style={styles.bookCover}><Ionicons name="book" size={24} color={colors.textLight} /></View>
      }
      <View style={styles.bookInfo}>
        <View style={styles.bookTopRow}>
          <Text style={styles.bookTitle} numberOfLines={2}>{book.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
        <Text style={styles.bookAuthor} numberOfLines={1}>{book.author}</Text>
        {book.status === 'reading' && (
          <>
            <View style={styles.bookProgressBg}>
              <View style={[styles.bookProgressFill, { width: `${Math.min(progress * 100, 100)}%` }]} />
            </View>
            <Text style={styles.bookProgressText}>Pág. {book.currentPage ?? 0} de {book.totalPages} · {Math.round(progress * 100)}%</Text>
          </>
        )}
        {book.status === 'finished' && (
          <View style={styles.finishedRow}>
            <Ionicons name="checkmark-circle" size={13} color={COLORS.support} />
            <Text style={styles.finishedText}>{book.totalPages} páginas lidas</Text>
          </View>
        )}
        {book.status === 'wishlist' && (
          <Text style={styles.wishlistText}>Toque para começar a ler</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },

    header: {
      paddingTop: 56, paddingBottom: 20, paddingHorizontal: 24,
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    },
    headerTitle: { fontSize: 22, fontWeight: '800', color: colors.text },
    headerSub: { fontSize: 13, color: colors.textLight, marginTop: 2 },
    addButton: {
      width: 40, height: 40, borderRadius: 10,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
      justifyContent: 'center', alignItems: 'center',
    },

    searchBox: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
      borderRadius: 10, marginHorizontal: 16, marginBottom: 12,
      paddingHorizontal: 14, paddingVertical: 11, gap: 8,
    },
    searchInput: { flex: 1, fontSize: 14, color: colors.text },

    filtersScroll: {},
    filtersContent: { paddingHorizontal: 20, gap: 8, paddingBottom: 12 },
    filterChip: {
      height: 36, paddingHorizontal: 14, borderRadius: 18,
      borderWidth: 1, borderColor: colors.border,
      justifyContent: 'center', alignItems: 'center',
    },
    filterChipActive: { borderColor: COLORS.action },
    filterChipText: { fontSize: 13, fontWeight: '600', color: colors.textLight },
    filterChipTextActive: { color: COLORS.action },

    listContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 32, gap: 8 },
    bookCard: {
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
      borderRadius: 12, padding: 14, flexDirection: 'row', gap: 14,
    },
    bookCover: {
      width: 58, height: 82, borderRadius: 8,
      backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center',
    },
    bookCoverImage: { width: 58, height: 82, borderRadius: 8 },
    bookInfo: { flex: 1 },
    bookTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
    bookTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.text, lineHeight: 20 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    statusText: { fontSize: 11, fontWeight: '700' },
    bookAuthor: { fontSize: 12, color: colors.textLight, marginTop: 3, marginBottom: 8 },
    bookProgressBg: { height: 3, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden', marginBottom: 5 },
    bookProgressFill: { height: '100%', backgroundColor: COLORS.action, borderRadius: 2 },
    bookProgressText: { fontSize: 11, color: colors.textLight },
    finishedRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    finishedText: { fontSize: 12, color: COLORS.support, fontWeight: '600' },
    wishlistText: { fontSize: 12, color: '#9F85C5', fontWeight: '600' },

    logCard: {
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
      borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
    },
    logIconWrap: {
      width: 40, height: 40, borderRadius: 10,
      backgroundColor: 'rgba(214,158,46,0.1)', justifyContent: 'center', alignItems: 'center',
    },
    logInfo: { flex: 1 },
    logBook: { fontSize: 14, fontWeight: '700', color: colors.text },
    logMeta: { fontSize: 12, color: colors.textLight, marginTop: 2 },
    logRight: { alignItems: 'flex-end' },
    logXP: { fontSize: 14, fontWeight: '800', color: COLORS.action },
    logDate: { fontSize: 11, color: colors.textLight, marginTop: 2 },

    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 8 },
    emptyTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text, textAlign: 'center', marginTop: 8 },
    emptyText: { fontSize: 13, color: colors.textLight, textAlign: 'center' },
    emptyButton: {
      marginTop: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: COLORS.action,
      paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20,
    },
    emptyButtonText: { color: COLORS.action, fontWeight: 'bold', fontSize: 14 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
    modalSheet: {
      backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
      borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border,
      padding: 24, maxHeight: '92%',
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
    modalLabel: { fontSize: 13, fontWeight: '700', color: colors.textLight, marginBottom: 8, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
    cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    progressCardTitle: { fontSize: 13, fontWeight: '700', color: colors.text },

    modalSearchBox: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.background, borderRadius: 10,
      paddingHorizontal: 14, paddingVertical: 12, gap: 10,
      borderWidth: 1, borderColor: colors.border,
    },
    modalSearchInput: { flex: 1, fontSize: 15, color: colors.text },

    suggestionsContainer: {
      marginTop: 8, borderRadius: 10, borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
    },
    suggestionItem: {
      flexDirection: 'row', alignItems: 'center', padding: 12,
      backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 12,
    },
    suggestionCover: { width: 44, height: 62, borderRadius: 6 },
    suggestionCoverPlaceholder: {
      width: 44, height: 62, borderRadius: 6,
      backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center',
    },
    suggestionInfo: { flex: 1 },
    suggestionTitle: { fontSize: 14, fontWeight: '600', color: colors.text, lineHeight: 19 },
    suggestionAuthor: { fontSize: 12, color: colors.textLight, marginTop: 2 },
    suggestionPages: { fontSize: 11, color: COLORS.support, marginTop: 3, fontWeight: '600' },

    selectedBookCard: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.background, borderRadius: 10, padding: 12, marginTop: 12,
      gap: 12, borderWidth: 1, borderColor: COLORS.action,
    },
    selectedBookCover: { width: 50, height: 70, borderRadius: 8 },
    selectedBookCoverPlaceholder: {
      width: 50, height: 70, borderRadius: 8,
      backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center',
    },
    selectedBookInfo: { flex: 1 },
    selectedBookTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
    selectedBookAuthor: { fontSize: 12, color: colors.textLight, marginTop: 2 },
    selectedBookPages: { fontSize: 11, color: COLORS.action, marginTop: 4, fontWeight: '600' },

    statusOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    statusOption: {
      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
      borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.background,
    },
    statusOptionText: { fontSize: 13, fontWeight: '600', color: colors.textLight },

    pageInputRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
    pageBtn: {
      width: 44, height: 44, borderRadius: 10,
      backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center',
      borderWidth: 1, borderColor: colors.border,
    },
    pageInput: {
      flex: 1, height: 52, backgroundColor: colors.background,
      borderRadius: 10, fontSize: 24, fontWeight: 'bold', color: COLORS.action,
      borderWidth: 1, borderColor: colors.border,
    },
    hint: { fontSize: 12, color: colors.textLight, marginTop: 8, textAlign: 'center' },
    modalButton: {
      backgroundColor: COLORS.action, borderRadius: 10,
      paddingVertical: 14, alignItems: 'center', marginTop: 16,
    },
    modalButtonText: { color: COLORS.white, fontSize: 15, fontWeight: '800' },

    detailBookRow: { flexDirection: 'row', gap: 16, marginBottom: 8 },
    detailBookCover: { width: 80, height: 110, borderRadius: 10 },
    detailBookCoverPlaceholder: {
      width: 80, height: 110, borderRadius: 10,
      backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center',
    },
    detailBookInfo: { flex: 1, justifyContent: 'center' },
    detailBookTitle: { fontSize: 16, fontWeight: '700', color: colors.text, lineHeight: 22 },
    detailBookAuthor: { fontSize: 13, color: colors.textLight, marginTop: 4 },
    detailBookPages: { fontSize: 13, color: colors.textLight, marginTop: 4 },
    detailBookGenre: { fontSize: 12, color: COLORS.action, marginTop: 4, fontWeight: '600' },

    progressCard: {
      backgroundColor: colors.background, borderRadius: 12, padding: 16, marginTop: 16,
      borderWidth: 1, borderColor: colors.border,
    },
    progressBarBg: { height: 3, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden' },
    progressBarFill: { height: '100%', backgroundColor: COLORS.action, borderRadius: 2 },
    progressPercent: { fontSize: 12, color: colors.textLight, marginTop: 6, marginBottom: 4, textAlign: 'right' },

    removeButton: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      marginTop: 20, paddingVertical: 14, borderRadius: 10,
      borderWidth: 1, borderColor: 'rgba(229,62,62,0.3)', backgroundColor: 'rgba(229,62,62,0.08)',
    },
    removeButtonText: { fontSize: 14, color: COLORS.error, fontWeight: '600' },
  });
}
