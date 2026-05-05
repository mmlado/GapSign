import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import Key from './Key';

type KeypadProps = {
  keys: string[][];
  onKey: (key: string) => void;
};

function Keypad({ keys, onKey }: KeypadProps) {
  return (
    <View style={styles.pad}>
      {keys.map((row, ri) => (
        <View key={ri} style={styles.padRow}>
          {row.map((key, ki) => (
            <Key key={ki} value={key} onKey={onKey} />
          ))}
        </View>
      ))}
    </View>
  );
}

export default memo(Keypad);

const styles = StyleSheet.create({
  pad: {
    width: '100%',
    gap: 4,
  },
  padRow: {
    flexDirection: 'row',
    gap: 10,
  },
});
