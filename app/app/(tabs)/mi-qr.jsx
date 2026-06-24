import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Modal, Animated,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { apiGetMe, apiAddFriend } from '../../services/api';

const GREEN = '#2e7d32';

export default function MiQrScreen() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [permission, requestPermission] = useCameraPermissions();
  const scaleEscanear = useRef(new Animated.Value(1)).current;
  const scaleSalir = useRef(new Animated.Value(1)).current;

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

  const handleCerrarSesion = async () => {
    await AsyncStorage.removeItem('token');
    router.replace('/login');
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={GREEN} />
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
            <QRCode value={user.qrCode} size={210} color="#222" backgroundColor="#fff" />
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

      <Animated.View style={{ width: '100%', transform: [{ scale: scaleSalir }] }}>
        <TouchableOpacity
          style={styles.btnSalir}
          onPress={handleCerrarSesion}
          onPressIn={() => Animated.spring(scaleSalir, { toValue: 0.97, useNativeDriver: true }).start()}
          onPressOut={() => Animated.spring(scaleSalir, { toValue: 1, useNativeDriver: true }).start()}
          activeOpacity={0.9}
        >
          <Text style={styles.btnSalirText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </Animated.View>

      <Modal visible={scanning} animationType="slide" onRequestClose={() => setScanning(false)}>
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

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: 24, alignItems: 'center', paddingBottom: 40 },
  titulo: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 4, marginTop: 4 },
  nombre: { fontSize: 16, color: '#666', marginBottom: 22 },
  qrBox: {
    padding: 22,
    backgroundColor: '#fff',
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 14,
  },
  hint: { fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 24, paddingHorizontal: 12 },
  errorTxt: { color: '#c62828', marginBottom: 16 },
  banner: { width: '100%', borderRadius: 10, padding: 14, marginBottom: 16 },
  bannerOk: { backgroundColor: '#e8f5e9' },
  bannerError: { backgroundColor: '#ffebee' },
  bannerText: { textAlign: 'center', fontWeight: '600', fontSize: 14 },
  bannerTextOk: { color: '#2e7d32' },
  bannerTextError: { color: '#c62828' },
  btn: {
    backgroundColor: GREEN,
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  btnSalir: {
    borderWidth: 1.5,
    borderColor: '#ccc',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    width: '100%',
  },
  btnSalirText: { color: '#888', fontSize: 15 },
  cameraContainer: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  cameraOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  scanFrame: { width: 240, height: 240, borderWidth: 3, borderColor: '#fff', borderRadius: 16, backgroundColor: 'transparent' },
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
});
