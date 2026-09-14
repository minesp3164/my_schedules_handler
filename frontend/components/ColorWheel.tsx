import { type GestureResponderEvent, Text, View } from 'react-native';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';

type HSV = { hue: number; saturation: number; value: number };

type ColorWheelProps = {
  value: string;
  onChange: (color: string) => void;
  accessibilityLabel: string;
  brightnessLabel: string;
  onInteractionChange?: (isInteracting: boolean) => void;
  size?: number;
};

const sectorCount = 72;
const brightnessSteps = 28;

function hsvToHex({ hue, saturation, value }: HSV) {
  const chroma = value * saturation;
  const hueSection = hue / 60;
  const x = chroma * (1 - Math.abs((hueSection % 2) - 1));
  const [red, green, blue] =
    hueSection < 1
      ? [chroma, x, 0]
      : hueSection < 2
        ? [x, chroma, 0]
        : hueSection < 3
          ? [0, chroma, x]
          : hueSection < 4
            ? [0, x, chroma]
            : hueSection < 5
              ? [x, 0, chroma]
              : [chroma, 0, x];
  const match = value - chroma;
  return `#${[red, green, blue]
    .map((channel) =>
      Math.round((channel + match) * 255)
        .toString(16)
        .padStart(2, '0')
    )
    .join('')}`.toUpperCase();
}

function hexToHsv(color: string): HSV {
  const normalized = color.match(/^#([0-9a-f]{6})$/i)?.[1];
  if (!normalized) return { hue: 210, saturation: 0.7, value: 1 };

  const [red, green, blue] = [0, 2, 4].map(
    (index) => parseInt(normalized.slice(index, index + 2), 16) / 255
  );
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const delta = maximum - minimum;
  const hue =
    delta === 0
      ? 0
      : maximum === red
        ? 60 * (((green - blue) / delta + 6) % 6)
        : maximum === green
          ? 60 * ((blue - red) / delta + 2)
          : 60 * ((red - green) / delta + 4);

  return { hue, saturation: maximum === 0 ? 0 : delta / maximum, value: maximum };
}

function sectorPath(index: number) {
  const center = 100;
  const radius = 100;
  const start = (index / sectorCount) * Math.PI * 2 - Math.PI / 2;
  const end = ((index + 1) / sectorCount) * Math.PI * 2 - Math.PI / 2;
  const startX = center + radius * Math.cos(start);
  const startY = center + radius * Math.sin(start);
  const endX = center + radius * Math.cos(end);
  const endY = center + radius * Math.sin(end);
  return `M ${center} ${center} L ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY} Z`;
}

export function ColorWheel({
  value,
  onChange,
  accessibilityLabel,
  brightnessLabel,
  onInteractionChange,
  size = 184,
}: ColorWheelProps) {
  const selected = hexToHsv(value);
  const radians = (selected.hue - 90) * (Math.PI / 180);
  const markerDistance = selected.saturation * 100;
  const markerX = 100 + Math.cos(radians) * markerDistance;
  const markerY = 100 + Math.sin(radians) * markerDistance;

  const updateColor = (event: GestureResponderEvent) => {
    const { locationX, locationY } = event.nativeEvent;
    const center = size / 2;
    const distanceX = locationX - center;
    const distanceY = locationY - center;
    const radius = Math.sqrt(distanceX ** 2 + distanceY ** 2);
    const saturation = Math.min(radius / center, 1);
    const hue = (Math.atan2(distanceY, distanceX) * 180) / Math.PI + 90;
    onChange(hsvToHex({ hue: (hue + 360) % 360, saturation, value: selected.value }));
  };

  const updateBrightness = (event: GestureResponderEvent) => {
    const brightness = Math.min(Math.max(1 - event.nativeEvent.locationY / size, 0), 1);
    onChange(hsvToHex({ ...selected, value: brightness }));
  };

  const brightColor = hsvToHex({ ...selected, value: 1 });
  const finishInteraction = () => onInteractionChange?.(false);

  return (
    <View className="flex-row items-center gap-3">
      <View
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel}
        onStartShouldSetResponderCapture={() => true}
        onMoveShouldSetResponderCapture={() => true}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(event) => {
          onInteractionChange?.(true);
          updateColor(event);
        }}
        onResponderMove={updateColor}
        onResponderRelease={(event) => {
          updateColor(event);
          finishInteraction();
        }}
        onResponderTerminate={finishInteraction}
        onResponderTerminationRequest={() => false}
        style={{ height: size, width: size }}>
        <Svg height={size} width={size} viewBox="0 0 200 200">
          <Defs>
            <RadialGradient id="colorWheelFade" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
              <Stop offset="65%" stopColor="#FFFFFF" stopOpacity="0.35" />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          {Array.from({ length: sectorCount }, (_, index) => (
            <Path
              key={index}
              d={sectorPath(index)}
              fill={`hsl(${(index / sectorCount) * 360}, 100%, 50%)`}
            />
          ))}
          <Circle cx="100" cy="100" r="100" fill="url(#colorWheelFade)" />
          <Circle cx={markerX} cy={markerY} r="5" fill={value} stroke="#FFFFFF" strokeWidth="2" />
        </Svg>
      </View>
      <View className="items-center">
        <Text className="mb-1 text-[10px] font-bold text-muted">{brightnessLabel}</Text>
        <View
          accessibilityRole="adjustable"
          accessibilityLabel={brightnessLabel}
          onStartShouldSetResponderCapture={() => true}
          onMoveShouldSetResponderCapture={() => true}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={(event) => {
            onInteractionChange?.(true);
            updateBrightness(event);
          }}
          onResponderMove={updateBrightness}
          onResponderRelease={(event) => {
            updateBrightness(event);
            finishInteraction();
          }}
          onResponderTerminate={finishInteraction}
          onResponderTerminationRequest={() => false}
          className="overflow-hidden rounded-full border border-white"
          style={{ height: size, width: 24 }}>
          {Array.from({ length: brightnessSteps }, (_, index) => (
            <View
              key={index}
              style={{
                backgroundColor: hsvToHex({
                  ...selected,
                  value: 1 - index / (brightnessSteps - 1),
                }),
                flex: 1,
              }}
            />
          ))}
          <View
            pointerEvents="none"
            className="absolute left-0 right-0 border-2 border-white"
            style={{
              backgroundColor: brightColor,
              height: 6,
              top: (1 - selected.value) * (size - 6),
            }}
          />
        </View>
      </View>
    </View>
  );
}
