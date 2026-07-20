import { useCallback, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { apiGetMoodHistory } from '../../services/api';
import { rachaDeDias, textoRacha, etiquetaDias } from '../../features/wellness/racha';
import { analizarPatron, mensajeResumen, RUTA_HISTORIAL } from '../../features/wellness/historial';
import { useTheme, makeThemedStyles } from '../../theme/ThemeContext';
import Tappable from '../Tappable';

/**
 * RachaCard — refuerzo positivo al pie de la pestaña "Para mí": la racha de
 * días registrando ánimo + el mensaje de resumen semanal de la Fase 7
 * (mensajeResumen/analizarPatron de features/wellness/historial). Ambos se
 * calculan de las MISMAS entries de apiGetMoodHistory, sin datos nuevos.
 *
 * Autosuficiente (patrón de Fase 6/8): hace su propio fetch al enfocar y maneja
 * cargando / error / ok. Absorbe el enlace "Ver mi historial" que antes vivía
 * suelto en ParaMiTab, para que la navegación al historial quede junto al
 * resumen que la origina. Tono sin presión: ver textoRacha en racha.js.
 */
export default function RachaCard() {
  const { theme } = useTheme();
  const styles = useStyles();

  const [estado, setEstado] = useState('cargando'); // 'cargando' | 'error' | 'ok'
  const [racha, setRacha] = useState(0);
  const [resumen, setResumen] = useState('');

  const cargar = useCallback(async () => {
    try {
      const data = await apiGetMoodHistory(30);
      const entries = data.entries ?? [];
      setRacha(rachaDeDias(entries));
      setResumen(mensajeResumen(analizarPatron(entries)));
      setEstado('ok');
    } catch {
      setEstado('error');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  const enlaceHistorial = (
    <Tappable style={styles.link} onPress={() => router.push(RUTA_HISTORIAL)} haptic={false}>
      <Ionicons name="time-outline" size={16} color={theme.colors.primary} />
      <Text style={styles.linkTexto}>Ver mi historial</Text>
      <Ionicons name="chevron-forward" size={14} color={theme.colors.primary} />
    </Tappable>
  );

  if (estado === 'cargando') {
    return (
      <View style={[styles.card, styles.cardCargando]}>
        <ActivityIndicator size="small" color={theme.colors.textFaint} />
      </View>
    );
  }

  // En error no bloqueamos el acceso al historial: la tarjeta degrada al enlace.
  if (estado === 'error') {
    return <View style={styles.card}>{enlaceHistorial}</View>;
  }

  return (
    <View style={styles.card}>
      {racha > 0 ? (
        <View style={styles.encabezado}>
          <Ionicons name="flame" size={26} color={theme.colors.accent} />
          <Text style={styles.numero}>{racha}</Text>
          <Text style={styles.numeroLabel}>{etiquetaDias(racha)}</Text>
        </View>
      ) : (
        <View style={styles.encabezado}>
          <Ionicons name="leaf-outline" size={22} color={theme.colors.primary} />
          <Text style={styles.tituloVacio}>Tu espacio de registro</Text>
        </View>
      )}

      <Text style={styles.racha}>{textoRacha(racha)}</Text>

      <View style={styles.divisor} />

      <Text style={styles.resumen}>{resumen}</Text>

      {enlaceHistorial}
    </View>
  );
}

const useStyles = makeThemedStyles((t) => ({
  card: {
    backgroundColor: t.colors.surfaceElevated,
    borderRadius: t.shape.radiusLg,
    padding: 24,
    marginTop: 24,
    ...t.shadows.card,
  },
  cardCargando: { alignItems: 'center', paddingVertical: 28 },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  numero: {
    ...t.typography.type.display,
    color: t.colors.text,
    lineHeight: undefined,
  },
  numeroLabel: {
    ...t.typography.type.body,
    color: t.colors.textMuted,
    marginBottom: 4,
    alignSelf: 'flex-end',
  },
  tituloVacio: {
    ...t.typography.type.section,
    color: t.colors.text,
  },
  racha: {
    ...t.typography.type.body,
    color: t.colors.textMuted,
    marginBottom: 16,
  },
  divisor: {
    height: t.shape.borderThin,
    backgroundColor: t.colors.border,
    marginBottom: 16,
  },
  resumen: {
    ...t.typography.type.body,
    color: t.colors.text,
    marginBottom: 16,
  },
  link: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 4,
    paddingHorizontal: 8,
  },
  linkTexto: {
    ...t.typography.type.body,
    ...t.typography.fonts.semibold,
    color: t.colors.primary,
  },
}));
