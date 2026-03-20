import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import {
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

import { ImportKeyScreenProps } from '../../navigation/types';
import theme from '../../theme';

import NFCBottomSheet from '../../components/NFCBottomSheet';
import PinPad from '../../components/PinPad';
import PrimaryButton from '../../components/PrimaryButton';
import { Icons } from '../../assets/icons';

import { useLoadKey } from '../../hooks/keycard/useLoadKey';

const TOAST = 'Key pair has been added to Keycard';

export default function ImportKeyScreen({ navigation }: ImportKeyScreenProps) {
  const insets = useSafeAreaInsets();
  const [wordCount, setWordCount] = useState<12 | 24>(12);
  const [input, setInput] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [wordError, setWordError] = useState<string | null>(null);
  const [phraseError, setPhraseError] = useState<string | null>(null);

  const words = useMemo(
    () =>
      input
        .trim()
        .split(/\s+/)
        .filter(w => w.length > 0),
    [input],
  );

  const { phase, status, pinError, start, cancel, submitPin } = useLoadKey(
    words,
    passphrase || undefined,
  );

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
    if (phase === 'done') {
      navigation.navigate('Dashboard', { toast: TOAST });
    }
  }, [phase, navigation]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title:
        phase === 'pin_entry' ? 'Enter Keycard PIN' : 'Import recovery phrase',
    });
  }, [navigation, phase]);

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
            placeholderTextColor="rgba(255,255,255,0.3)"
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
          placeholderTextColor="rgba(255,255,255,0.3)"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </ScrollView>

      <View style={styles.buttonContainer}>
        <PrimaryButton
          label="Continue"
          icon={Icons.nfcActivate}
          onPress={handleContinue}
          disabled={!isComplete}
        />
      </View>

      {phase === 'pin_entry' && (
        <View style={styles.pinOverlay}>
          <PinPad onComplete={submitPin} error={pinError ?? undefined} />
        </View>
      )}

      <NFCBottomSheet
        visible={phase === 'nfc' || phase === 'error'}
        status={status}
        variant={phase === 'error' ? 'error' : 'scanning'}
        onCancel={handleCancel}
      />
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
    borderColor: '#919191',
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  segmentActive: {
    backgroundColor: '#474747',
  },
  segmentDivider: {
    width: 1,
    backgroundColor: '#919191',
  },
  segmentText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontWeight: '600',
  },
  segmentActiveText: {
    color: '#ffffff',
  },
  inputWrapper: {
    gap: 6,
  },
  wordInput: {
    backgroundColor: '#2d2d2d',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderBottomWidth: 3,
    borderBottomColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
    color: '#ffffff',
    fontSize: 16,
    minHeight: 128,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#E95460',
    fontSize: 13,
  },
  wordCountText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    textAlign: 'right',
  },
  passphraseInput: {
    backgroundColor: '#2d2d2d',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderBottomWidth: 3,
    borderBottomColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
    color: '#ffffff',
    fontSize: 16,
    height: 52,
  },
  buttonContainer: {
    paddingHorizontal: 16,
  },
  pinOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
