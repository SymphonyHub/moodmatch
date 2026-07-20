-- AlterTable
ALTER TABLE "MoodEntry" ADD COLUMN     "clientId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "MoodEntry_clientId_key" ON "MoodEntry"("clientId");
