import express from "express";
import { PrismaClient } from "@prisma/client";
import { buildGraph, dijkstra, aStar, adjustWeightsForSimulation } from "../utils/pathfinding";

const prisma = new PrismaClient();

export const routeOptimizationRouter = express.Router();

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
routeOptimizationRouter.post("/find-path", async (req, res) => {
  try {
    const {
      mapId,
      startX,
      startY,
      endX,
      endY,
      algorithm = "astar", // Default to A* algorithm
      simulationParams,
    } = req.body;

    if (!mapId || startX === undefined || startY === undefined || endX === undefined || endY === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Fetch traffic data for the specified map
    const trafficData = await prisma.trafficData.findMany({
      where: {
        mapId: parseInt(mapId.toString()),
      },
    });

    if (trafficData.length === 0) {
      return res.status(404).json({ error: "No traffic data found for this map" });
    }

    // Fetch active events that might affect the route
    const today = new Date();
    const events = await prisma.event.findMany({
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
    const graph = buildGraph(trafficData);

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

      adjustedGraph = adjustWeightsForSimulation(graph, trafficData, params, events);
    }

    // Find the optimal path
    let pathResult;
    if (algorithm.toLowerCase() === "dijkstra") {
      pathResult = dijkstra(adjustedGraph, startNodeId, endNodeId);
    } else {
      pathResult = aStar(adjustedGraph, startNodeId, endNodeId);
    }

    if (!pathResult) {
      return res.status(404).json({ error: "No valid path found between the specified points" });
    }

    // Enhance the path result with road information
    const enhancedPath = await enhancePathWithRoadInfo(pathResult.roadPath, trafficData);

    res.status(200).json({
      algorithm: algorithm.toLowerCase(),
      path: pathResult.path,
      roadPath: enhancedPath,
      coordinatePath: pathResult.coordinatePath,
      totalWeight: pathResult.totalWeight,
      estimatedTimeMinutes: Math.round(pathResult.totalWeight * 2) // Simple conversion to minutes
    });

  } catch (error) {
    console.error("Route optimization error:", error);
    res.status(500).json({ error: "Failed to find optimal path" });
  }
});

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
routeOptimizationRouter.post("/compare-paths", async (req, res) => {
  try {
    const {
      mapId,
      startX,
      startY,
      endX,
      endY,
      simulationParams,
    } = req.body;

    if (!mapId || startX === undefined || startY === undefined || endX === undefined || endY === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Fetch traffic data for the specified map
    const trafficData = await prisma.trafficData.findMany({
      where: {
        mapId: parseInt(mapId.toString()),
      },
    });

    if (trafficData.length === 0) {
      return res.status(404).json({ error: "No traffic data found for this map" });
    }

    // Fetch active events that might affect the route
    const today = new Date();
    const events = await prisma.event.findMany({
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
    const graph = buildGraph(trafficData);

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

      adjustedGraph = adjustWeightsForSimulation(graph, trafficData, params, events);
    }

    // Find paths using both algorithms
    const dijkstraResult = dijkstra(adjustedGraph, startNodeId, endNodeId);
    const astarResult = aStar(adjustedGraph, startNodeId, endNodeId);

    if (!dijkstraResult && !astarResult) {
      return res.status(404).json({ error: "No valid path found between the specified points" });
    }

    // Prepare results
    const results: {
      dijkstra: null | {
        path: number[];
        roadPath: any[];
        coordinatePath: {x: number, y: number}[];
        totalWeight: number;
        estimatedTimeMinutes: number;
      };
      astar: null | {
        path: number[];
        roadPath: any[];
        coordinatePath: {x: number, y: number}[];
        totalWeight: number;
        estimatedTimeMinutes: number;
      };
    } = {
      dijkstra: null,
      astar: null,
    };

    if (dijkstraResult) {
      const enhancedDijkstraPath = await enhancePathWithRoadInfo(dijkstraResult.roadPath, trafficData);
      results.dijkstra = {
        path: dijkstraResult.path,
        roadPath: enhancedDijkstraPath,
        coordinatePath: dijkstraResult.coordinatePath,
        totalWeight: dijkstraResult.totalWeight,
        estimatedTimeMinutes: Math.round(dijkstraResult.totalWeight * 2) 
      };
    }

    if (astarResult) {
      const enhancedAstarPath = await enhancePathWithRoadInfo(astarResult.roadPath, trafficData);
      results.astar = {
        path: astarResult.path,
        roadPath: enhancedAstarPath,
        coordinatePath: astarResult.coordinatePath,
        totalWeight: astarResult.totalWeight,
        estimatedTimeMinutes: Math.round(astarResult.totalWeight * 2)
      };
    }

    res.status(200).json(results);
  } catch (error) {
    console.error("Route comparison error:", error);
    res.status(500).json({ error: "Failed to compare paths" });
  }
});

// Helper function to find the closest node to given coordinates
function findClosestNode(graph: { nodes: Map<number, { x: number; y: number }> }, x: number, y: number): number | null {
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

  // Define a proper type for the closest nodes array
  interface NodeDistance {
    id: number;
    x: number;
    y: number;
    distance: number;
  }
  
  let closestNodes: NodeDistance[] = [];
  
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
  console.log(`Selected node ${closestNodeId} at distance ${minDistance}`);

  return closestNodeId;
}

// Helper function to enhance path with road information
async function enhancePathWithRoadInfo(roadPath: number[], trafficData: any[]): Promise<any[]> {
  // Map of road IDs to road information
  const roadMap = trafficData.reduce((map: Record<number, any>, road) => {
    map[road.id] = road;
    return map;
  }, {});

  // Enhance each road in the path with additional information
  return roadPath.map(roadId => {
    const road = roadMap[roadId];
    if (!road) return { id: roadId };

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
}

export default routeOptimizationRouter; 