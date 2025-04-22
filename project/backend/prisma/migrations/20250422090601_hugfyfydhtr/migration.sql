-- CreateEnum
CREATE TYPE "RoadType" AS ENUM ('HIGHWAY', 'NORMAL', 'RESIDENTIAL');

-- CreateEnum
CREATE TYPE "Density" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CONGESTED');

-- CreateTable
CREATE TABLE "TrafficMap" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrafficMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrafficData" (
    "id" SERIAL NOT NULL,
    "mapId" INTEGER NOT NULL,
    "startX" INTEGER NOT NULL,
    "startY" INTEGER NOT NULL,
    "endX" INTEGER NOT NULL,
    "endY" INTEGER NOT NULL,
    "roadType" "RoadType" NOT NULL DEFAULT 'NORMAL',
    "density" "Density" NOT NULL DEFAULT 'LOW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrafficData_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TrafficData" ADD CONSTRAINT "TrafficData_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "TrafficMap"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
