import { Link, Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SunTimeCard } from '@/components/sun-time-card';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useSunLocation } from '@/hooks/use-sun-location';
import { useTheme } from '@/hooks/use-theme';
import { formatDuration, formatTime } from '@/lib/format';
import { formatUpdatedAgo } from '@/lib/relative-time';
import { getSunTimes } from '@/lib/sun';

/** Current time, refreshed whenever the app returns to the foreground and every minute. */
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNow(new Date());
    });
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, []);
  return now;
}

function SettingsButton() {
  const theme = useTheme();
  return (
    <Link href="/settings" asChild>
      <Pressable hitSlop={12} accessibilityLabel="Settings" accessibilityRole="button">
        <SymbolView
          name={{ ios: 'gearshape', android: 'settings' }}
          tintColor={theme.textSecondary}
          size={22}
        />
      </Pressable>
    </Link>
  );
}

function signedMinutes(diff: number) {
  if (diff === 0) return 'same as today';
  return `${diff > 0 ? '+' : '−'}${formatDuration(Math.abs(diff))}`;
}

export default function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const now = useNow();
  const { location, status, refresh } = useSunLocation();

  const header = <Stack.Screen options={{ headerRight: () => <SettingsButton /> }} />;

  if (!location) {
    return (
      <View style={[styles.flex, { paddingBottom: insets.bottom }]}>
        {header}
        <View style={styles.centered}>
          {status === 'loading' ? (
            <>
              <ActivityIndicator color={theme.tint} />
              <ThemedText themeColor="textSecondary">Finding your location…</ThemedText>
            </>
          ) : status === 'denied' ? (
            <>
              <SymbolView
                name={{ ios: 'location.slash', android: 'location_off' }}
                tintColor={theme.textSecondary}
                size={40}
              />
              <ThemedText type="smallBold" style={styles.messageTitle}>
                Location access is off
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.messageBody}>
                Sunset needs your location once to calculate local sunrise and sunset times. It
                stays on your device.
              </ThemedText>
              <PillButton label="Open Settings" onPress={() => void Linking.openSettings()} />
              <PillButton label="Try again" onPress={() => void refresh()} subtle />
            </>
          ) : (
            <>
              <ThemedText type="smallBold" style={styles.messageTitle}>
                Couldn’t get your location
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.messageBody}>
                Make sure location services are enabled and try again.
              </ThemedText>
              <PillButton label="Try again" onPress={() => void refresh()} />
            </>
          )}
        </View>
      </View>
    );
  }

  const today = getSunTimes(now, location.latitude, location.longitude);
  const tomorrowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 12);
  const tomorrow = getSunTimes(tomorrowDate, location.latitude, location.longitude);
  const polarLabel =
    today.polar === 'day' ? 'Midnight sun' : today.polar === 'night' ? 'Polar night' : undefined;
  const dateLabel = now.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const placeLabel =
    location.name ?? `${location.latitude.toFixed(2)}°, ${location.longitude.toFixed(2)}°`;

  return (
    <View style={[styles.flex, { paddingBottom: insets.bottom }]}>
      {header}
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic">
        <View style={styles.heading}>
          <ThemedText themeColor="textSecondary" type="small">
            {dateLabel}
          </ThemedText>
          <ThemedText style={styles.place} numberOfLines={1}>
            {placeLabel}
          </ThemedText>
        </View>

        <View style={styles.cards}>
          <SunTimeCard kind="sunrise" time={today.sunrise} fallback={polarLabel} />
          <SunTimeCard kind="sunset" time={today.sunset} fallback={polarLabel} />
        </View>

        <View style={[styles.details, { backgroundColor: theme.backgroundElement }]}>
          <DetailRow
            label="Day length"
            value={formatDuration(today.dayLengthMinutes)}
            note={`${signedMinutes(tomorrow.dayLengthMinutes - today.dayLengthMinutes)} tomorrow`}
          />
          <Separator />
          <DetailRow label="Solar noon" value={formatTime(today.solarNoon)} />
          <Separator />
          <DetailRow
            label="Tomorrow"
            value={
              tomorrow.polar
                ? tomorrow.polar === 'day'
                  ? 'Midnight sun'
                  : 'Polar night'
                : `${formatTime(tomorrow.sunrise)} – ${formatTime(tomorrow.sunset)}`
            }
          />
        </View>

        <View style={styles.footer}>
          {status === 'loading' ? (
            <ActivityIndicator size="small" color={theme.textSecondary} />
          ) : null}
          <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
            {status === 'denied'
              ? 'Location access is off · showing last known place'
              : status === 'error'
                ? 'Couldn’t update location · showing last known place'
                : `Location updated ${formatUpdatedAgo(location.updatedAt, now.getTime())}`}
          </ThemedText>
          {status === 'denied' ? (
            <Pressable onPress={() => void Linking.openSettings()} hitSlop={8}>
              <ThemedText type="smallBold" style={{ color: theme.tint }}>
                Open Settings
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function DetailRow({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <View style={styles.row}>
      <ThemedText themeColor="textSecondary">{label}</ThemedText>
      <View style={styles.rowValue}>
        <ThemedText style={styles.tabular}>{value}</ThemedText>
        {note ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.tabular}>
            {note}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

function Separator() {
  const theme = useTheme();
  return <View style={[styles.separator, { backgroundColor: theme.separator }]} />;
}

function PillButton({
  label,
  onPress,
  subtle,
}: {
  label: string;
  onPress: () => void;
  subtle?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.pill,
        { backgroundColor: subtle ? 'transparent' : theme.tint, opacity: pressed ? 0.7 : 1 },
      ]}>
      <ThemedText type="smallBold" style={{ color: subtle ? theme.tint : '#fff' }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.five,
  },
  messageTitle: { fontSize: 18, textAlign: 'center' },
  messageBody: { textAlign: 'center' },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.five,
    gap: Spacing.four,
  },
  heading: { gap: Spacing.one },
  place: { fontSize: 32, lineHeight: 40, fontWeight: 600 },
  cards: { flexDirection: 'row', gap: Spacing.three },
  details: {
    borderRadius: 24,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
    gap: Spacing.three,
  },
  rowValue: { alignItems: 'flex-end', flexShrink: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
  separator: { height: StyleSheet.hairlineWidth },
  footer: { alignItems: 'center', gap: Spacing.two },
  center: { textAlign: 'center' },
  pill: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three - 4,
    borderRadius: 999,
    minWidth: 180,
    alignItems: 'center',
  },
});
