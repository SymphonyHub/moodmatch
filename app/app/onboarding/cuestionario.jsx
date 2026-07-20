import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiGetMe, apiUpdateMe } from '../../services/api';
import { getPendingInvite, clearPendingInvite } from '../../utils/pendingInvite';
import { useTheme, makeThemedStyles } from '../../theme/ThemeContext';
import Tappable from '../../components/Tappable';
import {
  PREGUNTAS_PERSONALIDAD,
  crearPerfilPersonalidad,
} from '../../features/onboarding/perfilPersonalidad';

async function irAlDestinoFinal() {
  const pendingCode = await getPendingInvite().catch(() => null);
  if (pendingCode) {
    await clearPendingInvite().catch(() => {});
    router.replace({ pathname: '/add-friend', params: { code: pendingCode } });
  } else {
    router.replace('/(tabs)/home');
  }
}

export default function CuestionarioScreen() {
  const { theme } = useTheme();
  const styles = useStyles();
  const [indice, setIndice] = useState(0);
  const [respuestas, setRespuestas] = useState({});
  const [verificando, setVerificando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const pregunta = PREGUNTAS_PERSONALIDAD[indice];
  const seleccion = respuestas[pregunta.id];
  const esUltima = indice === PREGUNTAS_PERSONALIDAD.length - 1;

  useEffect(() => {
    let activo = true;
    apiGetMe()
      .then((data) => {
        if (!activo) return;
        if (data.user?.perfilPersonalidad) {
          irAlDestinoFinal();
          return;
        }
        setVerificando(false);
      })
      .catch(() => {
        if (activo) setVerificando(false);
      });
    return () => {
      activo = false;
    };
  }, []);

  const elegir = (valor) => {
    setError('');
    setRespuestas((actuales) => ({ ...actuales, [pregunta.id]: valor }));
  };

  const continuar = async () => {
    if (!seleccion || guardando) return;
    if (!esUltima) {
      setIndice((actual) => actual + 1);
      return;
    }

    setGuardando(true);
    setError('');
    try {
      const perfilPersonalidad = crearPerfilPersonalidad(respuestas);
      const data = await apiUpdateMe({ perfilPersonalidad });
      if (data.error || !data.user?.perfilPersonalidad) {
        setError(data.error || 'No pudimos guardar tus respuestas. Intenta de nuevo.');
        return;
      }
      await irAlDestinoFinal();
    } catch {
      setError('No pudimos guardar tus respuestas. Revisa tu conexión e intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  if (verificando) {
    return (
      <View style={styles.cargando}>
        <StatusBar style={theme.statusBar.onBackground} />
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const progreso = `${indice + 1} de ${PREGUNTAS_PERSONALIDAD.length}`;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <StatusBar style={theme.statusBar.onBackground} />
      <View style={styles.header}>
        <View>
          <Text style={styles.paso}>Tu perfil · {progreso}</Text>
          <Text style={styles.encabezado}>Conocerte mejor</Text>
        </View>
        <View style={styles.contador}>
          <Text style={styles.contadorTexto}>{indice + 1}</Text>
        </View>
      </View>

      <View style={styles.progresoBase}>
        <View
          style={[
            styles.progresoActivo,
            { width: `${((indice + 1) / PREGUNTAS_PERSONALIDAD.length) * 100}%` },
          ]}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.contenido}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.preguntaCard}>
          <Text style={styles.pregunta}>{pregunta.titulo}</Text>
          <Text style={styles.ayuda}>Elige la opción que más se parezca a ti.</Text>
        </View>

        <View style={styles.opciones}>
          {pregunta.opciones.map((opcion) => {
            const activa = seleccion === opcion.valor;
            return (
              <TouchableOpacity
                key={opcion.valor}
                style={[styles.opcion, activa && styles.opcionActiva]}
                onPress={() => elegir(opcion.valor)}
                activeOpacity={0.84}
                accessibilityRole="radio"
                accessibilityState={{ checked: activa }}
              >
                <View style={[styles.opcionIcono, activa && styles.opcionIconoActivo]}>
                  <Ionicons
                    name={opcion.icono}
                    size={22}
                    color={activa ? theme.colors.onPrimary : theme.colors.primary}
                  />
                </View>
                <Text style={[styles.opcionTexto, activa && styles.opcionTextoActivo]}>
                  {opcion.etiqueta}
                </Text>
                <Ionicons
                  name={activa ? 'checkmark-circle' : 'ellipse-outline'}
                  size={23}
                  color={activa ? theme.colors.primary : theme.colors.border}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {!!error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      <View style={styles.acciones}>
        {indice > 0 && (
          <TouchableOpacity
            style={styles.atras}
            onPress={() => { setError(''); setIndice((actual) => actual - 1); }}
            disabled={guardando}
            accessibilityLabel="Pregunta anterior"
          >
            <Ionicons name="arrow-back" size={21} color={theme.colors.textMuted} />
          </TouchableOpacity>
        )}
        <Tappable
          wrapperStyle={styles.botonWrapper}
          style={[styles.boton, (!seleccion || guardando) && styles.botonDeshabilitado]}
          onPress={continuar}
          disabled={!seleccion || guardando}
        >
          {guardando ? (
            <ActivityIndicator color={theme.colors.onPrimary} />
          ) : (
            <>
              <Text style={styles.botonTexto}>{esUltima ? 'Guardar mi perfil' : 'Continuar'}</Text>
              <Ionicons name="arrow-forward" size={20} color={theme.colors.onPrimary} />
            </>
          )}
        </Tappable>
      </View>
    </SafeAreaView>
  );
}

const useStyles = makeThemedStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
  cargando: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    marginBottom: 22,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
  },
  paso: {
    ...t.typography.fonts.bold,
    color: t.colors.accent,
    fontSize: t.fontSize(12),
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  encabezado: { ...t.typography.type.title, color: t.colors.text },
  contador: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.primarySoft,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.primarySoftBorder,
  },
  contadorTexto: {
    ...t.typography.fonts.bold,
    color: t.colors.primary,
    fontSize: t.fontSize(16),
  },
  progresoBase: {
    height: 5,
    width: '90%',
    maxWidth: 632,
    alignSelf: 'center',
    borderRadius: 3,
    backgroundColor: t.colors.border,
    overflow: 'hidden',
  },
  progresoActivo: { height: '100%', borderRadius: 3, backgroundColor: t.colors.primary },
  contenido: {
    padding: 24,
    paddingBottom: 18,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
  },
  preguntaCard: { marginBottom: 26 },
  pregunta: {
    ...t.typography.type.display,
    color: t.colors.text,
    fontSize: t.fontSize(27),
    lineHeight: Math.round(t.fontSize(27) * 1.22),
    marginBottom: 10,
  },
  ayuda: { ...t.typography.type.body, color: t.colors.textMuted },
  opciones: { gap: 12 },
  opcion: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: t.colors.surface,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    borderRadius: t.shape.radiusLg,
    borderWidth: t.shape.borderMedium,
    borderColor: t.colors.border,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  opcionActiva: {
    backgroundColor: t.colors.primarySoft,
    borderColor: t.colors.primary,
  },
  opcionIcono: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.primarySoft,
  },
  opcionIconoActivo: { backgroundColor: t.colors.primary },
  opcionTexto: {
    flex: 1,
    ...t.typography.fonts.semibold,
    color: t.colors.text,
    fontSize: t.fontSize(15),
  },
  opcionTextoActivo: { color: t.colors.primary },
  error: {
    ...t.typography.type.caption,
    color: t.colors.danger,
    textAlign: 'center',
    marginTop: 16,
  },
  acciones: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 28,
    borderTopWidth: t.shape.borderThin,
    borderTopColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  atras: {
    width: 52,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: t.shape.radiusMd,
    borderWidth: t.shape.borderMedium,
    borderColor: t.colors.border,
  },
  botonWrapper: { flex: 1 },
  boton: {
    minHeight: 52,
    flexDirection: 'row',
    gap: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: t.shape.radiusMd,
    backgroundColor: t.colors.primary,
  },
  botonDeshabilitado: { backgroundColor: t.colors.primaryDisabled },
  botonTexto: {
    ...t.typography.fonts.bold,
    color: t.colors.onPrimary,
    fontSize: t.fontSize(15),
  },
}));
