import { opcionesSentry, iniciarSentry } from '../services/sentry';

const DSN_FALSO = 'https://abc123@o1.ingest.us.sentry.io/2';

describe('opcionesSentry — reporte de errores de la app', () => {
  test('sin EXPO_PUBLIC_SENTRY_DSN no hay configuración: Sentry queda inerte', () => {
    expect(opcionesSentry({})).toBeNull();
    expect(opcionesSentry({ EXPO_PUBLIC_SENTRY_DSN: '' })).toBeNull();
    expect(iniciarSentry({})).toBe(false);
  });

  test('toma el DSN del entorno tal cual', () => {
    expect(opcionesSentry({ EXPO_PUBLIC_SENTRY_DSN: DSN_FALSO }).dsn).toBe(DSN_FALSO);
  });

  test('el environment distingue desarrollo de producción', () => {
    expect(opcionesSentry({ EXPO_PUBLIC_SENTRY_DSN: DSN_FALSO }, true).environment).toBe(
      'development',
    );
    expect(opcionesSentry({ EXPO_PUBLIC_SENTRY_DSN: DSN_FALSO }, false).environment).toBe(
      'production',
    );
  });

  test('nunca manda PII y no muestrea trazas', () => {
    const opciones = opcionesSentry({ EXPO_PUBLIC_SENTRY_DSN: DSN_FALSO });
    expect(opciones.sendDefaultPii).toBe(false);
    expect(opciones.tracesSampleRate).toBe(0);
  });

  test('descarta los breadcrumbs de consola: no filtran texto del chat', () => {
    const { beforeBreadcrumb } = opcionesSentry({ EXPO_PUBLIC_SENTRY_DSN: DSN_FALSO });
    expect(beforeBreadcrumb({ category: 'console', message: 'me siento muy sola hoy' })).toBeNull();
  });

  test('los breadcrumbs que no son de consola pasan intactos', () => {
    const { beforeBreadcrumb } = opcionesSentry({ EXPO_PUBLIC_SENTRY_DSN: DSN_FALSO });
    const navegacion = { category: 'navigation', data: { to: '/perfil' } };
    expect(beforeBreadcrumb(navegacion)).toBe(navegacion);
  });

  test('el DSN nunca está hardcodeado en el módulo', () => {
    const fuente = require('fs').readFileSync(require.resolve('../services/sentry'), 'utf8');
    expect(fuente).not.toMatch(/ingest\.[a-z]+\.sentry\.io/);
  });
});
