import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Text} from 'react-native-paper';
import PrimaryButton from './PrimaryButton';

interface DuressQuestionProps {
  onYes: () => void;
  onNo: () => void;
}

export default function DuressQuestion({onYes, onNo}: DuressQuestionProps) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Add a duress PIN?</Text>
        <Text style={styles.description}>
          A duress PIN unlocks the card but shows a decoy account. Use it if you
          are ever forced to access your wallet under pressure.
        </Text>
      </View>
      <View style={styles.buttons}>
        <PrimaryButton label="Yes, add duress PIN" onPress={onYes} />
        <PrimaryButton label="No, skip" onPress={onNo} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: 16,
  },
  title: {
    color: '#ffffff',
    fontFamily: 'Inter_18pt-SemiBold',
    fontSize: 27,
    lineHeight: 32,
    letterSpacing: -0.567,
  },
  description: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 15,
    lineHeight: 22,
  },
  buttons: {
    gap: 12,
    paddingBottom: 16,
  },
});
