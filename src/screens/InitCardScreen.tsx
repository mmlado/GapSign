import { StyleSheet, View } from "react-native";
import { DashboardAction, InitCardScreenProps } from "../navigation/types";
import NFCBottomSheet from "../components/NFCBottomSheet";
import PinPad from "../components/PinPad";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useInitCard } from "../hooks/useInitCard";
import DuressQuestion from "../components/DuressQuestion";

export const dashboardEntry: DashboardAction = {
  label: '',
  navigate: (nav) => nav.navigate('ExportKey'),
};
type Step = 'pin_entry' | 'pin_confirm' | 'duress_question' | 'duress_entry' | 'duress_confirm';

export default function InitCardScreen({navigation}: InitCardScreenProps) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('pin_entry');
  const [pin, setPin] = useState('');
  const [duress, setDuress]  = useState(null);

  const {phase, status, result, start, cancel, reset} =
    useInitCard();

  useEffect(() => {
    if (phase !== 'done' || !result) {
      return;
    }

    navigation.reset({index: 0, routes: [{name: 'Dashboard'}]});
  }, [phase, result, navigation]);

  const handleCancel = useCallback(() => {
    cancel();
    navigation.goBack();
  }, [cancel, navigation]);

  const handlePin = useCallback((pin: string) => {

  }, []);

  const handlePinConfirm = useCallback((pin: string) => {

  }, []);

  const handleDuress = useCallback((pin: string) => {

  }, []);

  const handleDuressConfirm = useCallback((pin: string) => {

  }, []);

  const handleDurresYes = useCallback(() => {

  }, []);

  const handleDurresNo = useCallback(() => {
    start(pin, duress)
  }, []);

  const pinPadProps: Record<string, { title: string, onComplete: (pin: string) => void }> = {
    pin_entry: { title: 'Create Keycard PIN', onComplete: handlePin },
    pin_confirm: { title: 'Create Keycard PIN', onComplete: handlePinConfirm },
    duress_entry: { title: 'Create Keycard PIN', onComplete: handleDuress },
    duress_confirm: { title: 'Create Keycard PIN', onComplete: handleDuressConfirm },
  };

  const currentPinPad = pinPadProps[step];

  return (
    <View style={[styles.container, {paddingBottom: insets.bottom + 16}]}>
      {phase === 'idle' && currentPinPad && (
        <PinPad
          title={currentPinPad.title}
          onComplete={currentPinPad.onComplete}
        />
      )}

      {phase === 'idle' && step === 'duress_question' && (
        <DuressQuestion onYes={handleDurresYes} onNo={handleDurresNo} />
      )}

      <NFCBottomSheet
        visible={phase === 'nfc' || phase === 'error' || phase === 'done'}
        status={status}
        variant={phase === 'done' ? 'success' : phase === 'error' ? 'error' : 'scanning'}
        onCancel={handleCancel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
});
