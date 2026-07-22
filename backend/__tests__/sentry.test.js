const { opcionesSentry, iniciarSentry } = require('../lib/sentry');

const DSN_FALSO = 'https://abc123@o1.ingest.us.sentry.io/2';

describe('opcionesSentry — configuración del reporte de errores', () => {
  test('sin SENTRY_DSN no hay configuración: Sentry queda inerte', () => {
    expect(opcionesSentry({})).toBeNull();
    expect(opcionesSentry({ SENTRY_DSN: '' })).toBeNull();
  });

  test('iniciarSentry sin DSN no inicializa y avisa devolviendo false', () => {
    expect(iniciarSentry({})).toBe(false);
  });

  test('con SENTRY_DSN toma el DSN del entorno tal cual', () => {
    expect(opcionesSentry({ SENTRY_DSN: DSN_FALSO }).dsn).toBe(DSN_FALSO);
  });

  test('el environment sale de NODE_ENV, con development por defecto', () => {
    expect(opcionesSentry({ SENTRY_DSN: DSN_FALSO, NODE_ENV: 'production' }).environment).toBe(
      'production',
    );
    expect(opcionesSentry({ SENTRY_DSN: DSN_FALSO }).environment).toBe('development');
  });

  test('nunca manda PII: los eventos no llevan cuerpo de request ni Authorization', () => {
    expect(opcionesSentry({ SENTRY_DSN: DSN_FALSO }).sendDefaultPii).toBe(false);
  });

  test('no muestrea trazas de performance: solo reportamos errores', () => {
    expect(opcionesSentry({ SENTRY_DSN: DSN_FALSO }).tracesSampleRate).toBe(0);
  });

  test('el debug de Sentry está apagado salvo que SENTRY_DEBUG lo pida', () => {
    expect(opcionesSentry({ SENTRY_DSN: DSN_FALSO }).debug).toBe(false);
    expect(opcionesSentry({ SENTRY_DSN: DSN_FALSO, SENTRY_DEBUG: 'true' }).debug).toBe(true);
  });

  test('el DSN nunca está hardcodeado en el módulo', () => {
    const fuente = require('fs').readFileSync(require.resolve('../lib/sentry'), 'utf8');
    expect(fuente).not.toMatch(/ingest\.[a-z]+\.sentry\.io/);
  });
});
