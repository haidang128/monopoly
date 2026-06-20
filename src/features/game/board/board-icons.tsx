/**
 * Board tile icons — tiny vector glyphs composed from plain Views (no SVG dep),
 * recreating the hi-fi design's per-tile artwork: GO arrow, jail bars, parking
 * "P", handcuffs (go-to-jail), train (station), power bolt + water drop
 * (utilities), tax coin + luxury gem. Each takes a `color` and a `size` so the
 * glyph scales with the board.
 */
import { Text, View } from 'react-native';

import { Fonts } from '@/shared/ui/fonts';

interface IconProps {
  color: string;
  /** Nominal glyph size in px (roughly the height). Default 14. */
  size?: number;
}

export function GoArrow({ color, size = 14 }: IconProps) {
  const tail = size * 1.1;
  return (
    <View style={{ width: tail, height: size, justifyContent: 'center' }}>
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: size * 0.36,
          width: tail * 0.6,
          height: size * 0.28,
          backgroundColor: color,
          borderRadius: 1,
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          width: 0,
          height: 0,
          borderTopWidth: size / 2,
          borderBottomWidth: size / 2,
          borderLeftWidth: size * 0.7,
          borderTopColor: 'transparent',
          borderBottomColor: 'transparent',
          borderLeftColor: color,
        }}
      />
    </View>
  );
}

export function JailBars({ color, size = 14 }: IconProps) {
  return (
    <View
      style={{
        width: size * 1.25,
        height: size,
        borderWidth: 1.5,
        borderColor: color,
        borderRadius: 2,
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        alignItems: 'stretch',
        paddingVertical: 1.5,
        paddingHorizontal: 1,
      }}
    >
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ width: 1.5, backgroundColor: color, borderRadius: 1 }} />
      ))}
    </View>
  );
}

export function ParkingP({ color, size = 14 }: IconProps) {
  return (
    <View
      style={{
        width: size * 1.4,
        height: size * 1.4,
        borderRadius: size * 0.4,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontFamily: Fonts.display, color: '#FBF7EE', fontSize: size, lineHeight: size * 1.2 }}>
        P
      </Text>
    </View>
  );
}

export function Handcuffs({ color, size = 12 }: IconProps) {
  const r = size;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View
        style={{ width: r, height: r, borderRadius: r / 2, borderWidth: 2.5, borderColor: color }}
      />
      <View style={{ width: size * 0.5, height: 2.5, backgroundColor: color }} />
      <View
        style={{ width: r, height: r, borderRadius: r / 2, borderWidth: 2.5, borderColor: color }}
      />
    </View>
  );
}

export function Train({ color, size = 14 }: IconProps) {
  const w = size * 1.45;
  return (
    <View style={{ width: w, height: size * 1.25 }}>
      <View
        style={{
          position: 'absolute',
          left: w * 0.08,
          top: 0,
          width: w * 0.84,
          height: size * 0.85,
          backgroundColor: color,
          borderTopLeftRadius: 3,
          borderTopRightRadius: 5,
          borderBottomLeftRadius: 2,
          borderBottomRightRadius: 2,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: w * 0.16,
          bottom: 0,
          width: size * 0.32,
          height: size * 0.32,
          borderRadius: size * 0.16,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: w * 0.16,
          bottom: 0,
          width: size * 0.32,
          height: size * 0.32,
          borderRadius: size * 0.16,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

export function Bolt({ color, size = 16 }: IconProps) {
  const barW = size * 0.28;
  const barH = size * 0.62;
  return (
    <View style={{ width: size * 0.8, height: size }}>
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: size * 0.26,
          width: barW,
          height: barH,
          backgroundColor: color,
          borderRadius: 1,
          transform: [{ skewX: '-24deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: size * 0.26,
          width: barW,
          height: barH,
          backgroundColor: color,
          borderRadius: 1,
          transform: [{ skewX: '24deg' }],
        }}
      />
    </View>
  );
}

export function WaterDrop({ color, size = 14 }: IconProps) {
  return (
    <View
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        borderTopLeftRadius: 0,
        borderTopRightRadius: size / 2,
        borderBottomLeftRadius: size / 2,
        borderBottomRightRadius: size / 2,
        transform: [{ rotate: '45deg' }],
      }}
    />
  );
}

export function Coin({ color, size = 16 }: IconProps) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.12)',
      }}
    >
      <Text style={{ fontFamily: Fonts.display, color: '#FBF7EE', fontSize: size * 0.62 }}>₫</Text>
    </View>
  );
}

export function Gem({ color, size = 13 }: IconProps) {
  return (
    <View
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        borderRadius: 2,
        transform: [{ rotate: '45deg' }],
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.4)',
      }}
    />
  );
}
