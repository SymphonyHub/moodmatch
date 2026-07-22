import { View, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme, makeThemedStyles } from '../theme/ThemeContext';
import Tappable from '../components/Tappable';
import { mensajeRacha, tituloRacha, estadoRegalo } from './interaccionesSociales';

// Contenido social de la pantalla de detalle de la mascota (Fase 14). Se monta
// en el slot que deja la estructura de la pantalla, sin reescribir el resto:
// racha compartida (constancia conjunta, no competitiva) y regalo entre amigos.
export default function InteraccionesSociales({ mascota, onRegalar, regalando = false }) {
  const { theme } = useTheme();
  const styles = useStyles();

  const racha = mascota?.racha;
  const regalo = estadoRegalo(mascota?.regalo);

  return (
    <>
      {/* Racha compartida */}
      <View style={styles.bloque}>
        <Text style={styles.bloqueTitulo}>{tituloRacha(racha)}</Text>
        <Text style={styles.bloqueTexto}>{mensajeRacha(racha)}</Text>
      </View>

      {/* Regalo entre amigos */}
      {regalo && (
        <View style={styles.bloque}>
          <Text style={styles.bloqueTitulo}>Un regalo para su mascota</Text>
          <Text style={styles.bloqueTexto}>{regalo.detalle}</Text>
          {regalo.habilitado ? (
            <Tappable
              style={styles.botonRegalo}
              onPress={onRegalar}
              disabled={regalando}
              accessibilityLabel="Enviar un regalo de cariño"
            >
              <Ionicons name="gift" size={17} color={theme.colors.primary} />
              <Text style={styles.botonRegaloTxt}>
                {regalando ? 'Enviando…' : regalo.etiqueta}
              </Text>
            </Tappable>
          ) : (
            <View style={styles.regaloHecho}>
              <Ionicons name="checkmark-circle" size={16} color={theme.colors.textFaint} />
              <Text style={styles.regaloHechoTxt}>{regalo.etiqueta}</Text>
            </View>
          )}
        </View>
      )}
    </>
  );
}

const useStyles = makeThemedStyles((t) => ({
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
  botonRegalo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 46,
    marginTop: 12,
    backgroundColor: t.colors.primarySoft,
    borderRadius: t.shape.radiusMd,
  },
  botonRegaloTxt: { color: t.colors.primary, fontSize: t.fontSize(14), ...t.typography.fonts.semibold },
  regaloHecho: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  regaloHechoTxt: { color: t.colors.textFaint, fontSize: t.fontSize(13) },
}));
