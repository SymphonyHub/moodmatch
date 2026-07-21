-- AlterTable
ALTER TABLE "MascotaAmistad" ADD COLUMN     "accesorioCabeza" TEXT,
ADD COLUMN     "accesorioColor" TEXT,
ADD COLUMN     "accesoriosDesbloqueados" JSONB,
ADD COLUMN     "activa" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "etapa" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "invitacionEstado" TEXT NOT NULL DEFAULT 'pendiente',
ADD COLUMN     "invitadaPor" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "racha" INTEGER NOT NULL DEFAULT 0;

-- Backfill de filas existentes (mascotas creadas automáticamente en Fase 12):
-- ya son amistades activas y aceptadas, no invitaciones pendientes.
UPDATE "MascotaAmistad" SET "invitacionEstado" = 'aceptada';

-- Preservar progreso: derivar la etapa del nivel ya acumulado
-- (nivel 36+ = etapa 3, 16+ = etapa 2, resto = etapa 1).
UPDATE "MascotaAmistad"
SET "etapa" = CASE
  WHEN "nivelCarino" >= 36 THEN 3
  WHEN "nivelCarino" >= 16 THEN 2
  ELSE 1
END;
