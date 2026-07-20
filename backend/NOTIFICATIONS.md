# Notificaciones en Render y EAS

## Job periódico de Render

Crear un **Cron Job** separado que use el mismo repositorio y variables del API:

- Root Directory: `backend`
- Build Command: `npm install && npx prisma generate`
- Start Command: `npm run notifications:due`
- Schedule: `0 * * * *` (cada hora, en UTC)
- Variable requerida: `DATABASE_URL`, con el mismo valor que el Web Service
- Variable opcional: `EXPO_ACCESS_TOKEN`, solo si se habilita Enhanced Push Security en EAS

El job reclama cada episodio en una transacción serializable antes de enviarlo, para
evitar duplicados entre ejecuciones solapadas. También consulta los receipts de Expo,
descarta tokens que ya no están registrados y conserva los tickets hasta 24 horas.
Ejecutarlo cada hora permite entregar el aviso cuando termina un rango de "No molestar".

## Build móvil

Las notificaciones remotas no funcionan en Expo Go para Android. Después de configurar
las credenciales FCM v1 del proyecto EAS, generar e instalar un development build o un
release build. El plugin `expo-notifications` y el canal Android `hora-azul` ya están
configurados en `app/app.json`.

Caso mínimo de QA en dispositivo real:

1. Iniciar sesión y aceptar el permiso una sola vez.
2. Confirmar en Ajustes > Notificaciones que el dispositivo aparece activo.
3. Enviar un mensaje desde otra cuenta amiga.
4. Desactivar "Mensajes nuevos" y confirmar que el siguiente mensaje no genera push.
5. Activar "No molestar: Todo el día" y confirmar que no se envía ningún tipo de push.
