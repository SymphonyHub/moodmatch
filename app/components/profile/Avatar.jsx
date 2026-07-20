import { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

export default function Avatar({ avatarUrl, nombre, size = 48, style }) {
  const { theme } = useTheme();
  const [imageFailed, setImageFailed] = useState(false);
  const initial = nombre?.trim()?.charAt(0)?.toUpperCase() || '?';

  useEffect(() => setImageFailed(false), [avatarUrl]);

  const frame = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: theme.colors.primarySoft,
    borderColor: theme.colors.primarySoftBorder,
    borderWidth: theme.shape.borderThin,
  };

  if (avatarUrl && !imageFailed) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={[frame, style]}
        resizeMode="cover"
        onError={() => setImageFailed(true)}
        accessibilityLabel={`Foto de perfil de ${nombre || 'usuario'}`}
      />
    );
  }

  return (
    <View
      style={[frame, { alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityLabel={`${nombre || 'Usuario'} sin foto de perfil`}
    >
      <Text
        style={{
          color: theme.colors.primary,
          fontFamily: theme.typography.fonts.bold.fontFamily,
          fontSize: theme.fontSize(Math.round(size * 0.4)),
        }}
      >
        {initial}
      </Text>
    </View>
  );
}
