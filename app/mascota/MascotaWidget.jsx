import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TextInput, View } from 'react-native';
import {
  apiCuidarMascota,
  apiGetMascota,
  apiIniciarRetoMascota,
  apiProponerNombreMascota,
} from '../services/api';
import { useTheme, makeThemedStyles } from '../theme/ThemeContext';
import Tappable from '../components/Tappable';
import { estadoMascota } from './estadoMascota';
import MascotaSprite from './MascotaSprite';

export default function MascotaWidget({ amistadId, refreshKey = 0 }) {
  const { theme } = useTheme();
  const styles = useStyles();
  const [mascota, setMascota] = useState(null);
  const [estadoCarga, setEstadoCarga] = useState('loading');
  const [reintento, setReintento] = useState(0);
  const [accion, setAccion] = useState(null);
  const [mensajeAccion, setMensajeAccion] = useState('');
  const [editarNombre, setEditarNombre] = useState(false);
  const [nombre, setNombre] = useState('');

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
  const reto = mascota.reto;

  const ejecutar = async (tipo, request, exito) => {
    setAccion(tipo);
    setMensajeAccion('');
    try {
      const data = await request();
      if (data?.error) throw new Error(data.error);
      if (!data?.mascota) throw new Error(data?.error || 'No se pudo actualizar a la mascota');
      setMascota(data.mascota);
      setMensajeAccion(exito);
      setEditarNombre(false);
    } catch (error) {
      setMensajeAccion(error.message || 'No se pudo completar la acción');
    } finally {
      setAccion(null);
    }
  };

  const cuidar = () => ejecutar(
    'cuidado',
    () => apiCuidarMascota(amistadId),
    'Lumi recibió su momento de cuidado.',
  );
  const iniciarReto = () => ejecutar(
    'reto',
    () => apiIniciarRetoMascota(amistadId),
    'Nuevo reto cooperativo listo.',
  );
  const proponerNombre = () => {
    const propuesto = nombre.trim();
    if (!propuesto) return setMensajeAccion('Escribe un nombre para proponerlo.');
    return ejecutar(
      'nombre',
      () => apiProponerNombreMascota(amistadId, propuesto),
      mascota.nombrePropuesto?.puedeConfirmar ? 'Nombre confirmado.' : 'Propuesta enviada a tu amistad.',
    );
  };

  return (
    <View
      style={styles.contenedor}
      accessibilityLabel={`${mascota.nombre}, mascota compartida. ${mascota.nivelCarino} puntos de cariño`}
    >
      <View style={styles.rostro}><MascotaSprite etapa={estado.sprite} /></View>
      <View style={styles.info}>
        <View style={styles.filaTitulo}>
          <Text style={styles.nombre}>{mascota.nombre}</Text>
          <Text style={styles.nivel}>{mascota.nivelCarino} cariño</Text>
        </View>
        <Text style={styles.estado}>{estado.etiqueta} · {mascota.personalidad ?? 'curiosa'}</Text>
        <View style={styles.barra}>
          <View style={[styles.progreso, { width: porcentaje }]} />
        </View>
        <Text style={styles.ayuda}>Conversen, cuídenla y completen retos juntos.</Text>
        <View style={styles.acciones}>
          <Tappable
            style={[styles.boton, !mascota.puedeCuidar && styles.botonDesactivado]}
            onPress={cuidar}
            disabled={accion !== null || !mascota.puedeCuidar}
            accessibilityLabel="Alimentar y jugar con la mascota"
          >
            <Text style={styles.botonTxt}>{accion === 'cuidado' ? 'Cuidando...' : 'Alimentar y jugar'}</Text>
          </Tappable>
          <Tappable
            style={styles.botonSecundario}
            onPress={() => { setEditarNombre(true); setNombre(mascota.nombrePropuesto?.nombre ?? mascota.nombre); }}
            disabled={accion !== null}
            haptic={false}
            accessibilityLabel="Proponer un nombre para la mascota"
          >
            <Text style={styles.botonSecundarioTxt}>Nombre</Text>
          </Tappable>
        </View>
        {!mascota.puedeCuidar && mascota.proximoCuidadoEn && (
          <Text style={styles.aviso}>Tu cuidado vuelve mañana.</Text>
        )}
        {reto && (
          <View style={styles.reto}>
            <Text style={styles.retoTitulo}>Reto cooperativo</Text>
            <Text style={styles.retoTexto}>
              {reto.completado
                ? '¡Reto completado! La siguiente etapa está más cerca.'
                : reto.expirado
                  ? 'Este reto venció sin presión. Pueden iniciar otro.'
                  : `Los dos cuiden a Lumi antes de ${new Date(reto.expiraEn).toLocaleDateString()}.`}
            </Text>
            {!reto.completado && !reto.expirado && (
              <Text style={styles.retoProgreso}>Tu aporte: {reto.progresoPropio ? 'listo' : 'pendiente'} · Compañero: {reto.progresoCompanero ? 'listo' : 'pendiente'}</Text>
            )}
            {(reto.completado || reto.expirado) && (
              <Tappable style={styles.enlaceReto} onPress={iniciarReto} disabled={accion !== null} haptic={false}>
                <Text style={styles.enlaceRetoTxt}>{accion === 'reto' ? 'Preparando...' : 'Iniciar nuevo reto'}</Text>
              </Tappable>
            )}
          </View>
        )}
        {!reto && (
          <Tappable style={styles.enlaceReto} onPress={iniciarReto} disabled={accion !== null} haptic={false}>
            <Text style={styles.enlaceRetoTxt}>{accion === 'reto' ? 'Preparando...' : 'Proponer reto cooperativo'}</Text>
          </Tappable>
        )}
        {editarNombre && (
          <View style={styles.nombreEditor}>
            <TextInput
              value={nombre}
              onChangeText={setNombre}
              maxLength={30}
              style={styles.nombreInput}
              placeholder="Nombre de la mascota"
              placeholderTextColor={theme.colors.textFaint}
            />
            <Tappable style={styles.enviarNombre} onPress={proponerNombre} disabled={accion !== null}>
              <Text style={styles.enviarNombreTxt}>{mascota.nombrePropuesto?.puedeConfirmar ? 'Confirmar' : 'Proponer'}</Text>
            </Tappable>
          </View>
        )}
        {mascota.nombrePropuesto && !editarNombre && (
          <Text style={styles.aviso}>Propuesta pendiente: {mascota.nombrePropuesto.nombre}</Text>
        )}
        {mascota.historialHitos?.length > 0 && (
          <Text style={styles.recuerdo}>
            Recuerdo: {mascota.historialHitos[mascota.historialHitos.length - 1].hito} · {new Date(mascota.historialHitos[mascota.historialHitos.length - 1].fecha).toLocaleDateString()}
          </Text>
        )}
        {!!mensajeAccion && <Text style={styles.aviso}>{mensajeAccion}</Text>}
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
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.accentSoft,
    marginRight: 12,
  },
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
  acciones: { flexDirection: 'row', gap: 7, marginTop: 8 },
  boton: { backgroundColor: t.colors.primary, paddingVertical: 7, paddingHorizontal: 9, borderRadius: t.shape.radiusMd },
  botonDesactivado: { opacity: 0.48 },
  botonTxt: { color: t.colors.onPrimary, fontSize: t.fontSize(11), ...t.typography.fonts.semibold },
  botonSecundario: { borderColor: t.colors.primarySoftBorder, borderWidth: t.shape.borderThin, paddingVertical: 7, paddingHorizontal: 9, borderRadius: t.shape.radiusMd },
  botonSecundarioTxt: { color: t.colors.primary, fontSize: t.fontSize(11), ...t.typography.fonts.semibold },
  aviso: { color: t.colors.textMuted, fontSize: t.fontSize(10), marginTop: 6 },
  reto: { borderTopColor: t.colors.border, borderTopWidth: t.shape.borderThin, marginTop: 8, paddingTop: 7 },
  retoTitulo: { color: t.colors.text, fontSize: t.fontSize(11), ...t.typography.fonts.semibold },
  retoTexto: { color: t.colors.textMuted, fontSize: t.fontSize(10), marginTop: 2 },
  retoProgreso: { color: t.colors.textFaint, fontSize: t.fontSize(10), marginTop: 3 },
  enlaceReto: { alignSelf: 'flex-start', marginTop: 4 },
  enlaceRetoTxt: { color: t.colors.primary, fontSize: t.fontSize(10), ...t.typography.fonts.semibold },
  nombreEditor: { flexDirection: 'row', gap: 6, marginTop: 8 },
  nombreInput: { flex: 1, color: t.colors.text, borderColor: t.colors.border, borderWidth: t.shape.borderThin, borderRadius: t.shape.radiusSm, paddingHorizontal: 7, paddingVertical: 5, fontSize: t.fontSize(11) },
  enviarNombre: { backgroundColor: t.colors.accentSoft, borderRadius: t.shape.radiusSm, justifyContent: 'center', paddingHorizontal: 8 },
  enviarNombreTxt: { color: t.colors.primary, fontSize: t.fontSize(10), ...t.typography.fonts.semibold },
  recuerdo: { color: t.colors.textFaint, fontSize: t.fontSize(10), marginTop: 6, fontStyle: 'italic' },
  refrescando: { position: 'absolute', right: 8, bottom: 7 },
}));
