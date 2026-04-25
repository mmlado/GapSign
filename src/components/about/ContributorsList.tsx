import { useCallback } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icons } from '../../assets/icons';
import theme from '../../theme';

import contributors from '../../data/contributors.json';

type Contributor = { name: string; github: string | null };

function ContributorRow({ contributor }: { contributor: Contributor }) {
  const handlePress = useCallback(() => {
    if (contributor.github) {
      Linking.openURL(`https://github.com/${contributor.github}`);
    }
  }, [contributor.github]);

  return (
    <Pressable
      style={[styles.row, styles.rowBorder]}
      onPress={contributor.github ? handlePress : undefined}
      disabled={!contributor.github}
    >
      <Text style={styles.rowLabel}>{contributor.name}</Text>
      {contributor.github ? (
        <Icons.openInBrowser
          width={18}
          height={18}
          color={theme.colors.onSurfaceMuted}
        />
      ) : null}
    </Pressable>
  );
}

export default function ContributorsList() {
  const entries = contributors as Contributor[];

  return (
    <View style={styles.list}>
      {entries.map((contributor, index) => (
        <View
          key={contributor.name}
          style={index < entries.length - 1 ? styles.rowBorderWrap : undefined}
        >
          <ContributorRow contributor={contributor} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceList,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surface,
  },
  rowBorderWrap: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surface,
  },
  rowLabel: {
    fontFamily: 'Inter_18pt-Medium',
    fontSize: 15,
    color: theme.colors.onSurface,
  },
});
