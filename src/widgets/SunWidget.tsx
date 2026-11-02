import { HStack, Image, Spacer, Text, VStack } from "@expo/ui/swift-ui";
import {
  containerBackground,
  font,
  foregroundStyle,
  lineLimit,
  minimumScaleFactor,
  monospacedDigit,
  multilineTextAlignment,
  padding,
} from "@expo/ui/swift-ui/modifiers";
import { createWidget, type WidgetEnvironment } from "expo-widgets";

/**
 * Everything the widget shows is pre-formatted in the app (see `update-sun-widget`), because the
 * widget runs in an isolated runtime with no access to app code, imports or module-scope values.
 */
export type SunWidgetProps = {
  sunrise: string;
  sunset: string;
  dayLength: string;
  place: string;
  dateLabel: string;
  hasData: boolean;
};

export const SUN_WIDGET_PLACEHOLDER: SunWidgetProps = {
  sunrise: "—",
  sunset: "—",
  dayLength: "—",
  place: "",
  dateLabel: "",
  hasData: false,
};

const SunWidgetLayout = (
  props: SunWidgetProps,
  environment: WidgetEnvironment,
) => {
  "widget";
  // NOTE: this function is serialized and evaluated inside the widget extension. It may only use
  // @expo/ui/swift-ui components + modifiers and must not reference anything outside its body.
  const family = environment.widgetFamily ?? "systemSmall";
  const isAccessory = family.indexOf("accessory") === 0;
  // Custom colors only on the home screen in full color; tinted (accented), lock screen (vibrant)
  // and StandBy-at-night (luminance reduced) get system hierarchical styles instead.
  const fullColor =
    (environment.widgetRenderingMode ?? "fullColor") === "fullColor" &&
    !environment.isLuminanceReduced &&
    !isAccessory;
  const dark = environment.colorScheme === "dark";

  const primary = fullColor
    ? dark
      ? "#FFEBD6"
      : "#FFFFFF"
    : ({ type: "hierarchical", style: "primary" } as const);
  const secondary = fullColor
    ? dark
      ? "#E9B99A"
      : "#FFF1E6"
    : ({ type: "hierarchical", style: "secondary" } as const);
  // `undefined` lets SF Symbols inherit the system foreground in tinted / vibrant modes.
  const sunriseColor = fullColor ? (dark ? "#FFC46B" : "#FFF3A3") : undefined;
  const sunsetColor = fullColor ? (dark ? "#FF8E5E" : "#FFE1CF") : undefined;
  const iconMuted = fullColor ? (dark ? "#E9B99A" : "#FFF1E6") : undefined;

  const background = isAccessory
    ? "clear"
    : ({
        type: "linearGradient",
        colors: dark
          ? ["#2A1A3E", "#5B2A4C", "#8E3C3A"]
          : ["#FFC371", "#FF8C5A", "#EE5D6C"],
        startPoint: { x: 0, y: 0 },
        endPoint: { x: 1, y: 1 },
      } as const);
  const rootModifiers = [containerBackground(background, "widget")];

  // ---------- Placeholder (no location yet) ----------
  if (!props.hasData) {
    if (family === "accessoryInline") {
      return (
        <HStack modifiers={rootModifiers}>
          <Image systemName="sunset.fill" />
          <Text>Open Sunset</Text>
        </HStack>
      );
    }
    if (family === "accessoryRectangular") {
      return (
        <HStack spacing={6} modifiers={rootModifiers}>
          <Image systemName="sunset.fill" size={20} />
          <Text modifiers={[font({ textStyle: "footnote" }), lineLimit(3)]}>
            Open Sunset to set location
          </Text>
          <Spacer />
        </HStack>
      );
    }
    return (
      <VStack spacing={8} modifiers={rootModifiers}>
        <Image systemName="sunset.fill" size={30} color={sunsetColor} />
        <Text
          modifiers={[
            font({
              textStyle: "footnote",
              weight: "semibold",
              design: "rounded",
            }),
            foregroundStyle(primary),
            multilineTextAlignment("center"),
            lineLimit(3),
          ]}
        >
          Open Sunset to set location
        </Text>
      </VStack>
    );
  }

  // ---------- Lock screen: inline ----------
  if (family === "accessoryInline") {
    // WidgetKit renders a single image + single line of text here.
    return (
      <HStack modifiers={rootModifiers}>
        <Image systemName="sunset.fill" />
        <Text>{"↑" + props.sunrise + "  ↓" + props.sunset}</Text>
      </HStack>
    );
  }

  // ---------- Lock screen: rectangular ----------
  if (family === "accessoryRectangular") {
    return (
      <HStack modifiers={rootModifiers}>
        <VStack alignment="leading" spacing={1}>
          <Text
            modifiers={[
              font({ textStyle: "headline" }),
              lineLimit(1),
              minimumScaleFactor(0.7),
            ]}
          >
            {props.place}
          </Text>
          <HStack spacing={4}>
            <Image systemName="sunrise.fill" />
            <Text
              modifiers={[
                monospacedDigit(),
                lineLimit(1),
                minimumScaleFactor(0.7),
              ]}
            >
              {props.sunrise}
            </Text>
            <Spacer minLength={4} />
            <Image systemName="sunset.fill" />
            <Text
              modifiers={[
                monospacedDigit(),
                lineLimit(1),
                minimumScaleFactor(0.7),
              ]}
            >
              {props.sunset}
            </Text>
          </HStack>
          <Text
            modifiers={[
              font({ textStyle: "caption" }),
              foregroundStyle({ type: "hierarchical", style: "secondary" }),
              lineLimit(1),
            ]}
          >
            {props.dayLength + " of daylight"}
          </Text>
        </VStack>
        <Spacer minLength={0} />
      </HStack>
    );
  }

  // ---------- Home screen ----------
  const timeRow = (
    symbol: "sunrise.fill" | "sunset.fill",
    label: string,
    time: string,
  ) => (
    <HStack spacing={8}>
      <Image
        systemName={symbol}
        size={family === "systemMedium" ? 26 : 22}
        color={symbol === "sunrise.fill" ? sunriseColor : sunsetColor}
      />
      <VStack alignment="leading" spacing={0}>
        <Text
          modifiers={[
            font({ textStyle: "caption2", weight: "medium" }),
            foregroundStyle(secondary),
            lineLimit(1),
          ]}
        >
          {label}
        </Text>
        <Text
          modifiers={[
            font({
              size: family === "systemMedium" ? 24 : 20,
              weight: "semibold",
              design: "rounded",
            }),
            monospacedDigit(),
            foregroundStyle(primary),
            lineLimit(1),
            minimumScaleFactor(0.6),
          ]}
        >
          {time}
        </Text>
      </VStack>
      <Spacer minLength={0} />
    </HStack>
  );

  const header = (
    <HStack spacing={4}>
      <Image systemName="location.fill" size={10} color={iconMuted} />
      <Text
        modifiers={[
          font({ textStyle: "caption", weight: "semibold", design: "rounded" }),
          foregroundStyle(primary),
          lineLimit(1),
          minimumScaleFactor(0.7),
        ]}
      >
        {props.place}
      </Text>
      <Spacer minLength={0} />
    </HStack>
  );

  if (family === "systemMedium") {
    return (
      <HStack spacing={16} modifiers={rootModifiers}>
        <VStack alignment="leading" spacing={4}>
          {header}
          <Text
            modifiers={[
              font({ textStyle: "caption", design: "rounded" }),
              foregroundStyle(secondary),
              lineLimit(1),
            ]}
          >
            {props.dateLabel}
          </Text>
          <Spacer minLength={0} />
          <Image systemName="sun.max.fill" size={22} color={sunriseColor} />
          <Text
            modifiers={[
              font({ textStyle: "caption2", weight: "medium" }),
              foregroundStyle(secondary),
              lineLimit(1),
            ]}
          >
            Day length
          </Text>
          <Text
            modifiers={[
              font({ size: 20, weight: "semibold", design: "rounded" }),
              monospacedDigit(),
              foregroundStyle(primary),
              lineLimit(1),
              minimumScaleFactor(0.6),
            ]}
          >
            {props.dayLength}
          </Text>
        </VStack>
        <VStack
          alignment="leading"
          spacing={10}
          modifiers={[padding({ vertical: 4 })]}
        >
          {timeRow("sunrise.fill", "Sunrise", props.sunrise)}
          {timeRow("sunset.fill", "Sunset", props.sunset)}
        </VStack>
      </HStack>
    );
  }

  // systemSmall (default)
  return (
    <VStack alignment="leading" spacing={6} modifiers={rootModifiers}>
      {header}
      <Spacer minLength={0} />
      {timeRow("sunrise.fill", "Sunrise", props.sunrise)}
      {timeRow("sunset.fill", "Sunset", props.sunset)}
    </VStack>
  );
};

/**
 * iOS home-screen / lock-screen widget. Import this module only on iOS
 * (`update-sun-widget.ios.ts` does) — creating it registers the layout with the native side.
 */
const SunWidget = createWidget<SunWidgetProps>(
  "SunWidget",
  SunWidgetLayout,
  SUN_WIDGET_PLACEHOLDER,
);

export default SunWidget;
