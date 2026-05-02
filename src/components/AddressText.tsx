import { StyleSheet, Text, type TextStyle } from 'react-native';

import theme from '../theme';

const ETH_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const BTC_BECH32_RE =
  /^(bc1|tb1|bcrt1)[023456789acdefghjklmnpqrstuvwxyz]{11,}$/i;
const BTC_BASE58_RE = /^[13mn2][A-HJ-NP-Za-km-z1-9]{25,62}$/;

export function isDisplayAddress(value: string): boolean {
  return (
    ETH_ADDRESS_RE.test(value) ||
    BTC_BECH32_RE.test(value) ||
    BTC_BASE58_RE.test(value)
  );
}

function chunkAddress(address: string): { prefix: string; groups: string[] } {
  const hasHexPrefix = address.startsWith('0x') || address.startsWith('0X');
  const prefix = hasHexPrefix ? address.slice(0, 2) : '';
  const body = hasHexPrefix ? address.slice(2) : address;
  const groups = body.match(/.{1,4}/g) ?? [];
  return { prefix, groups };
}

export default function AddressText({
  address,
  selectable = false,
  style,
}: {
  address: string;
  selectable?: boolean;
  style?: TextStyle | TextStyle[];
}) {
  const { prefix, groups } = chunkAddress(address);
  const flattened = StyleSheet.flatten(style);
  const activeColor = flattened?.color ?? theme.colors.onSurface;

  return (
    <Text selectable={selectable} style={[styles.address, style]}>
      {prefix ? (
        <Text style={[styles.address, { color: theme.colors.onSurfaceMuted }]}>
          {prefix}
        </Text>
      ) : null}
      {groups.map((group, index) => (
        <Text
          key={`${index}-${group}`}
          style={[
            styles.address,
            index % 2 === 0 ? styles.activeGroup : null,
            {
              color:
                index % 2 === 0 ? activeColor : theme.colors.onSurfaceSubtle,
            },
          ]}
        >
          {group}
        </Text>
      ))}
    </Text>
  );
}

const styles = StyleSheet.create({
  address: {
    fontFamily: 'monospace',
  },
  activeGroup: {
    fontWeight: '600',
  },
});
