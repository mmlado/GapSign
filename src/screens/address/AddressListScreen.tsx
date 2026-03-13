import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Icons } from '../../assets/icons';
import { HDKey } from '@scure/bip32';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAddresses } from '../../hooks/keycard/useAddresses';
import { deriveAddresses } from '../../utils/hdAddress';
import { pubKeyToEthAddress } from '../../utils/ethereumAddress';
import { pubKeyToBtcAddress } from '../../utils/bitcoinAddress';
import NFCBottomSheet from '../../components/NFCBottomSheet';
import PinPad from '../../components/PinPad';
import { AddressListScreenProps } from '../../navigation/types';
import theme from '../../theme';

const BATCH = 20;
const ADDR_FN = { eth: pubKeyToEthAddress, btc: pubKeyToBtcAddress };

export default function AddressListScreen({
  route,
  navigation,
}: AddressListScreenProps) {
  const { coin } = route.params;
  const {
    phase,
    result: accountKey,
    status,
    cancel,
    start,
    submitPin,
  } = useAddresses(coin);
  const insets = useSafeAreaInsets();

  const [addresses, setAddresses] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const externalRef = useRef<HDKey | null>(null);
  const nextIndexRef = useRef(0);

  useLayoutEffect(() => {
    const label = coin === 'eth' ? 'Ethereum' : 'Bitcoin';
    navigation.setOptions({ title: `${label} Addresses` });
  }, [navigation, coin]);

  useEffect(() => {
    start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase === 'done' && accountKey) {
      externalRef.current = accountKey.deriveChild(0);
      nextIndexRef.current = 0;
      loadMore();
    }
  }, [phase, accountKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = useCallback(() => {
    if (!externalRef.current) return;
    const from = nextIndexRef.current;
    nextIndexRef.current += BATCH;
    setLoading(true);
    const key = externalRef.current;
    setTimeout(() => {
      const batch = deriveAddresses(key, BATCH, ADDR_FN[coin], from);
      setAddresses(prev => [...prev, ...batch]);
      setLoading(false);
    }, 0);
  }, [coin]);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <FlatList
        data={addresses}
        keyExtractor={(_, i) => String(i)}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loading ? (
            <ActivityIndicator
              style={styles.footer}
              color={theme.colors.primary}
            />
          ) : null
        }
        renderItem={({ item, index }) => (
          <Pressable
            style={styles.row}
            onPress={() =>
              navigation.navigate('AddressDetail', { address: item, index })
            }
          >
            <Text style={styles.index}>{index}</Text>
            <Text style={styles.address}>{item}</Text>
            <View style={styles.qrIcon}>
              <Icons.qr
                width={20}
                height={20}
                color={theme.colors.onSurfaceVariant}
              />
            </View>
          </Pressable>
        )}
      />

      {phase === 'pin_entry' && (
        <View style={styles.pinOverlay}>
          <PinPad title="Enter Keycard PIN" onComplete={submitPin} />
        </View>
      )}

      <NFCBottomSheet
        visible={phase === 'nfc' || phase === 'error'}
        status={status}
        variant={phase === 'error' ? 'error' : 'scanning'}
        onCancel={() => {
          cancel();
          navigation.goBack();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  row: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.surfaceVariant,
  },
  index: { width: 40, color: theme.colors.onSurfaceVariant },
  address: { flex: 1, color: theme.colors.onSurface, fontFamily: 'monospace' },
  footer: { paddingVertical: 16 },
  qrIcon: { width: 40, alignItems: 'center', justifyContent: 'center' },
  pinOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
});
