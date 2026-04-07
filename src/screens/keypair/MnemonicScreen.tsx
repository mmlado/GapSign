import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';

import { MnemonicScreenProps } from '../../navigation/types';
import theme from '../../theme';

import { Icons } from '../../assets/icons';
import NFCBottomSheet from '../../components/NFCBottomSheet';
import PrimaryButton from '../../components/PrimaryButton';

import { useLoadKey } from '../../hooks/keycard/useLoadKey';
import { useVerifyMnemonic } from '../../hooks/keycard/useVerifyMnemonic';

export default function MnemonicScreen({
  navigation,
  route,
}: MnemonicScreenProps) {
  const mode = route.params?.mode ?? 'import';
  const insets = useSafeAreaInsets();
  const [wordCount, setWordCount] = useState<12 | 24>(12);
  const [input, setInput] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [wordError, setWordError] = useState<string | null>(null);
  const [phraseError, setPhraseError] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

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

  const words = useMemo(
    () =>
      input
        .trim()
        .split(/\s+/)
        .filter(w => w.length > 0),
    [input],
  );

  const loadKey = useLoadKey(words, passphrase || undefined);
  const verifyMnemonic = useVerifyMnemonic(words, passphrase || undefined);
  const keycard = mode === 'verify' ? verifyMnemonic : loadKey;
  const { phase, result, start, cancel } = keycard;

  const handleTextChange = useCallback((text: string) => {
    setInput(text);
    setPhraseError(null);

    // Validate all complete words (all except the one currently being typed)
    const parts = text.split(/\s+/).filter(w => w.length > 0);
    const hasTrailing = text.endsWith(' ') || text.endsWith('\n');
    const complete = hasTrailing ? parts : parts.slice(0, -1);
    const invalid = complete.find(w => !wordlist.includes(w.toLowerCase()));
    setWordError(invalid ? `"${invalid}" is not a valid BIP39 word` : null);
  }, []);

  const handleContinue = useCallback(() => {
    if (!validateMnemonic(words.join(' '), wordlist)) {
      setPhraseError('Invalid recovery phrase');
      return;
    }
    start();
  }, [words, start]);

  const handleCancel = useCallback(() => {
    cancel();
  }, [cancel]);

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
                  ? 'Recovery phrase matches'
                  : 'Recovery phrase does not match',
            },
          },
        ],
      });
    } else {
      navigation.navigate('Dashboard', {
        toast: 'Key pair has been added to Keycard',
      });
    }
  }, [phase, result, mode, navigation]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title:
        phase === 'pin_entry'
          ? 'Enter Keycard PIN'
          : mode === 'verify'
          ? 'Verify recovery phrase'
          : 'Import recovery phrase',
    });
  }, [navigation, phase, mode]);

  const isComplete = words.length === wordCount;

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 16 }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* 12 / 24 word selector */}
        <View style={styles.segmented}>
          <Pressable
            style={[styles.segment, wordCount === 12 && styles.segmentActive]}
            onPress={() => setWordCount(12)}
          >
            <Text
              style={[
                styles.segmentText,
                wordCount === 12 && styles.segmentActiveText,
              ]}
            >
              12 words
            </Text>
          </Pressable>
          <View style={styles.segmentDivider} />
          <Pressable
            style={[styles.segment, wordCount === 24 && styles.segmentActive]}
            onPress={() => setWordCount(24)}
          >
            <Text
              style={[
                styles.segmentText,
                wordCount === 24 && styles.segmentActiveText,
              ]}
            >
              24 words
            </Text>
          </Pressable>
        </View>

        {/* Word input */}
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.wordInput}
            value={input}
            onChangeText={handleTextChange}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            placeholder="Enter your recovery phrase"
            placeholderTextColor={theme.colors.onSurfacePlaceholder}
          />
          {wordError && <Text style={styles.errorText}>{wordError}</Text>}
          {phraseError && <Text style={styles.errorText}>{phraseError}</Text>}
          <Text style={styles.wordCountText}>
            {words.length}/{wordCount} words
          </Text>
        </View>

        {/* Passphrase input */}
        <TextInput
          style={styles.passphraseInput}
          value={passphrase}
          onChangeText={setPassphrase}
          placeholder="Passphrase (optional)"
          placeholderTextColor={theme.colors.onSurfacePlaceholder}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </ScrollView>

      <View
        style={[
          styles.buttonContainer,
          keyboardHeight > 0 && { paddingBottom: keyboardHeight + 8 },
        ]}
      >
        <PrimaryButton
          label={mode === 'verify' ? 'Verify' : 'Continue'}
          icon={Icons.nfcActivate}
          onPress={handleContinue}
          disabled={!isComplete}
        />
      </View>

      <NFCBottomSheet nfc={keycard} onCancel={handleCancel} />
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
  segmented: {
    flexDirection: 'row',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  segmentActive: {
    backgroundColor: theme.colors.surfaceSelected,
  },
  segmentDivider: {
    width: 1,
    backgroundColor: theme.colors.outline,
  },
  segmentText: {
    color: theme.colors.onSurfaceSubtle,
    fontSize: 14,
    fontWeight: '600',
  },
  segmentActiveText: {
    color: theme.colors.onSurface,
  },
  inputWrapper: {
    gap: 6,
  },
  wordInput: {
    backgroundColor: theme.colors.surfaceVariant,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderBottomWidth: 3,
    borderBottomColor: theme.colors.onSurface,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
    color: theme.colors.onSurface,
    fontSize: 16,
    minHeight: 128,
    textAlignVertical: 'top',
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 13,
  },
  wordCountText: {
    color: theme.colors.onSurfaceDisabled,
    fontSize: 12,
    textAlign: 'right',
  },
  passphraseInput: {
    backgroundColor: theme.colors.surfaceVariant,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderBottomWidth: 3,
    borderBottomColor: theme.colors.onSurface,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
    color: theme.colors.onSurface,
    fontSize: 16,
    height: 52,
  },
  buttonContainer: {
    paddingHorizontal: 16,
  },
});
