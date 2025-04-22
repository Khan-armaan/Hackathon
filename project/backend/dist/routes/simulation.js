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
exports.simulationRouter = void 0;
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
exports.simulationRouter = express_1.default.Router();
/**
 * @swagger
 * /api/simulation:
 *   get:
 *     summary: Get all simulation configurations
 *     tags: [Simulation]
 *     responses:
 *       200:
 *         description: List of simulation configurations
 *       500:
 *         description: Server error
 */
exports.simulationRouter.get("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const simulations = yield prisma.simulationParams.findMany({
            orderBy: {
                createdAt: "desc",
            },
            include: {
                trafficMap: {
                    select: {
                        name: true,
                    },
                },
            },
        });
        res.status(200).json(simulations);
    }
    catch (error) {
        console.error("Get simulations error:", error);
        res.status(500).json({ error: "Failed to get simulations" });
    }
}));
/**
 * @swagger
 * /api/simulation/{id}:
 *   get:
 *     summary: Get simulation configuration by ID
 *     tags: [Simulation]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the simulation
 *     responses:
 *       200:
 *         description: Simulation configuration
 *       404:
 *         description: Simulation not found
 *       500:
 *         description: Server error
 */
exports.simulationRouter.get("/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const simulation = yield prisma.simulationParams.findUnique({
            where: {
                id: parseInt(id),
            },
            include: {
                trafficMap: {
                    select: {
                        name: true,
                        width: true,
                        height: true,
                    },
                },
                simulationResults: true,
            },
        });
        if (!simulation) {
            return res.status(404).json({ error: "Simulation not found" });
        }
        res.status(200).json(simulation);
    }
    catch (error) {
        console.error("Get simulation error:", error);
        res.status(500).json({ error: "Failed to get simulation" });
    }
}));
/**
 * @swagger
 * /api/simulation:
 *   post:
 *     summary: Create a new simulation configuration
 *     tags: [Simulation]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - trafficMapId
 *             properties:
 *               trafficMapId:
 *                 type: integer
 *               timeOfDay:
 *                 type: string
 *                 enum: [MORNING, AFTERNOON, EVENING, NIGHT]
 *               dayType:
 *                 type: string
 *                 enum: [WEEKDAY, WEEKEND, HOLIDAY]
 *               vehicleDensity:
 *                 type: integer
 *               hasActiveEvents:
 *                 type: boolean
 *               weatherCondition:
 *                 type: string
 *                 enum: [CLEAR, RAIN, SNOW, FOG]
 *               routingStrategy:
 *                 type: string
 *                 enum: [SHORTEST_PATH, BALANCED, AVOID_CONGESTION]
 *               includeLargeVehicles:
 *                 type: boolean
 *               congestionThreshold:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Simulation created successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Traffic map not found
 *       500:
 *         description: Server error
 */
exports.simulationRouter.post("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { trafficMapId, timeOfDay, dayType, vehicleDensity, hasActiveEvents, weatherCondition, routingStrategy, includeLargeVehicles, congestionThreshold, } = req.body;
        if (!trafficMapId) {
            return res.status(400).json({ error: "Traffic map ID is required" });
        }
        // Check if map exists
        const map = yield prisma.trafficMap.findUnique({
            where: {
                id: parseInt(trafficMapId),
            },
        });
        if (!map) {
            return res.status(404).json({ error: "Traffic map not found" });
        }
        const simulation = yield prisma.simulationParams.create({
            data: {
                trafficMapId: parseInt(trafficMapId),
                timeOfDay: timeOfDay || "MORNING",
                dayType: dayType || "WEEKDAY",
                vehicleDensity: vehicleDensity || 100,
                hasActiveEvents: hasActiveEvents !== undefined ? hasActiveEvents : false,
                weatherCondition: weatherCondition || "CLEAR",
                routingStrategy: routingStrategy || "SHORTEST_PATH",
                includeLargeVehicles: includeLargeVehicles !== undefined ? includeLargeVehicles : true,
                congestionThreshold: congestionThreshold || 70,
            },
        });
        res.status(201).json({
            message: "Simulation created successfully",
            simulation,
        });
    }
    catch (error) {
        console.error("Create simulation error:", error);
        res.status(500).json({ error: "Failed to create simulation" });
    }
}));
/**
 * @swagger
 * /api/simulation/{id}/run:
 *   post:
 *     summary: Run a simulation and record results
 *     tags: [Simulation]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the simulation
 *     responses:
 *       200:
 *         description: Simulation results
 *       404:
 *         description: Simulation not found
 *       500:
 *         description: Server error
 */
exports.simulationRouter.post("/:id/run", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const simulation = yield prisma.simulationParams.findUnique({
            where: {
                id: parseInt(id),
            },
            include: {
                trafficMap: {
                    include: {
                        trafficData: true,
                    },
                },
            },
        });
        if (!simulation) {
            return res.status(404).json({ error: "Simulation not found" });
        }
        // Generate simulation results based on parameters
        const roadCount = simulation.trafficMap.trafficData.length;
        const basePercentage = Math.min(40 + (simulation.vehicleDensity / 2), 95);
        const weatherFactor = simulation.weatherCondition === "CLEAR" ? 0 :
            simulation.weatherCondition === "RAIN" ? 10 :
                simulation.weatherCondition === "SNOW" ? 25 : 15; // FOG
        const dayFactor = simulation.dayType === "WEEKEND" ? -5 :
            simulation.dayType === "HOLIDAY" ? 15 : 0; // WEEKDAY
        const timeFactor = simulation.timeOfDay === "MORNING" ? 10 :
            simulation.timeOfDay === "EVENING" ? 15 :
                simulation.timeOfDay === "AFTERNOON" ? 5 : -10; // NIGHT
        const eventFactor = simulation.hasActiveEvents ? 20 : 0;
        // Calculate congestion percentage with some randomness
        let congestionPercentage = basePercentage + weatherFactor + dayFactor + timeFactor + eventFactor;
        congestionPercentage += (Math.random() * 10) - 5; // Add +/- 5% randomness
        congestionPercentage = Math.min(100, Math.max(0, congestionPercentage));
        // Generate bottlenecks
        const potentialBottlenecks = [
            "North Junction",
            "Temple Entrance",
            "Market Square",
            "East Gate",
            "Main Crossing",
            "West Entrance",
            "Highway Exit",
            "South Circle"
        ];
        // More congestion means more bottlenecks
        const bottleneckCount = Math.floor(congestionPercentage / 20) + 1;
        const bottlenecks = [];
        for (let i = 0; i < bottleneckCount && i < potentialBottlenecks.length; i++) {
            bottlenecks.push(potentialBottlenecks[i]);
        }
        // Calculate average travel time (in seconds)
        const baseTime = 300; // 5 minutes base time
        const avgTravelTime = Math.round(baseTime * (1 + (congestionPercentage / 100)));
        // Calculate completed vehicles
        const baseCompleted = 500;
        const completedVehicles = Math.round(baseCompleted * (1 - (congestionPercentage / 200)));
        const simulationResult = yield prisma.simulationResult.create({
            data: {
                simulationId: parseInt(id),
                congestionPercentage: Math.round(congestionPercentage),
                bottlenecks,
                avgTravelTime,
                completedVehicles,
            },
        });
        res.status(200).json({
            message: "Simulation completed successfully",
            result: simulationResult,
        });
    }
    catch (error) {
        console.error("Run simulation error:", error);
        res.status(500).json({ error: "Failed to run simulation" });
    }
}));
/**
 * @swagger
 * /api/simulation/{id}:
 *   delete:
 *     summary: Delete a simulation
 *     tags: [Simulation]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the simulation
 *     responses:
 *       200:
 *         description: Simulation deleted successfully
 *       404:
 *         description: Simulation not found
 *       500:
 *         description: Server error
 */
exports.simulationRouter.delete("/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // First delete associated simulation results
        yield prisma.simulationResult.deleteMany({
            where: {
                simulationId: parseInt(id),
            },
        });
        // Then delete the simulation
        yield prisma.simulationParams.delete({
            where: {
                id: parseInt(id),
            },
        });
        res.status(200).json({
            message: "Simulation deleted successfully",
        });
    }
    catch (error) {
        console.error("Delete simulation error:", error);
        res.status(500).json({ error: "Failed to delete simulation" });
    }
}));
exports.default = exports.simulationRouter;
