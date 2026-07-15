import AsyncStorage from '@react-native-async-storage/async-storage';

// Si alguien abre un link de invitación sin sesión, el código se guarda acá
// y el login lo retoma apenas la sesión existe.
const KEY = 'pendingInviteCode';

export const setPendingInvite = (code) => AsyncStorage.setItem(KEY, code);
export const getPendingInvite = () => AsyncStorage.getItem(KEY);
export const clearPendingInvite = () => AsyncStorage.removeItem(KEY);
