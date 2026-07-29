import {
  useCallback, useEffect, useRef, useState,
} from 'react';
import {
  View, Text, ScrollView, ActivityIndicator, TextInput, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  router, useFocusEffect, useLocalSearchParams, Stack,
} from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  apiGetMascota,
  apiCuidarMascota,
  apiIniciarRetoMascota,
  apiProponerNombreMascota,
  apiRegalarMascota,
  apiEquiparAccesorioMascota,
  apiArchivarMascota,
} from '../../services/api';
import { useTheme, makeThemedStyles } from '../../theme/ThemeContext';
import Tappable from '../../components/Tappable';
import MascotaAnimada from '../../mascota/animation/MascotaAnimada';
import BarraProgresoCarino from '../../mascota/animation/BarraProgresoCarino';
import { animoDeMascota } from '../../mascota/animation/animo';
import CelebracionLottie from '../../mascota/animation/CelebracionLottie';
import VestidorAccesorios from '../../mascota/vestidor';
import { estadoMascota } from '../../mascota/estadoMascota';
import { nombreEspecie } from '../../mascota/especiesCatalogo';
import SeccionSocial from '../../mascota/SeccionSocial';
import SeccionMinijuegos from '../../mascota/minijuegos/SeccionMinijuegos';
import { TEXTOS_PAUSA } from '../../mascota/textosPausa';

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

export default function MascotaDetalleScreen() {
  const { amistadId } = useLocalSearchParams();
  const { theme } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();

  const [mascota, setMascota] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [accion, setAccion] = useState(null);
  const [aviso, setAviso] = useState('');
  const [editarNombre, setEditarNombre] = useState(false);
  const [nombre, setNombre] = useState('');
  const [celebracion, setCelebracion] = useState({
    tipo: 'encantada', key: 0, cantidad: 0,
  });
  const [saludo, setSaludo] = useState(0);
  const [confirmarPausa, setConfirmarPausa] = useState(false);
  const [confeti, setConfeti] = useState(0);
  const etapaPrevia = useRef(null);

  // Evolucionar es lo único que se lleva la pantalla entera. El resto de las
  // celebraciones viven sobre el sprite; esta no, porque subir de etapa pasa dos
  // veces en toda la vida de la mascota y porque el confetti del catálogo está
  // compuesto en vertical de teléfono: encogido a 132 px sería un puñado de
  // puntitos. La primera carga no dispara nada — abrir la pantalla de una
  // mascota que YA es adulta no es una evolución.
  const etapaActual = mascota?.etapa?.numero;
  useEffect(() => {
    if (!Number.isFinite(etapaActual)) return;
    if (etapaPrevia.current !== null && etapaActual > etapaPrevia.current) {
      setConfeti((n) => n + 1);
    }
    etapaPrevia.current = etapaActual;
  }, [etapaActual]);

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

  // Cada vez que se entra a la pantalla la mascota saluda. El contador sube
  // antes de que la mascota termine de cargar la primera vez, y está bien: el
  // rig dispara el saludo también al montar.
  useFocusEffect(useCallback(() => {
    cargar();
    setSaludo((s) => s + 1);
  }, [cargar]));

  const ejecutar = async (tipo, request, exito) => {
    setAccion(tipo);
    setAviso('');
    try {
      const data = await request();
      if (data?.error) throw new Error(data.error);
      if (!data?.mascota) throw new Error('No se pudo actualizar a la mascota');
      // Cuando el cariño sube por cuidado/regalo la mascota pone cara de
      // encantada y salta el confetti. `key` es lo que el rig usa para saber que
      // es un evento nuevo y no un re-render.
      const antes = Number(mascota?.nivelCarino);
      const despues = Number(data.mascota.nivelCarino);
      const ganancia = Number.isFinite(antes) && Number.isFinite(despues)
        ? Math.max(0, despues - antes)
        : 0;
      const accionConCarino = tipo === 'cuidado' || tipo === 'regalo';
      if (accionConCarino && ganancia > 0) {
        setCelebracion((evento) => ({
          ...evento, key: evento.key + 1, cantidad: ganancia,
        }));
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
  const regalar = () => ejecutar(
    'regalo',
    () => apiRegalarMascota(amistadId),
    `Le enviaste un regalo de cariño a ${mascota.nombre}.`,
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

  // Pausar no usa `ejecutar`: el backend responde { archivada: true } sin
  // mascota (ya no hay una que mostrar) y la pantalla se deja atrás.
  const pausar = async () => {
    setAccion('pausa');
    setAviso('');
    try {
      const data = await apiArchivarMascota(amistadId);
      if (!data?.archivada) throw new Error(data?.error || TEXTOS_PAUSA.error);
      setConfirmarPausa(false);
      router.replace('/(tabs)/mascota');
    } catch (e) {
      setConfirmarPausa(false);
      setAviso(e.message || TEXTOS_PAUSA.error);
    } finally {
      setAccion(null);
    }
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
          style={[styles.back, {
            paddingTop: insets.top + 8,
            minHeight: insets.top + 8 + 44,
          }]}
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
        {/* Si la otra persona la puso en pausa mientras esta pantalla estaba
            abierta, reintentar nunca va a servir: siempre hay salida. */}
        <Tappable
          style={styles.enlace}
          onPress={() => router.replace('/(tabs)/mascota')}
          haptic={false}
        >
          <Text style={styles.enlaceTxt}>Volver a la sección de mascota</Text>
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
            animo={animoDeMascota(mascota)}
            evento={celebracion}
            saludo={saludo}
            size={132}
          />
        </View>
        <Text style={styles.nombreHero} numberOfLines={1}>{mascota.nombre}</Text>
        <Text style={styles.etapaHero}>
          {nombreEspecie(mascota.especie)} · {etapaNombre} · {estado.etiqueta}
        </Text>
      </View>

      {/* Barra de progreso hacia la próxima evolución. */}
      <View style={styles.progresoWrap}>
        <BarraProgresoCarino progreso={progreso} nivelCarino={mascota.nivelCarino} />
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

      <SeccionMinijuegos mascota={mascota} onActualizar={cargar} />

      {/* Reto cooperativo activo */}
      <View style={styles.bloque}>
        <Text style={styles.bloqueTitulo}>Reto cooperativo{reto?.titulo ? ` · ${reto.titulo}` : ''}</Text>
        {reto ? (
          <>
            <Text style={styles.bloqueTexto}>
              {reto.completado
                ? '¡Reto completado! La siguiente etapa está más cerca.'
                : reto.expirado
                  ? 'Este reto venció sin presión. Pueden iniciar otro cuando quieran.'
                  : reto.descripcion
                    ?? `Los dos cuiden a ${mascota.nombre} antes del ${new Date(reto.expiraEn).toLocaleDateString()}.`}
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
      <SeccionSocial
        mascota={mascota}
        onRegalar={regalar}
        regalando={accion === 'regalo'}
        bloqueado={accion !== null}
      />

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

      {/* Vestidor: accesorios cosméticos (cabeza/rostro y color/patrón). Se
          desbloquean por nivel/hitos; visibles para ambos integrantes. Cada
          casilla dibuja la mascota real con la pieza puesta. */}
      <View style={styles.bloque}>
        <Text style={styles.bloqueTitulo}>Vestidor</Text>
        <Text style={styles.bloqueTexto}>
          Se desbloquean a medida que su vínculo crece. Toca uno para equiparlo.
        </Text>
        {/* __SLOT_ACCESORIOS__ */}
        <VestidorAccesorios
          accesorios={mascota.accesorios}
          especie={mascota.especie}
          etapa={mascota.etapa?.numero ?? 1}
          onEquipar={equipar}
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

      {/* Configuración: poner en pausa. A diferencia del nombre o la especie,
          esto no se negocia — cualquiera de los dos puede hacerlo solo. */}
      <View style={styles.bloque}>
        <Text style={styles.bloqueTitulo}>{TEXTOS_PAUSA.bloqueTitulo}</Text>
        <Text style={styles.bloqueTexto}>{TEXTOS_PAUSA.bloqueTexto}</Text>
        <Tappable
          style={styles.enlace}
          onPress={() => setConfirmarPausa(true)}
          disabled={accion !== null}
          haptic={false}
          accessibilityLabel={TEXTOS_PAUSA.accion(mascota.nombre)}
        >
          <Text style={styles.enlaceApagado}>{TEXTOS_PAUSA.accion(mascota.nombre)}</Text>
        </Tappable>
      </View>

      <Modal
        visible={confirmarPausa}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmarPausa(false)}
      >
        <View style={styles.modalFondo}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitulo}>{TEXTOS_PAUSA.dialogoTitulo(mascota.nombre)}</Text>
            <Text style={styles.modalSub}>{TEXTOS_PAUSA.dialogoTexto}</Text>
            <View style={styles.modalAcciones}>
              <Tappable
                style={styles.btnCancelar}
                onPress={() => setConfirmarPausa(false)}
                disabled={accion === 'pausa'}
                haptic={false}
                accessibilityLabel={TEXTOS_PAUSA.cancelar}
              >
                <Text style={styles.btnCancelarTxt}>{TEXTOS_PAUSA.cancelar}</Text>
              </Tappable>
              <Tappable
                style={styles.btnConfirmarPausa}
                onPress={pausar}
                disabled={accion === 'pausa'}
                accessibilityLabel={TEXTOS_PAUSA.confirmar}
              >
                <Text style={styles.btnConfirmarPausaTxt}>
                  {accion === 'pausa' ? TEXTOS_PAUSA.enCurso : TEXTOS_PAUSA.confirmar}
                </Text>
              </Tappable>
            </View>
          </View>
        </View>
      </Modal>

      {confeti > 0 && (
        <CelebracionLottie
          key={confeti}
          tipo="confeti"
          onFin={() => setConfeti(0)}
          testID="confeti-evolucion"
        />
      )}
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
  topBar: { width: '100%', paddingBottom: 4 },
  back: { width: 44, minHeight: 44, justifyContent: 'center', alignItems: 'flex-start' },
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
  // La pausa no se pinta como acción destructiva en rojo: es una decisión
  // válida, no una alarma. Queda en tono apagado, sin competir con "cuidar".
  enlaceApagado: { color: t.colors.textMuted, fontSize: t.fontSize(14), ...t.typography.fonts.semibold },
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
  modalFondo: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 22,
  },
  modalCard: {
    backgroundColor: t.colors.background,
    borderRadius: t.shape.radiusLg,
    padding: 20,
    ...t.shadows.card,
  },
  modalTitulo: {
    ...t.typography.type.title, fontSize: t.fontSize(19), color: t.colors.text, marginBottom: 4,
  },
  modalSub: {
    fontSize: t.fontSize(13),
    color: t.colors.textMuted,
    lineHeight: Math.round(t.fontSize(13) * 1.5),
  },
  modalAcciones: {
    flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 18,
  },
  btnCancelar: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16 },
  btnCancelarTxt: { color: t.colors.textMuted, fontSize: t.fontSize(14) },
  btnConfirmarPausa: {
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: t.colors.primary,
    borderRadius: t.shape.radiusMd,
    paddingHorizontal: 22,
  },
  btnConfirmarPausaTxt: {
    color: t.colors.onPrimary, fontSize: t.fontSize(14), ...t.typography.fonts.semibold,
  },
}));
