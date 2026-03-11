import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NFCBottomSheet from '../../components/NFCBottomSheet';
import PrimaryButton from '../../components/PrimaryButton';
import { GenerateKeyScreenProps } from '../../navigation/types';
import { useGenerateKey } from '../../hooks/useGenerateKey';
import theme from '../../theme';

export default function GenerateKeyScreen({
  navigation,
  route,
}: GenerateKeyScreenProps) {
  const insets = useSafeAreaInsets();
  const [revealed, setRevealed] = useState(false);

  const { phase, status, result, start, cancel } = useGenerateKey(
    route.params.size,
  );

  useLayoutEffect(() => {
    navigation.setOptions({ title: '' });
  }, [navigation]);

  useEffect(() => {
    start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCancel = useCallback(() => {
    cancel();
    navigation.goBack();
  }, [cancel, navigation]);

  const handleButton = useCallback(() => {
    if (!revealed) {
      setRevealed(true);
      return;
    }
    navigation.navigate('ConfirmKey', { words: result ?? [] });
  }, [revealed, navigation, result]);

  const words = result ?? [];
  const half = words.length / 2;

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 16 }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <Text variant="headlineMedium" style={styles.title}>
          Backup recovery phrase
        </Text>
        <Text style={styles.description}>
          Write down your recovery phrase and store it in a secure location.
          Never share your recovery phrase with anyone. It gives access to your
          funds.
        </Text>

        {phase === 'done' && result && (
          <View style={styles.wordGridWrapper}>
            <View style={styles.wordGrid}>
              <View style={styles.column}>
                {words.slice(0, half).map((word, i) => (
                  <View key={i} style={styles.wordCell}>
                    <Text style={styles.wordIndex}>{i + 1}.</Text>
                    <Text style={styles.wordText}>{word}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.column}>
                {words.slice(half).map((word, i) => (
                  <View key={i} style={styles.wordCell}>
                    <Text style={styles.wordIndex}>{half + i + 1}.</Text>
                    <Text style={styles.wordText}>{word}</Text>
                  </View>
                ))}
              </View>
            </View>
            {!revealed && (
              <BlurView
                style={StyleSheet.absoluteFill}
                blurType="dark"
                blurAmount={10}
              />
            )}
          </View>
        )}
      </ScrollView>

      {phase === 'done' && (
        <View style={styles.buttonArea}>
          <PrimaryButton
            label={revealed ? 'Done' : 'Reveal recovery phrase'}
            onPress={handleButton}
          />
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  title: {
    color: '#ffffff',
    marginBottom: 12,
  },
  description: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    lineHeight: 22,
  },
  wordGridWrapper: {
    marginTop: 24,
  },
  wordGrid: {
    flexDirection: 'row',
  },
  column: {
    flex: 1,
  },
  wordCell: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    gap: 6,
  },
  wordIndex: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    width: 22,
    textAlign: 'right',
  },
  wordText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '500',
  },
  buttonArea: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
});
