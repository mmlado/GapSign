import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import theme from '../theme';
import { Icons } from '../assets/icons';

type Entry = {
  label: string;
  onPress: () => void;
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
            <Text style={styles.itemLabel}>{action.label}</Text>
            <Icons.chevronRight width={24} height={24} />
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
  itemLabel: {
    fontFamily: 'Inter_18pt-Medium',
    fontWeight: '500',
    fontSize: 15,
    lineHeight: 15 * 1.45,
    letterSpacing: -0.135,
    color: '#ffffff',
  },
});
