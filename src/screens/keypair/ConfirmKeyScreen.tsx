import { Pressable, StyleSheet, View } from 'react-native';
import theme from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ConfirmKeySreenProps } from '../../navigation/types';
import { useLoadKey } from '../../hooks/keycard/useLoadKey';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import NFCBottomSheet from '../../components/NFCBottomSheet';
import { Text } from 'react-native-paper';
import PinPad from '../../components/PinPad';
import { Icons } from '../../assets/icons';

const N_CHALLENGE = 4;
const N_CHOICES = 4;

function pickRandom<T>(arr: T[], count: number, exclude?: number[]): T[] {
  const pool = arr
    .map((v, i) => ({ v, i }))
    .filter(({ i }) => !exclude?.includes(i));
  const shuffled = shuffle(pool);
  return shuffled.slice(0, count).map(({ v }) => v);
}

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; --i) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export default function ConfirmKeyScreen({
  navigation,
  route,
}: ConfirmKeySreenProps) {
  const insets = useSafeAreaInsets();
  const { words, passphrase } = route.params;

  const { phase, status, pinError, start, cancel, submitPin } = useLoadKey(
    words,
    passphrase,
  );

  const [challengePositions] = useState(() => {
    const indices = words.map((_, i) => i);
    return shuffle(indices)
      .slice(0, N_CHALLENGE)
      .sort((a, b) => a - b);
  });

  const [answers, setAnswers] = useState<(string | null)[]>(
    Array(N_CHALLENGE).fill(null),
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [wrongIndex, setWrongIndex] = useState<number | null>(null);

  const choices = useMemo(() => {
    if (currentIndex >= N_CHALLENGE) return [];
    const correctWord = words[challengePositions[currentIndex]];
    const wrong = pickRandom(words, N_CHOICES - 1, [
      challengePositions[currentIndex],
    ]);
    return shuffle([correctWord, ...wrong]);
  }, [currentIndex, challengePositions, words]);

  const handleChoice = useCallback(
    (word: string) => {
      const correct = words[challengePositions[currentIndex]];
      if (word !== correct) {
        setWrongIndex(currentIndex);
        return;
      }
      setWrongIndex(null);
      const next = currentIndex + 1;
      setAnswers(prev => {
        const updated = [...prev];
        updated[currentIndex] = word;
        return updated;
      });
      setCurrentIndex(next);
      if (next === N_CHALLENGE) {
        start();
      }
    },
    [currentIndex, challengePositions, words, start],
  );

  const handleCancel = useCallback(() => {
    cancel();
    navigation.goBack();
  }, [cancel, navigation]);

  useEffect(() => {
    if (phase === 'done') {
      navigation.navigate('Dashboard', { toast: 'Key saved to card' });
    }
  }, [phase, navigation]);

  const allDone = currentIndex >= N_CHALLENGE;

  useLayoutEffect(() => {
    navigation.setOptions({
      title: phase === 'pin_entry' ? 'Enter Keycard PIN' : 'Check your backup',
    });
  }, [navigation, phase]);

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <Text style={styles.description}>
        Confirm words positions in your recovery phrase.
      </Text>

      <View style={styles.slots}>
        {challengePositions.map((wordIdx, i) => {
          const filled = answers[i] !== null;
          const active = i === currentIndex;
          const wrong = wrongIndex === i;
          return (
            <View
              key={i}
              style={[
                styles.slot,
                active && styles.slotActive,
                wrong && styles.slotWrong,
                filled && styles.slotFilled,
              ]}
            >
              <Text
                style={[
                  styles.slotLabel,
                  filled && styles.slotFilledText,
                  wrong && styles.slotWrongText,
                ]}
              >
                {wordIdx + 1}.
              </Text>
              <Text
                style={[
                  styles.slotWord,
                  filled && styles.slotFilledText,
                  wrong && styles.slotWrongText,
                ]}
              >
                {answers[i] ?? '____'}
              </Text>
              <View style={styles.slotIcon}>
                {filled && <Icons.checkmark width={24} height={20} />}
                {wrong && <Icons.exclamation width={40} height={40} />}
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.spacer} />

      {!allDone && (
        <View style={styles.choices}>
          {choices.map(word => (
            <Pressable
              key={word}
              style={({ pressed }) => [
                styles.choiceBtn,
                pressed && styles.choiceBtnPressed,
              ]}
              onPress={() => handleChoice(word)}
            >
              <Text style={styles.choiceText}>{word}</Text>
            </Pressable>
          ))}
        </View>
      )}

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
  description: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 32,
  },
  slots: {
    gap: 12,
    marginBottom: 40,
  },
  spacer: {
    flex: 1,
  },
  slot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  slotActive: {
    borderWidth: 3,
    borderColor: '#C6C6C6',
  },
  slotFilled: {},
  slotIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotFilledText: {
    color: '#1C8A80',
  },
  slotWrong: {
    borderWidth: 3,
    borderColor: '#E95460',
  },
  slotWrongText: {
    color: '#BA434D',
  },
  slotLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 15 * 1.45,
    letterSpacing: -0.135,
  },
  slotWord: {
    flex: 1,
    color: '#ffffff',
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: 15,
    lineHeight: 15 * 1.45,
    letterSpacing: -0.135,
  },
  choices: {
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  choiceBtn: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#4A4459',
    height: 52,
    justifyContent: 'center',
  },
  choiceBtnPressed: {
    opacity: 0.6,
  },
  choiceText: {
    color: '#ffffff',
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: 15,
    lineHeight: 15 * 1.45,
    letterSpacing: -0.135,
  },
  pinOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
});
