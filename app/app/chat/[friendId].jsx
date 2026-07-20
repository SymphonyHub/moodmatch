import { useCallback, useRef, useState } from 'react';
import {
  View, Text, FlatList, ScrollView, ActivityIndicator, TextInput, useWindowDimensions,
} from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiGetMessages, apiSendMessage, apiSetMessageReaction } from '../../services/api';
import { CHEERS } from '../../constants/cheers';
import { MOOD_INFO } from '../../constants/moods';
import { useTheme, makeThemedStyles } from '../../theme/ThemeContext';
import Tappable from '../../components/Tappable';
import ChatInputBar from '../../components/chat/ChatInputBar';
import MascotaWidget from '../../mascota/MascotaWidget';
import {
  actualizarReacciones, crearOptimista, confirmar, marcarFallido, prepararReintento, reconciliar,
} from '../../friends/mensajesChat';
import { clasificar, crearRespuesta, estaRespondida } from '../../friends/invitacionSalida';
import { chatBubbleMaxWidth } from '../../utils/responsive';
import { buscarEnMensajes, moverResultado } from '../../friends/busquedaChat';

const POLL_MS = 8000;
const MAX_LENGTH = 500;
const EMOJIS_REACCION = ['❤️', '👍', '😂', '😮', '😢'];

const formatHora = (iso) => {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

function Burbuja({
  mensaje,
  texto,
  esInvitacion,
  mostrarBotones,
  onReintentar,
  onResponder,
  onAbrirReacciones,
  onReaccion,
  seleccionando,
  reaccionando,
  destacada,
}) {
  const { theme } = useTheme();
  const styles = useStyles();
  const { width } = useWindowDimensions();
  const bubbleMaxWidth = chatBubbleMaxWidth(width, 0.78);
  // Un mensaje fallido pierde el fondo primario: pasa a superficie con borde
  // de peligro, y toda la burbuja es tocable para reintentar (el texto solo
  // vive acá — ChatInputBar ya limpió su input al enviar).
  const cuerpo = (
    <View
      style={[
        styles.burbuja,
        mensaje.mine ? styles.burbujaMia : styles.burbujaAjena,
        mensaje.failed && styles.burbujaFallida,
        destacada && styles.burbujaDestacada,
      ]}
    >
      {esInvitacion && (
        <View style={styles.invEtiqueta}>
          <Ionicons
            name="calendar-outline"
            size={13}
            color={mensaje.mine && !mensaje.failed ? theme.colors.onPrimary : theme.colors.primary}
          />
          <Text style={[styles.invEtiquetaTxt, mensaje.mine && !mensaje.failed && styles.invEtiquetaTxtMia]}>
            Invitación de salida
          </Text>
        </View>
      )}
      <Text style={mensaje.mine && !mensaje.failed ? styles.textoMio : styles.textoAjeno}>
        {texto}
      </Text>
      {mostrarBotones && (
        <View style={styles.invBotones}>
          <Tappable
            wrapperStyle={styles.invBtnWrapper}
            style={[styles.invBtn, styles.invBtnAceptar]}
            onPress={() => onResponder(true)}
          >
            <Text style={styles.invBtnAceptarTxt}>Aceptar</Text>
          </Tappable>
          <Tappable
            wrapperStyle={styles.invBtnWrapper}
            style={[styles.invBtn, styles.invBtnRechazar]}
            onPress={() => onResponder(false)}
            haptic={false}
          >
            <Text style={styles.invBtnRechazarTxt}>Rechazar</Text>
          </Tappable>
        </View>
      )}
      {mensaje.failed ? (
        <Text style={styles.fallo}>No se envió — toca para reintentar</Text>
      ) : (
        <Text style={[styles.hora, mensaje.mine ? styles.horaMia : styles.horaAjena]}>
          {mensaje.pending ? 'enviando…' : formatHora(mensaje.createdAt)}
        </Text>
      )}
    </View>
  );
  return (
    <View style={[styles.burbujaFila, mensaje.mine ? styles.filaMia : styles.filaAjena]}>
      <View
        style={[
          styles.burbujaGrupo,
          mensaje.mine ? styles.grupoMio : styles.grupoAjeno,
          { maxWidth: bubbleMaxWidth },
        ]}
      >
        {mensaje.failed ? (
          <Tappable
            style={styles.burbujaMax}
            onPress={() => onReintentar(mensaje)}
            accessibilityLabel="Reintentar envío del mensaje"
          >
            {cuerpo}
          </Tappable>
        ) : cuerpo}
        {!mensaje.pending && !mensaje.failed && (
          <View style={[styles.reacciones, mensaje.mine ? styles.reaccionesMias : styles.reaccionesAjenas]}>
            {(mensaje.reacciones ?? []).map((reaccion) => (
              <Tappable
                key={reaccion.emoji}
                style={[styles.reaccionChip, reaccion.mine && styles.reaccionChipMia]}
                onPress={() => onReaccion(mensaje, reaccion.mine ? null : reaccion.emoji)}
                disabled={reaccionando}
                haptic={false}
                accessibilityLabel={`${reaccion.emoji}, ${reaccion.count} reacciones`}
              >
                <Text style={styles.reaccionTexto}>{reaccion.emoji} {reaccion.count}</Text>
              </Tappable>
            ))}
            <Tappable
              style={styles.reaccionAgregar}
              onPress={() => onAbrirReacciones(mensaje.id)}
              disabled={reaccionando}
              haptic={false}
              accessibilityLabel="Agregar reacción"
            >
              <Ionicons name="happy-outline" size={16} color={theme.colors.textMuted} />
              <Ionicons name="add" size={10} color={theme.colors.textMuted} />
            </Tappable>
          </View>
        )}
        {seleccionando && (
          <View style={styles.selectorReacciones}>
            {EMOJIS_REACCION.map((emoji) => (
              <Tappable
                key={emoji}
                style={styles.selectorEmoji}
                onPress={() => onReaccion(mensaje, emoji)}
                disabled={reaccionando}
                accessibilityLabel={`Reaccionar con ${emoji}`}
              >
                <Text style={styles.selectorEmojiTexto}>{emoji}</Text>
              </Tappable>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const {
    friendId, amistadId, nombre, mood, draft,
  } = useLocalSearchParams();
  const { theme } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();

  const [mensajes, setMensajes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mascotaRefresh, setMascotaRefresh] = useState(0);
  const [buscando, setBuscando] = useState(false);
  const [consulta, setConsulta] = useState('');
  const [resultadoActivo, setResultadoActivo] = useState(0);
  const [selectorReaccion, setSelectorReaccion] = useState(null);
  const [reaccionando, setReaccionando] = useState(null);
  const listRef = useRef(null);
  const mutacionesReaccionRef = useRef(new Map());

  const moodInfo = mood ? MOOD_INFO[mood] : null;
  const coincidencias = buscarEnMensajes(mensajes, consulta);
  const posicionActiva = coincidencias.length > 0
    ? Math.min(resultadoActivo, coincidencias.length - 1)
    : 0;
  const indiceDestacado = coincidencias[posicionActiva];

  const desplazarA = (index) => {
    if (index === undefined) return;
    listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
  };

  const cambiarConsulta = (texto) => {
    setConsulta(texto);
    setResultadoActivo(0);
    const resultados = buscarEnMensajes(mensajes, texto);
    if (resultados.length > 0) setTimeout(() => desplazarA(resultados[0]), 0);
  };

  const moverEntreResultados = (delta) => {
    if (coincidencias.length === 0) return;
    const siguiente = moverResultado(coincidencias.length, posicionActiva, delta);
    setResultadoActivo(siguiente);
    desplazarA(coincidencias[siguiente]);
  };

  const cargar = useCallback(async () => {
    const inicioCarga = Date.now();
    try {
      const data = await apiGetMessages(friendId);
      if (data.mensajes) {
        // La verdad del servidor sin pisar los locales en vuelo o fallidos
        setMensajes((prev) => reconciliar(
          data.mensajes,
          prev,
          mutacionesReaccionRef.current,
          inicioCarga,
        ));
      }
    } catch {
      // el próximo poll reintenta
    } finally {
      setLoading(false);
    }
  }, [friendId]);

  // Carga al enfocar + polling mientras la pantalla está enfocada.
  // Callback síncrono con cleanup: ver nota en amigos.jsx sobre useFocusEffect.
  useFocusEffect(
    useCallback(() => {
      cargar();
      const timer = setInterval(cargar, POLL_MS);
      return () => clearInterval(timer);
    }, [cargar]),
  );

  const transmitir = async (temp) => {
    try {
      const data = await apiSendMessage(friendId, temp.message);
      if (!data.mensaje) throw new Error(data.error || 'No se pudo enviar');
      setMensajes((prev) => confirmar(prev, temp.id, data.mensaje));
      setMascotaRefresh((valor) => valor + 1);
    } catch {
      setMensajes((prev) => marcarFallido(prev, temp.id));
    }
  };

  const enviar = (textoAEnviar) => {
    const message = textoAEnviar.trim();
    if (!message) return;
    const temp = crearOptimista(message);
    setMensajes((prev) => [...prev, temp]);
    transmitir(temp);
  };

  const reintentar = (mensaje) => {
    if (!mensaje.failed) return;
    setMensajes((prev) => prepararReintento(prev, mensaje.id));
    transmitir(mensaje);
  };

  const reaccionar = async (mensaje, emoji) => {
    if (mensaje.pending || mensaje.failed || reaccionando !== null) return;
    setReaccionando(mensaje.id);
    try {
      const data = await apiSetMessageReaction(friendId, mensaje.id, emoji);
      mutacionesReaccionRef.current.set(mensaje.id, Date.now());
      setMensajes((prev) => actualizarReacciones(prev, mensaje.id, data.mensaje.reacciones));
      setSelectorReaccion(null);
    } catch {
      // Se conserva la reacción anterior; el usuario puede reintentar.
    } finally {
      setReaccionando(null);
    }
  };

  // Responder una invitación de salida = enviar un mensaje marcado (aceptar/
  // rechazar) por el flujo optimista normal. Al aparecer, estaRespondida pasa a
  // true y los botones desaparecen.
  const responder = (acepta) => enviar(crearRespuesta(acepta));

  const renderItem = ({ item, index }) => {
    const { tipo, texto } = clasificar(item.message);
    const esInvitacion = tipo === 'invitacion';
    return (
      <Burbuja
        mensaje={item}
        texto={texto}
        esInvitacion={esInvitacion}
        mostrarBotones={esInvitacion && !item.mine && !item.pending && !estaRespondida(mensajes, item)}
        onReintentar={reintentar}
        onResponder={responder}
        onAbrirReacciones={(id) => setSelectorReaccion((actual) => (actual === id ? null : id))}
        onReaccion={reaccionar}
        seleccionando={selectorReaccion === item.id}
        reaccionando={reaccionando === item.id}
        destacada={indiceDestacado === index}
      />
    );
  };

  return (
    <View style={[styles.pantalla, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Tappable style={styles.btnVolver} onPress={() => router.back()} haptic={false}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.onHeader} />
        </Tappable>
        <View style={styles.headerInfo}>
          <Text style={styles.headerNombre} numberOfLines={1}>{nombre ?? 'Chat'}</Text>
          {moodInfo && (
            <Text style={styles.headerMood}>{moodInfo.emoji}  {moodInfo.label}</Text>
          )}
        </View>
        <Tappable
          style={styles.btnBuscar}
          onPress={() => {
            setBuscando((valor) => !valor);
            setConsulta('');
            setResultadoActivo(0);
          }}
          haptic={false}
          accessibilityLabel={buscando ? 'Cerrar búsqueda' : 'Buscar en la conversación'}
        >
          <Ionicons name={buscando ? 'close' : 'search'} size={22} color={theme.colors.onHeader} />
        </Tappable>
      </View>

      {buscando && (
        <View style={styles.busquedaBarra}>
          <Ionicons name="search" size={18} color={theme.colors.textMuted} />
          <TextInput
            style={styles.busquedaInput}
            value={consulta}
            onChangeText={cambiarConsulta}
            placeholder="Buscar mensajes"
            placeholderTextColor={theme.colors.textFaint}
            autoFocus
            returnKeyType="search"
            accessibilityLabel="Buscar mensajes"
          />
          <Text style={styles.busquedaConteo}>
            {consulta.trim() ? `${coincidencias.length ? posicionActiva + 1 : 0}/${coincidencias.length}` : ''}
          </Text>
          <Tappable
            style={styles.busquedaNavegar}
            onPress={() => moverEntreResultados(-1)}
            disabled={coincidencias.length === 0}
            haptic={false}
            accessibilityLabel="Coincidencia anterior"
          >
            <Ionicons name="chevron-up" size={19} color={theme.colors.textMuted} />
          </Tappable>
          <Tappable
            style={styles.busquedaNavegar}
            onPress={() => moverEntreResultados(1)}
            disabled={coincidencias.length === 0}
            haptic={false}
            accessibilityLabel="Coincidencia siguiente"
          >
            <Ionicons name="chevron-down" size={19} color={theme.colors.textMuted} />
          </Tappable>
        </View>
      )}

      <MascotaWidget amistadId={amistadId} refreshKey={mascotaRefresh} />

      {loading ? (
        <View style={styles.centro}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={mensajes}
          keyExtractor={(m) => String(m.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.lista}
          onContentSizeChange={() => {
            if (!buscando) listRef.current?.scrollToEnd({ animated: true });
          }}
          onScrollToIndexFailed={({ index, averageItemLength }) => {
            listRef.current?.scrollToOffset({ offset: averageItemLength * index, animated: true });
            setTimeout(() => desplazarA(index), 100);
          }}
          ListEmptyComponent={(
            <View style={styles.vacio}>
              <Text style={styles.vacioEmoji}>💬</Text>
              <Text style={styles.vacioTxt}>
                Todavía no hay mensajes.{'\n'}Escribe algo o envía un ánimo rápido.
              </Text>
            </View>
          )}
        />
      )}

      <ChatInputBar
        onSend={enviar}
        placeholder="Escribe un mensaje…"
        maxLength={MAX_LENGTH}
        bottomOffset={0}
        initialText={typeof draft === 'string' ? draft : ''}
        accessory={(
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
            keyboardShouldPersistTaps="handled"
          >
            {CHEERS.map((msg) => (
              <Tappable key={msg} style={styles.chip} onPress={() => enviar(msg)}>
                <Text style={styles.chipTxt}>{msg}</Text>
              </Tappable>
            ))}
          </ScrollView>
        )}
      />
    </View>
  );
}

const useStyles = makeThemedStyles((t) => ({
  pantalla: { flex: 1, backgroundColor: t.colors.background },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.headerBackground,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  btnVolver: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  btnBuscar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerInfo: { flex: 1, marginLeft: 4 },
  headerNombre: {
    ...t.typography.type.section,
    color: t.colors.onHeader,
  },
  headerMood: {
    fontSize: t.fontSize(12),
    color: t.colors.onHeader,
    opacity: 0.8,
    marginTop: 2,
  },
  busquedaBarra: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: t.colors.surface,
    borderBottomWidth: t.shape.borderThin,
    borderBottomColor: t.colors.border,
  },
  busquedaInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 7,
    fontSize: t.fontSize(14),
    color: t.colors.text,
  },
  busquedaConteo: { minWidth: 36, fontSize: t.fontSize(11), color: t.colors.textMuted },
  busquedaNavegar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  lista: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    padding: 16,
    paddingBottom: 8,
    flexGrow: 1,
  },
  burbujaFila: { flexDirection: 'row', marginBottom: 8 },
  filaMia: { justifyContent: 'flex-end' },
  filaAjena: { justifyContent: 'flex-start' },
  burbujaGrupo: {},
  grupoMio: { alignItems: 'flex-end' },
  grupoAjeno: { alignItems: 'flex-start' },
  burbujaMax: { maxWidth: '100%' },
  burbuja: {
    maxWidth: '100%',
    borderRadius: t.shape.radiusLg,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  burbujaMia: {
    backgroundColor: t.colors.primary,
    borderBottomRightRadius: t.shape.radiusSm ?? 6,
  },
  burbujaAjena: {
    backgroundColor: t.colors.surface,
    borderBottomLeftRadius: t.shape.radiusSm ?? 6,
    ...t.shadows.card,
  },
  burbujaFallida: {
    backgroundColor: t.colors.surface,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.danger,
    maxWidth: '100%',
  },
  burbujaDestacada: {
    borderWidth: 2,
    borderColor: t.colors.accent,
  },
  textoMio: {
    fontSize: t.fontSize(15),
    color: t.colors.onPrimary,
    lineHeight: Math.round(t.fontSize(15) * 1.4),
  },
  textoAjeno: {
    fontSize: t.fontSize(15),
    color: t.colors.text,
    lineHeight: Math.round(t.fontSize(15) * 1.4),
  },
  hora: { fontSize: t.fontSize(10), marginTop: 4, alignSelf: 'flex-end' },
  horaMia: { color: t.colors.onPrimary, opacity: 0.7 },
  horaAjena: { color: t.colors.textFaint },
  fallo: {
    fontSize: t.fontSize(11),
    color: t.colors.danger,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  reacciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4, alignItems: 'center' },
  reaccionesMias: { justifyContent: 'flex-end' },
  reaccionesAjenas: { justifyContent: 'flex-start' },
  reaccionChip: {
    borderRadius: t.shape.radiusMd,
    paddingHorizontal: 7,
    paddingVertical: 3,
    backgroundColor: t.colors.surface,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.border,
  },
  reaccionChipMia: { borderColor: t.colors.primary, backgroundColor: t.colors.primarySoft },
  reaccionTexto: { fontSize: t.fontSize(12), color: t.colors.text },
  reaccionAgregar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: t.shape.radiusMd,
  },
  selectorReacciones: {
    flexDirection: 'row',
    marginTop: 5,
    padding: 4,
    gap: 2,
    borderRadius: t.shape.radiusLg,
    backgroundColor: t.colors.surface,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.border,
    ...t.shadows.card,
  },
  selectorEmoji: { paddingHorizontal: 6, paddingVertical: 4 },
  selectorEmojiTexto: { fontSize: t.fontSize(19) },
  invEtiqueta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 5,
  },
  invEtiquetaTxt: {
    fontSize: t.fontSize(11),
    ...t.typography.fonts.semibold,
    color: t.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  invEtiquetaTxtMia: { color: t.colors.onPrimary, opacity: 0.9 },
  invBotones: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  invBtnWrapper: { flex: 1 },
  invBtn: {
    minHeight: 44,
    borderRadius: t.shape.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invBtnAceptar: { backgroundColor: t.colors.primary },
  invBtnAceptarTxt: {
    color: t.colors.onPrimary,
    fontSize: t.fontSize(13),
    ...t.typography.fonts.semibold,
  },
  invBtnRechazar: {
    backgroundColor: t.colors.background,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.border,
  },
  invBtnRechazarTxt: {
    color: t.colors.textMuted,
    fontSize: t.fontSize(13),
    ...t.typography.fonts.medium,
  },
  vacio: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  vacioEmoji: { fontSize: 44, marginBottom: 12 },
  vacioTxt: {
    fontSize: t.fontSize(14),
    color: t.colors.textMuted,
    textAlign: 'center',
    lineHeight: Math.round(t.fontSize(14) * 1.6),
  },
  chips: { paddingBottom: 10, gap: 8 },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: t.colors.primarySoft,
    borderRadius: t.shape.radiusMd,
    paddingHorizontal: 12,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.primarySoftBorder,
  },
  chipTxt: {
    fontSize: t.fontSize(13),
    ...t.typography.fonts.medium,
    color: t.colors.primary,
  },
}));
