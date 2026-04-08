import { useEffect, useMemo } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { Text } from 'react-native-paper';

import theme from '../theme';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  wordCount: number;
  wordList: readonly string[];
  wordListName: string;
  placeholder: string;
  errors?: Array<string | null | undefined>;
  onWordsChange?: (words: string[]) => void;
  onWordErrorChange?: (error: string | null) => void;
  wordCountOptions?: readonly number[];
  onWordCountChange?: (wordCount: number) => void;
  inputStyle?: StyleProp<TextStyle>;
  wrapperStyle?: StyleProp<ViewStyle>;
};

export default function MnemonicWordEntry({
  value,
  onChangeText,
  wordCount,
  wordList,
  wordListName,
  placeholder,
  errors = [],
  onWordsChange,
  onWordErrorChange,
  wordCountOptions,
  onWordCountChange,
  inputStyle,
  wrapperStyle,
}: Props) {
  const words = useMemo(
    () =>
      value
        .trim()
        .split(/\s+/)
        .filter(w => w.length > 0),
    [value],
  );

  const wordError = useMemo(() => {
    const hasTrailing = value.endsWith(' ') || value.endsWith('\n');
    const completeWords =
      hasTrailing || words.length >= wordCount ? words : words.slice(0, -1);
    const invalid = completeWords.find(
      word => !wordList.includes(word.toLowerCase()),
    );
    return invalid ? `"${invalid}" is not a valid ${wordListName} word` : null;
  }, [value, wordCount, wordList, wordListName, words]);

  useEffect(() => {
    onWordsChange?.(words);
  }, [onWordsChange, words]);

  useEffect(() => {
    onWordErrorChange?.(wordError);
  }, [onWordErrorChange, wordError]);

  return (
    <View style={[styles.wrapper, wrapperStyle]}>
      {wordCountOptions && wordCountOptions.length > 1 && (
        <View style={styles.segmented}>
          {wordCountOptions.map((option, index) => (
            <View key={option} style={styles.segmentWrapper}>
              {index > 0 && <View style={styles.segmentDivider} />}
              <Pressable
                style={[
                  styles.segment,
                  wordCount === option && styles.segmentActive,
                ]}
                onPress={() => onWordCountChange?.(option)}
              >
                <Text
                  style={[
                    styles.segmentText,
                    wordCount === option && styles.segmentActiveText,
                  ]}
                >
                  {`${option} words`}
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <View style={styles.inputWrapper}>
        <TextInput
          style={[styles.wordInput, inputStyle]}
          value={value}
          onChangeText={onChangeText}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.onSurfacePlaceholder}
        />
        {wordError && <Text style={styles.errorText}>{wordError}</Text>}
        {errors
          .filter((error): error is string => Boolean(error))
          .map(error => (
            <Text key={error} style={styles.errorText}>
              {error}
            </Text>
          ))}
        <Text style={styles.wordCountText}>
          {`${words.length}/${wordCount} words`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 20,
  },
  segmented: {
    borderColor: theme.colors.outline,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  segmentWrapper: {
    flex: 1,
    flexDirection: 'row',
  },
  segment: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    flex: 1,
    paddingVertical: 12,
  },
  segmentActive: {
    backgroundColor: theme.colors.surfaceSelected,
  },
  segmentDivider: {
    backgroundColor: theme.colors.outline,
    width: 1,
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
    borderBottomColor: theme.colors.onSurface,
    borderBottomWidth: 3,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    color: theme.colors.onSurface,
    fontSize: 16,
    minHeight: 128,
    paddingBottom: 4,
    paddingHorizontal: 16,
    paddingTop: 4,
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
});
