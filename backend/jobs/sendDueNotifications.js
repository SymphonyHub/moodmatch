const prisma = require('../lib/prisma');
const { sendDueNotifications } = require('../lib/dueNotifications');
const { processPushReceipts } = require('../lib/pushReceipts');

async function run() {
  let receipts = { checked: 0, invalidTokens: 0 };
  try {
    receipts = await processPushReceipts(prisma);
  } catch (error) {
    // Un fallo temporal del endpoint de receipts no debe impedir recordatorios.
    console.warn(`No se pudieron revisar receipts de Expo: ${error.message}`);
  }
  const due = await sendDueNotifications(prisma);
  return { ...due, ...receipts };
}

run()
  .then(({ moodReminders, petReminders, checked, invalidTokens }) => {
    console.log(
      `Notificaciones: ánimo=${moodReminders}, mascota=${petReminders}, ` +
      `receipts=${checked}, tokens inválidos=${invalidTokens}`,
    );
  })
  .catch((error) => {
    console.error('Falló el job de notificaciones:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
