import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

export function colorAnilloRacha(racha, theme) {
  if (racha >= 7) return theme.colors.accent;
  return theme.colors.primary;
}

export default function Avatar({ avatarUrl, nombre, size = 48, style, racha = 0 }) {
  const { theme } = useTheme();
  const [imageFailed, setImageFailed] = useState(false);
  const initial = nombre?.trim()?.charAt(0)?.toUpperCase() || '?';

  useEffect(() => setImageFailed(false), [avatarUrl]);

  const ringWidth = racha > 0 ? Math.max(theme.shape.borderMedium, 2) : 0;
  const contentSize = size - ringWidth * 2;
  const frame = {
    width: contentSize,
    height: contentSize,
    borderRadius: contentSize / 2,
    backgroundColor: theme.colors.primarySoft,
    borderColor: theme.colors.primarySoftBorder,
    borderWidth: theme.shape.borderThin,
  };

  const contenido = avatarUrl && !imageFailed ? (
    <Image
      source={{ uri: avatarUrl }}
      style={frame}
      resizeMode="cover"
      onError={() => setImageFailed(true)}
      accessibilityLabel={`Foto de perfil de ${nombre || 'usuario'}`}
    />
  ) : (
    <View
      style={[frame, { alignItems: 'center', justifyContent: 'center' }]}
      accessibilityLabel={`${nombre || 'Usuario'} sin foto de perfil`}
    >
      <Text
        style={{
          color: theme.colors.primary,
          fontFamily: theme.typography.fonts.bold.fontFamily,
          fontSize: theme.fontSize(Math.round(contentSize * 0.4)),
        }}
      >
        {initial}
      </Text>
    </View>
  );

  if (racha <= 0) return <View style={style}>{contenido}</View>;

  return (
    <View
      style={[
        styles.anillo,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: ringWidth,
          borderColor: colorAnilloRacha(racha, theme),
        },
        style,
      ]}
      accessibilityLabel={`${nombre || 'Usuario'}, racha activa de ${racha} días`}
    >
      {contenido}
    </View>
  );
}

const styles = StyleSheet.create({
  anillo: { alignItems: 'center', justifyContent: 'center' },
});
