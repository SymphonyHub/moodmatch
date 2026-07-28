import {
  useCallback, useEffect, useRef, useState,
} from 'react';
import {
  AccessibilityInfo, ActivityIndicator, AppState, Platform, ScrollView, Text, View,
} from 'react-native';
import {
  router, Stack, useFocusEffect,
} from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  apiCompletarMinijuegoMascota,
  apiGetMascota,
  apiIniciarMinijuegoMascota,
} from '../../services/api';
import { useMotionPrefs, useTheme, makeThemedStyles } from '../../theme/ThemeContext';
import Entrance from '../../components/Entrance';
import Tappable from '../../components/Tappable';
import RecompensaCompletada from '../../components/wellness/RecompensaCompletada';
import MascotaAnimada from '../animation/MascotaAnimada';
import AtrapalaGame from './AtrapalaGame';
import RitmoCarinoGame from './RitmoCarinoGame';
import {
  ATRAPALA,
  MINIJUEGOS,
  estadoCooldownTarjeta,
  modoAccesibleMinijuego,
  resumenResultado,
  tipoDeSlug,
} from './logica';
import {
  CODIGO_DESCANSO,
  interpretarErrorMinijuego,
  normalizarEstadosMinijuego,
  recompensasVisibles,
} from './contrato';

const INSTRUCCIONES = {
  ATRAPALA: [
    'La mascota asomará ocho veces en distintos rincones.',
    'Cada encuentro aporta puntos para su energía.',
    'Al terminar verás la recompensa efectiva.',
  ],
  RITMO_CARINO: [
    'El indicador va y vuelve sobre la barra.',
    'La zona central suma hasta 2 puntos por ronda.',
    'Son cinco rondas; al terminar verás cuánto cariño reunieron.',
  ],
};

export default function MinijuegoScreen({ amistadId, slug }) {
  const { theme } = useTheme();
  const { reduceMotion } = useMotionPrefs();
  const styles = useStyles();
  const tipo = tipoDeSlug(slug);
  const juego = MINIJUEGOS.find((item) => item.tipo === tipo) ?? null;

  const [mascota, setMascota] = useState(null);
  const [cooldown, setCooldown] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [intentoCarga, setIntentoCarga] = useState(0);
  const [iniciada, setIniciada] = useState(false);
  const [iniciando, setIniciando] = useState(false);
  const [errorInicio, setErrorInicio] = useState(null);
  const [resultadoLocal, setResultadoLocal] = useState(null);
  const [respuesta, setRespuesta] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState(null);
  const [conflictoCooldown, setConflictoCooldown] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [appActiva, setAppActiva] = useState(
    !['background', 'inactive'].includes(AppState.currentState),
  );
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);
  const [modoAccesibleManual, setModoAccesibleManual] = useState(false);
  const guardandoRef = useRef(false);
  const iniciandoRef = useRef(false);
  // El ticket de partida no se pinta, así que vive en un ref: el callback del
  // juego lo lee sin depender de qué render lo capturó.
  const sesionRef = useRef(null);

  useFocusEffect(useCallback(() => {
    setIsFocused(true);
    return () => setIsFocused(false);
  }, []));

  useEffect(() => {
    const appStateSub = AppState.addEventListener('change', (estado) => {
      setAppActiva(estado === 'active');
    });
    let montada = true;
    let lectorSub = null;
    if (Platform.OS !== 'web') {
      AccessibilityInfo.isScreenReaderEnabled?.().then((habilitado) => {
        if (montada) setScreenReaderEnabled(Boolean(habilitado));
      });
      lectorSub = AccessibilityInfo.addEventListener?.('screenReaderChanged', (habilitado) => {
        setScreenReaderEnabled(Boolean(habilitado));
      });
    }
    return () => {
      montada = false;
      appStateSub.remove();
      lectorSub?.remove?.();
    };
  }, []);

  const pantallaActiva = isFocused && appActiva;
  const modoAccesible = modoAccesibleMinijuego(
    Platform.OS,
    screenReaderEnabled,
    modoAccesibleManual,
  );
  useEffect(() => {
    if (!pantallaActiva && iniciada && !resultadoLocal) {
      // Abandonar la partida descarta su ticket: la próxima abre uno nuevo y
      // el cooldown sigue sin consumirse.
      sesionRef.current = null;
      setIniciada(false);
    }
  }, [iniciada, pantallaActiva, resultadoLocal]);

  useEffect(() => {
    let activo = true;
    if (!tipo || !amistadId) {
      setErrorCarga('Este juego no está disponible.');
      setLoading(false);
      return () => { activo = false; };
    }

    setLoading(true);
    setErrorCarga('');
    apiGetMascota(amistadId)
      .then((data) => {
        if (!activo) return;
        if (!data?.mascota) throw new Error(data?.error || 'Mascota no disponible');
        setMascota(data.mascota);
        setCooldown(normalizarEstadosMinijuego(data.mascota.minijuegos)?.[tipo] ?? null);
      })
      .catch((error) => {
        if (activo) setErrorCarga(error.message || 'No se pudo abrir el juego.');
      })
      .finally(() => {
        if (activo) setLoading(false);
      });

    return () => { activo = false; };
  }, [amistadId, intentoCarga, tipo]);

  const volver = () => {
    if (router.canGoBack?.()) router.back();
    else router.replace(`/mascota/${amistadId}`);
  };

  const anotarDescanso = (disponibleEn) => {
    setCooldown({ puedeJugar: false, disponibleEn });
    setConflictoCooldown(true);
    setIniciada(false);
    sesionRef.current = null;
  };

  const guardarResultado = async (resultado) => {
    if (guardandoRef.current || !tipo) return;
    guardandoRef.current = true;
    setResultadoLocal(resultado);
    setGuardando(true);
    setErrorGuardado(null);

    try {
      const data = await apiCompletarMinijuegoMascota(
        amistadId,
        tipo,
        resultado.puntuacion,
        sesionRef.current,
      );
      setMascota(data.mascota);
      setCooldown(data.mascota.minijuegos[tipo]);
      setRespuesta(data);
      sesionRef.current = null;
    } catch (error) {
      const guion = interpretarErrorMinijuego(error);
      if (guion.codigo === CODIGO_DESCANSO) {
        anotarDescanso(guion.disponibleEn);
      } else {
        // Un corte puede ocurrir después del commit. Antes de ofrecer otro POST,
        // refrescamos el detalle para no convertir un 201 perdido en un 429
        // ambiguo ni hacer que la persona repita la partida. Solo tiene sentido
        // cuando el fallo era de conexión: un ticket rechazado no cambia al
        // reintentarlo.
        let confirmada = false;
        if (guion.reintentable) {
          try {
            const data = await apiGetMascota(amistadId);
            const estado = normalizarEstadosMinijuego(data?.mascota?.minijuegos)?.[tipo];
            if (estado?.puedeJugar === false) {
              setMascota(data.mascota);
              setCooldown(estado);
              setConflictoCooldown(true);
              setIniciada(false);
              sesionRef.current = null;
              confirmada = true;
            }
          } catch {
            // El retry manual conserva el resultado local si tampoco hay red
            // para reconciliar el detalle.
          }
        }
        if (!confirmada) setErrorGuardado(guion);
      }
    } finally {
      guardandoRef.current = false;
      setGuardando(false);
    }
  };

  // La partida se abre contra el backend: el ticket sella allí el instante de
  // inicio. Sin ticket no se juega, porque el resultado no tendría dónde
  // apoyarse al reportarse.
  const comenzar = async () => {
    if (iniciandoRef.current || !tipo) return;
    iniciandoRef.current = true;
    setResultadoLocal(null);
    setRespuesta(null);
    setErrorGuardado(null);
    setErrorInicio(null);
    setIniciando(true);

    try {
      const { sesion } = await apiIniciarMinijuegoMascota(amistadId, tipo);
      sesionRef.current = sesion;
      setIniciada(true);
    } catch (error) {
      const guion = interpretarErrorMinijuego(error);
      if (guion.codigo === CODIGO_DESCANSO) anotarDescanso(guion.disponibleEn);
      else setErrorInicio(guion);
    } finally {
      iniciandoRef.current = false;
      setIniciando(false);
    }
  };

  const estadoCooldown = estadoCooldownTarjeta(cooldown);
  const bloqueado = estadoCooldown?.habilitado === false;
  const resumen = respuesta && resultadoLocal ? resumenResultado(tipo, resultadoLocal) : null;

  const encabezado = (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.topBar}>
        <Tappable
          style={styles.back}
          onPress={volver}
          haptic={false}
          accessibilityLabel="Volver a la mascota"
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </Tappable>
        <Text style={styles.topTitulo} numberOfLines={1}>{juego?.titulo ?? 'Minijuego'}</Text>
        <View style={styles.topEspacio} />
      </View>
    </>
  );

  if (loading) {
    return (
      <View style={styles.pantallaCentro}>
        {encabezado}
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.cargando}>Preparando un momento de juego...</Text>
      </View>
    );
  }

  if (errorCarga || !mascota || !juego) {
    return (
      <View style={styles.pantallaCentro}>
        {encabezado}
        <Ionicons name="paw-outline" size={42} color={theme.colors.textFaint} />
        <Text style={styles.estadoTitulo}>El juego está descansando</Text>
        <Text style={styles.estadoTexto}>{errorCarga || 'No pudimos encontrar este juego.'}</Text>
        <Tappable style={styles.botonPrincipal} onPress={() => setIntentoCarga((n) => n + 1)} haptic={false}>
          <Text style={styles.botonPrincipalTexto}>Volver a intentar</Text>
        </Tappable>
        <Tappable style={styles.enlace} onPress={volver} haptic={false}>
          <Text style={styles.enlaceTexto}>Volver a la mascota</Text>
        </Tappable>
      </View>
    );
  }

  if (!estadoCooldown) {
    return (
      <View style={styles.pantallaCentro}>
        {encabezado}
        <Ionicons name="construct-outline" size={40} color={theme.colors.textFaint} />
        <Text style={styles.estadoTitulo}>Los juegos se están preparando</Text>
        <Text style={styles.estadoTexto}>
          {mascota.nombre} sigue disponible para sus otros momentos de cuidado.
        </Text>
        <Tappable style={styles.botonPrincipal} onPress={volver} haptic={false}>
          <Text style={styles.botonPrincipalTexto}>Volver a la mascota</Text>
        </Tappable>
      </View>
    );
  }

  if (bloqueado && !respuesta) {
    return (
      <View style={styles.pantallaCentro}>
        {encabezado}
        <View style={styles.descansoIcono}>
          <Ionicons name="moon" size={31} color={theme.colors.primary} />
        </View>
        <Text style={styles.estadoTitulo}>
          {conflictoCooldown ? 'Ya hay una partida registrada para este juego' : estadoCooldown.etiqueta}
        </Text>
        <Text style={styles.estadoTexto}>
          {conflictoCooldown
            ? 'La disponibilidad se guarda por persona y por juego. Podrás volver cuando pasen 24 horas, sin apuro.'
            : estadoCooldown.detalle}
        </Text>
        <Tappable style={styles.botonPrincipal} onPress={volver} haptic={false}>
          <Text style={styles.botonPrincipalTexto}>Volver con {mascota.nombre}</Text>
        </Tappable>
      </View>
    );
  }

  if (respuesta && resumen) {
    const recompensas = recompensasVisibles(respuesta.recompensa);

    return (
      <ScrollView key="resultado" contentContainerStyle={styles.container}>
        {encabezado}
        <Entrance style={styles.resultadoCard} distance={10}>
          <View style={styles.resultadoHero}>
            <MascotaAnimada
              especie={mascota.especie}
              etapa={mascota.etapa?.numero ?? 1}
              personalidad={mascota.personalidad}
              accesorioCabeza={mascota.accesorios?.cabeza ?? null}
              accesorioColor={mascota.accesorios?.color ?? null}
              size={126}
            />
            {!reduceMotion && (
              <View style={styles.resultadoCelebracion} pointerEvents="none">
                <RecompensaCompletada categoria={tipo === ATRAPALA ? 'físico' : 'social'} size={58} />
              </View>
            )}
          </View>
          <Text style={styles.resultadoTitulo}>{resumen.titulo}</Text>
          <Text style={styles.resultadoPuntos}>{resumen.resultado}</Text>
          <Text style={styles.resultadoDetalle}>{resumen.detalle}</Text>

          <View style={styles.recompensas}>
            {recompensas.map((item) => (
              <View key={item.clave} style={styles.recompensaChip}>
                <Ionicons name={item.icono} size={16} color={theme.colors.primary} />
                <Text style={styles.recompensaTexto}>{item.texto}</Text>
              </View>
            ))}
          </View>

          <View style={styles.descansoNota}>
            <Ionicons name="moon-outline" size={16} color={theme.colors.textMuted} />
            <Text style={styles.descansoNotaTexto}>
              Este juego toma una pausa de 24 horas. El otro minijuego lleva su propio ritmo.
            </Text>
          </View>

          <Tappable style={styles.botonPrincipal} onPress={volver}>
            <Text style={styles.botonPrincipalTexto}>Volver con {mascota.nombre}</Text>
          </Tappable>
        </Entrance>
      </ScrollView>
    );
  }

  if (resultadoLocal) {
    const reintentable = errorGuardado?.reintentable === true;
    return (
      <View style={styles.pantallaCentro}>
        {encabezado}
        {guardando ? (
          <ActivityIndicator size="large" color={theme.colors.primary} />
        ) : (
          <Ionicons
            name={reintentable ? 'cloud-offline-outline' : 'paw-outline'}
            size={40}
            color={theme.colors.textFaint}
          />
        )}
        <Text style={styles.estadoTitulo}>
          {guardando ? 'Guardando el momento...' : errorGuardado?.titulo}
        </Text>
        <Text style={styles.estadoTexto}>
          {guardando ? 'Estamos sumando la recompensa de la partida.' : errorGuardado?.mensaje}
        </Text>
        {!guardando && (reintentable ? (
          <Tappable style={styles.botonPrincipal} onPress={() => guardarResultado(resultadoLocal)}>
            <Text style={styles.botonPrincipalTexto}>Intentar guardar otra vez</Text>
          </Tappable>
        ) : (
          <Tappable style={styles.botonPrincipal} onPress={volver} haptic={false}>
            <Text style={styles.botonPrincipalTexto}>Volver con {mascota.nombre}</Text>
          </Tappable>
        ))}
      </View>
    );
  }

  if (iniciada && !pantallaActiva) {
    return (
      <View style={styles.pantallaCentro}>
        {encabezado}
        <Ionicons name="pause-circle-outline" size={42} color={theme.colors.textFaint} />
        <Text style={styles.estadoTitulo}>La partida quedó en pausa</Text>
        <Text style={styles.estadoTexto}>Al volver podrás comenzar de nuevo; todavía no se consumió la partida.</Text>
      </View>
    );
  }

  if (iniciada) {
    return (
      <ScrollView key="partida" contentContainerStyle={styles.container}>
        {encabezado}
        <View style={styles.juegoCard}>
          {tipo === ATRAPALA ? (
            <AtrapalaGame
              mascota={mascota}
              reduceMotion={reduceMotion}
              screenReaderEnabled={modoAccesible}
              onCompletar={guardarResultado}
            />
          ) : (
            <RitmoCarinoGame
              mascota={mascota}
              reduceMotion={reduceMotion}
              screenReaderEnabled={modoAccesible}
              onCompletar={guardarResultado}
            />
          )}
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView key="introduccion" contentContainerStyle={styles.container}>
      {encabezado}
      <Entrance style={styles.introCard}>
        <View style={styles.introHero}>
          <View style={styles.introHalo} />
          <MascotaAnimada
            especie={mascota.especie}
            etapa={mascota.etapa?.numero ?? 1}
            personalidad={mascota.personalidad}
            accesorioCabeza={mascota.accesorios?.cabeza ?? null}
            accesorioColor={mascota.accesorios?.color ?? null}
            saludo={1}
            size={138}
          />
        </View>
        <View style={styles.pildora}>
          <Ionicons name={tipo === ATRAPALA ? 'paw' : 'heart'} size={14} color={theme.colors.primary} />
          <Text style={styles.pildoraTexto}>Una partida breve</Text>
        </View>
        <Text style={styles.introTitulo}>{juego.titulo}</Text>
        <Text style={styles.introTexto}>{juego.descripcion}</Text>

        <View style={styles.instrucciones}>
          {INSTRUCCIONES[tipo].map((texto, index) => (
            <View key={texto} style={styles.instruccionFila}>
              <View style={styles.numero}><Text style={styles.numeroTexto}>{index + 1}</Text></View>
              <Text style={styles.instruccionTexto}>{texto}</Text>
            </View>
          ))}
        </View>

        <View style={styles.limiteNota}>
          <Ionicons name="time-outline" size={17} color={theme.colors.textMuted} />
          <Text style={styles.limiteNotaTexto}>
            Al terminar, este juego toma una pausa de 24 horas para tu cuenta.
          </Text>
        </View>

        {Platform.OS === 'web' && (
          <Tappable
            style={styles.modoAccesible}
            onPress={() => setModoAccesibleManual((activo) => !activo)}
            haptic={false}
            accessibilityState={{ selected: modoAccesibleManual }}
          >
            <Ionicons
              name={modoAccesibleManual ? 'accessibility' : 'accessibility-outline'}
              size={18}
              color={theme.colors.primary}
            />
            <Text style={styles.modoAccesibleTexto}>
              {modoAccesibleManual ? 'Modo accesible activo' : 'Usar modo accesible'}
            </Text>
          </Tappable>
        )}

        {errorInicio && (
          <View style={styles.avisoInicio}>
            <Ionicons name="cloud-offline-outline" size={17} color={theme.colors.textMuted} />
            <Text style={styles.avisoInicioTexto}>
              {`${errorInicio.titulo}. ${errorInicio.mensaje}`}
            </Text>
          </View>
        )}

        <Tappable
          style={[styles.botonPrincipal, iniciando && styles.botonEsperando]}
          onPress={comenzar}
          disabled={iniciando}
          accessibilityLabel={`Comenzar ${juego.titulo}`}
          accessibilityState={{ disabled: iniciando, busy: iniciando }}
        >
          {iniciando ? (
            <ActivityIndicator size="small" color={theme.colors.onPrimary} />
          ) : (
            <Ionicons name="play" size={18} color={theme.colors.onPrimary} />
          )}
          <Text style={styles.botonPrincipalTexto}>
            {iniciando ? 'Preparando la partida...' : 'Comenzar'}
          </Text>
        </Tappable>
      </Entrance>
    </ScrollView>
  );
}

const useStyles = makeThemedStyles((t) => ({
  container: {
    width: '100%',
    maxWidth: 680,
    minHeight: '100%',
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  pantallaCentro: {
    flex: 1,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  topBar: {
    width: '100%',
    minHeight: 52,
    paddingTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  back: { width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-start' },
  topTitulo: { ...t.typography.fonts.semibold, fontSize: t.fontSize(14), color: t.colors.text, flexShrink: 1 },
  topEspacio: { width: 44 },
  cargando: { marginTop: 12, fontSize: t.fontSize(13), color: t.colors.textMuted },
  estadoTitulo: {
    ...t.typography.type.title,
    color: t.colors.text,
    textAlign: 'center',
    marginTop: 18,
  },
  estadoTexto: {
    maxWidth: 440,
    marginTop: 8,
    marginBottom: 20,
    textAlign: 'center',
    fontSize: t.fontSize(13),
    lineHeight: Math.round(t.fontSize(13) * 1.55),
    color: t.colors.textMuted,
  },
  descansoIcono: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 36,
    backgroundColor: t.colors.primarySoft,
  },
  enlace: { minHeight: 44, justifyContent: 'center', marginTop: 4 },
  enlaceTexto: { ...t.typography.fonts.semibold, fontSize: t.fontSize(13), color: t.colors.primary },
  introCard: {
    padding: 20,
    borderRadius: t.shape.radiusXl,
    backgroundColor: t.colors.surface,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.border,
    ...t.shadows.card,
  },
  introHero: {
    height: 176,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: t.shape.radiusLg,
    backgroundColor: t.colors.accentSoft,
  },
  introHalo: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: t.colors.primarySoft,
  },
  pildora: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 18,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: t.shape.radiusXl,
    backgroundColor: t.colors.primarySoft,
  },
  pildoraTexto: { ...t.typography.fonts.semibold, fontSize: t.fontSize(11), color: t.colors.primary },
  introTitulo: { ...t.typography.type.title, marginTop: 10, textAlign: 'center', color: t.colors.text },
  introTexto: {
    marginTop: 7,
    textAlign: 'center',
    fontSize: t.fontSize(13),
    lineHeight: Math.round(t.fontSize(13) * 1.55),
    color: t.colors.textMuted,
  },
  instrucciones: { marginTop: 19, gap: 11 },
  instruccionFila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  numero: {
    width: 27,
    height: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: t.colors.accentSoft,
  },
  numeroTexto: { ...t.typography.fonts.bold, fontSize: t.fontSize(11), color: t.colors.accent },
  instruccionTexto: { flex: 1, fontSize: t.fontSize(12), lineHeight: Math.round(t.fontSize(12) * 1.45), color: t.colors.text },
  limiteNota: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 19,
    marginBottom: 16,
    padding: 11,
    borderRadius: t.shape.radiusMd,
    backgroundColor: t.colors.background,
  },
  limiteNotaTexto: { flex: 1, fontSize: t.fontSize(11), lineHeight: Math.round(t.fontSize(11) * 1.45), color: t.colors.textMuted },
  modoAccesible: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginBottom: 12,
    borderRadius: t.shape.radiusMd,
    backgroundColor: t.colors.primarySoft,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.primarySoftBorder,
  },
  modoAccesibleTexto: { ...t.typography.fonts.semibold, fontSize: t.fontSize(13), color: t.colors.primary },
  avisoInicio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    padding: 11,
    borderRadius: t.shape.radiusMd,
    backgroundColor: t.colors.background,
  },
  avisoInicioTexto: {
    flex: 1,
    fontSize: t.fontSize(11),
    lineHeight: Math.round(t.fontSize(11) * 1.45),
    color: t.colors.textMuted,
  },
  botonPrincipal: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 22,
    borderRadius: t.shape.radiusLg,
    backgroundColor: t.colors.primary,
  },
  botonEsperando: { opacity: 0.75 },
  botonPrincipalTexto: { ...t.typography.fonts.semibold, fontSize: t.fontSize(14), color: t.colors.onPrimary },
  juegoCard: {
    padding: 18,
    borderRadius: t.shape.radiusXl,
    backgroundColor: t.colors.surface,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.border,
    ...t.shadows.card,
  },
  resultadoCard: {
    alignItems: 'stretch',
    padding: 22,
    borderRadius: t.shape.radiusXl,
    backgroundColor: t.colors.surface,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.border,
    ...t.shadows.cardStrong,
  },
  resultadoHero: { height: 156, alignItems: 'center', justifyContent: 'center' },
  resultadoCelebracion: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  resultadoTitulo: { ...t.typography.type.title, textAlign: 'center', color: t.colors.text },
  resultadoPuntos: { ...t.typography.fonts.bold, marginTop: 5, textAlign: 'center', fontSize: t.fontSize(17), color: t.colors.primary },
  resultadoDetalle: {
    marginTop: 7,
    textAlign: 'center',
    fontSize: t.fontSize(13),
    lineHeight: Math.round(t.fontSize(13) * 1.5),
    color: t.colors.textMuted,
  },
  recompensas: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 18 },
  recompensaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: t.shape.radiusXl,
    backgroundColor: t.colors.primarySoft,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.primarySoftBorder,
  },
  recompensaTexto: { ...t.typography.fonts.semibold, fontSize: t.fontSize(12), color: t.colors.primary },
  descansoNota: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 18,
    marginBottom: 16,
    padding: 11,
    borderRadius: t.shape.radiusMd,
    backgroundColor: t.colors.background,
  },
  descansoNotaTexto: { flex: 1, fontSize: t.fontSize(11), lineHeight: Math.round(t.fontSize(11) * 1.45), color: t.colors.textMuted },
}));
