import {
  cloudinaryUploadUrl,
  isCloudinaryConfigured,
  uploadAvatar,
} from '../services/avatarUpload';

describe('subida de avatar a Cloudinary', () => {
  test('construye el endpoint de imagen para el cloud configurado', () => {
    expect(cloudinaryUploadUrl('demo')).toBe(
      'https://api.cloudinary.com/v1_1/demo/image/upload',
    );
    expect(isCloudinaryConfigured('demo', 'avatars')).toBe(true);
    expect(isCloudinaryConfigured('', 'avatars')).toBe(false);
  });

  test('devuelve exclusivamente la URL HTTPS entregada por Cloudinary', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ secure_url: 'https://res.cloudinary.com/demo/image/upload/avatar.jpg' }),
    });

    await expect(
      uploadAvatar(
        { uri: 'file:///avatar.jpg', mimeType: 'image/jpeg', fileName: 'avatar.jpg' },
        { cloudName: 'demo', uploadPreset: 'avatars', fetchImpl },
      ),
    ).resolves.toBe('https://res.cloudinary.com/demo/image/upload/avatar.jpg');

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.cloudinary.com/v1_1/demo/image/upload',
      expect.objectContaining({ method: 'POST', body: expect.any(FormData) }),
    );
  });

  test('propaga el mensaje de error del servicio', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: { message: 'Preset inválido' } }),
    });

    await expect(
      uploadAvatar(
        { uri: 'file:///avatar.jpg' },
        { cloudName: 'demo', uploadPreset: 'avatars', fetchImpl },
      ),
    ).rejects.toThrow('Preset inválido');
  });
});
