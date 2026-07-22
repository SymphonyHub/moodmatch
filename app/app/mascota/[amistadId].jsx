import { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, ActivityIndicator, TextInput,
} from 'react-native';
import {
  router, useFocusEffect, useLocalSearchParams, Stack,
} from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  apiGetMascota,
  apiCuidarMascota,
  apiIniciarRetoMascota,
  apiProponerNombreMascota,
  apiEquiparAccesorioMascota,
} from '../../services/api';
import { useTheme, makeThemedStyles } from '../../theme/ThemeContext';
import Tappable from '../../components/Tappable';
import MascotaAnimada from '../../mascota/animation/MascotaAnimada';
import { CATALOGO_ACCESORIOS } from '../../mascota/sprites/accesorios';
import { estadoMascota } from '../../mascota/estadoMascota';

// Progreso hacia la próxima evolución (Cachorro→Joven en 16, Joven→Adulta en
// 36). El backend ya entrega la etapa; aquí solo se dibuja el avance. La
// animación de transición entre etapas es del Agente C.
function progresoEvolucion(nivelCarino = 0) {
  const nivel = Math.max(0, nivelCarino);
  if (nivel >= 36) return 1;
  const base = nivel < 16 ? 0 : 16;
  const meta = nivel < 16 ? 16 : 36;
  return Math.min(1, (nivel - base) / (meta - base));
}

// Grid de accesorios por categoría. Los desbloqueados se pueden equipar/quitar;
// los bloqueados muestran candado + pista de cómo se consiguen.
function AccesoriosGrid({
  accesorios, onEquipar, styles, theme,
}) {
  const desbloqueados = new Set(accesorios?.desbloqueados ?? []);
  const equipado = { cabeza: accesorios?.cabeza ?? null, color: accesorios?.color ?? null };
  const grupos = [
    { categoria: 'cabeza', titulo: 'Cabeza' },
    { categoria: 'color', titulo: 'Color y patrón' },
  ];
  return (
    <View style={styles.accWrap}>
      {grupos.map(({ categoria, titulo }) => (
        <View key={categoria} style={styles.accGrupo}>
          <Text style={styles.accGrupoTitulo}>{titulo}</Text>
          <View style={styles.accFila}>
            {CATALOGO_ACCESORIOS.filter((a) => a.categoria === categoria).map((a) => {
              const desbloqueado = desbloqueados.has(a.id);
              const on = equipado[categoria] === a.id;
              return (
                <Tappable
                  key={a.id}
                  style={[styles.accChip, on && styles.accChipOn, !desbloqueado && styles.accChipLock]}
                  onPress={() => desbloqueado && onEquipar(categoria, a.id)}
                  disabled={!desbloqueado}
                  haptic={false}
                  accessibilityLabel={desbloqueado
                    ? `${on ? 'Quitar' : 'Equipar'} ${a.nombre}`
                    : `${a.nombre} bloqueado: ${a.pista}`}
                >
                  <View style={styles.accChipFila}>
                    {!desbloqueado && (
                      <Ionicons name="lock-closed" size={11} color={theme.colors.textFaint} />
                    )}
                    <Text style={[
                      styles.accChipTxt,
                      on && styles.accChipTxtOn,
                      !desbloqueado && styles.accChipTxtLock,
                    ]}
                    >
                      {a.nombre}
                    </Text>
                  </View>
                  {!desbloqueado && <Text style={styles.accPista}>{a.pista}</Text>}
                </Tappable>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

export default function MascotaDetalleScreen() {
  const { amistadId } = useLocalSearchParams();
  const { theme } = useTheme();
  const styles = useStyles();

  const [mascota, setMascota] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [accion, setAccion] = useState(null);
  const [aviso, setAviso] = useState('');
  const [editarNombre, setEditarNombre] = useState(false);
  const [nombre, setNombre] = useState('');
  const [celebracion, setCelebracion] = useState(0);

  const cargar = useCallback(async () => {
    if (!amistadId) return;
    setLoading(true);
    setError(false);
    try {
      const data = await apiGetMascota(amistadId);
      if (!data?.mascota) throw new Error(data?.error || 'Mascota no disponible');
      setMascota(data.mascota);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [amistadId]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const ejecutar = async (tipo, request, exito) => {
    setAccion(tipo);
    setAviso('');
    try {
      const data = await request();
      if (data?.error) throw new Error(data.error);
      if (!data?.mascota) throw new Error('No se pudo actualizar a la mascota');
      // Celebración cuando el cariño sube (cuidado/reto): el rig muestra confetti.
      if (mascota && data.mascota.nivelCarino > mascota.nivelCarino) {
        setCelebracion((c) => c + 1);
      }
      setMascota(data.mascota);
      setAviso(exito);
      setEditarNombre(false);
    } catch (e) {
      setAviso(e.message || 'No se pudo completar la acción.');
    } finally {
      setAccion(null);
    }
  };

  const cuidar = () => ejecutar(
    'cuidado',
    () => apiCuidarMascota(amistadId),
    `${mascota.nombre} recibió su momento de cuidado.`,
  );
  const iniciarReto = () => ejecutar(
    'reto',
    () => apiIniciarRetoMascota(amistadId),
    'Nuevo reto cooperativo listo.',
  );
  const proponerNombre = () => {
    const propuesto = nombre.trim();
    if (!propuesto) return setAviso('Escribe un nombre para proponerlo.');
    return ejecutar(
      'nombre',
      () => apiProponerNombreMascota(amistadId, propuesto),
      mascota.nombrePropuesto?.puedeConfirmar ? 'Nombre confirmado.' : 'Propuesta enviada a tu amistad.',
    );
  };

  // Equipa o desequipa un accesorio (toca el equipado → lo quita). Update
  // optimista: el sprite hero refleja el cambio de inmediato.
  const equipar = async (categoria, id) => {
    const actual = mascota.accesorios?.[categoria] ?? null;
    const destino = actual === id ? null : id;
    setMascota((m) => ({
      ...m, accesorios: { ...m.accesorios, [categoria]: destino },
    }));
    try {
      const data = await apiEquiparAccesorioMascota(amistadId, { [categoria]: destino });
      if (data?.error) throw new Error(data.error);
      if (data?.mascota) setMascota(data.mascota);
    } catch {
      cargar();
    }
  };

  const encabezado = (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.topBar}>
        <Tappable
          style={styles.back}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/mascota'))}
          haptic={false}
          accessibilityLabel="Volver"
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </Tappable>
      </View>
    </>
  );

  if (loading && !mascota) {
    return (
      <View style={styles.centro}>
        {encabezado}
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (error || !mascota) {
    return (
      <View style={styles.centro}>
        {encabezado}
        <Text style={styles.errorEmoji}>🐾</Text>
        <Text style={styles.errorTxt}>La mascota está descansando.</Text>
        <Tappable style={styles.btnReintentar} onPress={cargar} haptic={false}>
          <Text style={styles.btnReintentarTxt}>Reintentar</Text>
        </Tappable>
      </View>
    );
  }

  const estado = estadoMascota(mascota.nivelCarino);
  const progreso = progresoEvolucion(mascota.nivelCarino);
  const etapaNombre = mascota.etapa?.nombre ?? 'Cachorro';
  const reto = mascota.reto;
  const hitos = mascota.historialHitos ?? [];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {encabezado}

      {/* Header hero: sprite animado por etapa (idle, reacción al toque,
          celebración, evolución, necesita atención) — rig único de las 7 especies. */}
      <View style={styles.hero}>
        <View style={styles.spriteHero}>
          <MascotaAnimada
            especie={mascota.especie}
            etapa={mascota.etapa?.numero ?? 1}
            personalidad={mascota.personalidad}
            accesorioCabeza={mascota.accesorios?.cabeza ?? null}
            accesorioColor={mascota.accesorios?.color ?? null}
            necesitaAtencion={mascota.necesitaAtencion}
            celebracionKey={celebracion}
            size={132}
          />
        </View>
        <Text style={styles.nombreHero} numberOfLines={1}>{mascota.nombre}</Text>
        <Text style={styles.etapaHero}>
          {etapaNombre} · {estado.etiqueta}
        </Text>
      </View>

      {/* Barra de progreso hacia la próxima evolución. El Agente C puede
          sustituirla por un anillo alrededor del sprite. */}
      <View style={styles.progresoWrap}>
        <View style={styles.progresoBarra}>
          <View style={[styles.progresoFill, { width: `${Math.round(progreso * 100)}%` }]} />
        </View>
        <Text style={styles.progresoTxt}>
          {mascota.nivelCarino} de cariño · {mascota.personalidad ?? 'curiosa'}
        </Text>
      </View>

      {!!aviso && <Text style={styles.aviso}>{aviso}</Text>}

      {/* Acción de cuidado */}
      <Tappable
        style={[styles.botonCuidar, !mascota.puedeCuidar && styles.botonDesactivado]}
        onPress={cuidar}
        disabled={accion !== null || !mascota.puedeCuidar}
        accessibilityLabel="Alimentar y jugar con la mascota"
      >
        <Ionicons name="heart" size={18} color={theme.colors.onPrimary} />
        <Text style={styles.botonCuidarTxt}>
          {accion === 'cuidado' ? 'Cuidando…' : 'Alimentar y jugar'}
        </Text>
      </Tappable>
      {!mascota.puedeCuidar && (
        <Text style={styles.notaSuave}>Tu cuidado vuelve mañana. Tu amistad puede cuidarla hoy.</Text>
      )}

      {/* Reto cooperativo activo */}
      <View style={styles.bloque}>
        <Text style={styles.bloqueTitulo}>Reto cooperativo</Text>
        {reto ? (
          <>
            <Text style={styles.bloqueTexto}>
              {reto.completado
                ? '¡Reto completado! La siguiente etapa está más cerca.'
                : reto.expirado
                  ? 'Este reto venció sin presión. Pueden iniciar otro cuando quieran.'
                  : `Los dos cuiden a ${mascota.nombre} antes del ${new Date(reto.expiraEn).toLocaleDateString()}.`}
            </Text>
            {!reto.completado && !reto.expirado && (
              <Text style={styles.retoProgreso}>
                Tú: {reto.progresoPropio ? 'listo' : 'pendiente'} · Tu amistad: {reto.progresoCompanero ? 'listo' : 'pendiente'}
              </Text>
            )}
            {(reto.completado || reto.expirado) && (
              <Tappable style={styles.enlace} onPress={iniciarReto} disabled={accion !== null} haptic={false}>
                <Text style={styles.enlaceTxt}>{accion === 'reto' ? 'Preparando…' : 'Iniciar nuevo reto'}</Text>
              </Tappable>
            )}
          </>
        ) : (
          <Tappable style={styles.enlace} onPress={iniciarReto} disabled={accion !== null} haptic={false}>
            <Text style={styles.enlaceTxt}>{accion === 'reto' ? 'Preparando…' : 'Proponer un reto cooperativo'}</Text>
          </Tappable>
        )}
      </View>

      {/* Slot del Agente B: regalos, racha compartida y catálogo ampliado de
          retos se integran aquí sin reescribir el resto de la pantalla. */}
      {/* __SLOT_INTERACCIONES_SOCIALES__ */}

      {/* Historial de hitos */}
      {hitos.length > 0 && (
        <View style={styles.bloque}>
          <Text style={styles.bloqueTitulo}>Sus recuerdos</Text>
          <View style={styles.timeline}>
            {hitos.slice().reverse().map((h, i) => (
              <View key={`${h.fecha}-${i}`} style={styles.hito}>
                <View style={styles.hitoPunto} />
                <View style={styles.hitoInfo}>
                  <Text style={styles.hitoTexto}>{h.hito}</Text>
                  <Text style={styles.hitoFecha}>{new Date(h.fecha).toLocaleDateString()}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Slot del Agente C: accesorios cosméticos (cabeza y color/patrón). Se
          desbloquean por nivel/hitos; visibles para ambos integrantes. */}
      <View style={styles.bloque}>
        <Text style={styles.bloqueTitulo}>Accesorios</Text>
        <Text style={styles.bloqueTexto}>
          Se desbloquean a medida que su vínculo crece. Toca uno para equiparlo.
        </Text>
        {/* __SLOT_ACCESORIOS__ */}
        <AccesoriosGrid
          accesorios={mascota.accesorios}
          onEquipar={equipar}
          styles={styles}
          theme={theme}
        />
      </View>

      {/* Configuración: cambiar nombre (negociación entre ambos) */}
      <View style={styles.bloque}>
        <Text style={styles.bloqueTitulo}>Nombre</Text>
        {mascota.nombrePropuesto && !editarNombre && (
          <Text style={styles.bloqueTexto}>
            Propuesta pendiente: {mascota.nombrePropuesto.nombre}
            {mascota.nombrePropuesto.puedeConfirmar ? ' · puedes confirmarla' : ''}
          </Text>
        )}
        {editarNombre ? (
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
              <Text style={styles.enviarNombreTxt}>
                {mascota.nombrePropuesto?.puedeConfirmar ? 'Confirmar' : 'Proponer'}
              </Text>
            </Tappable>
          </View>
        ) : (
          <Tappable
            style={styles.enlace}
            onPress={() => { setEditarNombre(true); setNombre(mascota.nombrePropuesto?.nombre ?? mascota.nombre); }}
            disabled={accion !== null}
            haptic={false}
          >
            <Text style={styles.enlaceTxt}>Proponer otro nombre</Text>
          </Tappable>
        )}
      </View>
    </ScrollView>
  );
}

const useStyles = makeThemedStyles((t) => ({
  container: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingBottom: 48,
  },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  topBar: { width: '100%', paddingTop: 8, paddingBottom: 4 },
  back: { width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-start' },
  errorEmoji: { fontSize: 40, marginBottom: 10 },
  errorTxt: { color: t.colors.textMuted, fontSize: t.fontSize(15), marginBottom: 16, textAlign: 'center' },
  btnReintentar: {
    minHeight: 44, justifyContent: 'center', paddingHorizontal: 22,
    backgroundColor: t.colors.primary, borderRadius: t.shape.radiusMd,
  },
  btnReintentarTxt: { color: t.colors.onPrimary, ...t.typography.fonts.semibold, fontSize: t.fontSize(14) },
  hero: { alignItems: 'center', marginTop: 4, marginBottom: 20 },
  spriteHero: {
    width: 164,
    height: 164,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.accentSoft,
    marginBottom: 14,
  },
  nombreHero: { ...t.typography.type.title, color: t.colors.text, marginBottom: 2 },
  etapaHero: { fontSize: t.fontSize(14), color: t.colors.textMuted },
  progresoWrap: { marginBottom: 20 },
  progresoBarra: {
    height: 10,
    borderRadius: 6,
    backgroundColor: t.colors.primarySoft,
    overflow: 'hidden',
  },
  progresoFill: { height: '100%', borderRadius: 6, backgroundColor: t.colors.accent },
  progresoTxt: { fontSize: t.fontSize(12), color: t.colors.textFaint, marginTop: 6, textAlign: 'center' },
  aviso: {
    color: t.colors.textMuted,
    fontSize: t.fontSize(13),
    marginBottom: 12,
    backgroundColor: t.colors.primarySoft,
    borderRadius: t.shape.radiusMd,
    padding: 10,
  },
  botonCuidar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 50,
    backgroundColor: t.colors.primary,
    borderRadius: t.shape.radiusLg,
  },
  botonDesactivado: { opacity: 0.5 },
  botonCuidarTxt: { color: t.colors.onPrimary, fontSize: t.fontSize(15), ...t.typography.fonts.semibold },
  notaSuave: { fontSize: t.fontSize(12), color: t.colors.textFaint, marginTop: 8, textAlign: 'center' },
  bloque: {
    marginTop: 22,
    padding: 16,
    borderRadius: t.shape.radiusLg,
    backgroundColor: t.colors.surface,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.border,
  },
  bloqueTitulo: { ...t.typography.fonts.semibold, fontSize: t.fontSize(15), color: t.colors.text, marginBottom: 8 },
  bloqueTexto: { fontSize: t.fontSize(13), color: t.colors.textMuted, lineHeight: Math.round(t.fontSize(13) * 1.5) },
  retoProgreso: { fontSize: t.fontSize(12), color: t.colors.textFaint, marginTop: 6 },
  enlace: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', marginTop: 6 },
  enlaceTxt: { color: t.colors.primary, fontSize: t.fontSize(14), ...t.typography.fonts.semibold },
  timeline: { marginTop: 4 },
  hito: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 10 },
  hitoPunto: {
    width: 9, height: 9, borderRadius: 5, backgroundColor: t.colors.accent, marginTop: 5, marginRight: 12,
  },
  hitoInfo: { flex: 1, minWidth: 0 },
  hitoTexto: { fontSize: t.fontSize(13), color: t.colors.text },
  hitoFecha: { fontSize: t.fontSize(11), color: t.colors.textFaint, marginTop: 1 },
  nombreEditor: { flexDirection: 'row', gap: 8, marginTop: 8 },
  nombreInput: {
    flex: 1,
    color: t.colors.text,
    borderColor: t.colors.border,
    borderWidth: t.shape.borderThin,
    borderRadius: t.shape.radiusMd,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: t.fontSize(14),
  },
  enviarNombre: {
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: t.colors.accentSoft,
    borderRadius: t.shape.radiusMd,
    paddingHorizontal: 14,
  },
  enviarNombreTxt: { color: t.colors.primary, fontSize: t.fontSize(13), ...t.typography.fonts.semibold },
  accWrap: { marginTop: 12, gap: 14 },
  accGrupo: { gap: 8 },
  accGrupoTitulo: {
    fontSize: t.fontSize(12),
    color: t.colors.textFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    ...t.typography.fonts.semibold,
  },
  accFila: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  accChip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: t.shape.radiusMd,
    backgroundColor: t.colors.primarySoft,
    borderWidth: t.shape.borderThin,
    borderColor: 'transparent',
  },
  accChipOn: { borderColor: t.colors.primary, backgroundColor: t.colors.accentSoft },
  accChipLock: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
  accChipFila: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  accChipTxt: { fontSize: t.fontSize(13), color: t.colors.text, ...t.typography.fonts.semibold },
  accChipTxtOn: { color: t.colors.primary },
  accChipTxtLock: { color: t.colors.textFaint, ...t.typography.fonts.regular },
  accPista: { fontSize: t.fontSize(10), color: t.colors.textFaint, marginTop: 2 },
}));
