import { StyleSheet, View } from "react-native";
import { DashboardAction, FactoryResetSreenProps } from "../navigation/types";
import NFCBottomSheet from "../components/NFCBottomSheet";
import ConfirmPrompt from "../components/ConfirmPropmpt";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFactoryReset } from "../hooks/useFactoryReset";
import { useCallback, useEffect } from "react";

export const dashboardEntry: DashboardAction = {
  label: 'Factory reset card',
  navigate: (nav) => nav.navigate('FactoryReset'),
};

export default function FactoryResetScreen({navigation}: FactoryResetSreenProps) {
  const insets = useSafeAreaInsets();
  
  const {phase, status, start, cancel} = useFactoryReset();

  useEffect(() => {
    if (phase !== 'done') {
      return;
    }

    navigation.reset({index: 0, routes: [{name: 'Dashboard', params: {toast: 'Factory reset done'}}]});
  }, [phase, navigation]);

  const handleConfirmYes = useCallback(() => {
    start();
  }, [navigation]);

  const handleConfirmNo = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleCancel = useCallback(() => {
    cancel();
    navigation.goBack();
  }, [cancel, navigation]);

  return (
    <View style={[styles.container, {paddingBottom: insets.bottom + 16}]}>
      {phase === 'idle' && (
        <ConfirmPrompt
          title="Factory reset card?"
          description="This will permanently erase all keys, PINs, and pairings from the card. Make sure you have a backup of your seed phrase before continuing. This cannot be undone."
          yesLabel="Yes, erase card"
          noLabel="Cancel"
          onYes={handleConfirmYes}
          onNo={handleConfirmNo}
        />
      )}

      <NFCBottomSheet
        visible={phase === 'nfc' || phase === 'error' || phase === 'done'}
        status={status}
        variant={phase === 'done' ? 'success' : phase === 'error' ? 'error' : 'scanning'}
        onCancel={handleCancel}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
});
