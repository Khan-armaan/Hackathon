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
  points?: {x: number, y: number}[]; // Array of intermediate points for curved paths
  roadType: "HIGHWAY" | "NORMAL" | "RESIDENTIAL";
  density: "LOW" | "MEDIUM" | "HIGH" | "CONGESTED";
}

interface OptimalPath {
  algorithm: string;
  path: number[];
  roadPath: TrafficData[];
  coordinatePath: {x: number, y: number}[];
  totalWeight: number;
  estimatedTimeMinutes: number;
  description: string;
}

interface PathComparison {
  dijkstra: OptimalPath | null;
  astar: OptimalPath | null;
  trafficFlowWinner?: string;
  timeDifference?: number;
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

const ViewMapPage: React.FC = () => {
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
  const [startPoint, setStartPoint] = useState<{x: number, y: number} | null>(null);
  const [endPoint, setEndPoint] = useState<{x: number, y: number} | null>(null);
  const [isSelectingPoints, setIsSelectingPoints] = useState<boolean>(false);
  const [optimalPath, setOptimalPath] = useState<OptimalPath | null>(null);
  const [isLoadingPath, setIsLoadingPath] = useState<boolean>(false);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<string>("astar");
  const [showPathComparison, setShowPathComparison] = useState<boolean>(false);
  const [pathComparison, setPathComparison] = useState<PathComparison | null>(null);
  const [simulationParams, setSimulationParams] = useState<SimulationParams>({
    timeOfDay: "MORNING",
    dayType: "WEEKDAY",
    weatherCondition: "CLEAR",
    routingStrategy: "SHORTEST_PATH",
  });

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
    simulationSpeed
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
        ...(points || []),       // Intermediate points if exist
        { x: endX, y: endY }     // End point
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
              Math.pow(completePath[j+1].x - completePath[j].x, 2) + 
              Math.pow(completePath[j+1].y - completePath[j].y, 2)
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
              localPosition = (targetDistance - distanceSoFar) / segmentLengths[j];
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
        const targetPointIndex = isReversed ? 
          (pathIndex === 0 ? 0 : pathIndex - 1) : 
          (pathIndex === completePath.length - 2 ? completePath.length - 1 : pathIndex + 2);
        
        const targetPoint = completePath[Math.min(Math.max(0, targetPointIndex), completePath.length - 1)];

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
          isReversed
        });
      }
    });

    setVehicles(newVehicles);
  };

  const findOptimalPath = async () => {
    if (!map || !startPoint || !endPoint) {
      console.error("Cannot find path: Missing map or start/end points");
      setError("Cannot find optimal path: Missing required information");
      return;
    }
    
    // Validate that start and end points have valid coordinates
    if (isNaN(startPoint.x) || isNaN(startPoint.y) || isNaN(endPoint.x) || isNaN(endPoint.y)) {
      console.error("Invalid coordinates:", startPoint, endPoint);
      setError("Cannot find optimal path: Invalid coordinates");
      return;
    }
    
    console.log("Finding optimal path from", startPoint, "to", endPoint);
    setIsLoadingPath(true);
    
    try {
      // First, get both paths for comparison
      const comparisonResponse = await fetch(`${API_URL}/api/route-optimization/compare-paths`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mapId: map.id,
          startX: startPoint.x,
          startY: startPoint.y,
          endX: endPoint.x,
          endY: endPoint.y,
          simulationParams: simulationParams
        })
      });
      
      if (!comparisonResponse.ok) {
        const errorText = await comparisonResponse.text();
        console.error("Compare paths response error:", errorText);
        throw new Error(`Failed to compare paths: ${errorText}`);
      }
      
      const comparisonData = await comparisonResponse.json();
      console.log("Comparison data:", comparisonData);
      
      // Store comparison data but don't show it yet
      setPathComparison(comparisonData);
      
      // Determine which algorithm to use for the final optimal path
      // This implements the "simple solution to traffic" concept from the video
      let finalAlgorithm = selectedAlgorithm;
      
      // If both algorithms returned a path, we can compare and possibly choose the better one
      if (comparisonData.dijkstra && comparisonData.astar) {
        const dijkstraPath = comparisonData.dijkstra;
        const astarPath = comparisonData.astar;
        
        // Count congestion points in each path
        const dijkstraCongestion = countCongestionPoints(dijkstraPath);
        const astarCongestion = countCongestionPoints(astarPath);
        
        // Count intersections in each path
        const dijkstraIntersections = countIntersections(dijkstraPath);
        const astarIntersections = countIntersections(astarPath);
        
        // Simulate the "traffic snake" - fewer intersections and congestion points is better
        // This follows the video's concept that "more intersections equals more dis-coordination equals more traffic"
        const dijkstraScore = dijkstraPath.totalWeight * (1 + 0.3 * dijkstraCongestion + 0.2 * dijkstraIntersections);
        const astarScore = astarPath.totalWeight * (1 + 0.3 * astarCongestion + 0.2 * astarIntersections);
        
        // Choose the algorithm with the better score
        finalAlgorithm = dijkstraScore <= astarScore ? "dijkstra" : "astar";
        console.log(`Selected ${finalAlgorithm} based on scores: Dijkstra=${dijkstraScore}, A*=${astarScore}`);
      } else {
        console.log("Could not compare both algorithms, using selected algorithm:", finalAlgorithm);
      }
      
      // Now get the optimal path with the chosen algorithm
      const response = await fetch(`${API_URL}/api/route-optimization/find-path`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mapId: map.id,
          startX: startPoint.x,
          startY: startPoint.y,
          endX: endPoint.x,
          endY: endPoint.y,
          algorithm: finalAlgorithm,
          simulationParams: {
            ...simulationParams,
            // If user selected avoid congestion, further enhance that preference
            routingStrategy: simulationParams.routingStrategy === "AVOID_CONGESTION" 
              ? "AVOID_CONGESTION" 
              : finalAlgorithm === "astar" ? "BALANCED" : "SHORTEST_PATH"
          }
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Find path response error:", errorText);
        throw new Error(`Failed to find optimal path: ${errorText}`);
      }
      
      const pathData = await response.json();
      console.log("Optimal path data:", pathData);
      
      // Validate that the path data contains valid roadPath
      if (!pathData.roadPath || pathData.roadPath.length === 0) {
        console.error("Received empty roadPath in path data");
        throw new Error("No valid path found between the selected points");
      }
      
      // Add a descriptive message about the chosen path
      pathData.description = getPathDescription(pathData, finalAlgorithm);
      
      setOptimalPath(pathData);
      setShowPathComparison(false);
    } catch (error) {
      console.error('Error finding optimal path:', error);
      setError(error instanceof Error ? error.message : 'Failed to find optimal path');
    } finally {
      setIsLoadingPath(false);
      setIsSelectingPoints(false);
    }
  };
  
  // Generate a description of the path based on the algorithm and path characteristics
  const getPathDescription = (path: OptimalPath, algorithm: string): string => {
    const congestionPoints = countCongestionPoints(path);
    const intersections = countIntersections(path);
    
    let description = `This route was calculated using the ${algorithm === 'dijkstra' ? 'Dijkstra' : 'A*'} algorithm. `;
    
    if (congestionPoints === 0) {
      description += "It avoids all congested areas. ";
    } else if (congestionPoints === 1) {
      description += "It passes through 1 congested area. ";
    } else {
      description += `It passes through ${congestionPoints} congested areas. `;
    }
    
    if (intersections <= 1) {
      description += "With minimal intersections, this route minimizes the 'traffic snake' effect. ";
    } else if (intersections <= 3) {
      description += "This route has a few intersections where traffic flow might slow down. ";
    } else {
      description += "This route has several intersections which may create traffic snakes during peak hours. ";
    }
    
    description += `Estimated travel time is ${formatTime(path.estimatedTimeMinutes)}.`;
    
    return description;
  };
  
  const comparePathAlgorithms = async () => {
    if (!map || !startPoint || !endPoint) return;
    
    setIsLoadingPath(true);
    
    try {
      const response = await fetch(`${API_URL}/api/route-optimization/compare-paths`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mapId: map.id,
          startX: startPoint.x,
          startY: startPoint.y,
          endX: endPoint.x,
          endY: endPoint.y,
          simulationParams: simulationParams
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to compare paths');
      }
      
      const comparisonData = await response.json();
      
      // Calculate additional metrics for the comparison
      if (comparisonData.dijkstra && comparisonData.astar) {
        // Add traffic flow insights
        comparisonData.dijkstra.congestionPoints = countCongestionPoints(comparisonData.dijkstra);
        comparisonData.dijkstra.intersections = countIntersections(comparisonData.dijkstra);
        
        comparisonData.astar.congestionPoints = countCongestionPoints(comparisonData.astar);
        comparisonData.astar.intersections = countIntersections(comparisonData.astar);
        
        // Analyze which algorithm is better for this scenario based on traffic flow theory
        const dijkstraScore = comparisonData.dijkstra.totalWeight * 
          (1 + 0.3 * comparisonData.dijkstra.congestionPoints + 0.2 * comparisonData.dijkstra.intersections);
        
        const astarScore = comparisonData.astar.totalWeight * 
          (1 + 0.3 * comparisonData.astar.congestionPoints + 0.2 * comparisonData.astar.intersections);
        
        comparisonData.trafficFlowWinner = dijkstraScore <= astarScore ? "dijkstra" : "astar";
        
        // Calculate time difference
        const timeDiff = Math.abs(
          comparisonData.dijkstra.estimatedTimeMinutes - comparisonData.astar.estimatedTimeMinutes
        );
        
        comparisonData.timeDifference = timeDiff;
      }
      
      setPathComparison(comparisonData);
      setOptimalPath(null); // Clear the single path data
      setShowPathComparison(true);
    } catch (error) {
      console.error('Error comparing paths:', error);
      setError('Failed to compare path algorithms');
    } finally {
      setIsLoadingPath(false);
      setIsSelectingPoints(false);
    }
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
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    console.log(`Canvas click at: (${x}, ${y})`);
    
    if (!startPoint) {
      setStartPoint({ x, y });
      console.log(`Set start point: (${x}, ${y})`);
    } else if (!endPoint) {
      setEndPoint({ x, y });
      console.log(`Set end point: (${x}, ${y})`);
      
      // Automatically find path when both points are selected
      // Increased timeout to ensure state is updated
      setTimeout(() => {
        console.log("Finding path between:", startPoint, "and", { x, y });
        if (showPathComparison) {
          comparePathAlgorithms();
        } else {
          findOptimalPath();
        }
      }, 300);
    }
  };
  
  const resetPathfinding = () => {
    setStartPoint(null);
    setEndPoint(null);
    setOptimalPath(null);
    setPathComparison(null);
    setIsSelectingPoints(false);
    setShowPathComparison(false);
  };
  
  const startPathSelection = () => {
    resetPathfinding();
    setIsSelectingPoints(true);
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

    // Draw roads
    map.trafficData.forEach((road) => {
      const { startX, startY, endX, endY, roadType, density, points } = road;

      // Set line style based on road type and density
      ctx.lineWidth = getRoadWidth(roadType);
      ctx.strokeStyle = getRoadColor(density);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Draw the road
      ctx.beginPath();
      
      // Start path
      ctx.moveTo(startX, startY);
      
      if (points && points.length > 0) {
        // Draw through all intermediate points
        points.forEach(point => {
          ctx.lineTo(point.x, point.y);
        });
      }
      
      // Draw to end point
      ctx.lineTo(endX, endY);
      ctx.stroke();
    });

    // Debug path points if available
    if (optimalPath && optimalPath.coordinatePath && optimalPath.coordinatePath.length > 0) {
      console.log("Drawing optimal path with", optimalPath.coordinatePath.length, "points");
    }

    // Draw the optimal path if available
    if (optimalPath && optimalPath.roadPath && optimalPath.roadPath.length > 0) {
      console.log("Drawing optimal path with roadPath length:", optimalPath.roadPath.length);
      drawOptimalPath(ctx, optimalPath, "#ff9900", 5);
    }

    // Draw comparison paths if enabled
    if (showPathComparison && pathComparison) {
      if (pathComparison.dijkstra && pathComparison.dijkstra.roadPath && pathComparison.dijkstra.roadPath.length > 0) {
        console.log("Drawing Dijkstra path with length:", pathComparison.dijkstra.roadPath.length);
        drawOptimalPath(ctx, pathComparison.dijkstra, "#ff5722", 4); // Orange for Dijkstra
      }
      if (pathComparison.astar && pathComparison.astar.roadPath && pathComparison.astar.roadPath.length > 0) {
        console.log("Drawing A* path with length:", pathComparison.astar.roadPath.length);
        drawOptimalPath(ctx, pathComparison.astar, "#8bc34a", 3); // Light green for A*
      }
    }
    
    // Always draw start and end points if available - improved visibility
    if (startPoint) {
      drawPathPoint(ctx, startPoint.x, startPoint.y, "#2196f3"); // Blue for start
    }
    if (endPoint) {
      drawPathPoint(ctx, endPoint.x, endPoint.y, "#f44336"); // Red for end
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
          ...(road.points || []),            // Intermediate points if exist
          { x: road.endX, y: road.endY }     // End point
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
            speedModifier = 0.7 + Math.sin(Date.now() / 1000 + vehicle.id) * 0.15; // More variation, slower
            break;
          case "HIGH":
            speedModifier = 0.5 + Math.sin(Date.now() / 1000 + vehicle.id) * 0.2; // Even more variation, even slower
            break;
          case "CONGESTED":
            speedModifier = 0.3 + Math.sin(Date.now() / 2000 + vehicle.id) * 0.25; // Most variation, slowest
            break;
        }

        // Check for vehicles ahead to simulate car following behavior
        const roadVehicles = vehiclesByRoad[vehicle.roadId] || [];
        
        // Get current target point based on path index and direction
        let currentPoint = completePath[pathIndex];
        let targetPoint = completePath[isReversed ? pathIndex - 1 : pathIndex + 1];
        
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
              direction: Math.atan2(targetPoint.y - currentPoint.y, targetPoint.x - currentPoint.x)
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
              direction: Math.atan2(targetPoint.y - currentPoint.y, targetPoint.x - currentPoint.x)
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
            
            if (dotProduct > 0) { // Vehicle is ahead
              const distanceBetween = Math.sqrt(otherDx * otherDx + otherDy * otherDy);
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
              )
            };
          }
          
          // Move to next segment
          const nextTargetIndex = isReversed ? newPathIndex - 1 : newPathIndex + 1;
          const nextTargetPoint = completePath[Math.min(Math.max(0, nextTargetIndex), completePath.length - 1)];
          
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
            )
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
          direction: Math.atan2(dirY, dirX)
        };
      })
      .filter((vehicle): vehicle is Vehicle => vehicle !== null);

    setVehicles(updatedVehicles);

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
    const roadType = map?.trafficData.find(r => r.id === roadId)?.roadType || "NORMAL";
    
    if (roadType === "HIGHWAY") {
      // Draw a more streamlined car (like a sports car or sedan)
      
      // Car body (main shape)
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(-size * 2, 0);  // back left
      ctx.lineTo(-size * 2, -size * 0.8);  // back left top
      ctx.lineTo(-size * 1, -size * 1.2);  // middle left top
      ctx.lineTo(size * 1, -size * 1.2);   // middle right top
      ctx.lineTo(size * 2, -size * 0.8);   // front right top
      ctx.lineTo(size * 2, 0);            // front right bottom
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
        return 8;
      case "NORMAL":
        return 6;
      case "RESIDENTIAL":
        return 4;
      default:
        return 6;
    }
  };

  const getRoadColor = (density: string): string => {
    switch (density) {
      case "LOW":
        return "#4caf50"; // Green
      case "MEDIUM":
        return "#ffc107"; // Yellow
      case "HIGH":
        return "#ff9800"; // Orange
      case "CONGESTED":
        return "#f44336"; // Red
      default:
        return "#9e9e9e"; // Gray
    }
  };

  const toggleSimulation = () => {
    setIsSimulationRunning(!isSimulationRunning);
  };

  const changeSimulationSpeed = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSimulationSpeed(parseFloat(e.target.value));
  };
  
  const handleSimulationParamChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSimulationParams(prev => ({
      ...prev,
      [name]: value
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
      ctx.save();
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = color;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      
      // Draw an outline around the path for better visibility
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 5;
      
      ctx.beginPath();
      
      // Start with the first point
      const firstRoad = path.roadPath[0];
      if (!firstRoad || firstRoad.startX === undefined || firstRoad.startY === undefined) {
        console.error("Invalid first road in path:", firstRoad);
        return;
      }
      
      ctx.moveTo(firstRoad.startX, firstRoad.startY);
      
      // Draw a gradient path to show potential congestion areas
      const gradient = createCongestionGradient(ctx, path);
      if (gradient) {
        ctx.strokeStyle = gradient;
      }
      
      // For each road segment in the path
      for (let i = 0; i < path.roadPath.length; i++) {
        const road = path.roadPath[i];
        if (!road || road.endX === undefined || road.endY === undefined) {
          console.error("Invalid road at index", i, ":", road);
          continue;
        }
        
        // If the road has intermediate points, draw through those
        if (road.points && road.points.length > 0) {
          road.points.forEach(point => {
            if (point && point.x !== undefined && point.y !== undefined) {
              ctx.lineTo(point.x, point.y);
            }
          });
        }
        
        // Draw to the end point of this road
        ctx.lineTo(road.endX, road.endY);
        
        // Mark congestion points with special indicators
        if (road.density === "HIGH" || road.density === "CONGESTED") {
          const midX = road.startX + (road.endX - road.startX) * 0.5;
          const midY = road.startY + (road.endY - road.startY) * 0.5;
          drawCongestionIndicator(ctx, midX, midY, road.density);
        }
      }
      
      ctx.stroke();
      
      // Visualize traffic flow along the path
      visualizeTrafficFlow(ctx, path);
      
      // Add arrow heads to show direction - add more arrows for visibility
      const numArrows = Math.min(5, Math.ceil(path.roadPath.length / 3));
      const arrowInterval = Math.max(1, Math.floor(path.roadPath.length / numArrows));
      
      for (let i = 0; i < path.roadPath.length; i += arrowInterval) {
        const road = path.roadPath[i];
        if (!road) continue;
        
        // Find the midpoint to place the arrow
        let midX, midY, angle;
        
        if (road.points && road.points.length > 0) {
          // For curved roads, use the middle point
          const midPointIndex = Math.floor(road.points.length / 2);
          const midPoint = road.points[midPointIndex];
          const nextPointIndex = Math.min(midPointIndex + 1, road.points.length - 1);
          const nextPoint = road.points[nextPointIndex];
          
          if (!midPoint || !nextPoint) continue;
          
          midX = midPoint.x;
          midY = midPoint.y;
          angle = Math.atan2(nextPoint.y - midPoint.y, nextPoint.x - midPoint.x);
        } else {
          // For straight roads, use midpoint of the line
          const dx = road.endX - road.startX;
          const dy = road.endY - road.startY;
          angle = Math.atan2(dy, dx);
          
          midX = road.startX + dx * 0.6;
          midY = road.startY + dy * 0.6;
        }
        
        // Draw arrow
        drawArrow(ctx, midX, midY, angle, color);
      }
      
      ctx.restore();
    } catch (error) {
      console.error("Error drawing optimal path:", error);
    }
  };
  
  // Create a gradient that visualizes congestion levels along the path
  const createCongestionGradient = (
    ctx: CanvasRenderingContext2D,
    path: OptimalPath
  ): CanvasGradient | null => {
    if (path.roadPath.length === 0) return null;
    
    // Get start and end points for gradient
    const firstRoad = path.roadPath[0];
    const lastRoad = path.roadPath[path.roadPath.length - 1];
    
    const gradient = ctx.createLinearGradient(
      firstRoad.startX, firstRoad.startY, 
      lastRoad.endX, lastRoad.endY
    );
    
    // Define gradient colors based on congestion patterns
    gradient.addColorStop(0, '#3498db'); // Start with blue for normal flow
    
    // Add intermediate color stops based on congestion
    let totalLength = 0;
    const pathTotalLength = path.totalWeight;
    
    // Calculate cumulative distance for each road segment
    path.roadPath.forEach((road, index) => {
      if (road.density === "HIGH" || road.density === "CONGESTED") {
        // Calculate position in the path (0-1)
        const segmentLength = Math.sqrt(
          Math.pow(road.endX - road.startX, 2) + 
          Math.pow(road.endY - road.startY, 2)
        );
        
        totalLength += segmentLength;
        const position = totalLength / pathTotalLength;
        
        if (road.density === "HIGH") {
          gradient.addColorStop(Math.max(0, position - 0.05), '#f39c12'); // Yellow before high density
          gradient.addColorStop(Math.min(1, position + 0.05), '#3498db'); // Back to blue after
        } else if (road.density === "CONGESTED") {
          gradient.addColorStop(Math.max(0, position - 0.05), '#e74c3c'); // Red before congestion
          gradient.addColorStop(Math.min(1, position + 0.05), '#3498db'); // Back to blue after
        }
      }
    });
    
    gradient.addColorStop(1, '#2ecc71'); // End with green at destination
    
    return gradient;
  };
  
  // Draw a congestion indicator at the specified location
  const drawCongestionIndicator = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    density: string
  ) => {
    const radius = density === "CONGESTED" ? 12 : 8;
    const color = density === "CONGESTED" ? '#e74c3c' : '#f39c12';
    
    ctx.save();
    ctx.globalAlpha = 0.7;
    
    // Draw warning indicator
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw exclamation mark
    ctx.fillStyle = 'white';
    ctx.font = `${radius}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', x, y);
    
    ctx.restore();
  };
  
  // Visualize traffic flow along the path with animated dots
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
      const numIndicators = Math.min(20, path.coordinatePath.length);
      
      // Current time for animation
      const time = Date.now() / 1000;
      
      for (let i = 0; i < numIndicators; i++) {
        // Calculate position in the path (0-1)
        const position = (time * simulationSpeed * 0.2 + i / numIndicators) % 1;
        
        // Get interpolated point in the path
        const pointIndex = Math.floor(position * (path.coordinatePath.length - 1));
        const nextPointIndex = Math.min(pointIndex + 1, path.coordinatePath.length - 1);
        
        // Check if the points exist and are valid
        const currentPoint = path.coordinatePath[pointIndex];
        const nextPoint = path.coordinatePath[nextPointIndex];
        
        if (!currentPoint || !nextPoint || 
            currentPoint.x === undefined || currentPoint.y === undefined || 
            nextPoint.x === undefined || nextPoint.y === undefined) {
          continue;
        }
        
        const subPosition = position * (path.coordinatePath.length - 1) - pointIndex;
        
        const x = currentPoint.x + (nextPoint.x - currentPoint.x) * subPosition;
        const y = currentPoint.y + (nextPoint.y - currentPoint.y) * subPosition;
        
        // Skip if NaN
        if (isNaN(x) || isNaN(y)) {
          continue;
        }
        
        // Draw a dot representing a vehicle
        const size = 4;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 3;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.restore();
    } catch (error) {
      console.error("Error visualizing traffic flow:", error);
    }
  };

  // Draw an arrow for path direction
  const drawArrow = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number,
    color: string
  ) => {
    const headLength = 15;
    const headWidth = 8;
    
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-headLength, -headWidth / 2);
    ctx.lineTo(-headLength * 0.8, 0);
    ctx.lineTo(-headLength, headWidth / 2);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
  };
  
  // Draw a point marker (start/end)
  const drawPathPoint = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string
  ) => {
    const radius = 8;
    
    ctx.save();
    
    // Outer circle
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Inner circle
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.6, 0, Math.PI * 2);
    ctx.fill();
    
    // Pulse effect
    const pulseSize = radius * (1.5 + Math.sin(Date.now() / 200) * 0.3);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(x, y, pulseSize, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.restore();
  };

  // Count congestion points along a path
  const countCongestionPoints = (path: OptimalPath): number => {
    if (!path.roadPath) return 0;
    
    return path.roadPath.filter(road => 
      road.density === "HIGH" || road.density === "CONGESTED"
    ).length;
  };
  
  // Count potential intersections along a path
  const countIntersections = (path: OptimalPath): number => {
    if (!path.roadPath || path.roadPath.length <= 1) return 0;
    
    // Simple approximation: count changes in direction as potential intersections
    let intersections = 0;
    let lastDirection = "";
    
    for (let i = 1; i < path.roadPath.length; i++) {
      const prevRoad = path.roadPath[i-1];
      const road = path.roadPath[i];
      
      // Calculate angle of the current road segment
      const angle = Math.atan2(
        road.endY - road.startY,
        road.endX - road.startX
      ) * 180 / Math.PI;
      
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
                      <span className="text-sm font-medium">{simulationSpeed}x</span>
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
                    style={{ cursor: isSelectingPoints ? 'crosshair' : 'default' }}
                  />
                  {isLoadingPath && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                      <div className="bg-white p-4 rounded-lg shadow-lg">
                        <p className="text-gray-800">Calculating optimal path...</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:w-1/4">
              <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                <h2 className="text-lg font-bold mb-4">Optimal Path Finder</h2>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Algorithm
                  </label>
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => {
                        setSelectedAlgorithm("dijkstra");
                        setShowPathComparison(false);
                      }}
                      className={`flex-1 py-2 px-3 rounded-md border ${
                        selectedAlgorithm === "dijkstra" && !showPathComparison
                          ? "bg-blue-100 border-blue-500 text-blue-700"
                          : "bg-white border-gray-300"
                      }`}
                    >
                      Dijkstra
                    </button>
                    <button
                      onClick={() => {
                        setSelectedAlgorithm("astar");
                        setShowPathComparison(false);
                      }}
                      className={`flex-1 py-2 px-3 rounded-md border ${
                        selectedAlgorithm === "astar" && !showPathComparison
                          ? "bg-blue-100 border-blue-500 text-blue-700"
                          : "bg-white border-gray-300"
                      }`}
                    >
                      A* Algorithm
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      setShowPathComparison(true);
                    }}
                    className={`w-full py-2 px-3 rounded-md border mb-4 ${
                      showPathComparison
                        ? "bg-blue-100 border-blue-500 text-blue-700"
                        : "bg-white border-gray-300"
                    }`}
                  >
                    Compare Both
                  </button>
                </div>
                
                <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                  <h2 className="text-lg font-bold mb-4">Simulation Parameters</h2>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Time of Day
                    </label>
                    <select
                      value={simulationParams.timeOfDay}
                      onChange={handleSimulationParamChange}
                      name="timeOfDay"
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="MORNING">Morning (Rush Hour)</option>
                      <option value="AFTERNOON">Afternoon</option>
                      <option value="EVENING">Evening (Rush Hour)</option>
                      <option value="NIGHT">Night</option>
                    </select>
                    {simulationParams.timeOfDay === "MORNING" || simulationParams.timeOfDay === "EVENING" ? (
                      <p className="mt-1 text-xs text-amber-600">
                        ⚠️ Rush hour: Higher likelihood of traffic snakes and phantom intersections
                      </p>
                    ) : null}
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Day Type
                    </label>
                    <select
                      value={simulationParams.dayType}
                      onChange={handleSimulationParamChange}
                      name="dayType"
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="WEEKDAY">Weekday</option>
                      <option value="WEEKEND">Weekend</option>
                      <option value="HOLIDAY">Holiday</option>
                    </select>
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Weather Condition
                    </label>
                    <select
                      value={simulationParams.weatherCondition}
                      onChange={handleSimulationParamChange}
                      name="weatherCondition"
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="CLEAR">Clear</option>
                      <option value="RAIN">Rain (Slows Traffic)</option>
                      <option value="SNOW">Snow (Heavy Slowdown)</option>
                      <option value="FOG">Fog (Reduced Visibility)</option>
                    </select>
                    {simulationParams.weatherCondition !== "CLEAR" ? (
                      <p className="mt-1 text-xs text-amber-600">
                        ⚠️ Bad weather increases driver reaction times and traffic snake formation
                      </p>
                    ) : null}
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Routing Strategy
                    </label>
                    <select
                      value={simulationParams.routingStrategy}
                      onChange={handleSimulationParamChange}
                      name="routingStrategy"
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="SHORTEST_PATH">Shortest Path (Distance Only)</option>
                      <option value="BALANCED">Balanced (Distance + Traffic)</option>
                      <option value="AVOID_CONGESTION">Avoid Congestion (Minimize Traffic Snakes)</option>
                    </select>
                    {simulationParams.routingStrategy === "AVOID_CONGESTION" ? (
                      <p className="mt-1 text-xs text-green-600">
                        ✓ This strategy prioritizes highways and roads with fewer intersections
                      </p>
                    ) : null}
                  </div>
                  
                  <div className="p-3 bg-blue-50 rounded-md text-sm text-gray-700 mb-3">
                    <p className="font-medium text-gray-800 mb-1">About Traffic Flow</p>
                    <p className="text-xs">
                      As explained in "The Simple Solution to Traffic", congestion often forms when vehicles need to slow down and accelerate at different rates, creating "traffic snakes" that propagate backward.
                    </p>
                    <p className="text-xs mt-1">
                      Routes with fewer intersections and less congestion can significantly reduce travel time, even if they're slightly longer in distance.
                    </p>
                  </div>
                </div>
                
                <div className="mb-4">
                  <div className="flex gap-2">
                    <button
                      onClick={startPathSelection}
                      className="flex-1 py-2 px-4 bg-green-500 text-white rounded-md hover:bg-green-600"
                      disabled={isLoadingPath}
                    >
                      Find Route
                    </button>
                    <button
                      onClick={resetPathfinding}
                      className="py-2 px-4 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                      disabled={isLoadingPath || (!startPoint && !endPoint)}
                    >
                      Reset
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
                </div>
                
                {/* Path Results */}
                {optimalPath && !showPathComparison && (
                  <div className="border border-gray-200 rounded-md p-3 bg-gray-50">
                    <h3 className="font-medium text-gray-800 mb-2">
                      Optimal Route
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      <div className="text-gray-600">Algorithm:</div>
                      <div className="font-medium text-right">{optimalPath.algorithm === 'dijkstra' ? 'Dijkstra' : 'A*'}</div>
                      
                      <div className="text-gray-600">Est. Travel Time:</div>
                      <div className="font-medium text-right">{formatTime(optimalPath.estimatedTimeMinutes)}</div>
                      
                      <div className="text-gray-600">Distance:</div>
                      <div className="font-medium text-right">{Math.round(optimalPath.totalWeight * 10) / 10} units</div>
                      
                      <div className="text-gray-600">Road Segments:</div>
                      <div className="font-medium text-right">{optimalPath.roadPath.length}</div>
                      
                      <div className="text-gray-600">Congestion Points:</div>
                      <div className="font-medium text-right">{countCongestionPoints(optimalPath)}</div>
                      
                      <div className="text-gray-600">Intersections:</div>
                      <div className="font-medium text-right">{countIntersections(optimalPath)}</div>
                    </div>
                    
                    <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-gray-700">
                      <p className="italic">{optimalPath.description}</p>
                    </div>
                    
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex-1 border-t border-gray-200"></div>
                      <span className="text-xs text-gray-500">Path Legend</span>
                      <div className="flex-1 border-t border-gray-200"></div>
                    </div>
                    
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-blue-500 mr-1"></div>
                        <span>Normal Flow</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-yellow-500 mr-1"></div>
                        <span>High Density</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-red-500 mr-1"></div>
                        <span>Congested</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
                        <span>Destination</span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => setShowPathComparison(true)}
                      className="w-full mt-3 py-1 text-xs text-blue-600 hover:text-blue-800 focus:outline-none"
                    >
                      Show Algorithm Comparison
                    </button>
                  </div>
                )}
                
                {showPathComparison && pathComparison && (
                  <div className="border border-gray-200 rounded-md p-3 bg-gray-50">
                    <h3 className="font-medium text-gray-800 mb-2">Algorithm Comparison</h3>
                    
                    <div className="flex mb-2">
                      <div className="w-1/3"></div>
                      <div className="w-1/3 text-center text-sm font-medium text-orange-600">Dijkstra</div>
                      <div className="w-1/3 text-center text-sm font-medium text-green-600">A*</div>
                    </div>
                    
                    <div className="mb-1">
                      <div className="text-xs text-gray-600 mb-1">Est. Travel Time:</div>
                      <div className="flex">
                        <div className="w-1/3 text-xs">Comparison:</div>
                        <div className="w-1/3 text-center font-medium">
                          {pathComparison.dijkstra ? formatTime(pathComparison.dijkstra.estimatedTimeMinutes) : '-'}
                        </div>
                        <div className="w-1/3 text-center font-medium">
                          {pathComparison.astar ? formatTime(pathComparison.astar.estimatedTimeMinutes) : '-'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mb-1">
                      <div className="text-xs text-gray-600 mb-1">Distance:</div>
                      <div className="flex">
                        <div className="w-1/3 text-xs">Comparison:</div>
                        <div className="w-1/3 text-center font-medium">
                          {pathComparison.dijkstra ? `${Math.round(pathComparison.dijkstra.totalWeight * 10) / 10}` : '-'}
                        </div>
                        <div className="w-1/3 text-center font-medium">
                          {pathComparison.astar ? `${Math.round(pathComparison.astar.totalWeight * 10) / 10}` : '-'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mb-1">
                      <div className="text-xs text-gray-600 mb-1">Congestion Points:</div>
                      <div className="flex">
                        <div className="w-1/3 text-xs">Count:</div>
                        <div className="w-1/3 text-center font-medium">
                          {pathComparison.dijkstra ? countCongestionPoints(pathComparison.dijkstra) : '-'}
                        </div>
                        <div className="w-1/3 text-center font-medium">
                          {pathComparison.astar ? countCongestionPoints(pathComparison.astar) : '-'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mb-1">
                      <div className="text-xs text-gray-600 mb-1">Intersections:</div>
                      <div className="flex">
                        <div className="w-1/3 text-xs">Count:</div>
                        <div className="w-1/3 text-center font-medium">
                          {pathComparison.dijkstra ? countIntersections(pathComparison.dijkstra) : '-'}
                        </div>
                        <div className="w-1/3 text-center font-medium">
                          {pathComparison.astar ? countIntersections(pathComparison.astar) : '-'}
                        </div>
                      </div>
                    </div>
                    
                    {pathComparison.trafficFlowWinner && (
                      <div className="mt-2 p-2 bg-indigo-50 border border-indigo-100 rounded-md">
                        <p className="text-xs text-gray-800">
                          <span className="font-medium">Traffic Flow Analysis:</span>{' '}
                          Based on "The Simple Solution to Traffic" concepts, the{' '}
                          <span className={`font-bold ${pathComparison.trafficFlowWinner === 'dijkstra' ? 'text-orange-600' : 'text-green-600'}`}>
                            {pathComparison.trafficFlowWinner === 'dijkstra' ? 'Dijkstra' : 'A*'}
                          </span>{' '}
                          algorithm provides a better route for current conditions.
                          {pathComparison.timeDifference ? (
                            <span className="block mt-1">
                              The time difference between routes is approximately {formatTime(pathComparison.timeDifference)}.
                            </span>
                          ) : null}
                        </p>
                      </div>
                    )}
                    
                    <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-gray-700">
                      <p className="mb-1 font-medium">Algorithm Differences:</p>
                      <p>• <span className="text-orange-600 font-medium">Dijkstra</span> explores all possible routes equally and guarantees the shortest path.</p>
                      <p>• <span className="text-green-600 font-medium">A*</span> uses a heuristic to prioritize exploring paths that seem to lead toward the destination.</p>
                      <p className="mt-2">Based on the traffic theory, A* typically finds routes with fewer intersections and traffic snakes, while Dijkstra may find shorter but more congested paths.</p>
                      <p className="mt-2">The blue path represents the optimal route balancing distance and traffic conditions.</p>
                    </div>
                    
                    <button
                      onClick={() => {
                        // Use the winner algorithm to find the optimal path
                        if (pathComparison.trafficFlowWinner) {
                          setSelectedAlgorithm(pathComparison.trafficFlowWinner);
                          findOptimalPath();
                        }
                      }}
                      className="w-full mt-3 py-1.5 px-3 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Show Optimal Route
                    </button>
                  </div>
                )}
              </div>
              
              <div className="bg-white rounded-lg shadow-md p-4">
                <h2 className="text-lg font-bold mb-4">Traffic Density Legend</h2>
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
    </div>
  );
};

export default ViewMapPage;
