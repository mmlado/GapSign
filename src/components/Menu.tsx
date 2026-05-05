import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icons } from '../assets/icons';
import theme from '../theme';

type Entry = {
  label: string;
  onPress: () => void;
  requiresNfc?: boolean;
  detail?: string;
};

type Props = {
  entries: Entry[];
};

export default function Menu({ entries }: Props) {
  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.list}>
        {entries.map((action, i) => (
          <Pressable
            style={[styles.item, i < entries.length - 1 && styles.itemBorder]}
            key={i}
            onPress={action.onPress}
          >
            <View style={styles.labelRow}>
              <Text
                style={styles.itemLabel}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {action.label}
              </Text>
              {action.detail ? (
                <Text
                  style={styles.itemDetail}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {action.detail}
                </Text>
              ) : null}
            </View>
            <View style={styles.trailingIcons}>
              {action.requiresNfc ? (
                <Icons.nfcActivate
                  testID={`menu-nfc-indicator-${i}`}
                  width={20}
                  height={20}
                  color={theme.colors.primary}
                />
              ) : null}
              <Icons.chevronRight width={24} height={24} />
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    marginHorizontal: '3%',
  },
  scrollContent: {
    padding: 16,
    gap: 12,
    alignItems: 'center',
  },
  list: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF0D',
    width: '100%',
  },
  actions: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: theme.colors.background,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: 12,
    paddingLeft: 16,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surface,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
    marginRight: 12,
  },
  itemLabel: {
    fontFamily: 'Inter_18pt-Medium',
    fontWeight: '500',
    fontSize: 15,
    lineHeight: 15 * 1.45,
    letterSpacing: -0.135,
    color: theme.colors.onSurface,
    flexShrink: 1,
  },
  itemDetail: {
    fontFamily: 'Inter_18pt-Regular',
    fontSize: 13,
    lineHeight: 13 * 1.45,
    color: theme.colors.onSurfaceMuted,
    flexShrink: 1,
  },
  trailingIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
