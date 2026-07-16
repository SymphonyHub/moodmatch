import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, ScrollView, Text, View } from 'react-native';
import { apiGetSocialActivities } from '../services/api';
import { makeThemedStyles, useTheme } from '../theme/ThemeContext';
import { springs, durations, easings } from '../theme/motion';

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
  actCard: {
    backgroundColor: t.colors.surface,
    borderRadius: t.shape.radiusLg,
    padding: 16,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: t.colors.categories.social,
    ...t.shadows.card,
  },
  actNombre: {
    fontSize: t.fontSize(15),
    ...t.typography.fonts.bold,
    color: t.colors.text,
    marginBottom: 4,
  },
  actDesc: {
    fontSize: t.fontSize(13),
    color: t.colors.textMuted,
    lineHeight: Math.round(t.fontSize(13) * 1.5),
  },
}));

// Pestaña "Con amigos" del Wellness Hub — dominio del Agente C (Amigos/QR).
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
    apiGetSocialActivities()
      .then((data) => {
        if (activo) setActividades(data.activities ? data.activities.slice(0, MAX_ACTIVIDADES) : []);
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
          actividades.map((act) => (
            <View key={act.id} style={styles.actCard}>
              <Text style={styles.actNombre}>{act.nombre}</Text>
              <Text style={styles.actDesc}>{act.descripcion}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </Animated.View>
  );
}
