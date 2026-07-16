import { useEffect, useRef, useState } from 'react';
import { Animated, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { makeThemedStyles, useTheme } from '../theme/ThemeContext';
import { springs } from '../theme/motion';
import Tappable from './Tappable';
import { indicatorLayout } from './tabBarLogic';

const INSET = 4;
const SEGMENT_HEIGHT = 40;

const useStyles = makeThemedStyles((t) => ({
  container: {
    flexDirection: 'row',
    backgroundColor: t.colors.surface,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.border,
    borderRadius: t.shape.radiusLg,
    padding: INSET,
  },
  pill: {
    position: 'absolute',
    top: INSET,
    left: INSET,
    height: SEGMENT_HEIGHT,
    borderRadius: t.shape.radiusMd,
    backgroundColor: t.colors.primarySoft,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.primarySoftBorder,
  },
  segment: {
    height: SEGMENT_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  label: {
    ...t.typography.type.body,
  },
}));

// Control segmentado de la casa: mismo lenguaje que la navbar (píldora suave
// que se desliza con spring contenido). `tabs` acepta un ícono trailing
// opcional por segmento (p. ej. el candado de "Con amigos" bloqueada).
//   <SegmentedTabs tabs={[{ id, label, icon? }]} activeId onChange={(id) => {}} />
export default function SegmentedTabs({ tabs, activeId, onChange }) {
  const { theme } = useTheme();
  const styles = useStyles();
  const [innerWidth, setInnerWidth] = useState(0);
  // La píldora recién se muestra con su posición inicial ya fijada (mismo
  // patrón que TabBar, evita el frame en x=0 antes del primer onLayout).
  const [positioned, setPositioned] = useState(false);
  const translateX = useRef(new Animated.Value(0)).current;

  const activeIndex = Math.max(
    0,
    tabs.findIndex((tab) => tab.id === activeId),
  );
  // Píldora al ancho completo del segmento: indicatorLayout la recorta al tab.
  const { x, width: pillWidth } = indicatorLayout(innerWidth, tabs.length, activeIndex, {
    pillWidth: Number.POSITIVE_INFINITY,
  });

  useEffect(() => {
    if (innerWidth <= 0) return;
    if (!positioned) {
      translateX.setValue(x);
      setPositioned(true);
      return;
    }
    Animated.spring(translateX, { toValue: x, useNativeDriver: true, ...springs.press }).start();
  }, [x, innerWidth, positioned, translateX]);

  return (
    <View
      style={styles.container}
      accessibilityRole="tablist"
      onLayout={(e) =>
        setInnerWidth(e.nativeEvent.layout.width - 2 * (INSET + theme.shape.borderThin))
      }
    >
      {positioned && (
        <Animated.View
          pointerEvents="none"
          style={[styles.pill, { width: pillWidth, transform: [{ translateX }] }]}
        />
      )}
      {tabs.map((tab) => {
        const focused = tab.id === activeId;
        const color = focused ? theme.colors.primary : theme.colors.textMuted;
        return (
          <Tappable
            key={tab.id}
            wrapperStyle={{ flex: 1 }}
            style={styles.segment}
            onPress={() => {
              if (!focused) onChange?.(tab.id);
            }}
            activeOpacity={0.85}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={tab.label}
          >
            <Text
              numberOfLines={1}
              style={[styles.label, focused && theme.typography.fonts.semibold, { color }]}
            >
              {tab.label}
            </Text>
            {tab.icon ? <Ionicons name={tab.icon} size={14} color={color} /> : null}
          </Tappable>
        );
      })}
    </View>
  );
}
