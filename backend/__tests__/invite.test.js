jest.mock('../lib/prisma', () => ({
  user: { findUnique: jest.fn() },
}));

const request = require('supertest');
const express = require('express');
const inviteRouter = require('../routes/invite');
const prisma = require('../lib/prisma');

const app = express();
app.use('/invite', inviteRouter);

beforeEach(() => jest.clearAllMocks());

describe('GET /invite/:code', () => {
  test('200 con nombre del usuario y deep link a la app', async () => {
    prisma.user.findUnique.mockResolvedValue({ nombre: 'Ana' });

    const res = await request(app).get('/invite/abc-123');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
    expect(res.text).toContain('Ana te invita a MoodMatch');
    expect(res.text).toContain('moodmatch://add-friend?code=abc-123');
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { qrCode: 'abc-123' },
      select: { nombre: true },
    });
  });

  test('escapa HTML en el nombre del usuario', async () => {
    prisma.user.findUnique.mockResolvedValue({ nombre: '<script>alert(1)</script>' });

    const res = await request(app).get('/invite/abc-123');

    expect(res.status).toBe(200);
    expect(res.text).not.toContain('<script>alert(1)</script>');
    expect(res.text).toContain('&lt;script&gt;');
  });

  test('404 amigable con código inexistente', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app).get('/invite/no-existe');

    expect(res.status).toBe(404);
    expect(res.text).toContain('no es válido');
  });
});
