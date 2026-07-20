import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, ScrollView, Text } from 'react-native';
import { apiGetSocialActivities, apiSuggestSocialActivity } from '../services/api';
import { makeThemedStyles, useTheme } from '../theme/ThemeContext';
import { springs, durations, easings } from '../theme/motion';
import AccionConAmigos from './AccionConAmigos';

const MAX_ACTIVIDADES = 3;

const useStyles = makeThemedStyles((t) => ({
  lista: { paddingBottom: 16 },
  cargando: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vacio: {
    fontSize: t.fontSize(13),
    color: t.colors.textFaint,
    textAlign: 'center',
    paddingVertical: 24,
  },
}));

// Pestaña "Con amigos" del Wellness Hub: combina una sugerencia asistida por IA
// (con fallback del backend) con las tres acciones sociales existentes.
// SOLO el contenido desbloqueado: la regla de bloqueo (lockStateFor) y el
// LockedState viven en la pantalla contenedora (actividades.jsx). Como este
// panel se monta recién al desbloquear, su entrada con springs.unlock es la
// física de resortes de la transición de desbloqueo.
export default function ConAmigosPanel() {
  const { theme } = useTheme();
  const styles = useStyles();

  const [actividades, setActividades] = useState(null);
  const scale = useRef(new Animated.Value(0.96)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, ...springs.unlock }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: durations.gentle,
        easing: easings.standard,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scale, opacity]);

  useEffect(() => {
    let activo = true;
    Promise.allSettled([apiSuggestSocialActivity(), apiGetSocialActivities()])
      .then(([social, fijas]) => {
        if (!activo) return;
        const sugerida =
          social.status === 'fulfilled'
            ? [{ ...social.value.activity, sugeridaDinamica: true }]
            : [];
        const base =
          fijas.status === 'fulfilled' && Array.isArray(fijas.value.activities)
            ? fijas.value.activities.slice(0, MAX_ACTIVIDADES)
            : [];
        setActividades([...sugerida, ...base]);
      })
      .catch(() => {
        if (activo) setActividades([]);
      });
    return () => {
      activo = false;
    };
  }, []);

  if (actividades === null) {
    return (
      <Animated.View style={[styles.cargando, { opacity }]}>
        <ActivityIndicator size="small" color={theme.colors.textFaint} />
      </Animated.View>
    );
  }

  return (
    <Animated.View style={{ flex: 1, opacity, transform: [{ scale }] }}>
      <ScrollView contentContainerStyle={styles.lista}>
        {actividades.length === 0 ? (
          <Text style={styles.vacio}>
            No pudimos cargar las actividades. Intenta de nuevo más tarde.
          </Text>
        ) : (
          actividades.map((act) => <AccionConAmigos key={act.id} actividad={act} />)
        )}
      </ScrollView>
    </Animated.View>
  );
}
