import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

interface Vehicle {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  color: string;
  size: number;
  direction: number;
  roadId: number;
  pathIndex?: number; // Index in the path array of points
  isReversed?: boolean; // Whether vehicle is traveling in reverse direction
}

interface TrafficData {
  id: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  points?: { x: number; y: number }[]; // Array of intermediate points for curved paths
  roadType: "HIGHWAY" | "NORMAL" | "RESIDENTIAL";
  density: "LOW" | "MEDIUM" | "HIGH" | "CONGESTED";
}

interface OptimalPath {
  algorithm: string;
  path: number[];
  roadPath: TrafficData[];
  coordinatePath: { x: number; y: number }[];
  totalWeight: number;
  estimatedTimeMinutes: number;
  description: string;
  // Additional properties used during comparison and analysis
  congestionPoints?: number;
  intersections?: number;
  highwaySegments?: number;
  highwayPercentage?: number;
  score?: number;
}

interface PathComparison {
  dijkstra: OptimalPath | null;
  astar: OptimalPath | null;
  trafficFlowWinner?: string;
  timeDifference?: number;
  winningReasons?: string;
}

interface TrafficMap {
  id: number;
  name: string;
  description: string;
  imageUrl: string;
  width: number;
  height: number;
  trafficData: TrafficData[];
}

interface SimulationParams {
  timeOfDay: "MORNING" | "AFTERNOON" | "EVENING" | "NIGHT";
  dayType: "WEEKDAY" | "WEEKEND" | "HOLIDAY";
  weatherCondition: "CLEAR" | "RAIN" | "SNOW" | "FOG";
  routingStrategy: "SHORTEST_PATH" | "BALANCED" | "AVOID_CONGESTION";
}

// Helper interface for shortest path calculation
interface RoadNode {
  id: number;
  x: number;
  y: number;
  roadData?: TrafficData;
  isStart?: boolean;
  isEnd?: boolean;
}

interface GraphNode {
  id: string; // Using string to handle both road IDs and special points
  x: number;
  y: number;
  neighbors: { id: string; distance: number; roadId: number }[];
  roadData?: TrafficData;
}

const ViewMapPage = (): React.ReactNode => {
  const { id } = useParams<{ id: string }>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [map, setMap] = useState<TrafficMap | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [simulationSpeed, setSimulationSpeed] = useState<number>(1);
  const [isSimulationRunning, setIsSimulationRunning] = useState(true);
  const animationRef = useRef<number | null>(null);

  // State for pathfinding
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(
    null
  );
  const [endPoint, setEndPoint] = useState<{ x: number; y: number } | null>(
    null
  );
  const [isSelectingPoints, setIsSelectingPoints] = useState<boolean>(false);
  const [optimalPath, setOptimalPath] = useState<OptimalPath | null>(null);
  const [isLoadingPath, setIsLoadingPath] = useState<boolean>(false);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<string>("astar");
  const [showPathComparison, setShowPathComparison] = useState<boolean>(false);
  const [pathComparison, setPathComparison] = useState<PathComparison | null>(
    null
  );
  const [simulationParams, setSimulationParams] = useState<SimulationParams>({
    timeOfDay: "MORNING",
    dayType: "WEEKDAY",
    weatherCondition: "CLEAR",
    routingStrategy: "SHORTEST_PATH",
  });
  // Add a new state variable for help message
  const [helpMessage, setHelpMessage] = useState<string | null>(null);

  // Fetch map data when component mounts
  useEffect(() => {
    if (id) {
      fetchMapData(parseInt(id));
    }
  }, [id]);

  // Animation loop
  useEffect(() => {
    if (isSimulationRunning && map && image) {
      // Clear any existing animation frame
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      console.log("Starting animation loop");
      animationRef.current = requestAnimationFrame(animateVehicles);
    }

    return () => {
      if (animationRef.current) {
        console.log("Cleaning up animation loop");
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [
    isSimulationRunning,
    map,
    image,
    startPoint,
    endPoint,
    optimalPath,
    pathComparison,
    showPathComparison,
    simulationSpeed,
  ]);

  const fetchMapData = async (mapId: number) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/api/traffic-map/${mapId}`);

      if (!response.ok) {
        throw new Error("Failed to fetch map data");
      }

      const data = await response.json();
      setMap(data);

      // Load the map image
      const img = new Image();
      img.onload = () => {
        setImage(img);
        initializeVehicles(data.trafficData);
        setIsLoading(false);
      };
      img.onerror = () => {
        setError("Failed to load map image");
        setIsLoading(false);
      };
      img.src = data.imageUrl;
    } catch (error) {
      setError("Error loading traffic map");
      setIsLoading(false);
    }
  };

  const initializeVehicles = (trafficData: TrafficData[]) => {
    const newVehicles: Vehicle[] = [];
    let vehicleId = 1;

    trafficData.forEach((road) => {
      const { startX, startY, endX, endY, roadType, density, points } = road;

      // Determine number of vehicles based on density
      let vehicleCount = 0;
      switch (density) {
        case "LOW":
          vehicleCount = Math.floor(Math.random() * 2) + 1; // 1-2 vehicles
          break;
        case "MEDIUM":
          vehicleCount = Math.floor(Math.random() * 3) + 3; // 3-5 vehicles
          break;
        case "HIGH":
          vehicleCount = Math.floor(Math.random() * 4) + 6; // 6-9 vehicles
          break;
        case "CONGESTED":
          vehicleCount = Math.floor(Math.random() * 5) + 10; // 10-14 vehicles
          break;
        default:
          vehicleCount = 2;
      }

      // Determine vehicle speed and size based on road type
      let baseSpeed = 0;
      let vehicleSize = 0;

      switch (roadType) {
        case "HIGHWAY":
          baseSpeed = 1.5;
          vehicleSize = 4;
          break;
        case "NORMAL":
          baseSpeed = 1.0;
          vehicleSize = 3;
          break;
        case "RESIDENTIAL":
          baseSpeed = 0.5;
          vehicleSize = 2;
          break;
        default:
          baseSpeed = 1.0;
          vehicleSize = 3;
      }

      // Prepare the complete path array for this road
      const completePath = [
        { x: startX, y: startY }, // Start point
        ...(points || []), // Intermediate points if exist
        { x: endX, y: endY }, // End point
      ];

      // Generate vehicles for this road
      for (let i = 0; i < vehicleCount; i++) {
        // Position along the path (0 to 1)
        const position = Math.random();

        // Determine path segment and exact position
        // For a position of 0.6 on a path with 3 segments, we want to be 0.8 of the way through segment 1
        let pathIndex = 0;
        let localPosition = 0;

        if (completePath.length > 1) {
          // Calculate total path length
          let totalLength = 0;
          let segmentLengths = [];

          for (let j = 0; j < completePath.length - 1; j++) {
            const length = Math.sqrt(
              Math.pow(completePath[j + 1].x - completePath[j].x, 2) +
                Math.pow(completePath[j + 1].y - completePath[j].y, 2)
            );
            segmentLengths.push(length);
            totalLength += length;
          }

          // Determine which segment we're on
          const targetDistance = position * totalLength;
          let distanceSoFar = 0;

          for (let j = 0; j < segmentLengths.length; j++) {
            if (targetDistance <= distanceSoFar + segmentLengths[j]) {
              // Found our segment
              pathIndex = j;
              localPosition =
                (targetDistance - distanceSoFar) / segmentLengths[j];
              break;
            }
            distanceSoFar += segmentLengths[j];
          }
        }

        // Calculate x, y based on path index and local position
        const current = completePath[pathIndex];
        const next = completePath[pathIndex + 1];

        const x = current.x + localPosition * (next.x - current.x);
        const y = current.y + localPosition * (next.y - current.y);

        // Calculate direction angle for this segment
        const direction = Math.atan2(next.y - current.y, next.x - current.x);

        // Vehicle color based on road type
        let color = "";
        switch (roadType) {
          case "HIGHWAY":
            color = "#0052cc"; // Blue
            break;
          case "NORMAL":
            color = "#00b300"; // Green
            break;
          case "RESIDENTIAL":
            color = "#e60000"; // Red
            break;
          default:
            color = "#000000"; // Black
        }

        // Add some speed variation between vehicles
        const speedVariation = 0.8 + Math.random() * 0.4; // 0.8 to 1.2

        // Randomly decide if vehicle is traveling forward or reverse
        const isReversed = Math.random() > 0.5;

        // Set target as next or previous point based on direction
        const targetPointIndex = isReversed
          ? pathIndex === 0
            ? 0
            : pathIndex - 1
          : pathIndex === completePath.length - 2
          ? completePath.length - 1
          : pathIndex + 2;

        const targetPoint =
          completePath[
            Math.min(Math.max(0, targetPointIndex), completePath.length - 1)
          ];

        newVehicles.push({
          id: vehicleId++,
          x,
          y,
          targetX: targetPoint.x,
          targetY: targetPoint.y,
          speed: baseSpeed * speedVariation,
          color,
          size: vehicleSize,
          direction,
          roadId: road.id,
          pathIndex,
          isReversed,
        });
      }
    });

    setVehicles(newVehicles);
  };

  // New function to calculate the shortest path in the frontend
  const calculateShortestPath = (
    start: { x: number; y: number },
    end: { x: number; y: number },
    roadData: TrafficData[]
  ): OptimalPath | null => {
    console.log("Calculating shortest path...", start, end, roadData.length);

    if (!roadData || roadData.length === 0) {
      console.error("No road data available");
      return null;
    }

    // Create a simplified graph representation
    const { graph, roadNodes } = buildGraphFromRoads(roadData, start, end);

    if (Object.keys(graph).length === 0) {
      console.error("Failed to build valid graph");
      return null;
    }

    // Find the nearest road nodes to start and end points
    const startNodeId = findNearestNodeId(start, graph);
    const endNodeId = findNearestNodeId(end, graph);

    if (!startNodeId || !endNodeId) {
      console.error("Could not find valid start/end nodes");
      return null;
    }

    console.log("Start node:", startNodeId, "End node:", endNodeId);

    // Calculate the shortest path using Dijkstra's algorithm
    const { distance, path } = dijkstraShortestPath(
      graph,
      startNodeId,
      endNodeId
    );

    if (!path || path.length === 0) {
      console.error("No path found");
      return null;
    }

    console.log("Found path:", path, "with distance:", distance);

    // Convert node path to road path
    const roadPath: TrafficData[] = [];
    const roadIds: number[] = [];
    const coordinatePath: { x: number; y: number }[] = [];

    // Add the starting point
    coordinatePath.push({ x: start.x, y: start.y });

    // Build the final path
    let prevRoadId: number | null = null;

    path.forEach((nodeId, index) => {
      if (index === 0) return; // Skip the start node

      const parts = nodeId.split(":");
      if (parts.length < 2) return;

      const [type, id] = parts;

      if (type === "road" && id) {
        const roadId = parseInt(id);
        if (isNaN(roadId)) return;

        const road = roadData.find((r) => r.id === roadId);

        if (road && roadId !== prevRoadId) {
          roadPath.push(road);
          roadIds.push(road.id);
          prevRoadId = roadId;

          // Add the endpoints and intermediate points to the coordinate path
          if (road.points && road.points.length > 0) {
            road.points.forEach((point) => {
              coordinatePath.push({ x: point.x, y: point.y });
            });
          }

          // Add the end point of the road
          coordinatePath.push({ x: road.endX, y: road.endY });
        }
      }
    });

    // Add the ending point if not already included
    const lastPoint = coordinatePath[coordinatePath.length - 1];
    if (lastPoint.x !== end.x || lastPoint.y !== end.y) {
      coordinatePath.push({ x: end.x, y: end.y });
    }

    // Calculate path statistics
    const congestionPoints = countCongestionPoints({ roadPath } as OptimalPath);
    const intersections = countIntersections({ roadPath } as OptimalPath);
    const highwaySegments = roadPath.filter(
      (r) => r.roadType === "HIGHWAY"
    ).length;
    const highwayPercentage =
      roadPath.length > 0 ? (highwaySegments / roadPath.length) * 100 : 0;

    // Calculate total weight (distance)
    const totalWeight = calculatePathDistance(coordinatePath);

    // Estimate time based on distance and road types
    const estimatedTimeMinutes = calculateEstimatedTime(roadPath, totalWeight);

    // Create a description for the path
    const description = getPathDescription(
      {
        roadPath,
        totalWeight,
        estimatedTimeMinutes,
        congestionPoints,
        intersections,
        highwaySegments,
        highwayPercentage,
      } as OptimalPath,
      "shortest"
    );

    return {
      algorithm: "shortest",
      path: roadIds,
      roadPath,
      coordinatePath,
      totalWeight,
      estimatedTimeMinutes,
      description,
      congestionPoints,
      intersections,
      highwaySegments,
      highwayPercentage,
      score: totalWeight * (1 + congestionPoints * 0.1 + intersections * 0.05),
    };
  };

  // Helper function to build a graph from the road data
  const buildGraphFromRoads = (
    roadData: TrafficData[],
    startPoint: { x: number; y: number },
    endPoint: { x: number; y: number }
  ) => {
    const graph: Record<string, GraphNode> = {};
    const roadNodes: RoadNode[] = [];

    console.log("Building graph with start", startPoint, "and end", endPoint);

    // Create nodes for all road endpoints and intermediate points
    roadData.forEach((road) => {
      // Skip invalid road data
      if (
        !road ||
        road.startX === undefined ||
        road.startY === undefined ||
        road.endX === undefined ||
        road.endY === undefined
      ) {
        console.warn("Skipping invalid road:", road);
        return;
      }

      // Start point
      const startNodeId = `road:${road.id}:start`;
      graph[startNodeId] = {
        id: startNodeId,
        x: road.startX,
        y: road.startY,
        neighbors: [],
        roadData: road,
      };

      roadNodes.push({
        id: road.id,
        x: road.startX,
        y: road.startY,
        roadData: road,
      });

      // End point
      const endNodeId = `road:${road.id}:end`;
      graph[endNodeId] = {
        id: endNodeId,
        x: road.endX,
        y: road.endY,
        neighbors: [],
        roadData: road,
      };

      roadNodes.push({
        id: road.id,
        x: road.endX,
        y: road.endY,
        roadData: road,
      });

      // Add intermediate points if available
      const intermediateNodes: string[] = [];

      if (road.points && Array.isArray(road.points) && road.points.length > 0) {
        road.points.forEach((point, idx) => {
          // Ensure point has valid x and y coordinates
          if (
            !point ||
            typeof point !== "object" ||
            !("x" in point) ||
            !("y" in point) ||
            point.x === undefined ||
            point.y === undefined ||
            isNaN(point.x) ||
            isNaN(point.y)
          ) {
            console.warn(`Skipping invalid point at index ${idx}:`, point);
            return;
          }

          const typedPoint = point as { x: number; y: number };
          const pointNodeId = `road:${road.id}:point:${idx}`;

          graph[pointNodeId] = {
            id: pointNodeId,
            x: typedPoint.x,
            y: typedPoint.y,
            neighbors: [],
            roadData: road,
          };

          intermediateNodes.push(pointNodeId);

          roadNodes.push({
            id: road.id,
            x: typedPoint.x,
            y: typedPoint.y,
            roadData: road,
          });
        });
      }

      // Connect the road nodes to form the road
      const allRoadNodes = [startNodeId, ...intermediateNodes, endNodeId];

      // Connect nodes sequentially along the road
      for (let i = 0; i < allRoadNodes.length - 1; i++) {
        const currentId = allRoadNodes[i];
        const nextId = allRoadNodes[i + 1];

        if (!graph[currentId] || !graph[nextId]) {
          console.warn(
            `Skipping edge due to missing node: ${currentId} -> ${nextId}`
          );
          continue;
        }

        const current = graph[currentId];
        const next = graph[nextId];

        const distance = calculateDistance(
          current.x,
          current.y,
          next.x,
          next.y
        );

        // Road connections are bidirectional
        current.neighbors.push({
          id: nextId,
          distance,
          roadId: road.id,
        });

        next.neighbors.push({
          id: currentId,
          distance,
          roadId: road.id,
        });
      }
    });

    // Add special nodes for start and end points
    const startNodeId = "special:start";
    graph[startNodeId] = {
      id: startNodeId,
      x: startPoint.x,
      y: startPoint.y,
      neighbors: [],
    };

    const endNodeId = "special:end";
    graph[endNodeId] = {
      id: endNodeId,
      x: endPoint.x,
      y: endPoint.y,
      neighbors: [],
    };

    // Connect start and end to nearby road nodes with increased connection distance for better pathfinding
    const MAX_CONNECTION_DISTANCE = 80; // Increased maximum distance to connect paths

    // Connect start node to nearby road nodes
    Object.values(graph).forEach((node) => {
      if (node.id === startNodeId || node.id === endNodeId) return;

      const distToStart = calculateDistance(
        startPoint.x,
        startPoint.y,
        node.x,
        node.y
      );

      if (distToStart <= MAX_CONNECTION_DISTANCE) {
        graph[startNodeId].neighbors.push({
          id: node.id,
          distance: distToStart,
          roadId: node.roadData?.id || 0,
        });

        node.neighbors.push({
          id: startNodeId,
          distance: distToStart,
          roadId: node.roadData?.id || 0,
        });
      }

      const distToEnd = calculateDistance(
        endPoint.x,
        endPoint.y,
        node.x,
        node.y
      );

      if (distToEnd <= MAX_CONNECTION_DISTANCE) {
        graph[endNodeId].neighbors.push({
          id: node.id,
          distance: distToEnd,
          roadId: node.roadData?.id || 0,
        });

        node.neighbors.push({
          id: endNodeId,
          distance: distToEnd,
          roadId: node.roadData?.id || 0,
        });
      }
    });

    // Initialize road intersections - connect nodes that are very close to each other
    const INTERSECTION_THRESHOLD = 15; // Increased threshold slightly for better connections

    for (let i = 0; i < roadNodes.length; i++) {
      const node1 = roadNodes[i];

      for (let j = i + 1; j < roadNodes.length; j++) {
        const node2 = roadNodes[j];

        // Skip nodes from the same road
        if (node1.id === node2.id) continue;

        const dist = calculateDistance(node1.x, node1.y, node2.x, node2.y);

        if (dist <= INTERSECTION_THRESHOLD) {
          // Find the corresponding graph nodes
          const graphNodeIds1 = Object.keys(graph).filter(
            (id) => graph[id].x === node1.x && graph[id].y === node1.y
          );

          const graphNodeIds2 = Object.keys(graph).filter(
            (id) => graph[id].x === node2.x && graph[id].y === node2.y
          );

          // Connect all matching nodes (could be multiple due to overlapping road points)
          graphNodeIds1.forEach((id1) => {
            graphNodeIds2.forEach((id2) => {
              // Add bidirectional connections
              if (!graph[id1].neighbors.some((n) => n.id === id2)) {
                graph[id1].neighbors.push({
                  id: id2,
                  distance: dist,
                  roadId: node2.id,
                });
              }

              if (!graph[id2].neighbors.some((n) => n.id === id1)) {
                graph[id2].neighbors.push({
                  id: id1,
                  distance: dist,
                  roadId: node1.id,
                });
              }
            });
          });
        }
      }
    }

    // Check if we have any working connections
    if (graph[startNodeId].neighbors.length === 0) {
      console.warn("Start node has no connections!");
    }

    if (graph[endNodeId].neighbors.length === 0) {
      console.warn("End node has no connections!");
    }

    return { graph, roadNodes };
  };

  // Find the nearest node ID to a point - improved to handle errors
  const findNearestNodeId = (
    point: { x: number; y: number },
    graph: Record<string, GraphNode>
  ): string | null => {
    if (
      !point ||
      point.x === undefined ||
      point.y === undefined ||
      isNaN(point.x) ||
      isNaN(point.y)
    ) {
      console.error("Invalid point:", point);
      return null;
    }

    let nearestId: string | null = null;
    let minDistance = Number.MAX_VALUE;

    Object.entries(graph).forEach(([id, node]) => {
      // Skip special nodes
      if (id === "special:start" || id === "special:end") return;

      if (
        node.x === undefined ||
        node.y === undefined ||
        isNaN(node.x) ||
        isNaN(node.y)
      ) {
        return;
      }

      const dist = calculateDistance(point.x, point.y, node.x, node.y);

      if (dist < minDistance) {
        minDistance = dist;
        nearestId = id;
      }
    });

    return nearestId;
  };

  // Calculate distance between two points
  const calculateDistance = (
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): number => {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  };

  // Calculate total path distance
  const calculatePathDistance = (
    points: { x: number; y: number }[]
  ): number => {
    let distance = 0;

    for (let i = 0; i < points.length - 1; i++) {
      distance += calculateDistance(
        points[i].x,
        points[i].y,
        points[i + 1].x,
        points[i + 1].y
      );
    }

    return distance;
  };

  // Estimate travel time based on road types and traffic density
  const calculateEstimatedTime = (
    roadPath: TrafficData[],
    distance: number
  ): number => {
    if (roadPath.length === 0) return 0;

    // Base speed in arbitrary units
    const baseSpeed = 60; // 60 units per minute

    // Speed factors for different road types
    const roadTypeSpeedFactor = {
      HIGHWAY: 1.5,
      NORMAL: 1.0,
      RESIDENTIAL: 0.7,
    };

    // Congestion factors
    const densityFactor = {
      LOW: 1.0,
      MEDIUM: 0.8,
      HIGH: 0.6,
      CONGESTED: 0.3,
    };

    // Calculate weighted average speed
    let totalLength = 0;
    let weightedSpeed = 0;

    for (let i = 0; i < roadPath.length; i++) {
      const road = roadPath[i];
      const roadLength = calculateDistance(
        road.startX,
        road.startY,
        road.endX,
        road.endY
      );

      const roadSpeed =
        baseSpeed *
        roadTypeSpeedFactor[road.roadType] *
        densityFactor[road.density];

      totalLength += roadLength;
      weightedSpeed += roadSpeed * roadLength;
    }

    if (totalLength === 0) {
      return distance / baseSpeed;
    }

    const avgSpeed = weightedSpeed / totalLength;
    return distance / avgSpeed;
  };

  // Implementation of Dijkstra's algorithm for shortest path
  const dijkstraShortestPath = (
    graph: Record<string, GraphNode>,
    startId: string,
    endId: string
  ): { distance: number; path: string[] } => {
    const distances: Record<string, number> = {};
    const previous: Record<string, string> = {}; // Not allowing null values here
    const unvisited = new Set<string>();

    // Initialize
    Object.keys(graph).forEach((nodeId) => {
      distances[nodeId] = nodeId === startId ? 0 : Infinity;
      // Use empty string instead of null to avoid TypeScript null index errors
      previous[nodeId] = "";
      unvisited.add(nodeId);
    });

    while (unvisited.size > 0) {
      // Find the unvisited node with the smallest distance
      let minDistance = Infinity;
      let current = "";

      unvisited.forEach((nodeId) => {
        if (distances[nodeId] < minDistance) {
          minDistance = distances[nodeId];
          current = nodeId;
        }
      });

      // If we can't find a node or we've reached the end, break
      if (current === "" || current === endId || minDistance === Infinity) {
        break;
      }

      unvisited.delete(current);

      // Visit each neighbor
      if (current in graph && graph[current]?.neighbors) {
        graph[current].neighbors.forEach((neighbor) => {
          if (!unvisited.has(neighbor.id)) return;

          const edgeWeight = neighbor.distance;

          // Weight adjustment based on road type and density
          let roadFactor = 1.0;

          if (
            neighbor.roadId &&
            neighbor.id in graph &&
            graph[neighbor.id]?.roadData
          ) {
            const road = graph[neighbor.id].roadData;

            // Prefer highways
            if (road?.roadType === "HIGHWAY") {
              roadFactor *= 0.8;
            } else if (road?.roadType === "RESIDENTIAL") {
              roadFactor *= 1.2;
            }

            // Avoid congested roads
            if (road?.density === "HIGH") {
              roadFactor *= 1.5;
            } else if (road?.density === "CONGESTED") {
              roadFactor *= 2.0;
            }
          }

          const weight = edgeWeight * roadFactor;
          const totalDistance = distances[current] + weight;

          if (totalDistance < distances[neighbor.id]) {
            distances[neighbor.id] = totalDistance;
            previous[neighbor.id] = current;
          }
        });
      }
    }

    // Build the path
    const path: string[] = [];

    // Check if we found a path to the endId
    if (!(endId in distances) || distances[endId] === Infinity) {
      return { distance: Infinity, path: [] };
    }

    // Build the path from end to start
    let current = endId;

    while (current && current !== "") {
      path.unshift(current);
      current = previous[current];
    }

    return {
      distance: distances[endId],
      path: path.length > 1 ? path : [],
    };
  };

  // Generate a description of the path based on the algorithm and path characteristics
  const getPathDescription = (path: OptimalPath, algorithm: string): string => {
    const congestionPoints = countCongestionPoints(path);
    const intersections = countIntersections(path);
    const highwaySegments = path.roadPath.filter(
      (r: TrafficData) => r.roadType === "HIGHWAY"
    ).length;
    const highwayPercentage = Math.round(
      (highwaySegments / path.roadPath.length) * 100
    );

    // Calculate estimated congestion delay as a percentage of the trip
    const congestedSegments = path.roadPath.filter(
      (r: TrafficData) => r.density === "CONGESTED"
    ).length;
    const highTrafficSegments = path.roadPath.filter(
      (r: TrafficData) => r.density === "HIGH"
    ).length;
    const congestionImpact =
      (congestedSegments * 0.4 + highTrafficSegments * 0.2) /
      path.roadPath.length;
    const congestionDelayMinutes = Math.round(
      path.estimatedTimeMinutes * congestionImpact
    );

    let description = `This route was calculated using the Shortest Path algorithm. `;

    // Highway description
    if (highwayPercentage > 70) {
      description += `It primarily uses highways (${highwayPercentage}% of the route). `;
    } else if (highwayPercentage > 30) {
      description += `It uses a mix of highways (${highwayPercentage}%) and local roads. `;
    } else {
      description += `It mostly uses local roads. `;
    }

    // Congestion description
    if (congestionPoints === 0) {
      description += "It avoids all congested areas. ";
    } else if (congestionPoints === 1) {
      description += "It passes through 1 congested area. ";
    } else {
      description += `It passes through ${congestionPoints} congested areas. `;
    }

    // Traffic flow and intersections
    if (intersections <= 1) {
      description +=
        "With minimal intersections, this route minimizes the 'traffic snake' effect. ";
    } else if (intersections <= 3) {
      description +=
        "This route has a few intersections where traffic flow might slow down. ";
    } else {
      description +=
        "This route has several intersections which may create traffic snakes during peak hours. ";
    }

    // Time estimate
    description += `Estimated travel time is ${formatTime(
      path.estimatedTimeMinutes
    )}`;

    // Add congestion delay if significant
    if (congestionDelayMinutes > 2) {
      description += ` including approximately ${congestionDelayMinutes} minutes of potential delay due to traffic.`;
    } else {
      description += ".";
    }

    return description;
  };

  const comparePathAlgorithms = async () => {
    // Use the shortest path directly instead of comparing
    findOptimalPath();
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSelectingPoints || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    // Account for canvas scaling by applying a scale factor
    // This fixes the issue of coordinates not being accurately captured
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // Calculate the actual coordinates on the canvas
    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);

    console.log(`Canvas click at: (${x}, ${y})`);

    // Clear any existing error messages when attempting to select new points
    setError(null);

    // Find nearest road point or intersection for more accurate selection
    const nearestPoint = findNearestRoadPoint(x, y);

    // Only use the nearest point if it's actually close to a road
    // This ensures we don't select points in empty spaces where no path can be found
    const validPoint =
      nearestPoint || (isPointNearRoad(x, y) ? { x, y } : null);

    if (!validPoint) {
      // Show feedback that this click isn't near any roads
      const ctx = canvas.getContext("2d");
      if (ctx && map) {
        // Add temporary visual feedback
        ctx.save();
        ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 0, 0, 0.8)";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        // Show warning text
        ctx.save();
        ctx.font = "14px Arial";
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(255, 0, 0, 0.8)";
        ctx.fillText("Please click near a road", x, y - 30);
        ctx.restore();

        // Set an error message for the user
        setError("Please click near a road to select valid start/end points");

        // Clear the feedback after a short delay
        setTimeout(() => {
          if (image && map) {
            // Redraw the canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

            // Redraw roads
            map.trafficData.forEach((road: TrafficData) => {
              const { startX, startY, endX, endY, roadType, density, points } =
                road;

              // Set line style
              ctx.lineWidth = getRoadWidth(roadType);
              ctx.strokeStyle = getRoadColor(density);
              ctx.lineCap = "round";
              ctx.lineJoin = "round";

              // Draw the road
              ctx.beginPath();
              ctx.moveTo(startX, startY);

              if (points && points.length > 0) {
                points.forEach((point) => {
                  ctx.lineTo(point.x, point.y);
                });
              }

              ctx.lineTo(endX, endY);
              ctx.stroke();
            });

            // Redraw any existing start/end points
            if (startPoint) {
              drawPathPoint(ctx, startPoint.x, startPoint.y, "#1976D2");
            }
          }
        }, 1500);
      }

      return; // Don't proceed with invalid points
    }

    if (!startPoint) {
      setStartPoint(validPoint);
      console.log(`Set start point:`, JSON.stringify(validPoint));

      // Add visual feedback for the selected start point
      const ctx = canvas.getContext("2d");
      if (ctx && image && map) {
        // Redraw the canvas to show the current point
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

        // Redraw roads
        map.trafficData.forEach((road: TrafficData) => {
          const { startX, startY, endX, endY, roadType, density, points } =
            road;

          // Set line style
          ctx.lineWidth = getRoadWidth(roadType);
          ctx.strokeStyle = getRoadColor(density);
          ctx.lineCap = "round";
          ctx.lineJoin = "round";

          // Draw the road
          ctx.beginPath();
          ctx.moveTo(startX, startY);

          if (points && points.length > 0) {
            points.forEach((point) => {
              ctx.lineTo(point.x, point.y);
            });
          }

          ctx.lineTo(endX, endY);
          ctx.stroke();
        });

        // Draw the start point
        drawPathPoint(ctx, validPoint.x, validPoint.y, "#1976D2");

        // Add text to instruct about the next step
        ctx.save();
        ctx.font = "16px Arial";
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(33, 150, 243, 0.8)";
        ctx.fillText("Now click to set your destination", canvas.width / 2, 30);
        ctx.restore();
      }
    } else if (!endPoint) {
      // Don't allow selecting the same point as start and end
      if (
        Math.abs(validPoint.x - startPoint.x) < 10 &&
        Math.abs(validPoint.y - startPoint.y) < 10
      ) {
        // Provide feedback that this is too close to start point
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.save();
          ctx.font = "14px Arial";
          ctx.textAlign = "center";
          ctx.fillStyle = "rgba(255, 0, 0, 0.8)";
          ctx.fillText(
            "Please select a different end point",
            validPoint.x,
            validPoint.y - 30
          );
          ctx.restore();
        }
        setError(
          "Start and end points are too close. Please select different points."
        );
        return;
      }

      setEndPoint(validPoint);
      console.log(`Set end point:`, JSON.stringify(validPoint));

      // Provide visual feedback that the endpoint has been set
      const ctx = canvas.getContext("2d");
      if (ctx && startPoint) {
        // Draw the end point
        drawPathPoint(ctx, validPoint.x, validPoint.y, "#FF5722");

        // Add text to show we're calculating
        ctx.save();
        ctx.font = "16px Arial";
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(33, 150, 243, 0.8)";
        ctx.fillText("Calculating route...", canvas.width / 2, 30);
        ctx.restore();
      }

      // Automatically find path when both points are selected
      // Increased timeout to ensure state is updated
      setTimeout(() => {
        if (startPoint && validPoint) {
          console.log(
            "Finding path between:",
            JSON.stringify(startPoint),
            "and",
            JSON.stringify(validPoint)
          );

          // Ensure both points are set in state before finding path
          setEndPoint(validPoint);

          // Use a small delay to ensure state is updated
          setTimeout(() => {
            // Double check that both points are available in state
            if (startPoint && endPoint) {
              findOptimalPath();
            } else {
              console.error("Failed to set start/end points properly");
              setError("Failed to set start/end points. Please try again.");
              // Fall back to direct points if state update is inconsistent
              const start = startPoint;
              const end = validPoint;

              if (start && end && map) {
                // Run findOptimalPath with explicit points
                console.log("Using explicit points for path finding");
                setIsLoadingPath(true);

                try {
                  const result = calculateShortestPath(
                    start,
                    end,
                    map.trafficData
                  );
                  if (result) {
                    setOptimalPath(result);
                    setPathComparison(null);
                    setIsSelectingPoints(false);
                    setError(null);
                  } else {
                    setError(
                      "No valid path found between points. Please try different locations."
                    );
                  }
                } catch (error) {
                  console.error("Path calculation error:", error);
                  setError(
                    "Error calculating path. Please try different points."
                  );
                } finally {
                  setIsLoadingPath(false);
                }
              }
            }
          }, 100);
        } else {
          setError("Invalid points selected. Please try again.");
        }
      }, 500); // Increased timeout for more reliability
    }
  };

  // Find the nearest road point or intersection to make selection more accurate
  const findNearestRoadPoint = (
    x: number,
    y: number
  ): { x: number; y: number } | null => {
    if (!map || !map.trafficData) {
      console.error(
        "Cannot find nearest road point: Map or traffic data is missing"
      );
      return null;
    }

    const DISTANCE_THRESHOLD = 50; // Increased threshold for better point selection
    let nearestPoint: { x: number; y: number } | null = null;
    let minDistance = DISTANCE_THRESHOLD;

    // Check endpoints and intermediate points
    map.trafficData.forEach((road) => {
      // Skip invalid roads
      if (
        !road ||
        road.startX === undefined ||
        road.startY === undefined ||
        road.endX === undefined ||
        road.endY === undefined
      ) {
        return;
      }

      // Check start point
      const distToStart = Math.sqrt(
        Math.pow(road.startX - x, 2) + Math.pow(road.startY - y, 2)
      );
      if (distToStart < minDistance) {
        minDistance = distToStart;
        nearestPoint = { x: road.startX, y: road.startY };
      }

      // Check end point
      const distToEnd = Math.sqrt(
        Math.pow(road.endX - x, 2) + Math.pow(road.endY - y, 2)
      );
      if (distToEnd < minDistance) {
        minDistance = distToEnd;
        nearestPoint = { x: road.endX, y: road.endY };
      }

      // Check intermediate points if available
      if (road.points && Array.isArray(road.points) && road.points.length > 0) {
        road.points.forEach((point) => {
          if (
            typeof point === "object" &&
            point !== null &&
            "x" in point &&
            "y" in point &&
            point.x !== undefined &&
            point.y !== undefined &&
            !isNaN(point.x) &&
            !isNaN(point.y)
          ) {
            const distToPoint = Math.sqrt(
              Math.pow((point as { x: number; y: number }).x - x, 2) +
                Math.pow((point as { x: number; y: number }).y - y, 2)
            );
            if (distToPoint < minDistance) {
              minDistance = distToPoint;
              nearestPoint = {
                x: (point as { x: number; y: number }).x,
                y: (point as { x: number; y: number }).y,
              };
            }
          }
        });
      }

      // Check points along road segments
      let prevX = road.startX;
      let prevY = road.startY;

      // Add intermediate points if available
      if (road.points && Array.isArray(road.points) && road.points.length > 0) {
        road.points.forEach((point) => {
          if (
            typeof point === "object" &&
            point !== null &&
            "x" in point &&
            "y" in point &&
            point.x !== undefined &&
            point.y !== undefined &&
            !isNaN(point.x) &&
            !isNaN(point.y)
          ) {
            const typedPoint = point as { x: number; y: number };
            // For each segment, find the closest point
            const closestPoint = getClosestPointOnSegment(
              x,
              y,
              prevX,
              prevY,
              typedPoint.x,
              typedPoint.y
            );

            if (closestPoint) {
              const distance = Math.sqrt(
                Math.pow(closestPoint.x - x, 2) +
                  Math.pow(closestPoint.y - y, 2)
              );

              if (distance < minDistance) {
                minDistance = distance;
                nearestPoint = {
                  x: Math.round(closestPoint.x),
                  y: Math.round(closestPoint.y),
                };
              }
            }

            prevX = typedPoint.x;
            prevY = typedPoint.y;
          }
        });
      }

      // Final segment to endpoint
      const closestPoint = getClosestPointOnSegment(
        x,
        y,
        prevX,
        prevY,
        road.endX,
        road.endY
      );

      if (closestPoint) {
        const distance = Math.sqrt(
          Math.pow(closestPoint.x - x, 2) + Math.pow(closestPoint.y - y, 2)
        );

        if (distance < minDistance) {
          minDistance = distance;
          nearestPoint = {
            x: Math.round(closestPoint.x),
            y: Math.round(closestPoint.y),
          };
        }
      }
    });

    return nearestPoint;
  };

  // Helper function to get the closest point on a line segment to a given point
  const getClosestPointOnSegment = (
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): { x: number; y: number } | null => {
    const dx = x2 - x1;
    const dy = y2 - y1;

    // Handle the case where the segment is just a point
    if (dx === 0 && dy === 0) {
      return { x: x1, y: y1 };
    }

    // Calculate the squared length of the segment
    const segmentLengthSquared = dx * dx + dy * dy;

    // Calculate the projection of the point onto the segment
    const t = Math.max(
      0,
      Math.min(1, ((px - x1) * dx + (py - y1) * dy) / segmentLengthSquared)
    );

    // Calculate the closest point coordinates
    return {
      x: x1 + t * dx,
      y: y1 + t * dy,
    };
  };

  const resetPathfinding = () => {
    setStartPoint(null);
    setEndPoint(null);
    setOptimalPath(null);
    setPathComparison(null);
    setIsSelectingPoints(false);
    setShowPathComparison(false);
    setHelpMessage(null);
  };

  const startPathSelection = () => {
    resetPathfinding();
    setIsSelectingPoints(true);
    setSelectedAlgorithm("shortest");

    // Set a clear user instruction
    setError(null);
    setHelpMessage(
      "Click on the map to set your starting point, then click again to set your destination. Choose points near roads for accurate paths."
    );

    // Add visual feedback to help user understand they need to click on the map
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Highlight the canvas with a subtle overlay to indicate selection mode
        ctx.save();
        ctx.fillStyle = "rgba(33, 150, 243, 0.1)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Add instructional text
        ctx.font = "16px Arial";
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(33, 150, 243, 0.8)";
        ctx.fillText(
          "Click on the map to set your starting point",
          canvas.width / 2,
          canvas.height / 2 - 20
        );
        ctx.fillText(
          "Then click again to set your destination",
          canvas.width / 2,
          canvas.height / 2 + 20
        );
        ctx.restore();
      }
    }

    // Show visual cue on the cursor when hovering over the canvas
    if (canvasRef.current) {
      canvasRef.current.style.cursor = "crosshair";
    }
  };

  const animateVehicles = () => {
    if (!map || !image || !canvasRef.current) {
      animationRef.current = requestAnimationFrame(animateVehicles);
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      animationRef.current = requestAnimationFrame(animateVehicles);
      return;
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the map image
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    // Apply a slight dim effect to make routes more visible
    if (optimalPath || showPathComparison) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Draw roads with improved rendering
    map.trafficData.forEach((road) => {
      const { startX, startY, endX, endY, roadType, density, points } = road;

      // Set line style based on road type and density
      const roadWidth = getRoadWidth(roadType);
      ctx.lineWidth = roadWidth;

      // Two-pass drawing for better aesthetics:
      // 1. Draw all roads with a dark base color for better visibility
      ctx.strokeStyle = "rgba(60, 60, 60, 0.8)";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Draw the road base
      ctx.beginPath();

      // Start path
      ctx.moveTo(startX, startY);

      if (points && points.length > 0) {
        // Draw through all intermediate points
        points.forEach((point) => {
          ctx.lineTo(point.x, point.y);
        });
      }

      // Draw to end point
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // 2. Draw the colored overlay based on traffic density
      // Slightly thinner than the base for a "border" effect
      ctx.lineWidth = roadWidth * 0.8;
      ctx.strokeStyle = getRoadColor(density);

      ctx.beginPath();
      ctx.moveTo(startX, startY);

      if (points && points.length > 0) {
        points.forEach((point) => {
          ctx.lineTo(point.x, point.y);
        });
      }

      ctx.lineTo(endX, endY);
      ctx.stroke();

      // For highway roads, add dashed center line
      if (roadType === "HIGHWAY") {
        ctx.save();
        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
        ctx.setLineDash([5, 10]); // Create dashed line effect

        ctx.beginPath();
        ctx.moveTo(startX, startY);

        if (points && points.length > 0) {
          points.forEach((point) => {
            ctx.lineTo(point.x, point.y);
          });
        }

        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.restore();
      }
    });

    // Draw the comparison paths if enabled
    if (showPathComparison && pathComparison) {
      // Draw traffic information visualization
      // Use blue highlight for the path
      if (
        optimalPath &&
        optimalPath.roadPath &&
        optimalPath.roadPath.length > 0
      ) {
        drawOptimalPath(ctx, optimalPath, "#2196f3", 6);
      }
    } else if (
      optimalPath &&
      optimalPath.roadPath &&
      optimalPath.roadPath.length > 0
    ) {
      // Use a blue highlight color similar to Google Maps for the single optimal path
      drawOptimalPath(ctx, optimalPath, "#2196f3", 6);
    }

    // Always draw start and end points if available - improved visibility
    if (startPoint) {
      drawPathPoint(ctx, startPoint.x, startPoint.y, "#1976D2"); // Blue for start
    }
    if (endPoint) {
      drawPathPoint(ctx, endPoint.x, endPoint.y, "#D32F2F"); // Red for end
    }

    // Group vehicles by road for collision detection
    const vehiclesByRoad = vehicles.reduce((acc, vehicle) => {
      if (!acc[vehicle.roadId]) {
        acc[vehicle.roadId] = [];
      }
      acc[vehicle.roadId].push(vehicle);
      return acc;
    }, {} as Record<number, Vehicle[]>);

    // Update and draw vehicles
    const updatedVehicles = vehicles
      .map((vehicle) => {
        // Get the road and its density
        const road = map.trafficData.find((r) => r.id === vehicle.roadId);
        if (!road) return null;

        // Prepare the complete path array for this road
        const completePath = [
          { x: road.startX, y: road.startY }, // Start point
          ...(road.points || []), // Intermediate points if exist
          { x: road.endX, y: road.endY }, // End point
        ];

        // Make sure pathIndex is valid
        let pathIndex = vehicle.pathIndex || 0;
        const isReversed = vehicle.isReversed || false;

        // Adjust speed based on density and add some randomness
        let speedModifier = 1;
        switch (road.density) {
          case "LOW":
            speedModifier = 1 + Math.sin(Date.now() / 1000 + vehicle.id) * 0.1; // Small variation
            break;
          case "MEDIUM":
            speedModifier =
              0.7 + Math.sin(Date.now() / 1000 + vehicle.id) * 0.15; // More variation, slower
            break;
          case "HIGH":
            speedModifier =
              0.5 + Math.sin(Date.now() / 1000 + vehicle.id) * 0.2; // Even more variation, even slower
            break;
          case "CONGESTED":
            speedModifier =
              0.3 + Math.sin(Date.now() / 2000 + vehicle.id) * 0.25; // Most variation, slowest
            break;
        }

        // Check for vehicles ahead to simulate car following behavior
        const roadVehicles = vehiclesByRoad[vehicle.roadId] || [];

        // Get current target point based on path index and direction
        let currentPoint = completePath[pathIndex];
        let targetPoint =
          completePath[isReversed ? pathIndex - 1 : pathIndex + 1];

        // If we're at the end of the path, reverse direction
        if (targetPoint === undefined) {
          if (isReversed) {
            // If we're already going in reverse and hit the start, switch to forward
            targetPoint = completePath[1];
            pathIndex = 0;
            return {
              ...vehicle,
              x: completePath[0].x,
              y: completePath[0].y,
              targetX: targetPoint.x,
              targetY: targetPoint.y,
              pathIndex,
              isReversed: false,
              direction: Math.atan2(
                targetPoint.y - currentPoint.y,
                targetPoint.x - currentPoint.x
              ),
            };
          } else {
            // Going forward and hit the end, switch to reverse
            const lastIndex = completePath.length - 1;
            targetPoint = completePath[lastIndex - 1];
            pathIndex = lastIndex;
            return {
              ...vehicle,
              x: completePath[lastIndex].x,
              y: completePath[lastIndex].y,
              targetX: targetPoint.x,
              targetY: targetPoint.y,
              pathIndex,
              isReversed: true,
              direction: Math.atan2(
                targetPoint.y - currentPoint.y,
                targetPoint.x - currentPoint.x
              ),
            };
          }
        }

        // Calculate distance to target
        const dx = targetPoint.x - vehicle.x;
        const dy = targetPoint.y - vehicle.y;
        const distanceToTarget = Math.sqrt(dx * dx + dy * dy);

        // Calculate direction vector
        const dirX = dx / (distanceToTarget || 1);
        const dirY = dy / (distanceToTarget || 1);

        // Check for vehicles ahead to maintain spacing
        const minSpacing = vehicle.size * 5; // Minimum space between vehicles
        let shouldSlow = false;

        roadVehicles.forEach((otherVehicle) => {
          if (otherVehicle.id !== vehicle.id) {
            // Check if the other vehicle is ahead of this one (in the direction of travel)
            const otherDx = otherVehicle.x - vehicle.x;
            const otherDy = otherVehicle.y - vehicle.y;
            const dotProduct = dirX * otherDx + dirY * otherDy;

            if (dotProduct > 0) {
              // Vehicle is ahead
              const distanceBetween = Math.sqrt(
                otherDx * otherDx + otherDy * otherDy
              );
              if (distanceBetween < minSpacing) {
                shouldSlow = true;
                // The closer the vehicle, the more we slow down
                speedModifier *= Math.max(0.1, distanceBetween / minSpacing);
              }
            }
          }
        });

        // If the vehicle has reached its target
        if (distanceToTarget < vehicle.speed * simulationSpeed) {
          // Move to next path segment
          const newPathIndex = isReversed ? pathIndex - 1 : pathIndex + 1;

          // Check if we need to reverse direction
          if (newPathIndex < 0 || newPathIndex >= completePath.length - 1) {
            const atEnd = newPathIndex >= completePath.length - 1;
            const newReversed = !isReversed;
            const newIndex = atEnd ? completePath.length - 1 : 0;
            const nextTargetIndex = newReversed ? newIndex - 1 : newIndex + 1;
            const nextTargetPoint = completePath[nextTargetIndex];

            return {
              ...vehicle,
              x: completePath[newIndex].x,
              y: completePath[newIndex].y,
              targetX: nextTargetPoint.x,
              targetY: nextTargetPoint.y,
              pathIndex: newIndex,
              isReversed: newReversed,
              direction: Math.atan2(
                nextTargetPoint.y - completePath[newIndex].y,
                nextTargetPoint.x - completePath[newIndex].x
              ),
            };
          }

          // Move to next segment
          const nextTargetIndex = isReversed
            ? newPathIndex - 1
            : newPathIndex + 1;
          const nextTargetPoint =
            completePath[
              Math.min(Math.max(0, nextTargetIndex), completePath.length - 1)
            ];

          return {
            ...vehicle,
            x: targetPoint.x,
            y: targetPoint.y,
            targetX: nextTargetPoint.x,
            targetY: nextTargetPoint.y,
            pathIndex: newPathIndex,
            direction: Math.atan2(
              nextTargetPoint.y - targetPoint.y,
              nextTargetPoint.x - targetPoint.x
            ),
          };
        }

        // Apply all the modifiers to get the final speed
        const finalSpeed = vehicle.speed * speedModifier * simulationSpeed;

        // Move the vehicle
        const newX = vehicle.x + dirX * finalSpeed;
        const newY = vehicle.y + dirY * finalSpeed;

        return {
          ...vehicle,
          x: newX,
          y: newY,
          direction: Math.atan2(dirY, dirX),
        };
      })
      .filter((vehicle): vehicle is Vehicle => vehicle !== null);

    setVehicles(updatedVehicles);

    // Draw the vehicles
    updatedVehicles.forEach((vehicle) => {
      drawVehicle(ctx, vehicle);
    });

    // Request next animation frame
    animationRef.current = requestAnimationFrame(animateVehicles);
  };

  const drawVehicle = (ctx: CanvasRenderingContext2D, vehicle: Vehicle) => {
    const { x, y, size, color, direction, roadId } = vehicle;

    ctx.save();

    // Move to vehicle position and rotate
    ctx.translate(x, y);
    ctx.rotate(direction);

    // Draw shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.fillRect(-size * 2.2, size * 0.8, size * 4.4, size * 0.6);

    // Draw different vehicle types based on road type
    const roadType =
      map?.trafficData.find((r) => r.id === roadId)?.roadType || "NORMAL";

    if (roadType === "HIGHWAY") {
      // Draw a more streamlined car (like a sports car or sedan)

      // Car body (main shape)
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(-size * 2, 0); // back left
      ctx.lineTo(-size * 2, -size * 0.8); // back left top
      ctx.lineTo(-size * 1, -size * 1.2); // middle left top
      ctx.lineTo(size * 1, -size * 1.2); // middle right top
      ctx.lineTo(size * 2, -size * 0.8); // front right top
      ctx.lineTo(size * 2, 0); // front right bottom
      ctx.closePath();
      ctx.fill();

      // Windows
      ctx.fillStyle = "#a8d1ff"; // light blue windows
      ctx.beginPath();
      ctx.moveTo(-size * 0.9, -size * 0.8);
      ctx.lineTo(-size * 0.5, -size * 1.1);
      ctx.lineTo(size * 0.5, -size * 1.1);
      ctx.lineTo(size * 1.5, -size * 0.8);
      ctx.closePath();
      ctx.fill();

      // Wheels
      ctx.fillStyle = "#333";
      ctx.beginPath();
      ctx.arc(-size, 0, size * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(size, 0, size * 0.5, 0, Math.PI * 2);
      ctx.fill();

      // Headlights
      ctx.fillStyle = "#ffdd00";
      ctx.beginPath();
      ctx.arc(size * 1.9, -size * 0.3, size * 0.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (roadType === "RESIDENTIAL") {
      // Draw a simple car (hatchback or compact)

      // Car body
      ctx.fillStyle = color;
      ctx.fillRect(-size * 1.5, -size, size * 3, size);

      // Roof
      ctx.fillRect(-size * 0.8, -size * 1.8, size * 1.6, size * 0.8);

      // Windows
      ctx.fillStyle = "#a8d1ff";
      ctx.fillRect(-size * 0.7, -size * 1.7, size * 1.4, size * 0.6);

      // Wheels
      ctx.fillStyle = "#333";
      ctx.beginPath();
      ctx.arc(-size * 0.8, 0, size * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(size * 0.8, 0, size * 0.4, 0, Math.PI * 2);
      ctx.fill();

      // Headlights
      ctx.fillStyle = "#ffdd00";
      ctx.beginPath();
      ctx.arc(size * 1.4, -size * 0.5, size * 0.15, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // NORMAL road - draw a standard car (SUV/sedan)

      // Car body
      ctx.fillStyle = color;
      ctx.fillRect(-size * 2, -size, size * 4, size);

      // Top part of car
      ctx.fillRect(-size, -size * 1.8, size * 2, size * 0.8);

      // Windows
      ctx.fillStyle = "#a8d1ff";
      ctx.fillRect(-size * 0.9, -size * 1.7, size * 1.8, size * 0.6);

      // Wheels
      ctx.fillStyle = "#333";
      ctx.beginPath();
      ctx.arc(-size, 0, size * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(size, 0, size * 0.5, 0, Math.PI * 2);
      ctx.fill();

      // Headlights
      ctx.fillStyle = "#ffdd00";
      ctx.beginPath();
      ctx.arc(size * 1.9, -size * 0.5, size * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Restore context
    ctx.restore();
  };

  const getRoadWidth = (roadType: string): number => {
    switch (roadType) {
      case "HIGHWAY":
        return 12; // Wider for highways
      case "NORMAL":
        return 8; // Medium for standard roads
      case "RESIDENTIAL":
        return 5; // Narrower for residential streets
      default:
        return 8;
    }
  };

  const getRoadColor = (density: string): string => {
    switch (density) {
      case "LOW":
        return "#81C784"; // Softer green
      case "MEDIUM":
        return "#FFD54F"; // Softer yellow
      case "HIGH":
        return "#FF9800"; // Orange
      case "CONGESTED":
        return "#F44336"; // Red
      default:
        return "#9E9E9E"; // Gray for unknown
    }
  };

  const toggleSimulation = () => {
    setIsSimulationRunning(!isSimulationRunning);
  };

  const changeSimulationSpeed = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSimulationSpeed(parseFloat(e.target.value));
  };

  const handleSimulationParamChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setSimulationParams((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Format time in minutes for display
  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);

    if (hours === 0) {
      return `${mins} min`;
    }

    return `${hours} hr ${mins} min`;
  };

  // Draw optimal path on the canvas
  const drawOptimalPath = (
    ctx: CanvasRenderingContext2D,
    path: OptimalPath,
    color: string,
    lineWidth: number
  ) => {
    if (!path.roadPath || path.roadPath.length === 0) {
      console.error("Cannot draw path: Empty roadPath");
      return;
    }

    try {
      const allPoints: { x: number; y: number }[] = [];

      // Collect all the points along the path to create a smoother path
      // First add the starting point
      if (startPoint) {
        allPoints.push({ x: startPoint.x, y: startPoint.y });
      } else if (path.roadPath.length > 0) {
        allPoints.push({
          x: path.roadPath[0].startX,
          y: path.roadPath[0].startY,
        });
      }

      // Add all intermediate points
      path.roadPath.forEach((road) => {
        if (road.points && Array.isArray(road.points)) {
          road.points.forEach((point) => {
            if (
              point &&
              typeof point === "object" &&
              "x" in point &&
              "y" in point
            ) {
              allPoints.push({ x: point.x, y: point.y });
            }
          });
        }

        // Add the end point
        if (road.endX !== undefined && road.endY !== undefined) {
          allPoints.push({ x: road.endX, y: road.endY });
        }
      });

      // Add the endpoint as the final destination
      if (endPoint) {
        // Check if the end point is already in the array (to avoid duplicates)
        const lastPoint = allPoints[allPoints.length - 1];
        if (
          !lastPoint ||
          endPoint.x !== lastPoint.x ||
          endPoint.y !== lastPoint.y
        ) {
          allPoints.push({ x: endPoint.x, y: endPoint.y });
        }
      }

      ctx.save();

      // First pass: Draw a wider shadow/outline
      ctx.lineWidth = lineWidth + 10;
      ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      ctx.beginPath();

      if (allPoints.length > 0) {
        ctx.moveTo(allPoints[0].x, allPoints[0].y);

        for (let i = 1; i < allPoints.length; i++) {
          ctx.lineTo(allPoints[i].x, allPoints[i].y);
        }
      }

      ctx.stroke();

      // Second pass: Draw the white border (Google Maps style)
      ctx.lineWidth = lineWidth + 6;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";

      ctx.beginPath();

      if (allPoints.length > 0) {
        ctx.moveTo(allPoints[0].x, allPoints[0].y);

        for (let i = 1; i < allPoints.length; i++) {
          ctx.lineTo(allPoints[i].x, allPoints[i].y);
        }
      }

      ctx.stroke();

      // Third pass: Draw the main colored path
      ctx.lineWidth = lineWidth;

      // Use Google Maps style gradient for the route
      if (allPoints.length > 1) {
        const gradient = ctx.createLinearGradient(
          allPoints[0].x,
          allPoints[0].y,
          allPoints[allPoints.length - 1].x,
          allPoints[allPoints.length - 1].y
        );

        gradient.addColorStop(0, "#4285F4"); // Google Maps blue at start
        gradient.addColorStop(1, "#0F9D58"); // Google green at destination

        ctx.strokeStyle = gradient;
      } else {
        ctx.strokeStyle = "#4285F4"; // Default Google blue
      }

      ctx.beginPath();

      if (allPoints.length > 0) {
        ctx.moveTo(allPoints[0].x, allPoints[0].y);

        for (let i = 1; i < allPoints.length; i++) {
          ctx.lineTo(allPoints[i].x, allPoints[i].y);
        }
      }

      ctx.stroke();

      // Add animated traffic flow dots along the path
      if (allPoints.length > 1) {
        const time = Date.now() / 1000;
        const numDots = Math.min(
          Math.max(5, Math.floor(allPoints.length / 3)),
          10
        );

        for (let i = 0; i < numDots; i++) {
          // Calculate animated position (0-1 along the path)
          const position = (time * simulationSpeed * 0.2 + i / numDots) % 1;

          // Calculate the point index based on position
          const pointIndex = Math.min(
            Math.floor(position * (allPoints.length - 1)),
            allPoints.length - 2
          );

          const fraction = position * (allPoints.length - 1) - pointIndex;

          const x =
            allPoints[pointIndex].x +
            (allPoints[pointIndex + 1].x - allPoints[pointIndex].x) * fraction;
          const y =
            allPoints[pointIndex].y +
            (allPoints[pointIndex + 1].y - allPoints[pointIndex].y) * fraction;

          // Draw the dot with pulse effect
          const dotSize = 4 + Math.sin(time * 3 + i) * 1;

          // White outline
          ctx.beginPath();
          ctx.arc(x, y, dotSize + 2, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
          ctx.fill();

          // Blue dot (Google Maps style)
          ctx.beginPath();
          ctx.arc(x, y, dotSize, 0, Math.PI * 2);
          ctx.fillStyle = "#4285F4";
          ctx.fill();
        }
      }

      // Draw arrows to indicate direction every few segments
      if (allPoints.length > 2) {
        const arrowCount = Math.min(3, Math.floor(allPoints.length / 3));
        const step = Math.floor(allPoints.length / (arrowCount + 1));

        for (let i = 1; i <= arrowCount; i++) {
          const index = i * step;
          if (index < allPoints.length - 1) {
            const p1 = allPoints[index];
            const p2 = allPoints[index + 1];

            const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);

            // Draw directional arrow
            ctx.save();
            ctx.translate(p1.x, p1.y);
            ctx.rotate(angle);

            // White background circle
            ctx.beginPath();
            ctx.arc(0, 0, 10, 0, Math.PI * 2);
            ctx.fillStyle = "white";
            ctx.fill();

            // Arrow icon
            ctx.fillStyle = "#4285F4";
            ctx.beginPath();
            ctx.moveTo(5, 0);
            ctx.lineTo(-3, -5);
            ctx.lineTo(-3, 5);
            ctx.closePath();
            ctx.fill();

            ctx.restore();
          }
        }
      }

      ctx.restore();
    } catch (error) {
      console.error("Error drawing optimal path:", error);
    }
  };

  // Convert hex color to rgba for transparency support
  const convertHexToRGBA = (hex: string, alpha: number): string => {
    // Remove # if present
    hex = hex.replace("#", "");

    // Parse hex values
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Return rgba string
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Draw a Google Maps style direction arrow
  const drawArrow = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number,
    color: string
  ) => {
    const headLength = 12;
    const headWidth = 6;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Draw a circular background for the arrow
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fillStyle = "white";
    ctx.fill();
    ctx.strokeStyle = convertHexToRGBA(color, 0.5);
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw the arrow
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(headLength / 2, 0);
    ctx.lineTo(-headLength / 2, -headWidth / 2);
    ctx.lineTo(-headLength / 3, 0);
    ctx.lineTo(-headLength / 2, headWidth / 2);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  };

  // Draw congestion indicator with improved style
  const drawCongestionIndicator = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    density: string
  ) => {
    const radius = density === "CONGESTED" ? 10 : 8;
    const color = density === "CONGESTED" ? "#DB4437" : "#F4B400"; // Google red or yellow

    ctx.save();

    // Draw circular background
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(x, y, radius + 2, 0, Math.PI * 2);
    ctx.fill();

    // Draw colored circle
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Add traffic icon
    ctx.fillStyle = "white";
    ctx.font = `${radius}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("!", x, y);

    ctx.restore();
  };

  // Visualize traffic flow with improved animation
  const visualizeTrafficFlow = (
    ctx: CanvasRenderingContext2D,
    path: OptimalPath
  ) => {
    if (!path.coordinatePath || path.coordinatePath.length < 2) {
      return;
    }

    try {
      ctx.save();

      // Number of flow indicators (vehicles)
      const numIndicators = Math.min(
        10,
        Math.floor(path.coordinatePath.length / 2)
      );

      // Current time for animation
      const time = Date.now() / 1000;

      for (let i = 0; i < numIndicators; i++) {
        // Calculate position in the path (0-1)
        // Add variation in speed for different dots
        const speedVariation = 0.9 + (i % 3) * 0.1; // 0.9, 1.0, or 1.1
        const position =
          (time * simulationSpeed * 0.1 * speedVariation + i / numIndicators) %
          1;

        // Get interpolated point in the path
        const pointIndex = Math.floor(
          position * (path.coordinatePath.length - 1)
        );
        const nextPointIndex = Math.min(
          pointIndex + 1,
          path.coordinatePath.length - 1
        );

        // Check if the points exist and are valid
        const currentPoint = path.coordinatePath[pointIndex];
        const nextPoint = path.coordinatePath[nextPointIndex];

        if (
          !currentPoint ||
          !nextPoint ||
          currentPoint.x === undefined ||
          currentPoint.y === undefined ||
          nextPoint.x === undefined ||
          nextPoint.y === undefined
        ) {
          continue;
        }

        const subPosition =
          position * (path.coordinatePath.length - 1) - pointIndex;

        const x = currentPoint.x + (nextPoint.x - currentPoint.x) * subPosition;
        const y = currentPoint.y + (nextPoint.y - currentPoint.y) * subPosition;

        // Skip if NaN
        if (isNaN(x) || isNaN(y)) {
          continue;
        }

        // Draw a Google Maps style dot with pulsing effect
        const size = 4 + Math.sin(time * 3 + i) * 1.5;

        // White glow effect
        ctx.beginPath();
        ctx.arc(x, y, size + 2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        ctx.fill();

        // Blue dot - Google Maps style
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = "#4285F4";
        ctx.fill();
      }

      ctx.restore();
    } catch (error) {
      console.error("Error visualizing traffic flow:", error);
    }
  };

  // Draw a point marker (start/end) with an improved Google Maps-like appearance
  const drawPathPoint = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string
  ) => {
    // Draw a Google Maps style marker
    ctx.save();

    // Translate to the marker's position
    ctx.translate(x, y);

    // Draw drop shadow
    ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // Draw the marker pin shape
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, -10, 10, Math.PI / 2, 2.5 * Math.PI);
    ctx.lineTo(0, 8);
    ctx.fillStyle = color;
    ctx.fill();

    // Add white circle in the middle
    ctx.beginPath();
    ctx.arc(0, -10, 5, 0, 2 * Math.PI);
    ctx.fillStyle = "white";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.fill();

    // Add pulsating effect for better visibility
    const pulseSize = 15 + Math.sin(Date.now() / 300) * 5;
    ctx.beginPath();
    ctx.arc(0, -10, pulseSize, 0, 2 * Math.PI);
    ctx.fillStyle = "rgba(255, 255, 255, 0)";
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.5 - Math.sin(Date.now() / 300) * 0.3;
    ctx.stroke();

    ctx.restore();
  };

  // Count congestion points along a path
  const countCongestionPoints = (path: OptimalPath): number => {
    if (!path || !path.roadPath) return 0;

    return path.roadPath.filter(
      (road) => road.density === "HIGH" || road.density === "CONGESTED"
    ).length;
  };

  // Count potential intersections along a path
  const countIntersections = (path: OptimalPath): number => {
    if (!path || !path.roadPath || path.roadPath.length <= 1) return 0;

    // Simple approximation: count changes in direction as potential intersections
    let intersections = 0;
    let lastDirection = "";

    for (let i = 1; i < path.roadPath.length; i++) {
      const prevRoad = path.roadPath[i - 1];
      const road = path.roadPath[i];

      // Calculate angle of the current road segment
      const angle =
        (Math.atan2(road.endY - road.startY, road.endX - road.startX) * 180) /
        Math.PI;

      // Discretize angle into 8 possible directions
      const direction = getDiscreteDirection(angle);

      // If the direction changed, count it as a potential intersection
      if (lastDirection && direction !== lastDirection) {
        intersections++;
      }

      lastDirection = direction;
    }

    return intersections;
  };

  // Convert an angle to a discrete direction
  const getDiscreteDirection = (angle: number): string => {
    // Normalize angle to 0-360
    const normalizedAngle = (angle + 360) % 360;

    // Split into 8 directions (N, NE, E, SE, S, SW, W, NW)
    if (normalizedAngle >= 337.5 || normalizedAngle < 22.5) return "E";
    if (normalizedAngle >= 22.5 && normalizedAngle < 67.5) return "SE";
    if (normalizedAngle >= 67.5 && normalizedAngle < 112.5) return "S";
    if (normalizedAngle >= 112.5 && normalizedAngle < 157.5) return "SW";
    if (normalizedAngle >= 157.5 && normalizedAngle < 202.5) return "W";
    if (normalizedAngle >= 202.5 && normalizedAngle < 247.5) return "NW";
    if (normalizedAngle >= 247.5 && normalizedAngle < 292.5) return "N";
    return "NE";
  };

  // Add a helper function to check if a clicked point is close to any
  // existing roads, to ensure paths can be calculated correctly
  const isPointNearRoad = (
    x: number,
    y: number,
    threshold: number = 20
  ): boolean => {
    if (!map || !map.trafficData) return false;

    for (const road of map.trafficData) {
      const { startX, startY, endX, endY, points } = road;

      // Check proximity to start and end points
      if (
        Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2)) <
          threshold ||
        Math.sqrt(Math.pow(x - endX, 2) + Math.pow(y - endY, 2)) < threshold
      ) {
        return true;
      }

      // Check proximity to intermediate points
      if (points && points.length > 0) {
        for (const point of points) {
          if (
            Math.sqrt(Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2)) <
            threshold
          ) {
            return true;
          }
        }
      }

      // Check proximity to road segments (start-to-first point, point-to-point, last point-to-end)
      let prevX = startX;
      let prevY = startY;

      // Add intermediate points if available
      if (points && points.length > 0) {
        for (const point of points) {
          // Check distance to this line segment
          if (
            isPointNearLineSegment(
              x,
              y,
              prevX,
              prevY,
              point.x,
              point.y,
              threshold
            )
          ) {
            return true;
          }
          prevX = point.x;
          prevY = point.y;
        }
      }

      // Check final segment
      if (isPointNearLineSegment(x, y, prevX, prevY, endX, endY, threshold)) {
        return true;
      }
    }

    return false;
  };

  // Helper function to determine if a point is near a line segment
  const isPointNearLineSegment = (
    pointX: number,
    pointY: number,
    lineX1: number,
    lineY1: number,
    lineX2: number,
    lineY2: number,
    threshold: number
  ): boolean => {
    const lineLength = Math.sqrt(
      Math.pow(lineX2 - lineX1, 2) + Math.pow(lineY2 - lineY1, 2)
    );

    // If line segment is very small, just check distance to either end
    if (lineLength < threshold) {
      return (
        Math.sqrt(Math.pow(pointX - lineX1, 2) + Math.pow(pointY - lineY1, 2)) <
          threshold ||
        Math.sqrt(Math.pow(pointX - lineX2, 2) + Math.pow(pointY - lineY2, 2)) <
          threshold
      );
    }

    // Calculate perpendicular distance from point to line
    const u =
      ((pointX - lineX1) * (lineX2 - lineX1) +
        (pointY - lineY1) * (lineY2 - lineY1)) /
      (lineLength * lineLength);

    // Point projection is outside the line segment
    if (u < 0 || u > 1) {
      // Check distance to endpoints
      const distToStart = Math.sqrt(
        Math.pow(pointX - lineX1, 2) + Math.pow(pointY - lineY1, 2)
      );
      const distToEnd = Math.sqrt(
        Math.pow(pointX - lineX2, 2) + Math.pow(pointY - lineY2, 2)
      );
      return Math.min(distToStart, distToEnd) < threshold;
    }

    // Calculate the closest point on the line
    const closestX = lineX1 + u * (lineX2 - lineX1);
    const closestY = lineY1 + u * (lineY2 - lineY1);

    // Calculate distance from the point to the closest point on the line
    const distance = Math.sqrt(
      Math.pow(pointX - closestX, 2) + Math.pow(pointY - closestY, 2)
    );

    return distance < threshold;
  };

  // Before the line with "const calculateShortestPath", add this forward declaration:
  const findOptimalPath = async () => {
    console.log(
      "findOptimalPath called with startPoint:",
      startPoint,
      "endPoint:",
      endPoint
    );

    if (!map) {
      console.error("Cannot find path: Map is missing");
      setError("Cannot find optimal path: Map data is missing");
      return;
    }

    // If both points are null or undefined, show clear error message
    if (!startPoint && !endPoint) {
      console.error("Cannot find path: Missing start/end points");
      setError("Please select both starting point and destination on the map");

      // Auto-select points if map data is available
      if (map && map.trafficData && map.trafficData.length > 0) {
        try {
          // Select points from first and last roads
          const firstRoad = map.trafficData[0];
          const lastRoad =
            map.trafficData[
              map.trafficData.length > 1 ? map.trafficData.length - 1 : 0
            ];

          // Create valid points with some distance between them
          if (firstRoad && lastRoad) {
            console.log("Auto-selecting points from available roads");
            setStartPoint({ x: firstRoad.startX, y: firstRoad.startY });
            setEndPoint({ x: lastRoad.endX, y: lastRoad.endY });

            // Notify user about auto-selection
            setError(
              "Points were auto-selected. You can click 'Reset' and try manual selection if needed."
            );

            // Don't immediately call pathfinding - give time for UI update
            return;
          }
        } catch (error) {
          console.error("Error auto-selecting points:", error);
        }
      }
      return;
    }

    // Handle case where only one point is missing
    if (!startPoint && endPoint) {
      console.error("Start point is missing");
      setError("Please select a starting point");
      return;
    }

    if (startPoint && !endPoint) {
      console.error("End point is missing");
      setError("Please select a destination point");
      return;
    }

    // Validate that start and end points have valid coordinates
    if (
      !startPoint ||
      !endPoint || // Add a redundant null check for TypeScript
      startPoint.x === undefined ||
      startPoint.y === undefined ||
      endPoint.x === undefined ||
      endPoint.y === undefined ||
      isNaN(startPoint.x) ||
      isNaN(startPoint.y) ||
      isNaN(endPoint.x) ||
      isNaN(endPoint.y)
    ) {
      console.error("Invalid coordinates:", startPoint, endPoint);
      setError("Cannot find optimal path: Invalid coordinates");
      return;
    }

    // At this point TypeScript knows startPoint and endPoint are not null
    // Make sure we have integer coordinates
    const start = {
      x: Math.round(startPoint.x),
      y: Math.round(startPoint.y),
    };

    const end = {
      x: Math.round(endPoint.x),
      y: Math.round(endPoint.y),
    };

    // Validate that we're not trying to find a path from a point to itself
    if (Math.abs(start.x - end.x) < 10 && Math.abs(start.y - end.y) < 10) {
      setError(
        "Start and end points are too close. Please select different points."
      );
      return;
    }

    console.log("Finding optimal path from", start, "to", end);
    setIsLoadingPath(true);
    setError(null);

    try {
      // Frontend-based shortest path calculation
      const result = calculateShortestPath(start, end, map.trafficData);

      if (!result) {
        throw new Error(
          "No valid path found between the selected points. Please try different points."
        );
      }

      console.log("Path result:", result);
      setOptimalPath(result);
      setPathComparison(null);
      setIsSelectingPoints(false);
    } catch (error) {
      console.error("Failed to find path:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Unknown error calculating path"
      );
    } finally {
      setIsLoadingPath(false);
    }
  };

  // Add a new function to auto-select points
  const autoSelectPoints = () => {
    if (!map || !map.trafficData || map.trafficData.length === 0) {
      setError("Cannot auto-select points: No map data available");
      return;
    }

    try {
      // Reset any existing points
      resetPathfinding();

      // Select points from first and last roads
      const firstRoad = map.trafficData[0];
      const lastRoad =
        map.trafficData[
          map.trafficData.length > 1 ? map.trafficData.length - 1 : 0
        ];

      // Create valid points with some distance between them
      if (firstRoad && lastRoad) {
        console.log("Auto-selecting points from available roads");
        setStartPoint({ x: firstRoad.startX, y: firstRoad.startY });
        setEndPoint({ x: lastRoad.endX, y: lastRoad.endY });

        // Set selection mode to true so the user knows points are being selected
        setIsSelectingPoints(true);

        // Clear any existing errors
        setError(null);
        setHelpMessage("Points were auto-selected. Calculating route...");

        // Redraw canvas with the selected points
        if (canvasRef.current) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext("2d");
          if (ctx && image) {
            // Redraw the image
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

            // Redraw the roads
            if (map && map.trafficData) {
              map.trafficData.forEach((road) => {
                const {
                  startX,
                  startY,
                  endX,
                  endY,
                  roadType,
                  density,
                  points,
                } = road;

                // Draw the road
                ctx.lineWidth = getRoadWidth(roadType);
                ctx.strokeStyle = getRoadColor(density);
                ctx.lineCap = "round";
                ctx.lineJoin = "round";

                ctx.beginPath();
                ctx.moveTo(startX, startY);

                if (points && points.length > 0) {
                  points.forEach((point) => {
                    ctx.lineTo(point.x, point.y);
                  });
                }

                ctx.lineTo(endX, endY);
                ctx.stroke();
              });
            }

            // Draw the start and end points
            drawPathPoint(ctx, firstRoad.startX, firstRoad.startY, "#1976D2"); // Blue for start
            drawPathPoint(ctx, lastRoad.endX, lastRoad.endY, "#D32F2F"); // Red for end
          }
        }
      } else {
        setError(
          "Unable to select valid start/end points. Please try manual selection."
        );
      }
    } catch (error) {
      console.error("Error auto-selecting points:", error);
      setError("Error auto-selecting points. Please try manual selection.");
    }

    // After a short delay, automatically find the path
    setTimeout(() => {
      console.log("Auto-finding path after point selection");
      findOptimalPath();
    }, 500);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {isLoading ? (
        <div className="flex justify-center items-center h-96">
          <div className="text-xl text-gray-500">Loading map...</div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      ) : (
        <>
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="lg:w-3/4">
              <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h1 className="text-2xl font-bold">{map?.name}</h1>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={toggleSimulation}
                      className={`px-4 py-2 rounded font-medium ${
                        isSimulationRunning
                          ? "bg-red-500 text-white hover:bg-red-600"
                          : "bg-green-500 text-white hover:bg-green-600"
                      }`}
                    >
                      {isSimulationRunning ? "Pause" : "Resume"}
                    </button>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Speed:</span>
                      <input
                        type="range"
                        min="0.5"
                        max="3"
                        step="0.5"
                        value={simulationSpeed}
                        onChange={changeSimulationSpeed}
                        className="w-24"
                      />
                      <span className="text-sm font-medium">
                        {simulationSpeed}x
                      </span>
                    </div>
                  </div>
                </div>
                {map?.description && (
                  <p className="text-gray-600 mb-4">{map.description}</p>
                )}
                <div className="relative">
                  <canvas
                    ref={canvasRef}
                    width={map?.width || 800}
                    height={map?.height || 600}
                    className="border border-gray-300 bg-gray-100 w-full h-auto"
                    onClick={handleCanvasClick}
                    style={{
                      cursor: isSelectingPoints ? "crosshair" : "default",
                    }}
                  />
                  {isLoadingPath && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                      <div className="bg-white p-4 rounded-lg shadow-lg">
                        <p className="text-gray-800">
                          Calculating optimal path...
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:w-1/4">
              <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                <h2 className="text-lg font-bold mb-4">Find Shortest Path</h2>

                <div className="mb-4">
                  <div className="flex gap-2">
                    <button
                      onClick={startPathSelection}
                      className="flex-1 py-2 px-4 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                      disabled={isLoadingPath}
                    >
                      <div className="flex items-center justify-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 mr-1"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Find Route
                      </div>
                    </button>
                    <button
                      onClick={resetPathfinding}
                      className="py-2 px-4 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                      disabled={isLoadingPath || (!startPoint && !endPoint)}
                    >
                      Reset
                    </button>
                    <button
                      onClick={autoSelectPoints}
                      className="py-2 px-4 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors ml-2"
                      disabled={isLoadingPath || !map}
                    >
                      Auto-Select
                    </button>
                  </div>

                  {isSelectingPoints && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-sm text-blue-800">
                        {!startPoint
                          ? "Click on the map to set starting point"
                          : "Click on the map to set destination point"}
                      </p>
                    </div>
                  )}

                  {isLoadingPath && (
                    <div className="mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded-md flex items-center justify-center">
                      <svg
                        className="animate-spin h-5 w-5 text-indigo-500 mr-2"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      <span className="text-sm text-indigo-800">
                        Calculating best route...
                      </span>
                    </div>
                  )}
                </div>

                {!isSelectingPoints && !optimalPath && !isLoadingPath && (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-md text-center">
                    <p className="text-sm text-gray-600">
                      Click "Find Route" to calculate the shortest path between
                      two points
                    </p>
                  </div>
                )}

                {error && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-800">{error}</p>
                    <button
                      onClick={() => setError(null)}
                      className="mt-2 text-xs text-red-600 hover:text-red-800"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-lg shadow-md p-4">
                <h2 className="text-lg font-bold mb-4">
                  Traffic Density Legend
                </h2>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <div
                      className="w-6 h-6 mr-2"
                      style={{ backgroundColor: getRoadColor("LOW") }}
                    ></div>
                    <span>Low Traffic</span>
                  </div>
                  <div className="flex items-center">
                    <div
                      className="w-6 h-6 mr-2"
                      style={{ backgroundColor: getRoadColor("MEDIUM") }}
                    ></div>
                    <span>Medium Traffic</span>
                  </div>
                  <div className="flex items-center">
                    <div
                      className="w-6 h-6 mr-2"
                      style={{ backgroundColor: getRoadColor("HIGH") }}
                    ></div>
                    <span>High Traffic</span>
                  </div>
                  <div className="flex items-center">
                    <div
                      className="w-6 h-6 mr-2"
                      style={{ backgroundColor: getRoadColor("CONGESTED") }}
                    ></div>
                    <span>Congested</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
      {error && (
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 relative"
          role="alert"
        >
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
          <button
            className="absolute top-0 bottom-0 right-0 px-4"
            onClick={() => setError(null)}
          >
            <span>&times;</span>
          </button>
        </div>
      )}
      {helpMessage && (
        <div
          className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4 relative"
          role="alert"
        >
          <strong className="font-bold">Info: </strong>
          <span className="block sm:inline">{helpMessage}</span>
          <button
            className="absolute top-0 bottom-0 right-0 px-4"
            onClick={() => setHelpMessage(null)}
          >
            <span>&times;</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ViewMapPage;
