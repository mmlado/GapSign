import { BackHandler, StyleSheet, View } from 'react-native';
import { DashboardAction, InitCardScreenProps } from '../navigation/types';
import NFCBottomSheet from '../components/NFCBottomSheet';
import PinPad from '../components/PinPad';
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useInitCard } from '../hooks/keycard/useInitCard';
import ConfirmPrompt from '../components/ConfirmPropmpt';
import { useFocusEffect } from '@react-navigation/native';

export const dashboardEntry: DashboardAction = {
  label: 'Initialize a Keycard',
  navigate: nav => nav.navigate('InitCard'),
};
type Step =
  | 'pin_entry'
  | 'pin_confirm'
  | 'duress_question'
  | 'duress_entry'
  | 'duress_confirm';

export default function InitCardScreen({ navigation }: InitCardScreenProps) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('pin_entry');
  const [error, setError] = useState<string | undefined>('');

  const pinRef = useRef('');
  const duressRef = useRef<string | null>(null);

  const keycard = useInitCard();
  const { phase, result, start, cancel } = keycard;

  useEffect(() => {
    if (phase !== 'done' || !result) {
      return;
    }

    navigation.reset({
      index: 0,
      routes: [{ name: 'Dashboard', params: { toast: 'Card initialized' } }],
    });
  }, [phase, result, navigation]);

  const handleCancel = useCallback(() => {
    cancel();
    navigation.goBack();
  }, [cancel, navigation]);

  const handlePin = useCallback((pin: string) => {
    pinRef.current = pin;
    setStep('pin_confirm');
  }, []);

  const handlePinConfirm = useCallback((pin: string) => {
    if (pinRef.current !== pin) {
      setError("PINs don't match");
      return;
    }
    setError(undefined);
    setStep('duress_question');
  }, []);

  const handleDuress = useCallback((pin: string) => {
    duressRef.current = pin;
    setStep('duress_confirm');
  }, []);

  const handleDuressConfirm = useCallback(
    (pin: string) => {
      if (duressRef.current !== pin) {
        setError("PINs don't match");
        return;
      }
      setError(undefined);
      start(pinRef.current, duressRef.current);
    },
    [start],
  );

  const handleDurresYes = useCallback(() => {
    setStep('duress_entry');
  }, []);

  const handleDurresNo = useCallback(() => {
    start(pinRef.current, duressRef.current);
  }, [start]);

  const goBack = useCallback(() => {
    const prev: Record<Step, Step | null> = {
      pin_entry: null, // exit screen
      pin_confirm: 'pin_entry',
      duress_question: 'pin_confirm',
      duress_entry: 'duress_question',
      duress_confirm: 'duress_entry',
    };

    if (phase === 'nfc') {
      cancel();
      navigation.goBack();
      return true;
    }

    const prevStep = prev[step];
    if (prevStep === null) {
      navigation.goBack();
      return true;
    }

    setError(undefined);
    setStep(prevStep);
    return true; // consumed — don't let RN handle it
  }, [phase, step, cancel, navigation]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', goBack);
      return () => sub.remove();
    }, [goBack]),
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', e => {
      if (phase === 'nfc') {
        cancel();
        return;
      }
      const prev: Record<Step, Step | null> = {
        pin_entry: null,
        pin_confirm: 'pin_entry',
        duress_question: 'pin_confirm',
        duress_entry: 'duress_question',
        duress_confirm: 'duress_entry',
      };
      const prevStep = prev[step];
      if (prevStep !== null) {
        e.preventDefault();
        setError(undefined);
        setStep(prevStep);
      }
    });
    return unsubscribe;
  }, [navigation, phase, step, cancel]);

  const stepTitles: Record<Step, string> = {
    pin_entry: 'Create a PIN',
    pin_confirm: 'Confirm your PIN',
    duress_question: 'Initialize Card',
    duress_entry: 'Create a duress PIN',
    duress_confirm: 'Confirm duress PIN',
  };

  const pinPadProps: Record<string, { onComplete: (pin: string) => void }> = {
    pin_entry: { onComplete: handlePin },
    pin_confirm: { onComplete: handlePinConfirm },
    duress_entry: { onComplete: handleDuress },
    duress_confirm: { onComplete: handleDuressConfirm },
  };

  const currentPinPad = pinPadProps[step];

  useLayoutEffect(() => {
    navigation.setOptions({ title: stepTitles[step] });
  }, [navigation, step]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 16 }]}>
      {phase === 'idle' && currentPinPad && (
        <PinPad
          key={step}
          onComplete={currentPinPad.onComplete}
          error={error}
          onType={() => setError(undefined)}
        />
      )}

      {phase === 'idle' && step === 'duress_question' && (
        <ConfirmPrompt
          title="Add a duress PIN?"
          description="A duress PIN unlocks the card but shows a decoy account. Use it if you are ever forced to access your wallet under pressure."
          yesLabel="Yes, add duress PIN"
          noLabel="No, skip"
          onYes={handleDurresYes}
          onNo={handleDurresNo}
        />
      )}

      <NFCBottomSheet nfc={keycard} onCancel={handleCancel} showOnDone />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
});
