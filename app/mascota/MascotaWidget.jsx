import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { apiGetMascota } from '../services/api';
import { useTheme, makeThemedStyles } from '../theme/ThemeContext';
import Tappable from '../components/Tappable';
import { estadoMascota } from './estadoMascota';

export default function MascotaWidget({ amistadId, refreshKey = 0 }) {
  const { theme } = useTheme();
  const styles = useStyles();
  const [mascota, setMascota] = useState(null);
  const [estadoCarga, setEstadoCarga] = useState('loading');
  const [reintento, setReintento] = useState(0);

  useEffect(() => {
    if (!amistadId) return undefined;
    let activo = true;
    setEstadoCarga((actual) => (actual === 'ready' ? 'refreshing' : 'loading'));

    apiGetMascota(amistadId)
      .then((data) => {
        if (!activo) return;
        if (!data?.mascota) throw new Error(data?.error || 'Mascota no disponible');
        setMascota(data.mascota);
        setEstadoCarga('ready');
      })
      .catch(() => {
        if (activo) setEstadoCarga('error');
      });

    return () => { activo = false; };
  }, [amistadId, refreshKey, reintento]);

  if (!amistadId) return null;

  if (!mascota && estadoCarga === 'loading') {
    return (
      <View style={[styles.contenedor, styles.cargando]}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
        <Text style={styles.cargandoTxt}>Conociendo a su mascota…</Text>
      </View>
    );
  }

  if (!mascota) {
    return (
      <Tappable
        style={[styles.contenedor, styles.error]}
        onPress={() => setReintento((valor) => valor + 1)}
        haptic={false}
        accessibilityLabel="Reintentar carga de la mascota compartida"
      >
        <Text style={styles.emojiPequeno}>🐾</Text>
        <Text style={styles.errorTxt}>La mascota está descansando. Toca para reintentar.</Text>
      </Tappable>
    );
  }

  const estado = estadoMascota(mascota.nivelCarino);
  const porcentaje = `${Math.round(estado.progreso * 100)}%`;

  return (
    <View
      style={styles.contenedor}
      accessibilityLabel={`${mascota.nombre}, mascota compartida. ${mascota.nivelCarino} puntos de cariño`}
    >
      <View style={styles.rostro}>
        <Text style={styles.emoji}>🦊</Text>
      </View>
      <View style={styles.info}>
        <View style={styles.filaTitulo}>
          <Text style={styles.nombre}>{mascota.nombre}</Text>
          <Text style={styles.nivel}>{mascota.nivelCarino} cariño</Text>
        </View>
        <Text style={styles.estado}>{estado.etiqueta}</Text>
        <View style={styles.barra}>
          <View style={[styles.progreso, { width: porcentaje }]} />
        </View>
        <Text style={styles.ayuda}>
          Conversen en ambos sentidos y hagan actividades juntos.
        </Text>
      </View>
      {estadoCarga === 'refreshing' && (
        <ActivityIndicator style={styles.refrescando} size="small" color={theme.colors.primary} />
      )}
    </View>
  );
}

const useStyles = makeThemedStyles((t) => ({
  contenedor: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 14,
    marginTop: 12,
    padding: 12,
    borderRadius: t.shape.radiusLg,
    backgroundColor: t.colors.surface,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.primarySoftBorder,
    ...t.shadows.card,
  },
  cargando: { justifyContent: 'center', gap: 9, minHeight: 72 },
  cargandoTxt: { color: t.colors.textMuted, fontSize: t.fontSize(13) },
  error: { justifyContent: 'center', gap: 8 },
  errorTxt: { flex: 1, color: t.colors.textMuted, fontSize: t.fontSize(12) },
  emojiPequeno: { fontSize: 24 },
  rostro: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.accentSoft,
    marginRight: 12,
  },
  emoji: { fontSize: 32 },
  info: { flex: 1 },
  filaTitulo: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  nombre: {
    flex: 1,
    color: t.colors.text,
    fontSize: t.fontSize(16),
    ...t.typography.fonts.bold,
  },
  nivel: {
    color: t.colors.primary,
    fontSize: t.fontSize(11),
    ...t.typography.fonts.semibold,
  },
  estado: { color: t.colors.textMuted, fontSize: t.fontSize(12), marginTop: 1 },
  barra: {
    height: 5,
    borderRadius: 3,
    backgroundColor: t.colors.primarySoft,
    overflow: 'hidden',
    marginTop: 7,
  },
  progreso: { height: '100%', borderRadius: 3, backgroundColor: t.colors.accent },
  ayuda: { color: t.colors.textFaint, fontSize: t.fontSize(10), marginTop: 5 },
  refrescando: { position: 'absolute', right: 8, bottom: 7 },
}));
