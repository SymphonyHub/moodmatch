import { useEffect } from 'react';
import { View, Text } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme, makeThemedStyles } from '../../theme/ThemeContext';
import Tappable from '../../components/Tappable';
import { MINIJUEGOS, estadoCooldownTarjeta } from './logica';

const ICONO_POR_TIPO = {
  ATRAPALA: 'paw',
  RITMO_CARINO: 'heart',
};

export default function SeccionMinijuegos({ mascota, onActualizar }) {
  const { theme } = useTheme();
  const styles = useStyles();
  const cooldowns = mascota?.minijuegos;

  useEffect(() => {
    if (!cooldowns || !onActualizar) return undefined;
    const fechas = MINIJUEGOS
      .map(({ tipo }) => cooldowns[tipo])
      .filter((estado) => estado?.puedeJugar === false)
      .map((estado) => new Date(estado.disponibleEn).getTime())
      .filter((fecha) => Number.isFinite(fecha) && fecha > Date.now());
    if (fechas.length === 0) return undefined;

    const timer = setTimeout(onActualizar, Math.min(...fechas) - Date.now() + 1000);
    return () => clearTimeout(timer);
  }, [cooldowns, onActualizar]);

  // Hasta que el adaptador de A exponga el contrato completo, no mostramos
  // accesos que terminarian en un endpoint inexistente.
  if (!cooldowns) return null;

  const abrir = (slug) => router.push({
    pathname: '/mascota/minijuego',
    params: { amistadId: String(mascota.amistadId), tipo: slug },
  });

  return (
    <View style={styles.bloque}>
      <View style={styles.encabezado}>
        <View style={styles.tituloFila}>
          <Ionicons name="sparkles" size={17} color={theme.colors.accent} />
          <Text style={styles.titulo}>Momentos de juego</Text>
        </View>
        {Number.isFinite(mascota.monedas) && (
          <View style={styles.saldo}>
            <Ionicons name="leaf" size={13} color={theme.colors.primary} />
            <Text style={styles.saldoTexto}>{`${mascota.monedas} semillitas`}</Text>
          </View>
        )}
      </View>

      <Text style={styles.intro}>
        Una partida breve por juego; después cada uno toma una pausa de 24 horas.
      </Text>

      <View style={styles.lista}>
        {MINIJUEGOS.map((juego) => {
          const estado = estadoCooldownTarjeta(cooldowns[juego.tipo]);
          const habilitado = estado?.habilitado === true;
          return (
            <Tappable
              key={juego.tipo}
              style={[styles.tarjeta, !habilitado && styles.tarjetaDescanso]}
              onPress={() => abrir(juego.slug)}
              disabled={!habilitado}
              haptic={false}
              accessibilityLabel={`${juego.titulo}. ${estado?.etiqueta ?? 'No disponible'}`}
              accessibilityState={{ disabled: !habilitado }}
            >
              <View style={styles.icono}>
                <Ionicons
                  name={ICONO_POR_TIPO[juego.tipo]}
                  size={20}
                  color={habilitado ? theme.colors.primary : theme.colors.textFaint}
                />
              </View>
              <View style={styles.tarjetaTexto}>
                <Text style={styles.nombre}>{juego.titulo}</Text>
                <Text style={styles.estado}>{estado?.etiqueta ?? 'Preparándose'}</Text>
              </View>
              <Ionicons
                name={habilitado ? 'chevron-forward' : 'checkmark-circle-outline'}
                size={19}
                color={habilitado ? theme.colors.primary : theme.colors.textFaint}
              />
            </Tappable>
          );
        })}
      </View>
    </View>
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
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  tituloFila: { flexDirection: 'row', alignItems: 'center', gap: 7, flexShrink: 1 },
  titulo: { ...t.typography.fonts.semibold, fontSize: t.fontSize(15), color: t.colors.text },
  saldo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: t.shape.radiusXl,
    backgroundColor: t.colors.primarySoft,
  },
  saldoTexto: { ...t.typography.fonts.semibold, fontSize: t.fontSize(11), color: t.colors.primary },
  intro: {
    marginTop: 8,
    fontSize: t.fontSize(13),
    lineHeight: Math.round(t.fontSize(13) * 1.5),
    color: t.colors.textMuted,
  },
  lista: { marginTop: 13, gap: 9 },
  tarjeta: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: t.shape.radiusMd,
    backgroundColor: t.colors.primarySoft,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.primarySoftBorder,
  },
  tarjetaDescanso: { backgroundColor: t.colors.background, borderColor: t.colors.border },
  icono: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: t.colors.surface,
  },
  tarjetaTexto: { flex: 1, minWidth: 0 },
  nombre: { ...t.typography.fonts.semibold, fontSize: t.fontSize(14), color: t.colors.text },
  estado: { marginTop: 2, fontSize: t.fontSize(11), color: t.colors.textMuted },
}));
