import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import {
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';

import { MnemonicScreenProps } from '../../navigation/types';
import theme from '../../theme';

import { Icons } from '../../assets/icons';
import MnemonicWordEntry from '../../components/MnemonicWordEntry';
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
  const [words, setWords] = useState<string[]>([]);
  const [passphrase, setPassphrase] = useState('');
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

  const loadKey = useLoadKey(words, passphrase || undefined);
  const verifyMnemonic = useVerifyMnemonic(words, passphrase || undefined);
  const keycard = mode === 'verify' ? verifyMnemonic : loadKey;
  const { phase, result, start, cancel } = keycard;

  const handleTextChange = useCallback((text: string) => {
    setInput(text);
    setPhraseError(null);
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
        <MnemonicWordEntry
          value={input}
          onChangeText={handleTextChange}
          wordCount={wordCount}
          wordCountOptions={[12, 24]}
          onWordCountChange={count => setWordCount(count as 12 | 24)}
          wordList={wordlist}
          wordListName="BIP39"
          placeholder="Enter your recovery phrase"
          errors={[phraseError]}
          onWordsChange={setWords}
        />

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
