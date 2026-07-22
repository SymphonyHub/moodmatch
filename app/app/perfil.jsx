import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiGetMe, apiGetMoodHistory, apiGetMyMascotas, apiUpdateMe } from '../services/api';
import { makeThemedStyles, useTheme } from '../theme/ThemeContext';
import { useFriendsCount } from '../friends/FriendsCountContext';
import Tappable from '../components/Tappable';
import Entrance from '../components/Entrance';
import AvatarPicker from '../components/profile/AvatarPicker';
import MascotaSprite from '../mascota/MascotaSprite';
import { estadoMascota } from '../mascota/estadoMascota';
import { rachaDeDias, textoRacha, etiquetaDias } from '../features/wellness/racha';

// Tarjeta con título de sección y contenido. Misma jerarquía visual que Ajustes.
function SectionCard({ title, children, style }) {
  const styles = useStyles();
  return (
    <View style={[styles.sectionCard, style]}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      {children}
    </View>
  );
}

function RachaCard({ racha }) {
  const styles = useStyles();
  const activa = racha > 0;
  return (
    <SectionCard title="Tu racha">
      <View style={styles.rachaRow}>
        <View style={[styles.rachaNumBox, activa && styles.rachaNumBoxActiva]}>
          <Text style={[styles.rachaNum, activa && styles.rachaNumActiva]}>{racha}</Text>
          <Text style={[styles.rachaUnidad, activa && styles.rachaUnidadActiva]}>
            {etiquetaDias(racha)}
          </Text>
        </View>
        <Text style={styles.rachaTexto}>{textoRacha(racha)}</Text>
      </View>
    </SectionCard>
  );
}

function ResumenSocial({ friendsCount }) {
  const { theme } = useTheme();
  const styles = useStyles();
  const conocido = typeof friendsCount === 'number';
  const label = !conocido
    ? '—'
    : friendsCount === 1
      ? '1 amigo'
      : `${friendsCount} amigos`;

  return (
    <SectionCard title="Tu círculo">
      <Tappable
        style={styles.socialRow}
        onPress={() => router.push('/amigos')}
        accessibilityLabel="Ver mis amigos"
      >
        <View style={styles.socialIcon}>
          <Ionicons name="people" size={20} color={theme.colors.primary} />
        </View>
        <View style={styles.socialCopy}>
          <Text style={styles.socialCount}>{label}</Text>
          <Text style={styles.socialHint}>
            {conocido && friendsCount === 0
              ? 'Agrega a alguien desde Mi QR para acompañarte.'
              : 'Toca para ver tu lista de amigos.'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.textFaint} />
      </Tappable>
    </SectionCard>
  );
}

function MascotaPreview({ mascota, index }) {
  const styles = useStyles();
  const estado = estadoMascota(mascota.nivelCarino);

  // La sección de Mascota dedicada (Agente A) aún no existe en esta rama; hoy
  // la mascota vive en el chat del amigo, así que enlazamos ahí. INTEGRADOR:
  // repuntar a la ruta de detalle de Mascota (p. ej. /mascota/[amistadId])
  // cuando la Parte A aterrice.
  const abrir = () => {
    router.push({
      pathname: '/chat/[friendId]',
      params: {
        friendId: String(mascota.amigoId),
        amistadId: String(mascota.amistadId),
        nombre: mascota.amigoNombre,
      },
    });
  };

  return (
    <Entrance index={index}>
      <Tappable
        style={styles.petCard}
        onPress={abrir}
        haptic={false}
        accessibilityLabel={`${mascota.nombre}, ${estado.etiqueta}. Cuidan con ${mascota.amigoNombre}.`}
      >
        <View style={styles.petSprite}>
          <MascotaSprite etapa={estado.sprite} size={48} />
        </View>
        <View style={styles.petCopy}>
          <Text style={styles.petNombre} numberOfLines={1}>{mascota.nombre}</Text>
          <Text style={styles.petEtapa} numberOfLines={1}>{estado.etiqueta}</Text>
          <Text style={styles.petAmigo} numberOfLines={1}>Con {mascota.amigoNombre}</Text>
        </View>
      </Tappable>
    </Entrance>
  );
}

function MascotasDestacadas({ mascotas }) {
  const styles = useStyles();
  return (
    <SectionCard title="Tus mascotas">
      {mascotas.length === 0 ? (
        <Text style={styles.emptyText}>
          Cuando cuides una mascota junto a un amigo, aparecerá aquí.
        </Text>
      ) : (
        <View style={styles.petGrid}>
          {mascotas.map((m, i) => (
            <MascotaPreview key={m.amistadId} mascota={m} index={i} />
          ))}
        </View>
      )}
    </SectionCard>
  );
}

// Espacio preparado para un sistema de hitos/insignias transversal (FASE14 §10,
// fuera de alcance de esta fase). Sin lógica todavía — solo el lugar en el perfil.
function HitosPlaceholder() {
  const { theme } = useTheme();
  const styles = useStyles();
  return (
    <SectionCard title="Tus logros">
      <View style={styles.hitosRow}>
        <Ionicons name="ribbon-outline" size={22} color={theme.colors.textFaint} />
        <Text style={styles.hitosText}>Muy pronto vas a poder ver aquí tus logros.</Text>
      </View>
    </SectionCard>
  );
}

export default function PerfilScreen() {
  const { theme } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { friendsCount, refreshIfStale } = useFriendsCount();

  const [profile, setProfile] = useState(null);
  const [racha, setRacha] = useState(0);
  const [mascotas, setMascotas] = useState([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      refreshIfStale();

      apiGetMe()
        .then((data) => {
          if (active && data.user) setProfile(data.user);
        })
        .catch(() => {});

      // La racha se calcula igual que en Inicio/Historial (misma zona horaria del
      // dispositivo) para que el número siempre coincida con lo que ve el usuario
      // en su historial, y se persiste como caché en User.racha.
      apiGetMoodHistory()
        .then((data) => {
          if (!active) return;
          const dias = rachaDeDias(data.entries);
          setRacha(dias);
          apiUpdateMe({ racha: dias }).catch(() => {});
        })
        .catch(() => {});

      apiGetMyMascotas()
        .then((data) => {
          if (active && Array.isArray(data.mascotas)) setMascotas(data.mascotas);
        })
        .catch(() => {});

      return () => {
        active = false;
      };
    }, [refreshIfStale]),
  );

  return (
    <View style={styles.pantalla}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Tappable style={styles.btnVolver} onPress={() => router.back()} haptic={false}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.onHeader} />
        </Tappable>
        <Text style={styles.headerTitulo}>Mi perfil</Text>
        <View style={styles.btnVolver} />
      </View>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <SectionCard>
          <AvatarPicker
            avatarUrl={profile?.avatarUrl}
            nombre={profile?.nombre}
            onChange={(avatarUrl) => setProfile((current) => ({ ...current, avatarUrl }))}
          />
        </SectionCard>

        <RachaCard racha={racha} />
        <ResumenSocial friendsCount={friendsCount} />
        <MascotasDestacadas mascotas={mascotas} />
        <HitosPlaceholder />
      </ScrollView>
    </View>
  );
}

const useStyles = makeThemedStyles((t) => ({
  pantalla: { flex: 1, backgroundColor: t.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.headerBackground,
    paddingBottom: 12,
    paddingHorizontal: 8,
  },
  btnVolver: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitulo: {
    flex: 1,
    textAlign: 'center',
    ...t.typography.type.section,
    color: t.colors.onHeader,
  },
  container: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    padding: 20,
    paddingBottom: 40,
  },
  sectionCard: {
    backgroundColor: t.colors.surface,
    borderRadius: t.shape.radiusLg,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.border,
    padding: 16,
    marginBottom: 20,
    ...t.shadows.card,
  },
  sectionTitle: { ...t.typography.type.section, color: t.colors.text, marginBottom: 14 },

  rachaRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  rachaNumBox: {
    minWidth: 74,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: t.shape.radiusMd,
    backgroundColor: t.colors.background,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.border,
    alignItems: 'center',
  },
  rachaNumBoxActiva: {
    backgroundColor: t.colors.primarySoft,
    borderColor: t.colors.primarySoftBorder,
  },
  rachaNum: {
    ...t.typography.fonts.bold,
    fontSize: t.fontSize(30),
    color: t.colors.textMuted,
    lineHeight: t.fontSize(34),
  },
  rachaNumActiva: { color: t.colors.primary },
  rachaUnidad: { ...t.typography.type.caption, color: t.colors.textMuted },
  rachaUnidadActiva: { color: t.colors.primary },
  rachaTexto: { flex: 1, ...t.typography.type.body, color: t.colors.text },

  socialRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  socialIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: t.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialCopy: { flex: 1, minWidth: 0 },
  socialCount: { ...t.typography.type.body, ...t.typography.fonts.semibold, color: t.colors.text },
  socialHint: { ...t.typography.type.caption, color: t.colors.textMuted, marginTop: 2 },

  petGrid: { gap: 10 },
  petCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: t.colors.background,
    borderRadius: t.shape.radiusMd,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.border,
    padding: 12,
  },
  petSprite: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: t.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  petCopy: { flex: 1, minWidth: 0 },
  petNombre: { ...t.typography.type.body, ...t.typography.fonts.semibold, color: t.colors.text },
  petEtapa: { ...t.typography.type.caption, color: t.colors.primary, marginTop: 1 },
  petAmigo: { ...t.typography.type.caption, color: t.colors.textMuted, marginTop: 1 },

  emptyText: { ...t.typography.type.body, color: t.colors.textMuted },

  hitosRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hitosText: { flex: 1, ...t.typography.type.body, color: t.colors.textMuted },
}));
