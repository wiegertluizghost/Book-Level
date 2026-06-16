import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Modal,
  KeyboardAvoidingView, Platform, Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getUserLibrary } from '../../services/bookService';
import { logReading } from '../../services/readingService';
import { recoverStreak } from '../../services/userService';
import { COLORS } from '../../constants/colors';
import { calcXP, XP_PER_PAGE, STREAK_BONUS, BOOK_FINISH_BONUS } from '../../utils/xpCalculator';

export default function AddReadingScreen({ navigation, route }) {
  const { user, profile, refreshProfile } = useAuth();
  const { colors } = useTheme();
  const [books, setBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState(route.params?.book ?? null);
  const [pagesRead, setPagesRead] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showBookPicker, setShowBookPicker] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [reward, setReward] = useState(null);
  const [toastQueue, setToastQueue] = useState([]);
  const [currentToast, setCurrentToast] = useState(null);
  const toastAnim = useRef(new Animated.Value(-110)).current;

  const styles = makeStyles(colors);

  useEffect(() => { loadBooks(); }, []);

  async function loadBooks() {
    setLoading(true);
    const res = await getUserLibrary(user.uid);
    if (res.success) setBooks(res.books.filter(b => b.status === 'reading'));
    setLoading(false);
  }

  const previewXP = pagesRead ? calcXP(parseInt(pagesRead) || 0, profile.streak) : 0;
  const newPage = selectedBook ? (selectedBook.currentPage || 0) + (parseInt(pagesRead) || 0) : 0;
  const willFinish = selectedBook ? newPage >= selectedBook.totalPages : false;
  const totalPreviewXP = willFinish ? previewXP + BOOK_FINISH_BONUS : previewXP;

  async function handleSave() {
    if (!selectedBook) { Alert.alert('Atenção', 'Selecione um livro.'); return; }
    if (!pagesRead || parseInt(pagesRead) <= 0) { Alert.alert('Atenção', 'Informe quantas páginas você leu.'); return; }
    const pages = parseInt(pagesRead);
    const currentPage = Math.min((selectedBook.currentPage || 0) + pages, selectedBook.totalPages);
    const prevLevel = profile.level;
    setSaving(true);
    const result = await logReading(user.uid, selectedBook.id, selectedBook.title, pages, currentPage, selectedBook.totalPages);
    setSaving(false);
    if (!result.success) { Alert.alert('Erro', 'Não foi possível registrar. Tente novamente.'); return; }
    await refreshProfile();
    result.leveledUp = result.newLevel.level > prevLevel;
    setReward(result);
    if (result.streakBroke && result.canRecover) {
      setShowRecovery(true);
    } else if (result.leveledUp) {
      setShowLevelUp(true);
    } else {
      setShowSuccess(true);
    }
  }

  async function handleRecoverStreak() {
    setRecovering(true);
    const res = await recoverStreak(user.uid, reward.prevStreak);
    setRecovering(false);
    setShowRecovery(false);
    if (!res.success) {
      Alert.alert('Erro', res.error);
      proceedAfterRecovery();
      return;
    }
    await refreshProfile();
    setReward(prev => ({ ...prev, newStreak: res.newStreak, streakRecovered: true, xpSpentOnRecovery: res.xpSpent, recoveriesLeft: res.recoveriesLeft }));
    proceedAfterRecovery();
  }

  function handleSkipRecovery() {
    setShowRecovery(false);
    proceedAfterRecovery();
  }

  function proceedAfterRecovery() {
    if (reward?.leveledUp) {
      setShowLevelUp(true);
    } else {
      setShowSuccess(true);
    }
  }

  function handleDismissLevelUp() {
    setShowLevelUp(false);
    setShowSuccess(true);
  }

  function handleDismissSuccess() {
    setShowSuccess(false);
    const achievements = reward?.newAchievements ?? [];
    if (achievements.length > 0) {
      setToastQueue(achievements.slice(1));
      fireToast(achievements[0]);
    } else {
      goBack();
    }
  }

  function fireToast(achievement) {
    setCurrentToast(achievement);
    toastAnim.setValue(-110);
    Animated.spring(toastAnim, { toValue: 0, useNativeDriver: true, tension: 70, friction: 10 }).start();
    setTimeout(() => {
      Animated.timing(toastAnim, { toValue: -110, duration: 300, useNativeDriver: true }).start(() => {
        setCurrentToast(null);
        setToastQueue(prev => {
          if (prev.length > 0) {
            const [next, ...rest] = prev;
            setTimeout(() => {
              setToastQueue(rest);
              fireToast(next);
            }, 200);
          } else {
            goBack();
          }
          return [];
        });
      });
    }, 3200);
  }

  function goBack() {
    setSelectedBook(null);
    setPagesRead('');
    setNote('');
    navigation.goBack();
  }

  if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  if (books.length === 0) return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Registrar Leitura</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 12 }}>
        <Ionicons name="book-outline" size={64} color={colors.textLight} />
        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, textAlign: 'center' }}>Nenhum livro em leitura</Text>
        <Text style={{ fontSize: 14, color: colors.textLight, textAlign: 'center', lineHeight: 20 }}>
          Adicione um livro com status "Lendo" na sua biblioteca para registrar sua leitura.
        </Text>
        <TouchableOpacity
          style={{ marginTop: 8, backgroundColor: COLORS.action, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 14 }}
          onPress={() => navigation.navigate('BookList')}
        >
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Ir para Minha Biblioteca</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Registrar Leitura</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Qual livro você leu?</Text>
          <TouchableOpacity style={styles.bookSelector} onPress={() => setShowBookPicker(true)}>
            {selectedBook ? (
              <View style={styles.bookSelectorContent}>
                <View style={styles.bookIcon}><Ionicons name="book" size={20} color={COLORS.white} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bookSelectorTitle} numberOfLines={1}>{selectedBook.title}</Text>
                  <Text style={styles.bookSelectorSub}>Página atual: {selectedBook.currentPage} / {selectedBook.totalPages}</Text>
                </View>
                <Ionicons name="chevron-down" size={18} color={colors.textLight} />
              </View>
            ) : (
              <View style={styles.bookSelectorContent}>
                <Ionicons name="book-outline" size={22} color={colors.textLight} />
                <Text style={styles.bookSelectorPlaceholder}>Selecionar livro...</Text>
                <Ionicons name="chevron-down" size={18} color={colors.textLight} />
              </View>
            )}
          </TouchableOpacity>

          {selectedBook && (
            <View style={styles.progressPreview}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${Math.min(((selectedBook.currentPage || 0) / selectedBook.totalPages) * 100, 100)}%` }]} />
                {pagesRead && parseInt(pagesRead) > 0 && (
                  <View style={[styles.progressPreviewFill, { width: `${Math.min((parseInt(pagesRead) / selectedBook.totalPages) * 100, 100)}%` }]} />
                )}
              </View>
              <Text style={styles.progressLabel}>{selectedBook.currentPage} páginas lidas de {selectedBook.totalPages}</Text>
            </View>
          )}

          <Text style={styles.label}>Quantas páginas você leu hoje?</Text>
          <View style={styles.pagesInputRow}>
            <TouchableOpacity style={styles.pageButton} onPress={() => setPagesRead(p => String(Math.max(0, (parseInt(p) || 0) - 1)))}>
              <Ionicons name="remove" size={22} color={COLORS.primary} />
            </TouchableOpacity>
            <TextInput
              style={styles.pagesInput}
              value={pagesRead}
              onChangeText={v => setPagesRead(v.replace(/[^0-9]/g, ''))}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.textLight}
              textAlign="center"
            />
            <TouchableOpacity style={styles.pageButton} onPress={() => setPagesRead(p => String((parseInt(p) || 0) + 1))}>
              <Ionicons name="add" size={22} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.quickPages}>
            {[5, 10, 20, 30, 50].map(n => (
              <TouchableOpacity key={n} style={[styles.quickPageChip, pagesRead === String(n) && styles.quickPageChipActive]} onPress={() => setPagesRead(String(n))}>
                <Text style={[styles.quickPageText, pagesRead === String(n) && styles.quickPageTextActive]}>+{n}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {totalPreviewXP > 0 && (
            <View style={styles.xpPreview}>
              <View style={styles.xpPreviewRow}>
                <Ionicons name="flash" size={18} color={COLORS.action} />
                <Text style={styles.xpPreviewTitle}>Você vai ganhar</Text>
              </View>
              <Text style={styles.xpPreviewValue}>+{totalPreviewXP} XP</Text>
              <View style={styles.xpBreakdown}>
                <XPBreakdownRow label={`${pagesRead} páginas × ${XP_PER_PAGE} XP`} value={`+${parseInt(pagesRead) * XP_PER_PAGE}`} styles={styles} colors={colors} />
                {profile.streak > 1 && <XPBreakdownRow label={`Bônus de streak (${profile.streak} dias)`} value={`+${STREAK_BONUS}`} color={COLORS.action} styles={styles} colors={colors} />}
                {willFinish && <XPBreakdownRow label="Bônus de livro concluído!" value={`+${BOOK_FINISH_BONUS}`} color={COLORS.action} styles={styles} colors={colors} />}
              </View>
              {willFinish && <View style={styles.finishBanner}><Text style={styles.finishBannerText}>Você vai terminar este livro!</Text></View>}
            </View>
          )}

          <Text style={styles.label}>Anotação (opcional)</Text>
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="O que achou da leitura de hoje?"
            placeholderTextColor={colors.textLight}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.saveButton, (!selectedBook || !pagesRead) && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving || !selectedBook || !pagesRead}
          >
            {saving
              ? <ActivityIndicator color={COLORS.white} />
              : <><Ionicons name="checkmark-circle" size={20} color={COLORS.white} /><Text style={styles.saveButtonText}>Salvar leitura</Text></>
            }
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>

      {/* Modal: Selecionar livro */}
      <Modal visible={showBookPicker} animationType="slide" transparent onRequestClose={() => setShowBookPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Escolha um livro</Text>
              <TouchableOpacity onPress={() => setShowBookPicker(false)}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity>
            </View>
            {books.length === 0 ? (
              <View style={styles.emptyBooks}>
                <Ionicons name="book-outline" size={40} color={colors.textLight} />
                <Text style={styles.emptyBooksText}>Nenhum livro em andamento.</Text>
                <TouchableOpacity onPress={() => { setShowBookPicker(false); navigation.navigate('BookList'); }}>
                  <Text style={styles.emptyBooksLink}>Adicionar livro</Text>
                </TouchableOpacity>
              </View>
            ) : (
              books.map(book => (
                <TouchableOpacity
                  key={book.id}
                  style={[styles.bookPickerItem, selectedBook?.id === book.id && styles.bookPickerItemActive]}
                  onPress={() => { setSelectedBook(book); setShowBookPicker(false); }}
                >
                  <View style={styles.bookPickerIcon}><Ionicons name="book" size={18} color={COLORS.white} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bookPickerTitle} numberOfLines={1}>{book.title}</Text>
                    <Text style={styles.bookPickerSub}>{book.currentPage} / {book.totalPages} páginas</Text>
                  </View>
                  {selectedBook?.id === book.id && <Ionicons name="checkmark-circle" size={20} color={COLORS.action} />}
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
      </Modal>

      {/* Modal: Recuperação de Streak */}
      <Modal visible={showRecovery} animationType="fade" transparent onRequestClose={() => {}}>
        <View style={styles.modalOverlay}>
          <View style={styles.recoveryCard}>
            <View style={styles.recoveryIconWrap}>
              <Ionicons name="flame" size={36} color="#EF4444" />
            </View>
            <Text style={styles.recoveryTitle}>Streak quebrado!</Text>
            <Text style={styles.recoveryStreak}>{reward?.prevStreak} dias</Text>
            <Text style={styles.recoveryDesc}>
              Você não registrou leitura ontem e seu streak de{' '}
              <Text style={{ fontWeight: '800', color: '#EF4444' }}>{reward?.prevStreak} dias</Text>{' '}
              foi perdido. Deseja recuperá-lo?
            </Text>

            <View style={styles.recoveryCostBox}>
              <Ionicons name="flash" size={16} color={COLORS.action} />
              <Text style={styles.recoveryCostText}>Custo: <Text style={{ fontWeight: '800', color: COLORS.action }}>{reward?.recoveryCost} XP</Text></Text>
            </View>

            <Text style={styles.recoveryLeft}>
              Recuperações restantes este mês: <Text style={{ fontWeight: '700', color: COLORS.action }}>{reward?.recoveriesLeft}</Text> de 3
            </Text>

            <TouchableOpacity
              style={[styles.recoveryButton, recovering && { opacity: 0.7 }]}
              onPress={handleRecoverStreak}
              disabled={recovering}
            >
              {recovering
                ? <ActivityIndicator color="#fff" />
                : <>
                    <Ionicons name="flame" size={18} color="#fff" />
                    <Text style={styles.recoveryButtonText}>Recuperar streak</Text>
                  </>
              }
            </TouchableOpacity>

            <TouchableOpacity style={styles.recoverySkip} onPress={handleSkipRecovery} disabled={recovering}>
              <Text style={styles.recoverySkipText}>Continuar sem recuperar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: Level Up */}
      <Modal visible={showLevelUp} animationType="fade" transparent onRequestClose={() => {}}>
        <View style={styles.levelUpOverlay}>
          <View style={styles.levelUpCard}>
            <View style={styles.levelUpIconRow}>
              <Ionicons name="flash" size={32} color={COLORS.action} />
              <Ionicons name="flash" size={44} color={COLORS.action} />
              <Ionicons name="flash" size={32} color={COLORS.action} />
            </View>
            <Text style={styles.levelUpLabel}>NÍVEL UP!</Text>
            <Text style={styles.levelUpNumber}>{reward?.newLevel?.level}</Text>
            <Text style={styles.levelUpTitle}>{reward?.newLevel?.title}</Text>
            <View style={styles.levelUpDivider} />
            <View style={styles.levelUpStats}>
              <View style={styles.levelUpStat}>
                <Text style={styles.levelUpStatValue}>+{reward?.xpEarned}</Text>
                <Text style={styles.levelUpStatLabel}>XP ganhos</Text>
              </View>
              <View style={styles.levelUpStatDivider} />
              <View style={styles.levelUpStat}>
                <Text style={[styles.levelUpStatValue, { color: '#EF4444' }]}>{reward?.newStreak}</Text>
                <Text style={styles.levelUpStatLabel}>dias de streak</Text>
              </View>
            </View>
            {reward?.isFinished && (
              <View style={styles.finishedBadge}>
                <Ionicons name="trophy" size={14} color="#92400E" />
                <Text style={styles.finishedBadgeText}>Livro concluído! +{BOOK_FINISH_BONUS} XP</Text>
              </View>
            )}
            <TouchableOpacity style={styles.levelUpButton} onPress={handleDismissLevelUp}>
              <Text style={styles.levelUpButtonText}>Continuar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: Sucesso */}
      <Modal visible={showSuccess} animationType="fade" transparent onRequestClose={() => {}}>
        <View style={styles.modalOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successIconRow}>
              <View style={styles.successCheckWrap}>
                <Ionicons name="checkmark" size={28} color="#fff" />
              </View>
            </View>
            <Text style={styles.successTitle}>Leitura registrada!</Text>
            <View style={styles.successStats}>
              <SuccessStat label="XP ganho" value={`+${reward?.xpEarned}`} color={COLORS.action} styles={styles} />
              <SuccessStat label="Streak" value={`${reward?.newStreak} dias`} color="#EF4444" styles={styles} />
              <SuccessStat label="Nível" value={reward?.newLevel?.level} color={COLORS.primary} styles={styles} />
            </View>
            {reward?.isFinished && (
              <View style={styles.finishedBadge}>
                <Ionicons name="trophy" size={14} color="#92400E" />
                <Text style={styles.finishedBadgeText}>Livro concluído! +{BOOK_FINISH_BONUS} XP bônus</Text>
              </View>
            )}
            <TouchableOpacity style={styles.successButton} onPress={handleDismissSuccess}>
              <Text style={styles.successButtonText}>Continuar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Achievement Toast */}
      {currentToast && (
        <Animated.View style={[styles.toast, { transform: [{ translateY: toastAnim }] }]}>
          <View style={[styles.toastIconWrap, { backgroundColor: `${currentToast.color}25` }]}>
            <Ionicons name={currentToast.icon} size={24} color={currentToast.color} />
          </View>
          <View style={styles.toastContent}>
            <Text style={styles.toastLabel}>Conquista desbloqueada!</Text>
            <Text style={styles.toastTitle}>{currentToast.title}</Text>
            <Text style={styles.toastDesc} numberOfLines={1}>{currentToast.desc}</Text>
          </View>
          <Ionicons name="trophy" size={18} color={COLORS.action} />
        </Animated.View>
      )}
    </KeyboardAvoidingView>
  );
}

function XPBreakdownRow({ label, value, color, styles, colors }) {
  return (
    <View style={styles.breakdownRow}>
      <Text style={styles.breakdownLabel}>{label}</Text>
      <Text style={[styles.breakdownValue, { color: color ?? colors.text }]}>{value}</Text>
    </View>
  );
}

function SuccessStat({ label, value, color, styles }) {
  return (
    <View style={styles.successStatItem}>
      <Text style={[styles.successStatValue, { color }]}>{value}</Text>
      <Text style={styles.successStatLabel}>{label}</Text>
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { backgroundColor: COLORS.primary, paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.white },
    body: { flex: 1, paddingHorizontal: 16, paddingTop: 20 },
    label: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 8, marginTop: 20 },
    bookSelector: { backgroundColor: colors.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border },
    bookSelectorContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    bookIcon: { width: 38, height: 38, borderRadius: 8, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
    bookSelectorTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
    bookSelectorSub: { fontSize: 12, color: colors.textLight, marginTop: 2 },
    bookSelectorPlaceholder: { flex: 1, fontSize: 15, color: colors.textLight },
    progressPreview: { marginTop: 10 },
    progressBar: { height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden', flexDirection: 'row' },
    progressFill: { height: '100%', backgroundColor: COLORS.action, borderRadius: 4 },
    progressPreviewFill: { height: '100%', backgroundColor: `${COLORS.action}55`, borderRadius: 4 },
    progressLabel: { fontSize: 12, color: colors.textLight, marginTop: 4, textAlign: 'right' },
    pagesInputRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    pageButton: { width: 48, height: 48, borderRadius: 12, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    pagesInput: { flex: 1, height: 56, backgroundColor: colors.surface, borderRadius: 12, fontSize: 28, fontWeight: 'bold', color: COLORS.primary, borderWidth: 1, borderColor: colors.border },
    quickPages: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
    quickPageChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    quickPageChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    quickPageText: { fontSize: 13, color: colors.textLight, fontWeight: '600' },
    quickPageTextActive: { color: COLORS.white },
    xpPreview: { backgroundColor: '#FFFBEB', borderRadius: 14, padding: 16, marginTop: 20, borderWidth: 1, borderColor: '#FDE68A' },
    xpPreviewRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
    xpPreviewTitle: { fontSize: 13, color: colors.text, fontWeight: '600' },
    xpPreviewValue: { fontSize: 28, fontWeight: 'bold', color: COLORS.action, marginBottom: 12 },
    xpBreakdown: { gap: 6 },
    breakdownRow: { flexDirection: 'row', justifyContent: 'space-between' },
    breakdownLabel: { fontSize: 13, color: colors.textLight },
    breakdownValue: { fontSize: 13, fontWeight: '700' },
    finishBanner: { backgroundColor: '#FEF3C7', borderRadius: 8, padding: 10, marginTop: 12 },
    finishBannerText: { fontSize: 13, color: '#92400E', fontWeight: '600', textAlign: 'center' },
    noteInput: { backgroundColor: colors.surface, borderRadius: 12, padding: 14, fontSize: 14, color: colors.text, borderWidth: 1, borderColor: colors.border, minHeight: 90 },
    saveButton: { backgroundColor: COLORS.action, borderRadius: 14, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 24, shadowColor: COLORS.action, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    saveButtonDisabled: { opacity: 0.5 },
    saveButtonText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
    bookPickerItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 8, backgroundColor: colors.background, gap: 12 },
    bookPickerItemActive: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: COLORS.primary },
    bookPickerIcon: { width: 36, height: 36, borderRadius: 8, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
    bookPickerTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
    bookPickerSub: { fontSize: 12, color: colors.textLight, marginTop: 2 },
    emptyBooks: { alignItems: 'center', paddingVertical: 32, gap: 8 },
    emptyBooksText: { fontSize: 14, color: colors.textLight },
    emptyBooksLink: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
    // Recovery modal
    recoveryCard: {
      backgroundColor: colors.surface, borderRadius: 24, padding: 28, marginHorizontal: 20,
      alignItems: 'center', borderWidth: 1.5, borderColor: '#EF444440',
    },
    recoveryIconWrap: {
      width: 72, height: 72, borderRadius: 36,
      backgroundColor: '#EF444418', justifyContent: 'center', alignItems: 'center', marginBottom: 12,
    },
    recoveryTitle: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 4 },
    recoveryStreak: { fontSize: 48, fontWeight: '900', color: '#EF4444', lineHeight: 56, marginBottom: 12 },
    recoveryDesc: { fontSize: 14, color: colors.textLight, textAlign: 'center', lineHeight: 20, marginBottom: 16 },
    recoveryCostBox: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: `${COLORS.action}12`, paddingHorizontal: 16, paddingVertical: 8,
      borderRadius: 20, borderWidth: 1, borderColor: `${COLORS.action}30`, marginBottom: 10,
    },
    recoveryCostText: { fontSize: 14, color: colors.text },
    recoveryLeft: { fontSize: 12, color: colors.textLight, marginBottom: 20 },
    recoveryButton: {
      backgroundColor: '#EF4444', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32,
      flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%', justifyContent: 'center', marginBottom: 10,
    },
    recoveryButtonText: { color: '#fff', fontSize: 15, fontWeight: '800' },
    recoverySkip: { paddingVertical: 10 },
    recoverySkipText: { fontSize: 14, color: colors.textLight },

    // Level up modal
    levelUpOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    levelUpCard: {
      backgroundColor: colors.surface, borderRadius: 24, padding: 32, width: '100%',
      alignItems: 'center', borderWidth: 1, borderColor: `${COLORS.action}40`,
    },
    levelUpIconRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginBottom: 12 },
    levelUpLabel: { fontSize: 13, fontWeight: '800', color: COLORS.action, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 10 },
    levelUpNumber: { fontSize: 80, fontWeight: '900', color: colors.text, lineHeight: 88 },
    levelUpTitle: { fontSize: 22, fontWeight: '700', color: COLORS.action, marginBottom: 20 },
    levelUpDivider: { height: 1, backgroundColor: colors.border, width: '100%', marginBottom: 20 },
    levelUpStats: { flexDirection: 'row', gap: 32, marginBottom: 20 },
    levelUpStat: { alignItems: 'center' },
    levelUpStatValue: { fontSize: 24, fontWeight: '800', color: COLORS.action },
    levelUpStatLabel: { fontSize: 12, color: colors.textLight, marginTop: 3 },
    levelUpStatDivider: { width: 1, backgroundColor: colors.border },
    levelUpButton: {
      backgroundColor: COLORS.action, borderRadius: 14, paddingVertical: 16,
      paddingHorizontal: 48, marginTop: 4,
    },
    levelUpButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' },

    // Success modal
    successCard: {
      backgroundColor: colors.surface, borderRadius: 24, padding: 28, marginHorizontal: 20,
      shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10,
    },
    successIconRow: { alignItems: 'center', marginBottom: 16 },
    successCheckWrap: {
      width: 56, height: 56, borderRadius: 28,
      backgroundColor: '#22C55E', justifyContent: 'center', alignItems: 'center',
    },
    successTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 20, textAlign: 'center' },
    successStats: { flexDirection: 'row', gap: 20, marginBottom: 16, justifyContent: 'center' },
    successStatItem: { alignItems: 'center' },
    successStatValue: { fontSize: 22, fontWeight: 'bold' },
    successStatLabel: { fontSize: 12, color: colors.textLight, marginTop: 2 },
    finishedBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF7ED', borderRadius: 10, padding: 10, marginBottom: 14 },
    finishedBadgeText: { fontSize: 13, color: '#92400E', fontWeight: '600' },
    successButton: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    successButtonText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },

    // Achievement toast
    toast: {
      position: 'absolute', top: 56, left: 16, right: 16,
      backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border,
      flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12,
      shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 20,
    },
    toastIconWrap: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    toastContent: { flex: 1 },
    toastLabel: { fontSize: 11, fontWeight: '700', color: COLORS.action, textTransform: 'uppercase', letterSpacing: 0.5 },
    toastTitle: { fontSize: 14, fontWeight: '800', color: colors.text, marginTop: 1 },
    toastDesc: { fontSize: 12, color: colors.textLight, marginTop: 1 },
  });
}
