import { useContext, useEffect, useRef, useState } from 'react';
import { Animated, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BottomTabBarHeightCallbackContext } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { makeThemedStyles, useTheme } from '../theme/ThemeContext';
import { durations, easings, springs } from '../theme/motion';
import Tappable from './Tappable';
import { indicatorLayout, resolveTabIcon } from './tabBarLogic';

const PILL_WIDTH = 64;
const PILL_HEIGHT = 34;
const BAR_PADDING_TOP = 8;
const ICON_SIZE = 22;

const useStyles = makeThemedStyles((t) => ({
  bar: {
    backgroundColor: t.colors.tabBarBackground,
    borderTopWidth: t.shape.borderThin,
    borderTopColor: t.colors.tabBarBorder,
    paddingTop: BAR_PADDING_TOP,
  },
  items: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    flexDirection: 'row',
  },
  pill: {
    position: 'absolute',
    top: 0,
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
  labelCompact: { fontSize: 10 },
  badge: {
    position: 'absolute',
    top: 0,
    left: '50%',
    marginLeft: 8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.primary,
  },
  badgeTxt: {
    ...t.typography.fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    color: t.colors.onPrimary,
  },
}));

// Badge de la tab (options.tabBarBadge): burbuja arriba-derecha del ícono.
// tabBarBadgeStyle se divide: color/fontSize van al texto, el resto a la caja.
function TabBadge({ value, style, styles }) {
  if (value === undefined || value === null || value === '') return null;
  const { color, fontSize, ...boxStyle } = style ?? {};
  return (
    <View style={[styles.badge, boxStyle]}>
      <Text style={[styles.badgeTxt, color != null && { color }, fontSize != null && { fontSize }]}>
        {String(value)}
      </Text>
    </View>
  );
}

function TabItem({ options, route, focused, color, onPress, label, compact, theme, styles }) {
  const progreso = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progreso, {
      toValue: focused ? 1 : 0,
      duration: durations.quick,
      easing: easings.standard,
      useNativeDriver: true,
    }).start();
  }, [focused, progreso]);

  const iconScale = progreso.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const iconLift = progreso.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const labelOpacity = progreso.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] });

  return (
    <Tappable
      wrapperStyle={{ flex: 1 }}
      style={styles.item}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={typeof label === 'string' ? label : route.name}
    >
      <Animated.View
        style={[styles.iconBox, { transform: [{ translateY: iconLift }, { scale: iconScale }] }]}
      >
        {options.tabBarIconSet ? (
          <Ionicons
            name={resolveTabIcon(options.tabBarIconSet, theme.icons.variant, focused)}
            size={ICON_SIZE}
            color={color}
          />
        ) : null}
        <TabBadge value={options.tabBarBadge} style={options.tabBarBadgeStyle} styles={styles} />
      </Animated.View>
      <Animated.Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
        style={[
          styles.label,
          compact && styles.labelCompact,
          focused && theme.typography.fonts.semibold,
          { color, opacity: labelOpacity },
        ]}
      >
        {label}
      </Animated.Text>
    </Tappable>
  );
}

// Barra de tabs de la casa (prop `tabBar` de <Tabs>): una píldora suave se
// desliza detrás del ícono activo y el destino se eleva apenas al enfocarse.
export default function TabBar({ state, descriptors, navigation }) {
  const { theme } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  // Barra custom: hay que reportar la altura medida para que
  // useBottomTabBarHeight() entregue el valor real (lo consume el
  // bottomOffset de ChatInputBar en el chat de Emociones) y no un estimado.
  const reportarAltura = useContext(BottomTabBarHeightCallbackContext);
  const [barWidth, setBarWidth] = useState(0);
  // La píldora recién se muestra cuando su posición inicial ya está fijada,
  // para que no aparezca un frame en x=0 antes del primer onLayout.
  const [positioned, setPositioned] = useState(false);
  const translateX = useRef(new Animated.Value(0)).current;

  const segmentWidth = barWidth > 0 ? barWidth / state.routes.length : PILL_WIDTH;
  const responsivePillWidth = Math.min(PILL_WIDTH, Math.max(48, segmentWidth - 8));
  const compact = barWidth > 0 && barWidth <= 360;
  const { x, width: pillWidth } = indicatorLayout(barWidth, state.routes.length, state.index, {
    pillWidth: responsivePillWidth,
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
      onLayout={(e) => {
        reportarAltura?.(e.nativeEvent.layout.height);
      }}
    >
      <View style={styles.items} onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}>
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
          <TabItem
            key={route.key}
            options={options}
            route={route}
            focused={focused}
            color={color}
            onPress={onPress}
            label={label}
            compact={compact}
            theme={theme}
            styles={styles}
          />
        );
        })}
      </View>
    </View>
  );
}
