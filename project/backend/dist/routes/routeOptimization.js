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
        console.log("Find path request:", {
            mapId,
            startX,
            startY,
            endX,
            endY,
            algorithm,
            simulationParams
        });
        if (!mapId || startX === undefined || startY === undefined || endX === undefined || endY === undefined) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        // Ensure all coordinates are numbers
        const parsedStartX = Number(startX);
        const parsedStartY = Number(startY);
        const parsedEndX = Number(endX);
        const parsedEndY = Number(endY);
        if (isNaN(parsedStartX) || isNaN(parsedStartY) || isNaN(parsedEndX) || isNaN(parsedEndY)) {
            return res.status(400).json({ error: "Coordinates must be valid numbers" });
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
        console.log(`Found ${trafficData.length} traffic data items for map ${mapId}`);
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
        console.log(`Built graph with ${graph.nodes.size} nodes`);
        // Find the closest nodes to start and end points
        const startNodeId = findClosestNode(graph, parsedStartX, parsedStartY);
        const endNodeId = findClosestNode(graph, parsedEndX, parsedEndY);
        if (startNodeId === null) {
            return res.status(404).json({ error: "Could not locate valid start point on the map" });
        }
        if (endNodeId === null) {
            return res.status(404).json({ error: "Could not locate valid end point on the map" });
        }
        console.log(`Found start node ${startNodeId} and end node ${endNodeId}`);
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
            console.log(`Adjusting graph weights with parameters: ${JSON.stringify(params)}`);
            adjustedGraph = (0, pathfinding_1.adjustWeightsForSimulation)(graph, trafficData, params, events);
        }
        // Find the optimal path
        let pathResult;
        if (algorithm.toLowerCase() === "dijkstra") {
            console.log(`Finding path using Dijkstra algorithm from node ${startNodeId} to ${endNodeId}`);
            pathResult = (0, pathfinding_1.dijkstra)(adjustedGraph, startNodeId, endNodeId);
        }
        else {
            console.log(`Finding path using A* algorithm from node ${startNodeId} to ${endNodeId}`);
            pathResult = (0, pathfinding_1.aStar)(adjustedGraph, startNodeId, endNodeId);
        }
        if (!pathResult) {
            return res.status(404).json({
                error: "No valid path found between the specified points",
                details: {
                    startNodeId,
                    endNodeId,
                    graphSize: graph.nodes.size
                }
            });
        }
        console.log(`Found path with ${pathResult.path.length} nodes and ${pathResult.roadPath.length} road segments`);
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
        res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to find optimal path",
            details: error instanceof Error ? error.stack : undefined
        });
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
        console.log("Compare paths request:", {
            mapId,
            startX,
            startY,
            endX,
            endY,
            simulationParams
        });
        if (!mapId || startX === undefined || startY === undefined || endX === undefined || endY === undefined) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        // Ensure all coordinates are numbers
        const parsedStartX = Number(startX);
        const parsedStartY = Number(startY);
        const parsedEndX = Number(endX);
        const parsedEndY = Number(endY);
        if (isNaN(parsedStartX) || isNaN(parsedStartY) || isNaN(parsedEndX) || isNaN(parsedEndY)) {
            return res.status(400).json({ error: "Coordinates must be valid numbers" });
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
        console.log(`Found ${trafficData.length} traffic data items for map ${mapId}`);
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
        console.log(`Built graph with ${graph.nodes.size} nodes`);
        // Find the closest nodes to start and end points
        const startNodeId = findClosestNode(graph, parsedStartX, parsedStartY);
        const endNodeId = findClosestNode(graph, parsedEndX, parsedEndY);
        if (startNodeId === null) {
            return res.status(404).json({ error: "Could not locate valid start point on the map" });
        }
        if (endNodeId === null) {
            return res.status(404).json({ error: "Could not locate valid end point on the map" });
        }
        console.log(`Found start node ${startNodeId} and end node ${endNodeId}`);
        // Adjust weights based on simulation parameters and events
        let adjustedGraph = graph;
        if (simulationParams) {
            const params = {
                timeOfDay: simulationParams.timeOfDay || "MORNING",
                dayType: simulationParams.dayType || "WEEKDAY",
                weatherCondition: simulationParams.weatherCondition || "CLEAR",
                routingStrategy: simulationParams.routingStrategy || "SHORTEST_PATH",
            };
            console.log(`Adjusting graph weights with parameters: ${JSON.stringify(params)}`);
            adjustedGraph = (0, pathfinding_1.adjustWeightsForSimulation)(graph, trafficData, params, events);
        }
        // Find paths using both algorithms
        console.log(`Finding path using Dijkstra algorithm from node ${startNodeId} to ${endNodeId}`);
        const dijkstraResult = (0, pathfinding_1.dijkstra)(adjustedGraph, startNodeId, endNodeId);
        console.log(`Finding path using A* algorithm from node ${startNodeId} to ${endNodeId}`);
        const astarResult = (0, pathfinding_1.aStar)(adjustedGraph, startNodeId, endNodeId);
        if (!dijkstraResult && !astarResult) {
            return res.status(404).json({
                error: "No valid path found between the specified points",
                details: {
                    startNodeId,
                    endNodeId,
                    graphSize: graph.nodes.size
                }
            });
        }
        // Prepare results
        const results = {
            dijkstra: null,
            astar: null,
        };
        if (dijkstraResult) {
            console.log(`Dijkstra found path with ${dijkstraResult.path.length} nodes and ${dijkstraResult.roadPath.length} road segments`);
            const enhancedDijkstraPath = yield enhancePathWithRoadInfo(dijkstraResult.roadPath, trafficData);
            results.dijkstra = {
                path: dijkstraResult.path,
                roadPath: enhancedDijkstraPath,
                coordinatePath: dijkstraResult.coordinatePath,
                totalWeight: dijkstraResult.totalWeight,
                estimatedTimeMinutes: Math.round(dijkstraResult.totalWeight * 2)
            };
        }
        else {
            console.log("Dijkstra algorithm could not find a valid path");
        }
        if (astarResult) {
            console.log(`A* found path with ${astarResult.path.length} nodes and ${astarResult.roadPath.length} road segments`);
            const enhancedAstarPath = yield enhancePathWithRoadInfo(astarResult.roadPath, trafficData);
            results.astar = {
                path: astarResult.path,
                roadPath: enhancedAstarPath,
                coordinatePath: astarResult.coordinatePath,
                totalWeight: astarResult.totalWeight,
                estimatedTimeMinutes: Math.round(astarResult.totalWeight * 2)
            };
        }
        else {
            console.log("A* algorithm could not find a valid path");
        }
        res.status(200).json(results);
    }
    catch (error) {
        console.error("Route comparison error:", error);
        res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to compare paths",
            details: error instanceof Error ? error.stack : undefined
        });
    }
}));
// Helper function to find the closest node to given coordinates
function findClosestNode(graph, x, y) {
    if (!graph || !graph.nodes || graph.nodes.size === 0) {
        console.error("Cannot find closest node: Graph is empty or invalid");
        return null;
    }
    let closestNodeId = null;
    let minDistance = Infinity;
    // Ensure x and y are numbers
    const targetX = Number(x);
    const targetY = Number(y);
    if (isNaN(targetX) || isNaN(targetY)) {
        console.error(`Invalid coordinates: x=${x}, y=${y}`);
        return null;
    }
    // Log the target coordinates for debugging
    console.log(`Finding closest node to (${targetX}, ${targetY})`);
    let closestNodes = [];
    graph.nodes.forEach((node, id) => {
        // Ensure node coordinates are numbers
        const nodeX = Number(node.x);
        const nodeY = Number(node.y);
        if (isNaN(nodeX) || isNaN(nodeY)) {
            console.warn(`Node ${id} has invalid coordinates: (${node.x}, ${node.y})`);
            return;
        }
        const distance = Math.sqrt(Math.pow(nodeX - targetX, 2) + Math.pow(nodeY - targetY, 2));
        // Keep track of the closest 3 nodes for logging
        closestNodes.push({ id, x: nodeX, y: nodeY, distance });
        if (closestNodes.length > 3) {
            closestNodes.sort((a, b) => a.distance - b.distance);
            closestNodes = closestNodes.slice(0, 3);
        }
        if (distance < minDistance) {
            minDistance = distance;
            closestNodeId = id;
        }
    });
    // Log the closest nodes for debugging
    console.log(`Closest nodes: ${JSON.stringify(closestNodes)}`);
    if (closestNodeId === null) {
        console.error("Could not find any nodes close to the target coordinates");
        return null;
    }
    console.log(`Selected node ${closestNodeId} at distance ${minDistance}`);
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
