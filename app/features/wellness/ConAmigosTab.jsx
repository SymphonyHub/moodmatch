/**
 * Pestaña "Con amigos" del Wellness Hub.
 *
 * CONTRATO (Agente A): default export, sin props obligatorias. Montar tal cual
 * dentro de la pestaña del hub — el componente se autoalimenta (friendsCount
 * vía useFriendsCount + actividades vía API) y el gate de bloqueo/desbloqueo
 * vive aquí adentro:
 *   - friendsCount null  → placeholder de carga (nunca candado por null)
 *   - friendsCount === 0 → candado con CTA a Mi QR
 *   - friendsCount  >  0 → actividades sociales, entrando con spring suave
 * La regla de estados es gateState() (./socialGate.js), testeada aparte.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, Animated } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { apiGetSocialActivities } from '../../services/api';
import { useFriendsCount } from '../../friends/FriendsCountContext';
import { gateState, GATE } from './socialGate';
import { springs, durations, easings } from '../../theme/motion';
import { useTheme, makeThemedStyles } from '../../theme/ThemeContext';
import Tappable from '../../components/Tappable';

const MAX_ACTIVIDADES = 3;

export default function ConAmigosTab() {
  const { theme } = useTheme();
  const styles = useStyles();
  const { friendsCount, refreshIfStale } = useFriendsCount();

  // useFocusEffect espera un callback síncrono (ver nota en amigos.jsx).
  useFocusEffect(
    useCallback(() => {
      refreshIfStale();
    }, [refreshIfStale]),
  );

  const estado = gateState(friendsCount);

  // `vista` es lo renderizado; va detrás de `estado` para poder animar la
  // salida del candado antes de intercambiar el contenido.
  const [vista, setVista] = useState(estado);
  const lockOpacity = useRef(new Animated.Value(1)).current;
  const contentScale = useRef(new Animated.Value(0.96)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (estado === vista) return;
    if (vista === GATE.BLOQUEADO && estado === GATE.DESBLOQUEADO) {
      // Desbloqueo en vivo: el candado se despide con fade corto…
      Animated.timing(lockOpacity, {
        toValue: 0,
        duration: durations.base,
        easing: easings.accelerate,
        useNativeDriver: true,
      }).start(() => setVista(GATE.DESBLOQUEADO));
    } else {
      setVista(estado);
    }
  }, [estado, vista, lockOpacity]);

  useEffect(() => {
    if (vista === GATE.DESBLOQUEADO) {
      // …y el contenido asienta con spring (scale + fade), sin cambio brusco.
      contentScale.setValue(0.96);
      contentOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(contentScale, { toValue: 1, useNativeDriver: true, ...springs.unlock }),
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: durations.gentle,
          easing: easings.standard,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      lockOpacity.setValue(1);
    }
  }, [vista, contentScale, contentOpacity, lockOpacity]);

  // Las actividades se piden recién al desbloquear (con candado no hay nada que ver).
  const [actividades, setActividades] = useState(null);
  useEffect(() => {
    if (estado !== GATE.DESBLOQUEADO || actividades !== null) return undefined;
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
  }, [estado, actividades]);

  return (
    <View style={styles.seccion}>
      <Text style={styles.titulo}>Para hacer con amigos</Text>

      {vista === GATE.CARGANDO && (
        <View style={styles.cargando}>
          <ActivityIndicator size="small" color={theme.colors.textFaint} />
        </View>
      )}

      {vista === GATE.BLOQUEADO && (
        <Animated.View style={[styles.lockCard, { opacity: lockOpacity }]}>
          <Ionicons name="lock-closed-outline" size={28} color={theme.colors.textFaint} />
          <Text style={styles.lockTexto}>
            Agrega un amigo para desbloquear las actividades en compañía
          </Text>
          <Tappable style={styles.lockBtn} onPress={() => router.push('/(tabs)/mi-qr')}>
            <Text style={styles.lockBtnTxt}>Ir a Mi QR</Text>
          </Tappable>
        </Animated.View>
      )}

      {vista === GATE.DESBLOQUEADO && (
        <Animated.View style={{ opacity: contentOpacity, transform: [{ scale: contentScale }] }}>
          {actividades === null ? (
            <View style={styles.cargando}>
              <ActivityIndicator size="small" color={theme.colors.textFaint} />
            </View>
          ) : actividades.length === 0 ? (
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
        </Animated.View>
      )}
    </View>
  );
}

const useStyles = makeThemedStyles((t) => ({
  seccion: { marginTop: 4 },
  titulo: {
    ...t.typography.type.section,
    color: t.colors.text,
    marginBottom: 12,
  },
  cargando: { paddingVertical: 24, alignItems: 'center' },
  lockCard: {
    backgroundColor: t.colors.surface,
    borderRadius: t.shape.radiusLg,
    padding: 24,
    alignItems: 'center',
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.border,
    borderStyle: 'dashed',
  },
  lockTexto: {
    fontSize: t.fontSize(14),
    color: t.colors.textMuted,
    textAlign: 'center',
    lineHeight: Math.round(t.fontSize(14) * 1.55),
    marginTop: 10,
    marginBottom: 16,
  },
  lockBtn: {
    backgroundColor: t.colors.primarySoft,
    borderRadius: t.shape.radiusMd,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.primarySoftBorder,
  },
  lockBtnTxt: {
    fontSize: t.fontSize(14),
    ...t.typography.fonts.semibold,
    color: t.colors.primary,
  },
  vacio: {
    fontSize: t.fontSize(13),
    color: t.colors.textFaint,
    textAlign: 'center',
    paddingVertical: 16,
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
