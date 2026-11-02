import Constants from 'expo-constants';
import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useSunLocation } from '@/hooks/use-sun-location';
import { useTheme } from '@/hooks/use-theme';
import { formatUpdatedAgo } from '@/lib/relative-time';

export default function SettingsScreen() {
  const { location, status, refresh } = useSunLocation({ autoRefresh: false });
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}>
      <Section title="Location">
        <View style={styles.row}>
          <ThemedText>
            {location?.name ??
              (location
                ? `${location.latitude.toFixed(3)}°, ${location.longitude.toFixed(3)}°`
                : 'No location yet')}
          </ThemedText>
          {location ? (
            <ThemedText type="small" themeColor="textSecondary">
              {location.name
                ? `${location.latitude.toFixed(3)}°, ${location.longitude.toFixed(3)}° · `
                : ''}
              Updated {formatUpdatedAgo(location.updatedAt)}
            </ThemedText>
          ) : null}
          {status === 'denied' ? (
            <ThemedText type="small" themeColor="textSecondary">
              Location access is off.
            </ThemedText>
          ) : status === 'error' ? (
            <ThemedText type="small" themeColor="textSecondary">
              Couldn’t get your location.
            </ThemedText>
          ) : null}
        </View>
        <Separator />
        <RowButton
          label="Refresh location"
          onPress={() => void refresh()}
          loading={status === 'loading'}
          disabled={status === 'loading'}
        />
        {status === 'denied' ? (
          <>
            <Separator />
            <RowButton label="Open Settings" onPress={() => void Linking.openSettings()} />
          </>
        ) : null}
      </Section>

      <Section title="About">
        <View style={styles.row}>
          <ThemedText>Sunset {version}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Sunrise and sunset times are calculated on your device using the NOAA solar
            algorithm, so the app works fully offline. Your location never leaves your device
            except for looking up the place name.
          </ThemedText>
        </View>
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
        {title.toUpperCase()}
      </ThemedText>
      <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>{children}</View>
    </View>
  );
}

function Separator() {
  const theme = useTheme();
  return <View style={[styles.separator, { backgroundColor: theme.separator }]} />;
}

function RowButton({
  label,
  onPress,
  loading,
  disabled,
  prominent,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  prominent?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [styles.buttonRow, { opacity: pressed || disabled ? 0.6 : 1 }]}>
      <ThemedText type={prominent ? 'default' : 'small'} style={[styles.buttonLabel, { color: theme.tint }]}>
        {label}
      </ThemedText>
      {loading ? (
        <ActivityIndicator size="small" color={theme.tint} />
      ) : (
        <SymbolView
          name={{ ios: 'chevron.right', android: 'chevron_right' }}
          size={14}
          tintColor={theme.textSecondary}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.four,
  },
  section: { gap: Spacing.two },
  sectionTitle: { paddingHorizontal: Spacing.three, fontSize: 12, letterSpacing: 0.5 },
  card: { borderRadius: 16, borderCurve: 'continuous', overflow: 'hidden' },
  row: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.three - 4, gap: Spacing.one },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: Spacing.three },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three - 2,
    minHeight: 48,
  },
  buttonLabel: { fontWeight: 600 },
});
