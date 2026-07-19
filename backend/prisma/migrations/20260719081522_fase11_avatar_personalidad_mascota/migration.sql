-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "perfilPersonalidad" JSONB;

-- CreateTable
CREATE TABLE "MascotaAmistad" (
    "id" TEXT NOT NULL,
    "amistadId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "nivelCarino" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MascotaAmistad_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MascotaAmistad_amistadId_key" ON "MascotaAmistad"("amistadId");

-- AddForeignKey
ALTER TABLE "MascotaAmistad" ADD CONSTRAINT "MascotaAmistad_amistadId_fkey" FOREIGN KEY ("amistadId") REFERENCES "Friendship"("id") ON DELETE CASCADE ON UPDATE CASCADE;
