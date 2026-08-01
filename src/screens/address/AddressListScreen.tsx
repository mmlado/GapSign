import { HDKey } from '@scure/bip32';
import {
  memo,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddressListScreenProps } from '../../navigation/types';
import theme from '../../theme';

import { Icons } from '../../assets/icons';
import AddressText from '../../components/AddressText';
import NFCBottomSheet from '../../components/NFCBottomSheet';

import { useAddresses } from '../../hooks/keycard/useAddresses';

import { pubKeyToBtcAddress } from '../../utils/bitcoinAddress';
import { pubKeyToEthAddress } from '../../utils/ethereumAddress';
import { addressDerivationPath, deriveAddresses } from '../../utils/hdAddress';

const BATCH = 20;
const ADDR_FN = { eth: pubKeyToEthAddress, btc: pubKeyToBtcAddress };

type RowProps = {
  address: string;
  path: string;
  onNavigate: (address: string, path: string) => void;
};

const AddressRow = memo(({ address, path, onNavigate }: RowProps) => (
  <Pressable style={styles.row} onPress={() => onNavigate(address, path)}>
    <AddressText address={address} style={styles.address} />
    <View style={styles.metaRow}>
      <Text style={styles.path}>{path}</Text>
      <Icons.qr width={16} height={16} color={theme.colors.onSurfaceVariant} />
    </View>
  </Pressable>
));

export default function AddressListScreen({
  route,
  navigation,
}: AddressListScreenProps) {
  const { coin } = route.params;
  const keycard = useAddresses(coin);
  const { phase, result: accountKey, start } = keycard;
  const insets = useSafeAreaInsets();

  const [addresses, setAddresses] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const externalRef = useRef<HDKey | null>(null);
  const nextIndexRef = useRef(0);

  useLayoutEffect(() => {
    if (phase === 'pin_entry') {
      navigation.setOptions({ title: 'Enter Keycard PIN' });
    } else {
      const label = coin === 'eth' ? 'Ethereum' : 'Bitcoin';
      navigation.setOptions({ title: `${label} Addresses` });
    }
  }, [navigation, coin, phase]);

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

  const keyExtractor = useCallback((_: string, i: number) => String(i), []);

  const handleRowPress = useCallback(
    (address: string, derivationPath: string) =>
      navigation.navigate('AddressDetail', { address, derivationPath }),
    [navigation],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: string; index: number }) => (
      <AddressRow
        address={item}
        path={addressDerivationPath(coin, index)}
        onNavigate={handleRowPress}
      />
    ),
    [coin, handleRowPress],
  );

  const handleCancel = useCallback(() => {
    keycard.cancel();
    navigation.goBack();
  }, [keycard, navigation]);

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
        keyExtractor={keyExtractor}
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
        renderItem={renderItem}
      />

      <NFCBottomSheet nfc={keycard} onCancel={handleCancel} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  row: {
    padding: 12,
    gap: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.surfaceVariant,
  },
  address: {
    color: theme.colors.onSurface,
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  path: {
    color: theme.colors.onSurfaceVariant,
    fontFamily: 'monospace',
    fontSize: 12,
  },
  footer: { paddingVertical: 16 },
});
