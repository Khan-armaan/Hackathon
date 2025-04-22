-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ImpactLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "SlotStatus" AS ENUM ('OPEN', 'FILLING', 'FULL', 'CLOSED');

-- CreateEnum
CREATE TYPE "CongestionLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "TimeOfDay" AS ENUM ('MORNING', 'AFTERNOON', 'EVENING', 'NIGHT');

-- CreateEnum
CREATE TYPE "DayType" AS ENUM ('WEEKDAY', 'WEEKEND', 'HOLIDAY');

-- CreateEnum
CREATE TYPE "Weather" AS ENUM ('CLEAR', 'RAIN', 'SNOW', 'FOG');

-- CreateEnum
CREATE TYPE "RoutingStrategy" AS ENUM ('SHORTEST_PATH', 'BALANCED', 'AVOID_CONGESTION');

-- CreateTable
CREATE TABLE "Event" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "impactLevel" "ImpactLevel" NOT NULL DEFAULT 'MEDIUM',
    "expectedVisitors" INTEGER NOT NULL DEFAULT 0,
    "location" TEXT NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'UPCOMING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrafficStats" (
    "id" SERIAL NOT NULL,
    "mapId" INTEGER NOT NULL,
    "totalVehicles" INTEGER NOT NULL DEFAULT 0,
    "activeMaps" INTEGER DEFAULT 1,
    "congestionLevel" TEXT NOT NULL DEFAULT 'MEDIUM',
    "peakHours" TEXT[],
    "eventsToday" INTEGER NOT NULL DEFAULT 0,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrafficStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" SERIAL NOT NULL,
    "roadId" INTEGER NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "targetX" DOUBLE PRECISION NOT NULL,
    "targetY" DOUBLE PRECISION NOT NULL,
    "speed" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "color" TEXT NOT NULL DEFAULT '#3498db',
    "size" DOUBLE PRECISION NOT NULL DEFAULT 3.0,
    "direction" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeSlot" (
    "id" SERIAL NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "maxVehicles" INTEGER NOT NULL,
    "currentAllocation" INTEGER NOT NULL DEFAULT 0,
    "status" "SlotStatus" NOT NULL DEFAULT 'OPEN',
    "entryPoint" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteRecommendation" (
    "id" SERIAL NOT NULL,
    "entryPoint" TEXT NOT NULL,
    "exitPoint" TEXT NOT NULL,
    "route" TEXT[],
    "expectedDuration" INTEGER NOT NULL,
    "congestionLevel" "CongestionLevel" NOT NULL DEFAULT 'MEDIUM',
    "vehicleTypes" TEXT[],
    "timeSlotIds" INTEGER[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RouteRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationParams" (
    "id" SERIAL NOT NULL,
    "trafficMapId" INTEGER NOT NULL,
    "timeOfDay" "TimeOfDay" NOT NULL DEFAULT 'MORNING',
    "dayType" "DayType" NOT NULL DEFAULT 'WEEKDAY',
    "vehicleDensity" INTEGER NOT NULL DEFAULT 100,
    "hasActiveEvents" BOOLEAN NOT NULL DEFAULT false,
    "weatherCondition" "Weather" NOT NULL DEFAULT 'CLEAR',
    "routingStrategy" "RoutingStrategy" NOT NULL DEFAULT 'SHORTEST_PATH',
    "includeLargeVehicles" BOOLEAN NOT NULL DEFAULT true,
    "congestionThreshold" INTEGER NOT NULL DEFAULT 70,
    "simulationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SimulationParams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationResult" (
    "id" SERIAL NOT NULL,
    "simulationId" INTEGER NOT NULL,
    "congestionPercentage" INTEGER NOT NULL DEFAULT 0,
    "bottlenecks" TEXT[],
    "avgTravelTime" INTEGER NOT NULL DEFAULT 0,
    "completedVehicles" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SimulationResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrafficSnapshot" (
    "id" SERIAL NOT NULL,
    "time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalVehicles" INTEGER NOT NULL DEFAULT 0,
    "congestionLevel" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "avgSpeed" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "entryPoints" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrafficSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DayData" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalVehicles" INTEGER NOT NULL DEFAULT 0,
    "peakCongestion" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "avgWaitTime" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DayData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_RouteRecommendationToTimeSlot" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_RouteRecommendationToTimeSlot_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "DayData_date_key" ON "DayData"("date");

-- CreateIndex
CREATE INDEX "_RouteRecommendationToTimeSlot_B_index" ON "_RouteRecommendationToTimeSlot"("B");

-- AddForeignKey
ALTER TABLE "TrafficStats" ADD CONSTRAINT "TrafficStats_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "TrafficMap"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_roadId_fkey" FOREIGN KEY ("roadId") REFERENCES "TrafficData"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationParams" ADD CONSTRAINT "SimulationParams_trafficMapId_fkey" FOREIGN KEY ("trafficMapId") REFERENCES "TrafficMap"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationResult" ADD CONSTRAINT "SimulationResult_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "SimulationParams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RouteRecommendationToTimeSlot" ADD CONSTRAINT "_RouteRecommendationToTimeSlot_A_fkey" FOREIGN KEY ("A") REFERENCES "RouteRecommendation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RouteRecommendationToTimeSlot" ADD CONSTRAINT "_RouteRecommendationToTimeSlot_B_fkey" FOREIGN KEY ("B") REFERENCES "TimeSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
