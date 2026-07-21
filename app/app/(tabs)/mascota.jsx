import { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  apiGetSeccionMascota,
  apiInvitarMascota,
  apiAceptarInvitacionMascota,
  apiRechazarInvitacionMascota,
} from '../../services/api';
import { useTheme, makeThemedStyles } from '../../theme/ThemeContext';
import Tappable from '../../components/Tappable';
import Entrance from '../../components/Entrance';
import Avatar from '../../components/profile/Avatar';
import MascotaSprite from '../../mascota/MascotaSprite';
import { estadoMascota } from '../../mascota/estadoMascota';
import { clasificarSeccion } from '../../mascota/seccionMascota';

function abrirDetalle(amistadId) {
  router.push({ pathname: '/mascota/[amistadId]', params: { amistadId: String(amistadId) } });
}

// Tarjeta de una mascota activa: sprite miniatura, nombre, etapa y aviso suave
// si lleva mucho sin cuidados. El toque abre el detalle.
function MascotaCard({ mascota, index }) {
  const { theme } = useTheme();
  const styles = useStyles();
  const sprite = estadoMascota(mascota.nivelCarino).sprite;

  return (
    <Entrance index={index}>
      <Tappable style={styles.card} onPress={() => abrirDetalle(mascota.amistadId)} haptic={false}>
        <View style={styles.spriteMini}><MascotaSprite etapa={sprite} size={46} /></View>
        <View style={styles.info}>
          <Text style={styles.nombre} numberOfLines={1}>{mascota.nombre}</Text>
          <Text style={styles.etapa}>
            {mascota.etapa?.nombre ?? 'Cachorro'} · con {mascota.amigo?.nombre ?? 'tu amistad'}
          </Text>
        </View>
        {mascota.necesitaAtencion ? (
          <View style={styles.atencion}>
            <Ionicons name="heart-dislike-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.atencionTxt}>Los extraña</Text>
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textFaint} />
        )}
      </Tappable>
    </Entrance>
  );
}

function InvitacionRecibida({ invitacion, onResponder, ocupado }) {
  const styles = useStyles();
  return (
    <View style={styles.inviteCard}>
      <Avatar avatarUrl={invitacion.avatarUrl} nombre={invitacion.nombre} size={40} style={styles.avatar} />
      <View style={styles.info}>
        <Text style={styles.nombre} numberOfLines={1}>{invitacion.nombre}</Text>
        <Text style={styles.etapa}>Te invita a cuidar una mascota juntos</Text>
      </View>
      <View style={styles.inviteAcciones}>
        <Tappable
          style={styles.btnAceptar}
          onPress={() => onResponder(invitacion.amistadId, 'aceptar')}
          disabled={ocupado}
          accessibilityLabel={`Aceptar la invitación de ${invitacion.nombre}`}
        >
          <Text style={styles.btnAceptarTxt}>Aceptar</Text>
        </Tappable>
        <Tappable
          style={styles.btnRechazar}
          onPress={() => onResponder(invitacion.amistadId, 'rechazar')}
          disabled={ocupado}
          haptic={false}
          accessibilityLabel={`Rechazar la invitación de ${invitacion.nombre}`}
        >
          <Text style={styles.btnRechazarTxt}>Ahora no</Text>
        </Tappable>
      </View>
    </View>
  );
}

function InvitacionEnviada({ invitacion }) {
  const { theme } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.inviteCard}>
      <Avatar avatarUrl={invitacion.avatarUrl} nombre={invitacion.nombre} size={40} style={styles.avatar} />
      <View style={styles.info}>
        <Text style={styles.nombre} numberOfLines={1}>{invitacion.nombre}</Text>
        <Text style={styles.etapa}>Esperando su respuesta</Text>
      </View>
      <Ionicons name="hourglass-outline" size={18} color={theme.colors.textFaint} />
    </View>
  );
}

function AmigoElegible({ amigo, onInvitar, ocupado }) {
  const styles = useStyles();
  return (
    <View style={styles.inviteCard}>
      <Avatar avatarUrl={amigo.avatarUrl} nombre={amigo.nombre} size={40} style={styles.avatar} />
      <View style={styles.info}>
        <Text style={styles.nombre} numberOfLines={1}>{amigo.nombre}</Text>
        <Text style={styles.etapa}>Aún no tienen una mascota</Text>
      </View>
      <Tappable
        style={styles.btnInvitar}
        onPress={() => onInvitar(amigo.amistadId)}
        disabled={ocupado}
        accessibilityLabel={`Invitar a ${amigo.nombre} a cuidar una mascota`}
      >
        <Text style={styles.btnInvitarTxt}>Invitar</Text>
      </Tappable>
    </View>
  );
}

function Seccion({ titulo, children }) {
  const styles = useStyles();
  return (
    <View style={styles.seccion}>
      <Text style={styles.seccionTitulo}>{titulo}</Text>
      {children}
    </View>
  );
}

export default function MascotaScreen() {
  const { theme } = useTheme();
  const styles = useStyles();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState('');

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await apiGetSeccionMascota();
      if (!res || res.error) throw new Error(res?.error || 'Sin datos');
      setData(res);
      const seccion = clasificarSeccion(res);
      if (seccion.modo === 'detalle-directo') {
        router.replace({ pathname: '/mascota/[amistadId]', params: { amistadId: String(seccion.amistadId) } });
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const invitar = async (amistadId) => {
    setOcupado(true);
    setAviso('');
    try {
      const res = await apiInvitarMascota(amistadId);
      if (res?.error) throw new Error(res.error);
      setAviso('Invitación enviada. Te avisaremos cuando respondan.');
      await cargar();
    } catch (e) {
      setAviso(e.message || 'No se pudo enviar la invitación.');
    } finally {
      setOcupado(false);
    }
  };

  const responder = async (amistadId, accion) => {
    setOcupado(true);
    setAviso('');
    try {
      const res = accion === 'aceptar'
        ? await apiAceptarInvitacionMascota(amistadId)
        : await apiRechazarInvitacionMascota(amistadId);
      if (res?.error) throw new Error(res.error);
      if (accion === 'aceptar') {
        abrirDetalle(amistadId);
        return;
      }
      await cargar();
    } catch (e) {
      setAviso(e.message || 'No se pudo completar la acción.');
    } finally {
      setOcupado(false);
    }
  };

  const seccion = data ? clasificarSeccion(data) : null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.titulo}>Mascota</Text>
      <Text style={styles.subtitulo}>
        Una criatura que cuidan entre dos, a su propio ritmo.
      </Text>

      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={styles.spinner} />
      ) : error ? (
        <Tappable style={styles.reintentar} onPress={cargar} haptic={false}>
          <Text style={styles.reintentarTxt}>No se pudo cargar. Toca para reintentar.</Text>
        </Tappable>
      ) : seccion?.modo === 'detalle-directo' ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={styles.spinner} />
      ) : seccion?.modo === 'sin-amigos' ? (
        <Entrance style={styles.vacioCont}>
          <Text style={styles.vacioEmoji}>🐾</Text>
          <Text style={styles.vacioTxt}>Todavía no hay ninguna mascota</Text>
          <Text style={styles.vacioHint}>
            Las mascotas se cuidan de a dos. Agrega a un amigo y luego invítalo a
            cuidar una mascota juntos.
          </Text>
          <Tappable style={styles.btnIrQr} onPress={() => router.push('/(tabs)/mi-qr')}>
            <Ionicons name="qr-code-outline" size={18} color={theme.colors.onPrimary} />
            <Text style={styles.btnIrQrTxt}>Ir a Mi QR</Text>
          </Tappable>
        </Entrance>
      ) : seccion ? (
        <>
          {!!aviso && <Text style={styles.aviso}>{aviso}</Text>}

          {seccion.recibidas.length > 0 && (
            <Seccion titulo="Invitaciones">
              {seccion.recibidas.map((inv) => (
                <InvitacionRecibida
                  key={inv.amistadId}
                  invitacion={inv}
                  onResponder={responder}
                  ocupado={ocupado}
                />
              ))}
            </Seccion>
          )}

          {seccion.mascotas.length > 0 && (
            <Seccion titulo="Sus mascotas">
              {seccion.mascotas.map((m, i) => (
                <MascotaCard key={m.amistadId} mascota={m} index={i} />
              ))}
            </Seccion>
          )}

          {seccion.enviadas.length > 0 && (
            <Seccion titulo="Invitaciones enviadas">
              {seccion.enviadas.map((inv) => (
                <InvitacionEnviada key={inv.amistadId} invitacion={inv} />
              ))}
            </Seccion>
          )}

          {seccion.amigosElegibles.length > 0 && (
            <Seccion titulo="Invita a tu mascota">
              {seccion.amigosElegibles.map((amigo) => (
                <AmigoElegible
                  key={amigo.amistadId}
                  amigo={amigo}
                  onInvitar={invitar}
                  ocupado={ocupado}
                />
              ))}
            </Seccion>
          )}
        </>
      ) : null}
    </ScrollView>
  );
}

const useStyles = makeThemedStyles((t) => ({
  container: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    padding: 20,
    paddingBottom: 40,
  },
  titulo: { ...t.typography.type.title, color: t.colors.text, marginBottom: 4, marginTop: 4 },
  subtitulo: { ...t.typography.type.caption, color: t.colors.textMuted, marginBottom: 20 },
  spinner: { marginTop: 40 },
  reintentar: { marginTop: 32, alignItems: 'center', padding: 16 },
  reintentarTxt: { color: t.colors.textMuted, fontSize: t.fontSize(14), textAlign: 'center' },
  aviso: {
    color: t.colors.textMuted,
    fontSize: t.fontSize(13),
    marginBottom: 14,
    backgroundColor: t.colors.primarySoft,
    borderRadius: t.shape.radiusMd,
    padding: 10,
  },
  seccion: { marginBottom: 22 },
  seccionTitulo: {
    ...t.typography.fonts.semibold,
    fontSize: t.fontSize(13),
    color: t.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.surface,
    borderRadius: t.shape.radiusLg,
    padding: 14,
    marginBottom: 12,
    ...t.shadows.card,
  },
  inviteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.surface,
    borderRadius: t.shape.radiusLg,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.primarySoftBorder,
    padding: 14,
    marginBottom: 12,
  },
  spriteMini: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.accentSoft,
    marginRight: 14,
  },
  avatar: { marginRight: 14 },
  info: { flex: 1, minWidth: 0 },
  nombre: { fontSize: t.fontSize(16), ...t.typography.fonts.semibold, color: t.colors.text, marginBottom: 3 },
  etapa: { fontSize: t.fontSize(13), color: t.colors.textMuted },
  atencion: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  atencionTxt: { fontSize: t.fontSize(12), color: t.colors.primary, ...t.typography.fonts.semibold },
  inviteAcciones: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnAceptar: {
    minHeight: 40,
    justifyContent: 'center',
    backgroundColor: t.colors.primary,
    borderRadius: t.shape.radiusMd,
    paddingHorizontal: 14,
  },
  btnAceptarTxt: { color: t.colors.onPrimary, fontSize: t.fontSize(13), ...t.typography.fonts.semibold },
  btnRechazar: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 6 },
  btnRechazarTxt: { color: t.colors.textMuted, fontSize: t.fontSize(13) },
  btnInvitar: {
    minHeight: 40,
    justifyContent: 'center',
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.primary,
    borderRadius: t.shape.radiusMd,
    paddingHorizontal: 16,
  },
  btnInvitarTxt: { color: t.colors.primary, fontSize: t.fontSize(13), ...t.typography.fonts.semibold },
  vacioCont: { alignItems: 'center', marginTop: 28, paddingHorizontal: 20 },
  vacioEmoji: { fontSize: 46, marginBottom: 12 },
  vacioTxt: {
    fontSize: t.fontSize(16),
    ...t.typography.fonts.semibold,
    color: t.colors.textMuted,
    textAlign: 'center',
    marginBottom: 8,
  },
  vacioHint: {
    fontSize: t.fontSize(13),
    color: t.colors.textFaint,
    textAlign: 'center',
    lineHeight: Math.round(t.fontSize(13) * 1.55),
    marginBottom: 20,
  },
  btnIrQr: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: t.colors.primary,
    borderRadius: t.shape.radiusMd,
    minHeight: 44,
    paddingHorizontal: 24,
  },
  btnIrQrTxt: { color: t.colors.onPrimary, fontSize: t.fontSize(15), ...t.typography.fonts.semibold },
}));
