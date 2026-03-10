import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import PrimaryButton from './PrimaryButton';

interface ConfirmPromptProps {
  title: string;
  description: string;
  yesLabel?: string; // default: 'Yes'
  noLabel?: string; // default: 'No'
  onYes: () => void;
  onNo: () => void;
}

export default function ConfirmPrompt({
  title,
  description,
  yesLabel = 'Yes',
  noLabel = 'No',
  onYes,
  onNo,
}: ConfirmPromptProps) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      <View style={styles.buttons}>
        <PrimaryButton label={yesLabel} onPress={onYes} />
        <PrimaryButton label={noLabel} onPress={onNo} />
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
