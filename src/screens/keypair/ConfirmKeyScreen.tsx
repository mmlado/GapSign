import { Pressable, StyleSheet, View } from 'react-native';
import theme from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ConfirmKeySreenProps } from '../../navigation/types';
import { useLoadKey } from '../../hooks/keycard/useLoadKey';
import { useCallback, useEffect, useMemo, useState } from 'react';
import NFCBottomSheet from '../../components/NFCBottomSheet';
import { Text } from 'react-native-paper';
import PinPad from '../../components/PinPad';

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
  const { words } = route.params;

  const { phase, status, start, cancel, submitPin } = useLoadKey(words);

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
      if (word !== correct) return;
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

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <Text variant="headlineMedium" style={styles.title}>
        Check your backup
      </Text>
      <Text style={styles.description}>
        Confirm words positions in your recovery phrase.
      </Text>

      <View style={styles.slots}>
        {challengePositions.map((wordIdx, i) => {
          const filled = answers[i] !== null;
          const active = i === currentIndex;
          return (
            <View
              key={i}
              style={[
                styles.slot,
                active && styles.slotActive,
                filled && styles.slotFilled,
              ]}
            >
              <Text style={styles.slotLabel}>{wordIdx + 1}.</Text>
              <Text style={styles.slotWord}>{answers[i] ?? '____'}</Text>
            </View>
          );
        })}
      </View>

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
        <PinPad title="Enter Keycard PIN" onComplete={submitPin} />
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
  title: {
    color: '#ffffff',
    marginBottom: 12,
  },
  description: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 32,
  },
  slots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 40,
  },
  slot: {
    width: '45%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    padding: 12,
  },
  slotActive: {
    borderColor: theme.colors.primary,
  },
  slotFilled: {
    borderColor: 'rgba(255,255,255,0.4)',
  },
  slotLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    marginBottom: 4,
  },
  slotWord: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '500',
  },
  choices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  choiceBtn: {
    flex: 1,
    minWidth: '45%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  choiceBtnPressed: {
    opacity: 0.6,
  },
  choiceText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '500',
  },
});
