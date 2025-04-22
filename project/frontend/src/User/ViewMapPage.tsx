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
}

interface TrafficData {
  id: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
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
}

interface PathComparison {
  dijkstra: OptimalPath | null;
  astar: OptimalPath | null;
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
      animationRef.current = requestAnimationFrame(animateVehicles);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isSimulationRunning, vehicles, map, image, optimalPath, pathComparison, showPathComparison]);

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
      const { startX, startY, endX, endY, roadType, density } = road;

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

      // Calculate road direction angle
      const direction = Math.atan2(endY - startY, endX - startX);

      // Generate vehicles for this road
      for (let i = 0; i < vehicleCount; i++) {
        // Position along the road (0 to 1)
        const position = Math.random();

        // Calculate position
        const x = startX + position * (endX - startX);
        const y = startY + position * (endY - startY);

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

        newVehicles.push({
          id: vehicleId++,
          x,
          y,
          targetX: endX,
          targetY: endY,
          speed: baseSpeed * speedVariation,
          color,
          size: vehicleSize,
          direction,
          roadId: road.id,
        });
      }
    });

    setVehicles(newVehicles);
  };

  const findOptimalPath = async () => {
    if (!map || !startPoint || !endPoint) return;
    
    setIsLoadingPath(true);
    
    try {
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
          algorithm: selectedAlgorithm,
          simulationParams: simulationParams
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to find optimal path');
      }
      
      const pathData = await response.json();
      setOptimalPath(pathData);
      setPathComparison(null); // Clear any comparison data
      setShowPathComparison(false);
    } catch (error) {
      console.error('Error finding optimal path:', error);
      setError('Failed to find optimal path');
    } finally {
      setIsLoadingPath(false);
      setIsSelectingPoints(false);
    }
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
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (!startPoint) {
      setStartPoint({ x, y });
    } else if (!endPoint) {
      setEndPoint({ x, y });
      // Automatically find path when both points are selected
      setTimeout(() => {
        if (showPathComparison) {
          comparePathAlgorithms();
        } else {
          findOptimalPath();
        }
      }, 100);
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
      const { startX, startY, endX, endY, roadType, density } = road;

      // Set line style based on road type and density
      ctx.lineWidth = getRoadWidth(roadType);
      ctx.strokeStyle = getRoadColor(density);

      // Draw the road
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    });

    // Draw the optimal path if available
    if (optimalPath && optimalPath.roadPath.length > 0) {
      drawOptimalPath(ctx, optimalPath, "#ff9900", 5);
    }

    // Draw comparison paths if enabled
    if (showPathComparison && pathComparison) {
      if (pathComparison.dijkstra) {
        drawOptimalPath(ctx, pathComparison.dijkstra, "#ff5722", 4); // Orange for Dijkstra
      }
      if (pathComparison.astar) {
        drawOptimalPath(ctx, pathComparison.astar, "#8bc34a", 3); // Light green for A*
      }
    }
    
    // Draw start and end points if selecting or path is shown
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
        
        // Calculate distance to target
        const dx = vehicle.targetX - vehicle.x;
        const dy = vehicle.targetY - vehicle.y;
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
          // Switch direction - go back to start point or end point
          if (vehicle.targetX === road.endX && vehicle.targetY === road.endY) {
            return {
              ...vehicle,
              x: road.endX,
              y: road.endY,
              targetX: road.startX,
              targetY: road.startY,
              direction: Math.atan2(
                road.startY - road.endY,
                road.startX - road.endX
              ),
            };
          } else {
            return {
              ...vehicle,
              x: road.startX,
              y: road.startY,
              targetX: road.endX,
              targetY: road.endY,
              direction: Math.atan2(
                road.endY - road.startY,
                road.endX - road.startX
              ),
            };
          }
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
        };
      })
      .filter(Boolean) as Vehicle[];

    // Draw the vehicles
    updatedVehicles.forEach((vehicle) => {
      drawVehicle(ctx, vehicle);
    });

    setVehicles(updatedVehicles);
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
    if (!path.roadPath || path.roadPath.length === 0) return;
    
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
    ctx.moveTo(firstRoad.startX, firstRoad.startY);
    
    // Connect all road segments
    path.roadPath.forEach(road => {
      ctx.lineTo(road.endX, road.endY);
    });
    
    ctx.stroke();
    
    // Add arrow heads to show direction
    for (let i = 0; i < path.roadPath.length; i += Math.max(1, Math.floor(path.roadPath.length / 5))) {
      const road = path.roadPath[i];
      const dx = road.endX - road.startX;
      const dy = road.endY - road.startY;
      const angle = Math.atan2(dy, dx);
      
      const mid = {
        x: road.startX + dx * 0.6,
        y: road.startY + dy * 0.6
      };
      
      // Draw arrow
      drawArrow(ctx, mid.x, mid.y, angle, color);
    }
    
    ctx.restore();
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
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Conditions
                  </label>
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Time of Day
                      </label>
                      <select
                        name="timeOfDay"
                        value={simulationParams.timeOfDay}
                        onChange={handleSimulationParamChange}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      >
                        <option value="MORNING">Morning</option>
                        <option value="AFTERNOON">Afternoon</option>
                        <option value="EVENING">Evening</option>
                        <option value="NIGHT">Night</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Day Type
                      </label>
                      <select
                        name="dayType"
                        value={simulationParams.dayType}
                        onChange={handleSimulationParamChange}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      >
                        <option value="WEEKDAY">Weekday</option>
                        <option value="WEEKEND">Weekend</option>
                        <option value="HOLIDAY">Holiday</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Weather
                      </label>
                      <select
                        name="weatherCondition"
                        value={simulationParams.weatherCondition}
                        onChange={handleSimulationParamChange}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      >
                        <option value="CLEAR">Clear</option>
                        <option value="RAIN">Rain</option>
                        <option value="SNOW">Snow</option>
                        <option value="FOG">Fog</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Routing Strategy
                      </label>
                      <select
                        name="routingStrategy"
                        value={simulationParams.routingStrategy}
                        onChange={handleSimulationParamChange}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      >
                        <option value="SHORTEST_PATH">Shortest Path</option>
                        <option value="BALANCED">Balanced</option>
                        <option value="AVOID_CONGESTION">Avoid Congestion</option>
                      </select>
                    </div>
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
                      Route Using {optimalPath.algorithm === 'dijkstra' ? 'Dijkstra' : 'A*'} Algorithm
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-gray-600">Est. Travel Time:</div>
                      <div className="font-medium text-right">{formatTime(optimalPath.estimatedTimeMinutes)}</div>
                      
                      <div className="text-gray-600">Distance:</div>
                      <div className="font-medium text-right">{Math.round(optimalPath.totalWeight * 10) / 10} units</div>
                      
                      <div className="text-gray-600">Road Segments:</div>
                      <div className="font-medium text-right">{optimalPath.roadPath.length}</div>
                    </div>
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
                        <div className="w-1/3 text-xs">Difference:</div>
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
                      <div className="text-xs text-gray-600 mb-1">Road Segments:</div>
                      <div className="flex">
                        <div className="w-1/3 text-xs">Count:</div>
                        <div className="w-1/3 text-center font-medium">
                          {pathComparison.dijkstra ? pathComparison.dijkstra.roadPath.length : '-'}
                        </div>
                        <div className="w-1/3 text-center font-medium">
                          {pathComparison.astar ? pathComparison.astar.roadPath.length : '-'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-600">
                      <div className="flex items-center mb-1">
                        <span className="w-3 h-3 inline-block bg-orange-500 mr-1 rounded-full"></span>
                        <span>Dijkstra's Algorithm (orange path)</span>
                      </div>
                      <div className="flex items-center">
                        <span className="w-3 h-3 inline-block bg-green-500 mr-1 rounded-full"></span>
                        <span>A* Algorithm (green path)</span>
                      </div>
                    </div>
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
