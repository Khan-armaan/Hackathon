"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.trafficAnalyticsRouter = void 0;
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
exports.trafficAnalyticsRouter = express_1.default.Router();
/**
 * @swagger
 * /api/traffic-analytics/snapshots:
 *   get:
 *     summary: Get traffic snapshots
 *     tags: [TrafficAnalytics]
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Optional filter by date (YYYY-MM-DD)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Optional limit of records to return
 *     responses:
 *       200:
 *         description: List of traffic snapshots
 *       500:
 *         description: Server error
 */
exports.trafficAnalyticsRouter.get("/snapshots", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { date, limit } = req.query;
        let whereClause = {};
        if (date) {
            const startDate = new Date(date);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 1);
            whereClause = {
                time: {
                    gte: startDate,
                    lt: endDate,
                },
            };
        }
        const snapshots = yield prisma.trafficSnapshot.findMany({
            where: whereClause,
            orderBy: {
                time: "desc",
            },
            take: limit ? parseInt(limit) : undefined,
        });
        if (snapshots.length === 0) {
            // If no snapshots found, create synthetic data
            const currentDate = date ? new Date(date) : new Date();
            const syntheticSnapshots = generateSyntheticSnapshots(currentDate, limit ? parseInt(limit) : 24);
            return res.status(200).json(syntheticSnapshots);
        }
        res.status(200).json(snapshots);
    }
    catch (error) {
        console.error("Get snapshots error:", error);
        res.status(500).json({ error: "Failed to get traffic snapshots" });
    }
}));
/**
 * @swagger
 * /api/traffic-analytics/snapshots:
 *   post:
 *     summary: Create a new traffic snapshot
 *     tags: [TrafficAnalytics]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - totalVehicles
 *               - congestionLevel
 *               - avgSpeed
 *             properties:
 *               time:
 *                 type: string
 *                 format: date-time
 *               totalVehicles:
 *                 type: integer
 *               congestionLevel:
 *                 type: number
 *                 format: float
 *               avgSpeed:
 *                 type: number
 *                 format: float
 *               entryPoints:
 *                 type: object
 *     responses:
 *       201:
 *         description: Snapshot created successfully
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
exports.trafficAnalyticsRouter.post("/snapshots", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { time, totalVehicles, congestionLevel, avgSpeed, entryPoints } = req.body;
        if (totalVehicles === undefined || congestionLevel === undefined || avgSpeed === undefined) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        const snapshot = yield prisma.trafficSnapshot.create({
            data: {
                time: time ? new Date(time) : undefined,
                totalVehicles,
                congestionLevel,
                avgSpeed,
                entryPoints,
            },
        });
        res.status(201).json({
            message: "Traffic snapshot created successfully",
            snapshot,
        });
    }
    catch (error) {
        console.error("Create snapshot error:", error);
        res.status(500).json({ error: "Failed to create traffic snapshot" });
    }
}));
/**
 * @swagger
 * /api/traffic-analytics/daily:
 *   get:
 *     summary: Get daily traffic data
 *     tags: [TrafficAnalytics]
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *         description: Number of days to return (default: 7)
 *     responses:
 *       200:
 *         description: Daily traffic data
 *       500:
 *         description: Server error
 */
exports.trafficAnalyticsRouter.get("/daily", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const days = req.query.days ? parseInt(req.query.days) : 7;
        // Get the last 'days' days
        const endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        const startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - days + 1);
        startDate.setHours(0, 0, 0, 0);
        const dailyData = yield prisma.dayData.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            orderBy: {
                date: "asc",
            },
        });
        if (dailyData.length === 0) {
            // Generate synthetic data if no data is found
            const syntheticData = generateSyntheticDailyData(startDate, days);
            return res.status(200).json(syntheticData);
        }
        res.status(200).json(dailyData);
    }
    catch (error) {
        console.error("Get daily data error:", error);
        res.status(500).json({ error: "Failed to get daily traffic data" });
    }
}));
/**
 * @swagger
 * /api/traffic-analytics/daily:
 *   post:
 *     summary: Create or update daily traffic data
 *     tags: [TrafficAnalytics]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - date
 *               - totalVehicles
 *               - peakCongestion
 *               - avgWaitTime
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *               totalVehicles:
 *                 type: integer
 *               peakCongestion:
 *                 type: number
 *                 format: float
 *               avgWaitTime:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Daily data updated successfully
 *       201:
 *         description: Daily data created successfully
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
exports.trafficAnalyticsRouter.post("/daily", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { date, totalVehicles, peakCongestion, avgWaitTime } = req.body;
        if (!date || totalVehicles === undefined || peakCongestion === undefined || avgWaitTime === undefined) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        const inputDate = new Date(date);
        inputDate.setHours(0, 0, 0, 0);
        // Check if data already exists for this date
        const existingData = yield prisma.dayData.findUnique({
            where: {
                date: inputDate,
            },
        });
        if (existingData) {
            // Update existing data
            const updatedData = yield prisma.dayData.update({
                where: {
                    id: existingData.id,
                },
                data: {
                    totalVehicles,
                    peakCongestion,
                    avgWaitTime,
                },
            });
            return res.status(200).json({
                message: "Daily traffic data updated successfully",
                data: updatedData,
            });
        }
        else {
            // Create new data
            const newData = yield prisma.dayData.create({
                data: {
                    date: inputDate,
                    totalVehicles,
                    peakCongestion,
                    avgWaitTime,
                },
            });
            return res.status(201).json({
                message: "Daily traffic data created successfully",
                data: newData,
            });
        }
    }
    catch (error) {
        console.error("Create/update daily data error:", error);
        res.status(500).json({ error: "Failed to create/update daily traffic data" });
    }
}));
// Helper function to generate synthetic traffic snapshots
function generateSyntheticSnapshots(date, count) {
    const snapshots = [];
    const baseDate = new Date(date);
    baseDate.setHours(0, 0, 0, 0);
    for (let i = 0; i < count; i++) {
        // Set time to i hours
        const snapshotTime = new Date(baseDate);
        snapshotTime.setHours(Math.floor(i * 24 / count));
        // Generate traffic based on time of day
        const hour = snapshotTime.getHours();
        let baseCongestion = 0.3; // Default
        // Morning peak (7am-9am)
        if (hour >= 7 && hour <= 9) {
            baseCongestion = 0.7;
        }
        // Evening peak (5pm-7pm)
        else if (hour >= 17 && hour <= 19) {
            baseCongestion = 0.8;
        }
        // Midday
        else if (hour >= 11 && hour <= 14) {
            baseCongestion = 0.5;
        }
        // Late night
        else if (hour >= 22 || hour <= 5) {
            baseCongestion = 0.1;
        }
        // Add some randomness
        const congestionWithNoise = Math.min(1.0, Math.max(0.0, baseCongestion + (Math.random() * 0.2 - 0.1)));
        // Vehicle count based on congestion
        const vehicleCount = Math.round(1000 + congestionWithNoise * 4000);
        // Speed decreases as congestion increases
        const avgSpeed = Math.round(60 - congestionWithNoise * 40);
        // Generate entry points data
        const entryPoints = {
            "North Gate": { count: Math.round(vehicleCount * 0.3) },
            "East Gate": { count: Math.round(vehicleCount * 0.25) },
            "West Gate": { count: Math.round(vehicleCount * 0.2) },
            "South Gate": { count: Math.round(vehicleCount * 0.25) }
        };
        snapshots.push({
            id: i + 1,
            time: snapshotTime,
            totalVehicles: vehicleCount,
            congestionLevel: congestionWithNoise,
            avgSpeed,
            entryPoints,
            createdAt: new Date()
        });
    }
    return snapshots;
}
// Helper function to generate synthetic daily data
function generateSyntheticDailyData(startDate, days) {
    const dailyData = [];
    for (let i = 0; i < days; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() + i);
        // Traffic is higher on weekends
        const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
        const baseVehicles = isWeekend ? 12000 : 8000;
        // Add some randomness
        const vehiclesWithNoise = Math.round(baseVehicles + (Math.random() * 2000 - 1000));
        // Peak congestion correlates with vehicle count
        const peakCongestion = Math.min(1.0, (vehiclesWithNoise / 15000) + (Math.random() * 0.1));
        // Wait time increases with congestion
        const avgWaitTime = Math.round(10 + peakCongestion * 50);
        dailyData.push({
            id: i + 1,
            date: currentDate,
            totalVehicles: vehiclesWithNoise,
            peakCongestion,
            avgWaitTime,
            createdAt: new Date(),
            updatedAt: new Date()
        });
    }
    return dailyData;
}
exports.default = exports.trafficAnalyticsRouter;
