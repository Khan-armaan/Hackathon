import { TrafficData, Event, SimulationParams } from "@prisma/client";

interface Node {
  id: number;
  x: number;
  y: number;
  connections: Connection[];
}

interface Connection {
  nodeId: number;
  roadId: number;
  weight: number;
}

interface Graph {
  nodes: Map<number, Node>;
}

interface PathResult {
  path: number[];  // Sequence of node IDs
  roadPath: number[]; // Sequence of road IDs
  totalWeight: number;
  coordinatePath: {x: number, y: number}[];
}

// Build a graph from traffic data
export function buildGraph(trafficData: TrafficData[]): Graph {
  const nodes = new Map<number, Node>();
  const nodeIdCounter = { value: 1 };
  
  // Helper to get or create a node
  const getOrCreateNode = (x: number, y: number): number => {
    // Check if node already exists at these coordinates
    for (const [id, node] of nodes.entries()) {
      if (Math.abs(node.x - x) < 0.1 && Math.abs(node.y - y) < 0.1) {
        return id;
      }
    }
    
    // Create new node
    const id = nodeIdCounter.value++;
    nodes.set(id, {
      id,
      x,
      y,
      connections: []
    });
    
    return id;
  };
  
  // Create nodes and connections from road segments
  trafficData.forEach(road => {
    const startNodeId = getOrCreateNode(road.startX, road.startY);
    const endNodeId = getOrCreateNode(road.endX, road.endY);
    
    // Calculate base weight (distance)
    const distance = Math.sqrt(
      Math.pow(road.endX - road.startX, 2) + 
      Math.pow(road.endY - road.startY, 2)
    );
    
    // Adjust weight based on road type
    let weight = distance;
    if (road.roadType === 'HIGHWAY') {
      weight *= 0.7; // Faster on highways
    } else if (road.roadType === 'RESIDENTIAL') {
      weight *= 1.3; // Slower on residential roads
    }
    
    // Adjust weight based on density
    if (road.density === 'LOW') {
      weight *= 1.0;
    } else if (road.density === 'MEDIUM') {
      weight *= 1.5;
    } else if (road.density === 'HIGH') {
      weight *= 2.0;
    } else if (road.density === 'CONGESTED') {
      weight *= 3.0;
    }
    
    // Add bidirectional connections
    const startNode = nodes.get(startNodeId)!;
    const endNode = nodes.get(endNodeId)!;
    
    startNode.connections.push({
      nodeId: endNodeId,
      roadId: road.id,
      weight
    });
    
    endNode.connections.push({
      nodeId: startNodeId,
      roadId: road.id,
      weight
    });
  });
  
  return { nodes };
}

// Adjust road weights based on simulation parameters and events
export function adjustWeightsForSimulation(
  graph: Graph, 
  trafficData: TrafficData[], 
  simulationParams?: Partial<SimulationParams> | { 
    timeOfDay?: string, 
    dayType?: string, 
    weatherCondition?: string, 
    routingStrategy?: string 
  },
  events?: Event[]
): Graph {
  // Clone the graph to avoid modifying the original
  const newGraph: Graph = {
    nodes: new Map<number, Node>()
  };
  
  // Deep copy nodes and connections
  graph.nodes.forEach((node, id) => {
    newGraph.nodes.set(id, {
      ...node,
      connections: [...node.connections.map(conn => ({...conn}))]
    });
  });
  
  // Apply simulation parameter adjustments
  if (simulationParams) {
    // Time of day affects traffic patterns
    const timeMultiplier = getTimeOfDayMultiplier(simulationParams.timeOfDay as string);
    
    // Day type affects overall traffic volume
    const dayTypeMultiplier = getDayTypeMultiplier(simulationParams.dayType as string);
    
    // Weather affects road speeds
    const weatherMultiplier = getWeatherMultiplier(simulationParams.weatherCondition as string);
    
    // Apply global multipliers to all connections
    newGraph.nodes.forEach(node => {
      node.connections.forEach(conn => {
        conn.weight *= timeMultiplier * dayTypeMultiplier * weatherMultiplier;
      });
    });
    
    // Special case for congestion avoidance
    if (simulationParams.routingStrategy === 'AVOID_CONGESTION') {
      // Find roads with high congestion and increase their weights significantly
      const congestedRoadIds = trafficData
        .filter(road => road.density === 'HIGH' || road.density === 'CONGESTED')
        .map(road => road.id);
        
      newGraph.nodes.forEach(node => {
        node.connections.forEach(conn => {
          if (congestedRoadIds.includes(conn.roadId)) {
            conn.weight *= 5.0; // Heavy penalty for congested roads
          }
        });
      });
    }
  }
  
  // Apply event-based adjustments
  if (events && events.length > 0) {
    const activeEvents = events.filter(
      event => event.status === 'UPCOMING' || event.status === 'ONGOING'
    );
    
    activeEvents.forEach(event => {
      // For each event, find nearby roads and adjust their weights
      // This is a simplified approach - in a real system, you'd have geospatial data
      const eventImpactMultiplier = getEventImpactMultiplier(event.impactLevel);
      
      // Assume event.location contains coordinates or identifiers related to road segments
      // For simplicity, we're using a string matching approach, but geospatial would be better
      const affectedRoadIds = trafficData
        .filter(road => road.density === 'HIGH' || road.density === 'CONGESTED')
        .map(road => road.id);
      
      newGraph.nodes.forEach(node => {
        node.connections.forEach(conn => {
          if (affectedRoadIds.includes(conn.roadId)) {
            conn.weight *= eventImpactMultiplier;
          }
        });
      });
    });
  }
  
  return newGraph;
}

// Dijkstra's algorithm for shortest path
export function dijkstra(
  graph: Graph, 
  startNodeId: number, 
  endNodeId: number
): PathResult | null {
  // Set of visited nodes
  const visited = new Set<number>();
  
  // Priority queue for Dijkstra's algorithm
  // Using a simple array for simplicity, but a real implementation would use a heap
  const queue: { nodeId: number; weight: number }[] = [];
  
  // Distances from start node
  const distances = new Map<number, number>();
  
  // Previous node in optimal path
  const previous = new Map<number, number>();
  
  // Road used to reach each node
  const roadUsed = new Map<string, number>(); // key: "fromNode-toNode", value: roadId
  
  // Initialize distances
  graph.nodes.forEach((_, id) => {
    distances.set(id, id === startNodeId ? 0 : Infinity);
  });
  
  // Add start node to queue
  queue.push({ nodeId: startNodeId, weight: 0 });
  
  while (queue.length > 0) {
    // Sort and get the node with minimum distance
    queue.sort((a, b) => a.weight - b.weight);
    const { nodeId: currentNodeId } = queue.shift()!;
    
    // Skip if already visited
    if (visited.has(currentNodeId)) continue;
    
    // Mark as visited
    visited.add(currentNodeId);
    
    // If we reached the end node, build and return the path
    if (currentNodeId === endNodeId) {
      return buildPath(graph, previous, roadUsed, startNodeId, endNodeId, distances.get(endNodeId)!);
    }
    
    // Get the current node
    const currentNode = graph.nodes.get(currentNodeId);
    if (!currentNode) continue;
    
    // Update distances to neighbors
    currentNode.connections.forEach(connection => {
      const { nodeId: neighborId, weight, roadId } = connection;
      const totalDistance = distances.get(currentNodeId)! + weight;
      
      if (totalDistance < distances.get(neighborId)!) {
        distances.set(neighborId, totalDistance);
        previous.set(neighborId, currentNodeId);
        roadUsed.set(`${currentNodeId}-${neighborId}`, roadId);
        
        // Add to queue if not visited
        if (!visited.has(neighborId)) {
          queue.push({ nodeId: neighborId, weight: totalDistance });
        }
      }
    });
  }
  
  // No path found
  return null;
}

// A* algorithm for shortest path
export function aStar(
  graph: Graph, 
  startNodeId: number, 
  endNodeId: number
): PathResult | null {
  // Set of visited nodes
  const closedSet = new Set<number>();
  
  // Priority queue for A*
  const openSet: { nodeId: number; fScore: number }[] = [];
  
  // g score: cost from start to current node
  const gScore = new Map<number, number>();
  
  // f score: g score + heuristic (estimated cost to goal)
  const fScore = new Map<number, number>();
  
  // Previous node in optimal path
  const previous = new Map<number, number>();
  
  // Road used to reach each node
  const roadUsed = new Map<string, number>(); // key: "fromNode-toNode", value: roadId
  
  // Initialize scores
  graph.nodes.forEach((_, id) => {
    gScore.set(id, id === startNodeId ? 0 : Infinity);
    fScore.set(id, id === startNodeId ? heuristic(graph, id, endNodeId) : Infinity);
  });
  
  // Add start node to open set
  openSet.push({ nodeId: startNodeId, fScore: fScore.get(startNodeId)! });
  
  while (openSet.length > 0) {
    // Sort and get the node with minimum f score
    openSet.sort((a, b) => a.fScore - b.fScore);
    const { nodeId: currentNodeId } = openSet.shift()!;
    
    // If we reached the end node, build and return the path
    if (currentNodeId === endNodeId) {
      return buildPath(graph, previous, roadUsed, startNodeId, endNodeId, gScore.get(endNodeId)!);
    }
    
    // Move to closed set
    closedSet.add(currentNodeId);
    
    // Get the current node
    const currentNode = graph.nodes.get(currentNodeId);
    if (!currentNode) continue;
    
    // Update scores to neighbors
    currentNode.connections.forEach(connection => {
      const { nodeId: neighborId, weight, roadId } = connection;
      
      // Skip if in closed set
      if (closedSet.has(neighborId)) return;
      
      // Calculate tentative g score
      const tentativeGScore = gScore.get(currentNodeId)! + weight;
      
      // Check if this path is better
      if (tentativeGScore < gScore.get(neighborId)!) {
        // This path is better, record it
        previous.set(neighborId, currentNodeId);
        roadUsed.set(`${currentNodeId}-${neighborId}`, roadId);
        gScore.set(neighborId, tentativeGScore);
        fScore.set(neighborId, tentativeGScore + heuristic(graph, neighborId, endNodeId));
        
        // Add to open set if not already there
        if (!openSet.some(item => item.nodeId === neighborId)) {
          openSet.push({ nodeId: neighborId, fScore: fScore.get(neighborId)! });
        }
      }
    });
  }
  
  // No path found
  return null;
}

// Heuristic function for A* (Euclidean distance)
function heuristic(graph: Graph, nodeId: number, goalId: number): number {
  const node = graph.nodes.get(nodeId);
  const goal = graph.nodes.get(goalId);
  
  if (!node || !goal) return Infinity;
  
  return Math.sqrt(
    Math.pow(goal.x - node.x, 2) + 
    Math.pow(goal.y - node.y, 2)
  );
}

// Build the path from the result of pathfinding algorithms
function buildPath(
  graph: Graph,
  previous: Map<number, number>,
  roadUsed: Map<string, number>,
  startNodeId: number,
  endNodeId: number,
  totalWeight: number
): PathResult {
  const path: number[] = [];
  const roadPath: number[] = [];
  const coordinatePath: {x: number, y: number}[] = [];
  
  let current = endNodeId;
  
  // Reconstruct path from end to start
  while (current !== startNodeId) {
    path.unshift(current);
    
    const prev = previous.get(current);
    if (!prev) break; // Safety check
    
    // Add road ID
    const roadId = roadUsed.get(`${prev}-${current}`);
    if (roadId) roadPath.unshift(roadId);
    
    // Add coordinates
    const node = graph.nodes.get(current);
    if (node) coordinatePath.unshift({ x: node.x, y: node.y });
    
    current = prev;
  }
  
  // Add the start node
  path.unshift(startNodeId);
  const startNode = graph.nodes.get(startNodeId);
  if (startNode) coordinatePath.unshift({ x: startNode.x, y: startNode.y });
  
  return {
    path,
    roadPath,
    totalWeight,
    coordinatePath
  };
}

// Helper functions for weight adjustments

function getTimeOfDayMultiplier(timeOfDay: string): number {
  switch (timeOfDay) {
    case 'MORNING': return 1.5;  // Morning rush hour
    case 'EVENING': return 1.7;  // Evening rush hour
    case 'AFTERNOON': return 1.2;
    case 'NIGHT': return 0.8;    // Less traffic at night
    default: return 1.0;
  }
}

function getDayTypeMultiplier(dayType: string): number {
  switch (dayType) {
    case 'WEEKDAY': return 1.2;
    case 'WEEKEND': return 1.0;
    case 'HOLIDAY': return 1.3;  // More traffic on holidays
    default: return 1.0;
  }
}

function getWeatherMultiplier(weather: string): number {
  switch (weather) {
    case 'CLEAR': return 1.0;
    case 'RAIN': return 1.3;
    case 'SNOW': return 1.8;
    case 'FOG': return 1.5;
    default: return 1.0;
  }
}

function getEventImpactMultiplier(impactLevel: string): number {
  switch (impactLevel) {
    case 'LOW': return 1.2;
    case 'MEDIUM': return 1.5;
    case 'HIGH': return 2.0;
    case 'CRITICAL': return 3.0;
    default: return 1.0;
  }
} 