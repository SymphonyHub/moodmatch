import { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, makeThemedStyles } from '../../theme/ThemeContext';

const DURACION_BIENVENIDA_MS = 2600;

export default function BienvenidaScreen() {
  const { theme } = useTheme();
  const styles = useStyles();
  const halo = useRef(new Animated.Value(0.72)).current;
  const icono = useRef(new Animated.Value(0)).current;
  const contenido = useRef(new Animated.Value(0)).current;
  const termino = useRef(false);

  const continuar = () => {
    if (termino.current) return;
    termino.current = true;
    router.replace('/onboarding/cuestionario');
  };

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(icono, { toValue: 1, duration: 380, useNativeDriver: true }),
        Animated.timing(halo, { toValue: 1, duration: 380, useNativeDriver: true }),
      ]),
      Animated.timing(contenido, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(halo, { toValue: 1.08, duration: 320, useNativeDriver: true }),
        Animated.timing(halo, { toValue: 1, duration: 320, useNativeDriver: true }),
      ]),
    ]).start();

    const timer = setTimeout(continuar, DURACION_BIENVENIDA_MS);
    return () => {
      clearTimeout(timer);
      icono.stopAnimation();
      halo.stopAnimation();
      contenido.stopAnimation();
    };
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <Pressable
        style={styles.screen}
        onPress={continuar}
        accessibilityRole="button"
        accessibilityLabel="Continuar al cuestionario"
        accessibilityHint="Puedes saltar esta bienvenida"
      >
        <StatusBar style={theme.statusBar.onBackground} />
        <View style={styles.orbeSuperior} />
        <View style={styles.orbeInferior} />

        <View style={styles.centro}>
          <Animated.View style={[styles.halo, { transform: [{ scale: halo }] }]}>
            <Animated.View style={[styles.icono, { opacity: icono }]}>
              <Ionicons name="sparkles" size={42} color={theme.colors.onPrimary} />
            </Animated.View>
          </Animated.View>

          <Animated.View
            style={[
              styles.textos,
              {
                opacity: contenido,
                transform: [
                  {
                    translateY: contenido.interpolate({
                      inputRange: [0, 1],
                      outputRange: [18, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.marca}>MoodMatch</Text>
            <Text style={styles.titulo}>Este espacio empieza contigo</Text>
            <Text style={styles.descripcion}>
              Cuéntanos un poco sobre tus gustos para acompañarte mejor.
            </Text>
          </Animated.View>
        </View>

        <Text style={styles.saltar}>Toca para continuar</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const useStyles = makeThemedStyles((t) => ({
  safeArea: { flex: 1, backgroundColor: t.colors.background },
  screen: {
    flex: 1,
    backgroundColor: t.colors.background,
    paddingHorizontal: 28,
    paddingVertical: 36,
    overflow: 'hidden',
  },
  orbeSuperior: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: t.colors.primarySoft,
    top: -90,
    right: -90,
  },
  orbeInferior: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: t.colors.accentSoft,
    bottom: -70,
    left: -70,
  },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  halo: {
    width: 116,
    height: 116,
    borderRadius: 58,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.primarySoft,
    borderWidth: t.shape.borderMedium,
    borderColor: t.colors.primarySoftBorder,
    marginBottom: 34,
  },
  icono: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.primary,
    ...t.shadows.cardStrong,
  },
  textos: { alignItems: 'center', maxWidth: 340 },
  marca: {
    ...t.typography.fonts.bold,
    color: t.colors.accent,
    fontSize: t.fontSize(13),
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  titulo: {
    ...t.typography.type.display,
    color: t.colors.text,
    fontSize: t.fontSize(30),
    lineHeight: Math.round(t.fontSize(30) * 1.18),
    textAlign: 'center',
    marginBottom: 14,
  },
  descripcion: {
    ...t.typography.type.body,
    color: t.colors.textMuted,
    textAlign: 'center',
  },
  saltar: {
    ...t.typography.type.caption,
    color: t.colors.textFaint,
    textAlign: 'center',
  },
}));
