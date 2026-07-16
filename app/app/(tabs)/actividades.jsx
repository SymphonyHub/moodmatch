import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { makeThemedStyles, useTheme } from '../../theme/ThemeContext';
import { durations, easings } from '../../theme/motion';
import { useFriendsCount } from '../../friends/FriendsCountContext';
import SegmentedTabs from '../../components/SegmentedTabs';
import { HUB_TABS, lockStateFor } from '../../wellness/hubLogic';
import ParaMiPanel from '../../wellness/ParaMiPanel';
import ConAmigosPanel from '../../wellness/ConAmigosPanel';
import LockedState from '../../wellness/LockedState';

const useStyles = makeThemedStyles((t) => ({
  container: {
    flex: 1,
    padding: 16,
    gap: 16,
  },
  panelHost: {
    flex: 1,
  },
  cargando: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cargandoTxt: {
    ...t.typography.type.body,
    color: t.colors.textMuted,
  },
}));

// Entrada de un panel al cambiar de pestaña: fade + deslizamiento horizontal
// corto en la dirección del cambio. Se re-anima por remontaje (key).
function PanelSlide({ children, direction }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(24 * direction)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: durations.base,
        easing: easings.standard,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: 0,
        duration: durations.base,
        easing: easings.standard,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ flex: 1, opacity, transform: [{ translateX }] }}>
      {children}
    </Animated.View>
  );
}

// Wellness Hub (Fase 6): contenedor con las pestañas "Para mí" (contenido del
// Agente B) y "Con amigos" (contenido del Agente C). La regla de bloqueo vive
// aquí: candado SOLO con 0 amigos confirmados; null = cargando, estado neutro.
export default function ActividadesScreen() {
  const { theme } = useTheme();
  const styles = useStyles();
  const { friendsCount, refreshIfStale } = useFriendsCount();

  const [activeId, setActiveId] = useState(HUB_TABS[0].id);
  // Dirección del deslizamiento del panel entrante según hacia dónde se movió
  // la selección.
  const prevIndexRef = useRef(0);
  const activeIndex = HUB_TABS.findIndex((tab) => tab.id === activeId);
  const direction = activeIndex >= prevIndexRef.current ? 1 : -1;

  const onChangeTab = (id) => {
    prevIndexRef.current = activeIndex;
    setActiveId(id);
  };

  // Contrato de useFriendsCount: refrescar al enfocar la pantalla; el TTL y el
  // dedupe del store garantizan que esto no duplica llamadas al backend.
  useFocusEffect(
    useCallback(() => {
      refreshIfStale();
    }, [refreshIfStale]),
  );

  const lockState = lockStateFor(friendsCount);

  // Transición de desbloqueo: si el estado pasa de locked a unlocked con la
  // pantalla montada (ej. volvió de Mi QR con su primer amigo), el candado
  // sale con fade+scale encima del contenido que entra — sin salto brusco.
  const prevLockRef = useRef(lockState);
  const unlockVeil = useRef(new Animated.Value(0)).current;
  const [desbloqueando, setDesbloqueando] = useState(false);
  useEffect(() => {
    const prev = prevLockRef.current;
    prevLockRef.current = lockState;
    if (prev === 'locked' && lockState === 'unlocked') {
      setDesbloqueando(true);
      unlockVeil.setValue(1);
      Animated.timing(unlockVeil, {
        toValue: 0,
        duration: durations.gentle,
        easing: easings.standard,
        useNativeDriver: true,
      }).start(() => setDesbloqueando(false));
    }
  }, [lockState, unlockVeil]);

  const tabs = HUB_TABS.map((tab) =>
    tab.id === 'con-amigos' && lockState === 'locked'
      ? { ...tab, icon: 'lock-closed-outline' }
      : tab,
  );

  const renderConAmigos = () => {
    if (lockState === 'locked') return <LockedState />;
    if (lockState === 'unknown') {
      // Conteo aún desconocido: estado neutro de carga, jamás el candado.
      return (
        <View style={styles.cargando}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.cargandoTxt}>Preparando tus actividades…</Text>
        </View>
      );
    }
    return (
      <View style={{ flex: 1 }}>
        <ConAmigosPanel />
        {desbloqueando && (
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: theme.colors.background,
                opacity: unlockVeil,
                transform: [
                  {
                    scale: unlockVeil.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.95, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <LockedState />
          </Animated.View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <SegmentedTabs tabs={tabs} activeId={activeId} onChange={onChangeTab} />
      <View style={styles.panelHost}>
        <PanelSlide key={activeId} direction={direction}>
          {activeId === 'para-mi' ? <ParaMiPanel /> : renderConAmigos()}
        </PanelSlide>
      </View>
    </View>
  );
}
