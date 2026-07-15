import { useEffect, useRef, useState } from 'react';
import { Animated, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { makeThemedStyles, useTheme } from '../theme/ThemeContext';
import { springs } from '../theme/motion';
import Tappable from './Tappable';
import { indicatorLayout, resolveTabIcon } from './tabBarLogic';

const PILL_WIDTH = 64;
const PILL_HEIGHT = 34;
const BAR_PADDING_TOP = 8;
const ICON_SIZE = 22;

const useStyles = makeThemedStyles((t) => ({
  bar: {
    flexDirection: 'row',
    backgroundColor: t.colors.tabBarBackground,
    borderTopWidth: t.shape.borderThin,
    borderTopColor: t.colors.tabBarBorder,
    paddingTop: BAR_PADDING_TOP,
  },
  pill: {
    position: 'absolute',
    top: BAR_PADDING_TOP,
    left: 0,
    height: PILL_HEIGHT,
    borderRadius: t.shape.radiusXl,
    backgroundColor: t.colors.primarySoft,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.primarySoftBorder,
  },
  item: {
    alignItems: 'center',
    paddingBottom: 8,
  },
  iconBox: {
    height: PILL_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    ...t.typography.type.caption,
    marginTop: 3,
  },
}));

// Barra de tabs de la casa (prop `tabBar` de <Tabs>): una píldora suave se
// desliza detrás del ícono activo con el mismo spring contenido de Tappable.
export default function TabBar({ state, descriptors, navigation }) {
  const { theme } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const [barWidth, setBarWidth] = useState(0);
  // La píldora recién se muestra cuando su posición inicial ya está fijada,
  // para que no aparezca un frame en x=0 antes del primer onLayout.
  const [positioned, setPositioned] = useState(false);
  const translateX = useRef(new Animated.Value(0)).current;

  const { x, width: pillWidth } = indicatorLayout(barWidth, state.routes.length, state.index, {
    pillWidth: PILL_WIDTH,
  });

  useEffect(() => {
    if (barWidth <= 0) return;
    if (!positioned) {
      translateX.setValue(x);
      setPositioned(true);
      return;
    }
    Animated.spring(translateX, { toValue: x, useNativeDriver: true, ...springs.press }).start();
  }, [x, barWidth, positioned, translateX]);

  return (
    <View
      style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}
      onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
    >
      {positioned && (
        <Animated.View
          pointerEvents="none"
          style={[styles.pill, { width: pillWidth, transform: [{ translateX }] }]}
        />
      )}
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const focused = state.index === index;
        const label = options.tabBarLabel ?? options.title ?? route.name;
        const color = focused ? theme.colors.tabActive : theme.colors.tabInactive;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        return (
          <Tappable
            key={route.key}
            wrapperStyle={{ flex: 1 }}
            style={styles.item}
            onPress={onPress}
            activeOpacity={0.85}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={typeof label === 'string' ? label : route.name}
          >
            <View style={styles.iconBox}>
              {options.tabBarIconSet ? (
                <Ionicons
                  name={resolveTabIcon(options.tabBarIconSet, theme.icons.variant, focused)}
                  size={ICON_SIZE}
                  color={color}
                />
              ) : null}
            </View>
            <Text style={[styles.label, focused && theme.typography.fonts.semibold, { color }]}>
              {label}
            </Text>
          </Tappable>
        );
      })}
    </View>
  );
}
