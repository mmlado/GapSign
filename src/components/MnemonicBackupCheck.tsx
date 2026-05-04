import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import theme from '../theme';

import { Icons } from '../assets/icons';
import { SEED_VERIFY_FAILURE_THRESHOLD } from '../constants/backup';

const DEFAULT_CHALLENGE_COUNT = 4;
const DEFAULT_CHOICE_COUNT = 4;

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

type Props = {
  words: string[];
  description: string;
  onComplete: () => void;
  onFailure?: () => void;
  challengeCount?: number;
  choiceCount?: number;
  failureThreshold?: number;
};

export default function MnemonicBackupCheck({
  words,
  description,
  onComplete,
  onFailure,
  challengeCount = DEFAULT_CHALLENGE_COUNT,
  choiceCount = DEFAULT_CHOICE_COUNT,
  failureThreshold = SEED_VERIFY_FAILURE_THRESHOLD,
}: Props) {
  const [challengePositions] = useState(() => {
    const indices = words.map((_, i) => i);
    return shuffle(indices)
      .slice(0, challengeCount)
      .sort((a, b) => a - b);
  });

  const [answers, setAnswers] = useState<(string | null)[]>(
    Array(challengeCount).fill(null),
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [wrongIndex, setWrongIndex] = useState<number | null>(null);
  const [wrongCount, setWrongCount] = useState(0);
  const [remainingRetries, setRemainingRetries] = useState(failureThreshold);

  const choices = useMemo(() => {
    if (currentIndex >= challengeCount) {
      return [];
    }

    const correctWord = words[challengePositions[currentIndex]];
    const wrong = pickRandom(words, choiceCount - 1, [
      challengePositions[currentIndex],
    ]);
    return shuffle([correctWord, ...wrong]);
  }, [challengeCount, choiceCount, currentIndex, challengePositions, words]);

  const handleChoice = useCallback(
    (word: string) => {
      const correct = words[challengePositions[currentIndex]];
      if (word !== correct) {
        const nextWrongCount = wrongCount + 1;
        const remaining = failureThreshold - nextWrongCount;
        setWrongIndex(currentIndex);
        setWrongCount(nextWrongCount);
        setRemainingRetries(remaining);
        if (remaining <= 0) {
          onFailure?.();
        }
        return;
      }

      setWrongIndex(null);
      const nextIndex = currentIndex + 1;
      setAnswers(prev => {
        const updated = [...prev];
        updated[currentIndex] = word;
        return updated;
      });
      setCurrentIndex(nextIndex);

      if (nextIndex === challengeCount) {
        onComplete();
      }
    },
    [
      challengeCount,
      currentIndex,
      challengePositions,
      failureThreshold,
      onComplete,
      onFailure,
      words,
      wrongCount,
    ],
  );

  const allDone = currentIndex >= challengeCount;

  return (
    <>
      <Text style={styles.description}>{description}</Text>

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

      {wrongIndex !== null && remainingRetries > 0 && (
        <Text style={styles.wrongFeedback}>
          Wrong answer · {remainingRetries}{' '}
          {remainingRetries === 1 ? 'retry' : 'retries'} left
        </Text>
      )}

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
    </>
  );
}

const styles = StyleSheet.create({
  description: {
    color: theme.colors.onSurfaceVariant,
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
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  slotActive: {
    borderColor: theme.colors.outlineActive,
    borderWidth: 3,
  },
  slotIcon: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  slotFilledText: {
    color: theme.colors.success,
  },
  slotWrong: {
    borderColor: theme.colors.error,
    borderWidth: 3,
  },
  slotWrongText: {
    color: theme.colors.errorDark,
  },
  slotLabel: {
    color: theme.colors.onSurfaceMuted,
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: -0.135,
    lineHeight: 15 * 1.45,
  },
  slotWord: {
    color: theme.colors.onSurface,
    flex: 1,
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: -0.135,
    lineHeight: 15 * 1.45,
  },
  choices: {
    gap: 12,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  choiceBtn: {
    backgroundColor: theme.colors.surfaceChoice,
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  choiceBtnPressed: {
    opacity: 0.6,
  },
  choiceText: {
    color: theme.colors.onSurface,
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: -0.135,
    lineHeight: 15 * 1.45,
  },
  wrongFeedback: {
    color: theme.colors.error,
    fontSize: 13,
    marginBottom: 8,
    textAlign: 'center',
  },
});
