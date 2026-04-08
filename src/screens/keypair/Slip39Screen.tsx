import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Slip39ScreenProps } from '../../navigation/types';
import theme from '../../theme';

import MnemonicBackupCheck from '../../components/MnemonicBackupCheck';
import MnemonicWordEntry from '../../components/MnemonicWordEntry';
import NFCBottomSheet from '../../components/NFCBottomSheet';
import PrimaryButton from '../../components/PrimaryButton';

import { useGenerateSlip39Shares } from '../../hooks/keycard/useGenerateSlip39Shares';
import { useLoadSlip39 } from '../../hooks/keycard/useLoadSlip39';
import { useVerifySlip39 } from '../../hooks/keycard/useVerifySlip39';
import {
  SLIP39_MAX_SHARES,
  SLIP39_SHARE_WORD_COUNT,
  SLIP39_WORD_LIST,
  generateSlip39SharesFromKeycardEntropy,
  getSlip39ShareProgress,
  isSlip39Word,
  normalizeSlip39Share,
} from '../../utils/slip39';

function parseCount(value: string): number {
  return Number.parseInt(value, 10);
}

export default function Slip39Screen({ navigation, route }: Slip39ScreenProps) {
  const mode = route.params.mode;
  const insets = useSafeAreaInsets();
  const [shareInput, setShareInput] = useState('');
  const [shareInputWords, setShareInputWords] = useState<string[]>([]);
  const [shareWordError, setShareWordError] = useState<string | null>(null);
  const [shares, setShares] = useState<string[]>([]);
  const [passphrase, setPassphrase] = useState('');
  const [shareError, setShareError] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [shareCount, setShareCount] = useState('3');
  const [threshold, setThreshold] = useState('2');
  const [generatedShares, setGeneratedShares] = useState<string[]>([]);
  const [generatedShareIndex, setGeneratedShareIndex] = useState(0);
  const [isCreatingGeneratedShares, setIsCreatingGeneratedShares] =
    useState(false);
  const [backupStep, setBackupStep] = useState<'display' | 'confirm'>(
    'display',
  );

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      e => setKeyboardHeight(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const operationShares = mode === 'generate' ? generatedShares : shares;
  const parsedShareCount = parseCount(shareCount);
  const parsedThreshold =
    parsedShareCount === 1 ? 1 : Math.max(2, parseCount(threshold));
  const generateSlip39 = useGenerateSlip39Shares(
    parsedShareCount,
    parsedThreshold,
  );
  const loadSlip39 = useLoadSlip39(operationShares, passphrase || undefined);
  const verifySlip39 = useVerifySlip39(
    operationShares,
    passphrase || undefined,
  );
  const keycard = mode === 'verify' ? verifySlip39 : loadSlip39;
  const activeKeycard =
    mode === 'generate' && generatedShares.length === 0
      ? generateSlip39
      : keycard;
  const { phase, result, start } = keycard;
  const activePhase = activeKeycard.phase;

  const progress = useMemo(() => {
    if (operationShares.length === 0) {
      return null;
    }

    return getSlip39ShareProgress(operationShares);
  }, [operationShares]);

  const canAddShare =
    shareInputWords.length === SLIP39_SHARE_WORD_COUNT && !shareWordError;
  const importComplete = mode !== 'generate' && (progress?.complete ?? false);
  const generatedSharesReady = generatedShares.length > 0;
  const generatedBackupComplete =
    mode === 'generate' &&
    generatedSharesReady &&
    generatedShareIndex >= generatedShares.length;
  const currentGeneratedShare =
    generatedSharesReady && !generatedBackupComplete
      ? generatedShares[generatedShareIndex]
      : null;
  const currentGeneratedWords = useMemo(
    () => currentGeneratedShare?.split(' ') ?? [],
    [currentGeneratedShare],
  );
  const currentGeneratedWordHalf =
    currentGeneratedWords.length > 0 ? currentGeneratedWords.length / 2 : 0;

  const handleAddShare = useCallback(() => {
    try {
      const normalized = normalizeSlip39Share(shareInput);
      if (!normalized) {
        setShareError('Enter a SLIP39 share');
        return;
      }
      const invalid = normalized.split(' ').find(word => !isSlip39Word(word));
      if (invalid) {
        setShareError(`"${invalid}" is not a valid SLIP39 word`);
        return;
      }

      const nextShares = [...shares, normalized];
      getSlip39ShareProgress(nextShares);
      setShares(nextShares);
      setShareInput('');
      setShareError(null);
    } catch (e: any) {
      setShareError(e.message);
    }
  }, [shareInput, shares]);

  const handleGenerateShares = useCallback(() => {
    try {
      generateSlip39.start();
      setShareError(null);
    } catch (e: any) {
      setShareError(e.message);
    }
  }, [generateSlip39]);

  const handleStart = useCallback(() => {
    try {
      start();
    } catch (e: any) {
      setShareError(e.message);
    }
  }, [start]);

  const handleCancel = useCallback(() => {
    activeKeycard.cancel();
  }, [activeKeycard]);

  useEffect(() => {
    if (
      mode !== 'generate' ||
      generateSlip39.phase !== 'done' ||
      !generateSlip39.result
    ) {
      return;
    }

    setIsCreatingGeneratedShares(true);
    const entropy = generateSlip39.result;
    const timeout = setTimeout(() => {
      try {
        setGeneratedShares(
          generateSlip39SharesFromKeycardEntropy(entropy, {
            shareCount: parsedShareCount,
            threshold: parsedThreshold,
          }),
        );
        setGeneratedShareIndex(0);
        setBackupStep('display');
        setShareError(null);
      } catch (e: any) {
        setShareError(e.message);
      } finally {
        entropy.fill(0);
        setIsCreatingGeneratedShares(false);
        generateSlip39.reset();
      }
    }, 0);

    return () => clearTimeout(timeout);
  }, [mode, generateSlip39, parsedShareCount, parsedThreshold]);

  useEffect(() => {
    if (phase !== 'done') {
      return;
    }

    if (mode === 'verify') {
      navigation.reset({
        index: 0,
        routes: [
          {
            name: 'Dashboard',
            params: {
              toast:
                result === 'match'
                  ? 'SLIP39 shares match'
                  : 'SLIP39 shares do not match',
            },
          },
        ],
      });
      return;
    }

    navigation.navigate('Dashboard', {
      toast: 'Key pair has been added to Keycard',
    });
  }, [phase, result, mode, navigation]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title:
        activePhase === 'pin_entry'
          ? 'Enter Keycard PIN'
          : mode === 'generate' && backupStep === 'confirm'
          ? 'Check SLIP39 share'
          : mode === 'generate' && generatedSharesReady
          ? 'Backup SLIP39 share'
          : mode === 'generate'
          ? 'Generate SLIP39 shares'
          : mode === 'verify'
          ? 'Verify SLIP39 shares'
          : 'Import SLIP39 shares',
    });
  }, [navigation, activePhase, backupStep, generatedSharesReady, mode]);

  const isReady =
    mode === 'generate' ? generatedBackupComplete : progress?.complete ?? false;
  const showBottomButton = mode !== 'generate' || generatedBackupComplete;
  const buttonLabel =
    mode === 'generate'
      ? 'Load to Keycard'
      : mode === 'verify'
      ? 'Verify'
      : 'Import to Keycard';

  const handleGeneratedShareSaved = useCallback(() => {
    setBackupStep('confirm');
  }, []);

  const handleBackupComplete = useCallback(() => {
    setGeneratedShareIndex(index => index + 1);
    setBackupStep('display');
  }, []);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 16 }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.description}>
          {mode === 'generate' && backupStep === 'confirm'
            ? 'Confirm the requested words from the SLIP39 share you just wrote down.'
            : mode === 'generate'
            ? 'Choose how many SLIP39 shares to create, tap your Keycard for entropy, then write down every share before loading the key pair onto your Keycard.'
            : 'Enter one 20-word SLIP39 share at a time. GapSign supports single-group SLIP39 sets, matching keycard-shell.'}
        </Text>

        {mode === 'generate' && !generatedSharesReady ? (
          <View style={styles.section}>
            <Text style={styles.label}>Share count</Text>
            <TextInput
              style={styles.input}
              value={shareCount}
              onChangeText={setShareCount}
              keyboardType="number-pad"
              editable={generatedShares.length === 0}
              placeholder={`1-${SLIP39_MAX_SHARES}`}
              placeholderTextColor={theme.colors.onSurfacePlaceholder}
            />

            <Text style={styles.label}>Threshold</Text>
            <TextInput
              style={styles.input}
              value={parseCount(shareCount) === 1 ? '1' : threshold}
              onChangeText={setThreshold}
              keyboardType="number-pad"
              editable={
                generatedShares.length === 0 && parseCount(shareCount) !== 1
              }
              placeholder="Required shares"
              placeholderTextColor={theme.colors.onSurfacePlaceholder}
            />
          </View>
        ) : mode !== 'generate' && !importComplete ? (
          <View style={styles.section}>
            <MnemonicWordEntry
              value={shareInput}
              onChangeText={text => {
                setShareInput(text);
                setShareError(null);
              }}
              wordCount={SLIP39_SHARE_WORD_COUNT}
              wordList={SLIP39_WORD_LIST}
              wordListName="SLIP39"
              placeholder="Enter a 20-word SLIP39 share"
              errors={[shareError]}
              onWordsChange={setShareInputWords}
              onWordErrorChange={setShareWordError}
              inputStyle={styles.shareInput}
            />
            <PrimaryButton
              label="Add share"
              onPress={handleAddShare}
              disabled={!canAddShare}
            />
          </View>
        ) : mode !== 'generate' ? (
          <Text style={styles.progressText}>
            Share threshold reached. Enter the optional passphrase, then
            continue.
          </Text>
        ) : null}

        {mode === 'generate' && isCreatingGeneratedShares && (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.progressText}>Creating SLIP39 shares...</Text>
          </View>
        )}

        {mode === 'generate' &&
          generatedShares.length === 0 &&
          !isCreatingGeneratedShares && (
            <PrimaryButton
              label="Generate SLIP39 shares"
              onPress={handleGenerateShares}
            />
          )}

        {(mode !== 'generate' || generatedBackupComplete) && (
          <TextInput
            style={styles.input}
            value={passphrase}
            onChangeText={setPassphrase}
            placeholder="SLIP39 passphrase (optional)"
            placeholderTextColor={theme.colors.onSurfacePlaceholder}
            autoCapitalize="none"
            autoCorrect={false}
          />
        )}

        {mode === 'generate' && shareError && (
          <Text style={styles.errorText}>{shareError}</Text>
        )}

        {progress && (
          <Text style={styles.progressText}>
            {mode === 'generate'
              ? `${progress.acceptedShares.length} shares generated, threshold ${progress.requiredShares}`
              : `${progress.acceptedShares.length}/${progress.requiredShares} shares added`}
          </Text>
        )}

        {mode === 'generate' &&
          backupStep === 'display' &&
          currentGeneratedShare && (
            <View style={styles.shareList}>
              <View style={styles.shareCard}>
                <View style={styles.shareHeader}>
                  <Text style={styles.shareTitle}>Share</Text>
                  <Text style={styles.shareCounter}>
                    {generatedShareIndex + 1}/{generatedShares.length}
                  </Text>
                </View>
                <View style={styles.wordGrid}>
                  <View style={styles.column}>
                    {currentGeneratedWords
                      .slice(0, currentGeneratedWordHalf)
                      .map((word, i) => (
                        <View key={i} style={styles.wordCell}>
                          <Text style={styles.wordIndex}>{i + 1}.</Text>
                          <Text style={styles.wordText}>{word}</Text>
                        </View>
                      ))}
                  </View>
                  <View style={styles.column}>
                    {currentGeneratedWords
                      .slice(currentGeneratedWordHalf)
                      .map((word, i) => (
                        <View key={i} style={styles.wordCell}>
                          <Text style={styles.wordIndex}>
                            {currentGeneratedWordHalf + i + 1}.
                          </Text>
                          <Text style={styles.wordText}>{word}</Text>
                        </View>
                      ))}
                  </View>
                </View>
              </View>
              <PrimaryButton
                label={
                  generatedShareIndex + 1 === generatedShares.length
                    ? 'I saved the last share'
                    : 'I saved this share'
                }
                onPress={handleGeneratedShareSaved}
              />
            </View>
          )}

        {mode === 'generate' &&
          backupStep === 'confirm' &&
          currentGeneratedShare && (
            <MnemonicBackupCheck
              key={currentGeneratedShare}
              words={currentGeneratedWords}
              description={`Confirm share ${generatedShareIndex + 1}/${
                generatedShares.length
              } backup.`}
              onComplete={handleBackupComplete}
            />
          )}

        {mode === 'generate' && generatedBackupComplete && (
          <Text style={styles.progressText}>
            All shares saved. Enter the optional passphrase, then load the key
            pair to your Keycard.
          </Text>
        )}

        {mode !== 'generate' && operationShares.length > 0 && (
          <View style={styles.shareList}>
            {operationShares.map((share, index) => (
              <View key={share} style={styles.shareCard}>
                <Text style={styles.shareTitle}>Share {index + 1}</Text>
                <Text style={styles.shareText}>{share}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View
        style={[
          styles.buttonContainer,
          keyboardHeight > 0 && { paddingBottom: keyboardHeight + 8 },
        ]}
      >
        {showBottomButton && (
          <PrimaryButton
            label={buttonLabel}
            onPress={handleStart}
            disabled={!isReady}
          />
        )}
      </View>

      <NFCBottomSheet nfc={activeKeycard} onCancel={handleCancel} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 20,
  },
  description: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 14,
    lineHeight: 22,
  },
  section: {
    gap: 12,
  },
  label: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 14,
  },
  input: {
    backgroundColor: theme.colors.surfacePassphrase,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.colors.onSurface,
    fontSize: 15,
    fontFamily: 'Inter',
  },
  shareInput: {
    minHeight: 150,
    textAlignVertical: 'top',
    backgroundColor: theme.colors.surfacePassphrase,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.colors.onSurface,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'Inter',
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 14,
  },
  progressText: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 14,
  },
  shareList: {
    gap: 12,
  },
  shareCard: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  shareHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  shareTitle: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 13,
  },
  shareCounter: {
    backgroundColor: theme.colors.surfaceSelected,
    borderRadius: 8,
    color: theme.colors.onSurface,
    fontSize: 12,
    fontWeight: '600',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  shareText: {
    color: theme.colors.onSurface,
    fontSize: 14,
    lineHeight: 22,
  },
  loadingCard: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 8,
    gap: 12,
    padding: 24,
  },
  wordGrid: {
    flexDirection: 'row',
  },
  column: {
    flex: 1,
  },
  wordCell: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 4,
    paddingVertical: 5,
  },
  wordIndex: {
    color: theme.colors.onSurfaceDisabled,
    fontSize: 12,
    textAlign: 'right',
    width: 20,
  },
  wordText: {
    color: theme.colors.onSurface,
    fontSize: 14,
    fontWeight: '500',
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
});
