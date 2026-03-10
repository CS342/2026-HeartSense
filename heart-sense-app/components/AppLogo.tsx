import { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Heart } from 'lucide-react-native';
import { theme } from '@/theme/colors';

interface AppLogoProps {
  size?: 'small' | 'medium' | 'large';
  showTitle?: boolean;
  variant?: 'dark' | 'light'; // dark = on white bg, light = on dark/colored bg
  subtitle?: string;
}

export default function AppLogo({
  size = 'large',
  showTitle = true,
  variant = 'dark',
  subtitle,
}: AppLogoProps) {
  const isLight = variant === 'light';

  const dims = {
    small:  { icon: 18, outer: 44, middle: 36, inner: 28 },
    medium: { icon: 26, outer: 68, middle: 56, inner: 44 },
    large:  { icon: 38, outer: 96, middle: 78, inner: 62 },
  }[size];

  const titleSize  = { small: 16, medium: 22, large: 30 }[size];
  const subtitleSize = { small: 10, medium: 12, large: 13 }[size];

  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.13, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.delay(600),
      ])
    ).start();
  }, []);

  const outerBg  = isLight ? 'rgba(255,255,255,0.15)' : 'rgba(140,11,11,0.08)';
  const middleBg = isLight ? 'rgba(255,255,255,0.25)' : 'rgba(140,11,11,0.15)';
  const innerBg  = isLight ? 'rgba(255,255,255,0.95)' : theme.primary;
  const heartColor = isLight ? theme.primary : '#fff';
  const titleColor = isLight ? '#fff' : '#1a1a1a';
  const subtitleColor = isLight ? 'rgba(255,255,255,0.7)' : '#888';

  return (
    <View style={styles.wrapper}>
      <View style={[styles.outerRing, { width: dims.outer, height: dims.outer, borderRadius: dims.outer / 2, backgroundColor: outerBg }]}>
        <View style={[styles.middleRing, { width: dims.middle, height: dims.middle, borderRadius: dims.middle / 2, backgroundColor: middleBg }]}>
          <Animated.View style={[styles.innerCircle, { width: dims.inner, height: dims.inner, borderRadius: dims.inner / 2, backgroundColor: innerBg, shadowColor: isLight ? '#fff' : theme.primary, transform: [{ scale: pulseAnim }] }]}>
            <Heart color={heartColor} size={dims.icon} strokeWidth={2.5} fill={heartColor} />
          </Animated.View>
        </View>
      </View>

      {showTitle && (
        <View style={styles.titleBlock}>
          <Text style={[styles.title, { fontSize: titleSize, color: titleColor }]}>
            <Text style={styles.titleThin}>Heart</Text>
            <Text style={[styles.titleBold, { color: isLight ? '#fff' : theme.primary }]}>Sense</Text>
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { fontSize: subtitleSize, color: subtitleColor }]}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  outerRing: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  middleRing: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerCircle: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  titleBlock: {
    alignItems: 'center',
    gap: 3,
  },
  title: {
    letterSpacing: -0.5,
  },
  titleThin: {
    fontFamily: undefined,
  },
  titleBold: {
    fontFamily: undefined,
  },
  subtitle: {
    fontWeight: '500',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
