-- AlterTable
ALTER TABLE "GoldBar" ADD COLUMN     "validatedBy" TEXT,
ALTER COLUMN "handledBy" DROP NOT NULL;
