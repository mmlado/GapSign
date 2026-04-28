import { useCallback } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';

import { Icons } from '../../assets/icons';
import type { RootStackParamList } from '../../navigation/types';
import theme from '../../theme';

import contributors from '../../data/contributors.json';

type Contributor = { name: string; github: string | null };

function ContributorRow({ contributor }: { contributor: Contributor }) {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const handlePress = useCallback(() => {
    if (contributor.github) {
      Linking.openURL(`https://github.com/${contributor.github}`);
    }
  }, [contributor.github]);

  const handleShowQR = useCallback(() => {
    if (contributor.github) {
      navigation.navigate('UrlQR', {
        url: `https://github.com/${contributor.github}`,
        title: contributor.name,
      });
    }
  }, [contributor.github, contributor.name, navigation]);

  return (
    <Pressable
      style={[styles.row, styles.rowBorder]}
      onPress={contributor.github ? handleShowQR : undefined}
      disabled={!contributor.github}
      accessibilityLabel={
        contributor.github
          ? `Show QR code for ${contributor.github}`
          : contributor.name
      }
    >
      <Text style={styles.rowLabel}>{contributor.name}</Text>
      {contributor.github ? (
        <View style={styles.icons}>
          <Pressable
            style={styles.openIconButton}
            onPress={handlePress}
            accessibilityLabel={`Open ${contributor.name} GitHub profile`}
          >
            <Icons.openInBrowser
              width={18}
              height={18}
              color={theme.colors.onSurfaceMuted}
            />
          </Pressable>
          <Icons.qr
            width={18}
            height={18}
            color={theme.colors.onSurfaceMuted}
          />
        </View>
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
  icons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  openIconButton: {
    padding: 4,
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
