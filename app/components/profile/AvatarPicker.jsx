import { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { apiUpdateMe } from '../../services/api';
import { uploadAvatar } from '../../services/avatarUpload';
import { makeThemedStyles, useTheme } from '../../theme/ThemeContext';
import Tappable from '../Tappable';
import Avatar from './Avatar';

const PICKER_OPTIONS = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.8,
};

export default function AvatarPicker({ avatarUrl, nombre, onChange }) {
  const { theme } = useTheme();
  const styles = useStyles();
  const [uploading, setUploading] = useState(false);

  const saveResult = async (result) => {
    if (result.canceled || !result.assets?.[0]) return;

    setUploading(true);
    try {
      const url = await uploadAvatar(result.assets[0]);
      const data = await apiUpdateMe({ avatarUrl: url });
      if (data.user?.avatarUrl !== url) throw new Error(data.error ?? 'No se pudo guardar la foto.');
      onChange?.(url);
    } catch (error) {
      Alert.alert('No pudimos actualizar tu foto', error.message);
    } finally {
      setUploading(false);
    }
  };

  // Android puede recrear MainActivity mientras el picker está abierto. Expo
  // conserva ese resultado para que la subida continúe al reconstruir la vista.
  useEffect(() => {
    ImagePicker.getPendingResultAsync()
      .then((result) => {
        if (result?.assets?.[0]) saveResult(result);
      })
      .catch(() => {});
  }, []);

  const chooseFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
      await saveResult(result);
    } catch (error) {
      Alert.alert('No pudimos abrir tu galería', error.message);
    }
  };

  const takePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permiso de cámara', 'Habilita la cámara para tomar tu foto de perfil.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        ...PICKER_OPTIONS,
        cameraType: ImagePicker.CameraType.front,
      });
      await saveResult(result);
    } catch (error) {
      Alert.alert('No pudimos abrir la cámara', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Avatar avatarUrl={avatarUrl} nombre={nombre} size={76} />
      <View style={styles.actions}>
        <Text style={styles.name}>{nombre || 'Tu perfil'}</Text>
        <Text style={styles.hint}>{uploading ? 'Subiendo imagen…' : 'Elige una foto cuadrada y clara.'}</Text>
        <View style={styles.buttons}>
          <Tappable
            style={[styles.button, uploading && styles.buttonDisabled]}
            onPress={chooseFromGallery}
            disabled={uploading}
            accessibilityLabel="Elegir foto de la galería"
          >
            <Ionicons name="images-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.buttonText}>Galería</Text>
          </Tappable>
          <Tappable
            style={[styles.button, uploading && styles.buttonDisabled]}
            onPress={takePhoto}
            disabled={uploading}
            accessibilityLabel="Tomar foto con la cámara"
          >
            <Ionicons name="camera-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.buttonText}>Cámara</Text>
          </Tappable>
        </View>
      </View>
    </View>
  );
}

const useStyles = makeThemedStyles((t) => ({
  container: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  actions: { flex: 1 },
  name: { ...t.typography.type.body, ...t.typography.fonts.semibold, color: t.colors.text },
  hint: { ...t.typography.type.caption, color: t.colors.textMuted, marginTop: 2, marginBottom: 9 },
  buttons: { flexDirection: 'row', gap: 8 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.primarySoftBorder,
    borderRadius: t.shape.radiusMd,
    paddingVertical: 9,
    paddingHorizontal: 11,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { ...t.typography.type.caption, ...t.typography.fonts.semibold, color: t.colors.primary },
}));
