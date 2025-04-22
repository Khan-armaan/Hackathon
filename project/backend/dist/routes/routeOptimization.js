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
exports.routeOptimizationRouter = void 0;
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const pathfinding_1 = require("../utils/pathfinding");
const prisma = new client_1.PrismaClient();
exports.routeOptimizationRouter = express_1.default.Router();
/**
 * @swagger
 * /api/route-optimization/find-path:
 *   post:
 *     summary: Find the optimal path between two points
 *     tags: [RouteOptimization]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mapId
 *               - startX
 *               - startY
 *               - endX
 *               - endY
 *             properties:
 *               mapId:
 *                 type: integer
 *               startX:
 *                 type: number
 *               startY:
 *                 type: number
 *               endX:
 *                 type: number
 *               endY:
 *                 type: number
 *               algorithm:
 *                 type: string
 *                 enum: [dijkstra, astar]
 *               simulationParams:
 *                 type: object
 *                 properties:
 *                   timeOfDay:
 *                     type: string
 *                   dayType:
 *                     type: string
 *                   weatherCondition:
 *                     type: string
 *                   routingStrategy:
 *                     type: string
 *     responses:
 *       200:
 *         description: The optimal path
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Map not found or no path available
 *       500:
 *         description: Server error
 */
exports.routeOptimizationRouter.post("/find-path", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { mapId, startX, startY, endX, endY, algorithm = "astar", // Default to A* algorithm
        simulationParams, } = req.body;
        if (!mapId || startX === undefined || startY === undefined || endX === undefined || endY === undefined) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        // Fetch traffic data for the specified map
        const trafficData = yield prisma.trafficData.findMany({
            where: {
                mapId: parseInt(mapId.toString()),
            },
        });
        if (trafficData.length === 0) {
            return res.status(404).json({ error: "No traffic data found for this map" });
        }
        // Fetch active events that might affect the route
        const today = new Date();
        const events = yield prisma.event.findMany({
            where: {
                status: {
                    in: ["UPCOMING", "ONGOING"],
                },
                endDate: {
                    gte: today,
                },
            },
        });
        // Build the graph from traffic data
        const graph = (0, pathfinding_1.buildGraph)(trafficData);
        // Find the closest nodes to start and end points
        const startNodeId = findClosestNode(graph, startX, startY);
        const endNodeId = findClosestNode(graph, endX, endY);
        if (startNodeId === null || endNodeId === null) {
            return res.status(404).json({ error: "Could not locate valid start or end points on the map" });
        }
        // Adjust weights based on simulation parameters and events
        let adjustedGraph = graph;
        if (simulationParams) {
            // Convert string parameters to enum values if necessary
            const params = {
                timeOfDay: simulationParams.timeOfDay || "MORNING",
                dayType: simulationParams.dayType || "WEEKDAY",
                weatherCondition: simulationParams.weatherCondition || "CLEAR",
                routingStrategy: simulationParams.routingStrategy || "SHORTEST_PATH",
            };
            adjustedGraph = (0, pathfinding_1.adjustWeightsForSimulation)(graph, trafficData, params, events);
        }
        // Find the optimal path
        let pathResult;
        if (algorithm.toLowerCase() === "dijkstra") {
            pathResult = (0, pathfinding_1.dijkstra)(adjustedGraph, startNodeId, endNodeId);
        }
        else {
            pathResult = (0, pathfinding_1.aStar)(adjustedGraph, startNodeId, endNodeId);
        }
        if (!pathResult) {
            return res.status(404).json({ error: "No valid path found between the specified points" });
        }
        // Enhance the path result with road information
        const enhancedPath = yield enhancePathWithRoadInfo(pathResult.roadPath, trafficData);
        res.status(200).json({
            algorithm: algorithm.toLowerCase(),
            path: pathResult.path,
            roadPath: enhancedPath,
            coordinatePath: pathResult.coordinatePath,
            totalWeight: pathResult.totalWeight,
            estimatedTimeMinutes: Math.round(pathResult.totalWeight * 2) // Simple conversion to minutes
        });
    }
    catch (error) {
        console.error("Route optimization error:", error);
        res.status(500).json({ error: "Failed to find optimal path" });
    }
}));
/**
 * @swagger
 * /api/route-optimization/compare-paths:
 *   post:
 *     summary: Compare paths found by different algorithms
 *     tags: [RouteOptimization]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mapId
 *               - startX
 *               - startY
 *               - endX
 *               - endY
 *             properties:
 *               mapId:
 *                 type: integer
 *               startX:
 *                 type: number
 *               startY:
 *                 type: number
 *               endX:
 *                 type: number
 *               endY:
 *                 type: number
 *               simulationParams:
 *                 type: object
 *     responses:
 *       200:
 *         description: Comparison of paths found by different algorithms
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Map not found or no path available
 *       500:
 *         description: Server error
 */
exports.routeOptimizationRouter.post("/compare-paths", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { mapId, startX, startY, endX, endY, simulationParams, } = req.body;
        if (!mapId || startX === undefined || startY === undefined || endX === undefined || endY === undefined) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        // Fetch traffic data for the specified map
        const trafficData = yield prisma.trafficData.findMany({
            where: {
                mapId: parseInt(mapId.toString()),
            },
        });
        if (trafficData.length === 0) {
            return res.status(404).json({ error: "No traffic data found for this map" });
        }
        // Fetch active events that might affect the route
        const today = new Date();
        const events = yield prisma.event.findMany({
            where: {
                status: {
                    in: ["UPCOMING", "ONGOING"],
                },
                endDate: {
                    gte: today,
                },
            },
        });
        // Build the graph from traffic data
        const graph = (0, pathfinding_1.buildGraph)(trafficData);
        // Find the closest nodes to start and end points
        const startNodeId = findClosestNode(graph, startX, startY);
        const endNodeId = findClosestNode(graph, endX, endY);
        if (startNodeId === null || endNodeId === null) {
            return res.status(404).json({ error: "Could not locate valid start or end points on the map" });
        }
        // Adjust weights based on simulation parameters and events
        let adjustedGraph = graph;
        if (simulationParams) {
            const params = {
                timeOfDay: simulationParams.timeOfDay || "MORNING",
                dayType: simulationParams.dayType || "WEEKDAY",
                weatherCondition: simulationParams.weatherCondition || "CLEAR",
                routingStrategy: simulationParams.routingStrategy || "SHORTEST_PATH",
            };
            adjustedGraph = (0, pathfinding_1.adjustWeightsForSimulation)(graph, trafficData, params, events);
        }
        // Find paths using both algorithms
        const dijkstraResult = (0, pathfinding_1.dijkstra)(adjustedGraph, startNodeId, endNodeId);
        const astarResult = (0, pathfinding_1.aStar)(adjustedGraph, startNodeId, endNodeId);
        if (!dijkstraResult && !astarResult) {
            return res.status(404).json({ error: "No valid path found between the specified points" });
        }
        // Prepare results
        const results = {
            dijkstra: null,
            astar: null,
        };
        if (dijkstraResult) {
            const enhancedDijkstraPath = yield enhancePathWithRoadInfo(dijkstraResult.roadPath, trafficData);
            results.dijkstra = {
                path: dijkstraResult.path,
                roadPath: enhancedDijkstraPath,
                coordinatePath: dijkstraResult.coordinatePath,
                totalWeight: dijkstraResult.totalWeight,
                estimatedTimeMinutes: Math.round(dijkstraResult.totalWeight * 2)
            };
        }
        if (astarResult) {
            const enhancedAstarPath = yield enhancePathWithRoadInfo(astarResult.roadPath, trafficData);
            results.astar = {
                path: astarResult.path,
                roadPath: enhancedAstarPath,
                coordinatePath: astarResult.coordinatePath,
                totalWeight: astarResult.totalWeight,
                estimatedTimeMinutes: Math.round(astarResult.totalWeight * 2)
            };
        }
        res.status(200).json(results);
    }
    catch (error) {
        console.error("Route comparison error:", error);
        res.status(500).json({ error: "Failed to compare paths" });
    }
}));
// Helper function to find the closest node to given coordinates
function findClosestNode(graph, x, y) {
    let closestNodeId = null;
    let minDistance = Infinity;
    graph.nodes.forEach((node, id) => {
        const distance = Math.sqrt(Math.pow(node.x - x, 2) + Math.pow(node.y - y, 2));
        if (distance < minDistance) {
            minDistance = distance;
            closestNodeId = id;
        }
    });
    return closestNodeId;
}
// Helper function to enhance path with road information
function enhancePathWithRoadInfo(roadPath, trafficData) {
    return __awaiter(this, void 0, void 0, function* () {
        // Map of road IDs to road information
        const roadMap = trafficData.reduce((map, road) => {
            map[road.id] = road;
            return map;
        }, {});
        // Enhance each road in the path with additional information
        return roadPath.map(roadId => {
            const road = roadMap[roadId];
            if (!road)
                return { id: roadId };
            return {
                id: roadId,
                startX: road.startX,
                startY: road.startY,
                endX: road.endX,
                endY: road.endY,
                roadType: road.roadType,
                density: road.density,
            };
        });
    });
}
exports.default = exports.routeOptimizationRouter;
