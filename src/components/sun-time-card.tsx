import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatTime } from '@/lib/format';

type Props = {
  kind: 'sunrise' | 'sunset';
  time: Date | null;
  fallback?: string;
};

export function SunTimeCard({ kind, time, fallback }: Props) {
  const theme = useTheme();
  const color = theme[kind];
  const label = kind === 'sunrise' ? 'Sunrise' : 'Sunset';

  return (
    <View
      style={[styles.card, { backgroundColor: theme.backgroundElement }]}
      accessible
      accessibilityLabel={`${label} ${time ? formatTime(time) : (fallback ?? 'none')}`}>
      <View style={styles.labelRow}>
        <SymbolView
          name={{
            ios: kind === 'sunrise' ? 'sunrise.fill' : 'sunset.fill',
            android: kind === 'sunrise' ? 'wb_twilight' : 'bedtime',
          }}
          tintColor={color}
          size={20}
          type="hierarchical"
        />
        <ThemedText type="smallBold" style={{ color }}>
          {label.toUpperCase()}
        </ThemedText>
      </View>
      <ThemedText style={styles.time} numberOfLines={1} adjustsFontSizeToFit>
        {time ? formatTime(time) : (fallback ?? formatTime(null))}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 24,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
    gap: Spacing.two,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  time: {
    fontSize: 40,
    lineHeight: 46,
    fontWeight: 300,
    fontVariant: ['tabular-nums'],
  },
});
