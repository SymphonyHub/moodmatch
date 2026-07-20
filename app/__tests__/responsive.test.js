import {
  chatBubbleMaxWidth,
  isCompactWidth,
  qrSizeForWidth,
  scanSizeForViewport,
} from '../utils/responsive';

describe('layout responsivo', () => {
  test('activa variantes compactas en 320 px, no en tablet', () => {
    expect(isCompactWidth(320)).toBe(true);
    expect(isCompactWidth(768)).toBe(false);
  });

  test('limita las burbujas a una línea legible en 320 y 768 px', () => {
    expect(chatBubbleMaxWidth(320, 0.84)).toBeCloseTo(268.8);
    expect(chatBubbleMaxWidth(768, 0.84)).toBe(520);
  });

  test('mantiene QR y marco de cámara dentro de ambos viewports', () => {
    expect(qrSizeForWidth(320)).toBe(210);
    expect(qrSizeForWidth(768)).toBe(210);
    expect(scanSizeForViewport(320, 568)).toBe(240);
    expect(scanSizeForViewport(768, 1024)).toBe(240);
  });

  test('reduce el QR en pantallas más estrechas sin desbordar su padding', () => {
    expect(qrSizeForWidth(280)).toBe(188);
  });
});
