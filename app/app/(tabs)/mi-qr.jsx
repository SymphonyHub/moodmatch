import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, Modal, Animated,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { apiGetMe, apiAddFriend } from '../../services/api';
import { useTheme, makeThemedStyles } from '../../theme/ThemeContext';

export default function MiQrScreen() {
  const { theme } = useTheme();
  const styles = useStyles();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [permission, requestPermission] = useCameraPermissions();
  const scaleEscanear = useRef(new Animated.Value(1)).current;

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

      <Animated.View style={{ width: '100%', transform: [{ scale: scaleEscanear }] }}>
        <TouchableOpacity
          style={styles.btn}
          onPress={abrirCamara}
          onPressIn={() => Animated.spring(scaleEscanear, { toValue: 0.97, useNativeDriver: true }).start()}
          onPressOut={() => Animated.spring(scaleEscanear, { toValue: 1, useNativeDriver: true }).start()}
          activeOpacity={0.9}
        >
          <Text style={styles.btnText}>📷  Escanear QR de un amigo</Text>
        </TouchableOpacity>
      </Animated.View>

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
    fontSize: t.fontSize(22),
    ...t.typography.fonts.bold,
    color: t.colors.text,
    marginBottom: 4,
    marginTop: 4,
  },
  nombre: {
    fontSize: t.fontSize(16),
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
