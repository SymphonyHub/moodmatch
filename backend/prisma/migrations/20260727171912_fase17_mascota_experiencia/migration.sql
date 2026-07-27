-- AlterTable
ALTER TABLE "MascotaAmistad" ADD COLUMN     "experiencia" INTEGER NOT NULL DEFAULT 0;

-- PreserveStage
UPDATE "MascotaAmistad"
SET "experiencia" = CASE
  WHEN "etapa" >= 3 OR "nivelCarino" >= 36 THEN 9800
  WHEN "etapa" = 2 OR "nivelCarino" >= 16 THEN 800
  ELSE 0
END;
