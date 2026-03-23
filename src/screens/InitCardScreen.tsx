import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DashboardAction, InitCardScreenProps } from '../navigation/types';

import { useInitCard } from '../hooks/keycard/useInitCard';
import { useConfirmedEntry } from '../hooks/useConfirmedEntry';

import ConfirmPrompt from '../components/ConfirmPropmpt';
import NFCBottomSheet from '../components/NFCBottomSheet';
import PinPad from '../components/PinPad';

export const dashboardEntry: DashboardAction = {
  label: 'Initialize a Keycard',
  navigate: nav => nav.navigate('InitCard'),
};

type ScreenStep = 'pin_setup' | 'duress_question' | 'duress_setup';

export default function InitCardScreen({ navigation }: InitCardScreenProps) {
  const insets = useSafeAreaInsets();
  const [screenStep, setScreenStep] = useState<ScreenStep>('pin_setup');
  const mainPinRef = useRef('');

  const keycard = useInitCard();
  const { phase, result, start, cancel } = keycard;

  const pinSetup = useConfirmedEntry(pin => {
    mainPinRef.current = pin;
    setScreenStep('duress_question');
  });

  const duressSetup = useConfirmedEntry(pin => {
    start(mainPinRef.current, pin);
    mainPinRef.current = '';
  });

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

  const handleDuressYes = useCallback(() => {
    setScreenStep('duress_setup');
  }, []);

  const handleDuressNo = useCallback(() => {
    start(mainPinRef.current, null);
    mainPinRef.current = '';
  }, [start]);

  const goBack = useCallback(() => {
    if (phase === 'nfc') {
      cancel();
      navigation.goBack();
      return true;
    }

    if (screenStep === 'pin_setup') {
      const handled = pinSetup.goBack();
      if (!handled) {
        navigation.goBack();
      }
      return true;
    }

    if (screenStep === 'duress_question') {
      setScreenStep('pin_setup');
      pinSetup.jumpToConfirm();
      return true;
    }

    if (screenStep === 'duress_setup') {
      const handled = duressSetup.goBack();
      if (!handled) {
        setScreenStep('duress_question');
      }
      return true;
    }

    return true;
  }, [phase, screenStep, pinSetup, duressSetup, cancel, navigation]);

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
      if (screenStep === 'pin_setup' && pinSetup.step === 'confirm') {
        e.preventDefault();
        pinSetup.goBack();
        return;
      }
      if (screenStep === 'duress_question') {
        e.preventDefault();
        setScreenStep('pin_setup');
        pinSetup.jumpToConfirm();
        return;
      }
      if (screenStep === 'duress_setup') {
        e.preventDefault();
        const handled = duressSetup.goBack();
        if (!handled) {
          setScreenStep('duress_question');
        }
      }
    });
    return unsubscribe;
  }, [navigation, phase, screenStep, pinSetup, duressSetup, cancel]);

  const title = (() => {
    if (screenStep === 'pin_setup') {
      return pinSetup.step === 'entry' ? 'Create a PIN' : 'Confirm your PIN';
    }
    if (screenStep === 'duress_question') {
      return 'Initialize Card';
    }
    return duressSetup.step === 'entry'
      ? 'Create a duress PIN'
      : 'Confirm duress PIN';
  })();

  useLayoutEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  const activePinSetup =
    screenStep === 'pin_setup'
      ? pinSetup
      : screenStep === 'duress_setup'
      ? duressSetup
      : null;

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 16 }]}>
      {phase === 'idle' && activePinSetup && (
        <PinPad
          key={activePinSetup.step}
          onComplete={
            activePinSetup.step === 'entry'
              ? activePinSetup.handleEntry
              : activePinSetup.handleConfirm
          }
          error={activePinSetup.error}
          onType={activePinSetup.clearError}
        />
      )}

      {phase === 'idle' && screenStep === 'duress_question' && (
        <ConfirmPrompt
          title="Add a duress PIN?"
          description="A duress PIN unlocks the card but shows a decoy account. Use it if you are ever forced to access your wallet under pressure."
          yesLabel="Yes, add duress PIN"
          noLabel="No, skip"
          onYes={handleDuressYes}
          onNo={handleDuressNo}
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
