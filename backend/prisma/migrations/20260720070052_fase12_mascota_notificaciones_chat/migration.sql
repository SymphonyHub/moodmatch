-- AlterTable
ALTER TABLE "Cheer" ADD COLUMN     "reacciones" JSONB;

-- AlterTable
ALTER TABLE "MascotaAmistad" ADD COLUMN     "historialHitos" JSONB,
ADD COLUMN     "nombrePropuesto" TEXT,
ADD COLUMN     "retoCooperativo" JSONB,
ADD COLUMN     "ultimoCuidadoUsuario1" TIMESTAMP(3),
ADD COLUMN     "ultimoCuidadoUsuario2" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "expoPushToken" TEXT,
ADD COLUMN     "notificationPreferences" JSONB;
