/*
  Warnings:

  - You are about to drop the column `aadhaarImage` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "aadhaarImage",
ADD COLUMN     "aadhaarBack" TEXT,
ADD COLUMN     "aadhaarFront" TEXT;
