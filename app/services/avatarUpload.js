const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export const cloudinaryUploadUrl = (cloudName = CLOUD_NAME) =>
  `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

export function isCloudinaryConfigured(cloudName = CLOUD_NAME, uploadPreset = UPLOAD_PRESET) {
  return Boolean(cloudName && uploadPreset);
}

export async function uploadAvatar(
  asset,
  { cloudName = CLOUD_NAME, uploadPreset = UPLOAD_PRESET, fetchImpl = fetch } = {},
) {
  if (!isCloudinaryConfigured(cloudName, uploadPreset)) {
    throw new Error('Falta configurar Cloudinary para subir la imagen.');
  }
  if (!asset?.uri) throw new Error('No se pudo leer la imagen seleccionada.');

  const body = new FormData();
  body.append('upload_preset', uploadPreset);
  body.append(
    'file',
    asset.file ?? {
      uri: asset.uri,
      type: asset.mimeType ?? 'image/jpeg',
      name: asset.fileName ?? `avatar-${Date.now()}.jpg`,
    },
  );

  const response = await fetchImpl(cloudinaryUploadUrl(cloudName), { method: 'POST', body });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || typeof data.secure_url !== 'string') {
    throw new Error(data.error?.message ?? 'No se pudo subir la imagen.');
  }

  return data.secure_url;
}
