import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, Modal, Share,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Ionicons from '@expo/vector-icons/Ionicons';
import { apiGetMe, apiAddFriend } from '../../services/api';
import { useFriendsCount } from '../../friends/FriendsCountContext';
import { buildInviteMessage } from '../../utils/invite';
import { API_URL } from '../../config';
import { useTheme, makeThemedStyles } from '../../theme/ThemeContext';
import Tappable from '../../components/Tappable';

export default function MiQrScreen() {
  const { theme } = useTheme();
  const styles = useStyles();
  const { refresh } = useFriendsCount();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    apiGetMe()
      .then((data) => { if (data.user) setUser(data.user); })
      .finally(() => setLoading(false));
  }, []);

  const abrirCamara = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert('Permiso requerido', 'La app necesita acceso a la cámara para escanear el QR de tus amigos.');
        return;
      }
    }
    setScanned(false);
    setMensaje(null);
    setScanning(true);
  };

  const handleScan = async ({ data }) => {
    if (scanned) return;
    setScanned(true);
    setScanning(false);
    try {
      const result = await apiAddFriend(data);
      if (result.error) {
        setMensaje({ tipo: 'error', texto: result.error });
      } else {
        // Contrato de FriendsCountContext: forzar el conteo tras agregar,
        // para que el desbloqueo de "Con amigos" no espere al TTL.
        refresh({ force: true });
        setMensaje({ tipo: 'ok', texto: `¡${result.friend.nombre} agregado! 🎉 Revisa la pestaña Amigos.` });
      }
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error al agregar amigo. Intenta de nuevo.' });
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.titulo}>Mi código QR</Text>

      {user ? (
        <>
          <Text style={styles.nombre}>{user.nombre}</Text>
          <View style={styles.qrBox}>
            {/* El QR se mantiene oscuro sobre blanco en todos los temas: los lectores
                necesitan ese contraste, y el recuadro blanco hace de zona de silencio. */}
            <QRCode value={user.qrCode} size={210} color="#1a1a1a" backgroundColor="#ffffff" />
          </View>
          <Text style={styles.hint}>
            Muéstrale este código a tus amigos para que te agreguen
          </Text>
        </>
      ) : (
        <Text style={styles.errorTxt}>No se pudo cargar tu perfil</Text>
      )}

      {mensaje && (
        <View style={[styles.banner, mensaje.tipo === 'ok' ? styles.bannerOk : styles.bannerError]}>
          <Text style={[styles.bannerText, mensaje.tipo === 'ok' ? styles.bannerTextOk : styles.bannerTextError]}>
            {mensaje.texto}
          </Text>
        </View>
      )}

      <Tappable wrapperStyle={{ width: '100%' }} style={styles.btn} onPress={abrirCamara}>
        <Text style={styles.btnText}>📷  Escanear QR de un amigo</Text>
      </Tappable>

      {user && (
        <Tappable
          wrapperStyle={{ width: '100%' }}
          style={styles.btnInvitar}
          onPress={async () => {
            try {
              await Share.share({ message: buildInviteMessage(user.nombre, API_URL, user.qrCode) });
            } catch {
              // el usuario cerró el share sheet: no es un error
            }
          }}
        >
          <Ionicons name="share-social-outline" size={18} color={theme.colors.primary} />
          <Text style={styles.btnInvitarText}>Invitar por link</Text>
        </Tappable>
      )}

      <Modal visible={scanning} animationType="slide" onRequestClose={() => setScanning(false)}>
        {/* La UI de la cámara va sobre video en vivo: colores fijos, independientes del tema. */}
        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={handleScan}
          />
          <View style={styles.cameraOverlay}>
            <View style={styles.scanFrame} />
            <Text style={styles.scanLabel}>Apunta al QR de tu amigo</Text>
          </View>
          <TouchableOpacity style={styles.btnCancelar} onPress={() => setScanning(false)}>
            <Text style={styles.btnCancelarText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
  );
}

const useStyles = makeThemedStyles((t) => ({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: 24, alignItems: 'center', paddingBottom: 40 },
  titulo: {
    ...t.typography.type.title,
    color: t.colors.text,
    marginBottom: 4,
    marginTop: 4,
  },
  nombre: {
    ...t.typography.type.body,
    color: t.colors.textMuted,
    marginBottom: 22,
  },
  qrBox: {
    padding: 22,
    backgroundColor: '#ffffff',
    borderRadius: t.shape.radiusXl,
    ...t.shadows.cardStrong,
    marginBottom: 14,
  },
  hint: {
    fontSize: t.fontSize(13),
    color: t.colors.textFaint,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  errorTxt: { color: t.colors.danger, marginBottom: 16 },
  banner: {
    width: '100%',
    borderRadius: t.shape.radiusMd,
    padding: 14,
    marginBottom: 16,
  },
  bannerOk: { backgroundColor: t.colors.primarySoft },
  bannerError: { backgroundColor: t.colors.dangerSoft },
  bannerText: {
    textAlign: 'center',
    ...t.typography.fonts.semibold,
    fontSize: t.fontSize(14),
  },
  bannerTextOk: { color: t.colors.primary },
  bannerTextError: { color: t.colors.danger },
  btn: {
    backgroundColor: t.colors.primary,
    borderRadius: t.shape.radiusMd,
    paddingVertical: 15,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  btnText: {
    color: t.colors.onPrimary,
    fontSize: t.fontSize(16),
    ...t.typography.fonts.bold,
  },
  btnInvitar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: t.colors.primarySoft,
    borderRadius: t.shape.radiusMd,
    borderWidth: t.shape.borderThin,
    borderColor: t.colors.primarySoftBorder,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: '100%',
    marginBottom: 12,
  },
  btnInvitarText: {
    color: t.colors.primary,
    fontSize: t.fontSize(15),
    ...t.typography.fonts.semibold,
  },
  cameraContainer: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  cameraOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 240,
    height: 240,
    borderWidth: 3,
    borderColor: '#fff',
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  scanLabel: { color: '#fff', fontSize: 15, marginTop: 18, fontWeight: '600' },
  btnCancelar: {
    position: 'absolute',
    bottom: 48,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 40,
  },
  btnCancelarText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
}));
