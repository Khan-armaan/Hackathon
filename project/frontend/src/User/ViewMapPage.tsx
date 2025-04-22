import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { Colors } from "../Colors";

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

interface TrafficMap {
  id: number;
  name: string;
  description: string;
  imageUrl: string;
  width: number;
  height: number;
  trafficData: TrafficData[];
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
  }, [isSimulationRunning, vehicles, map, image]);

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
        return 5;
      case "RESIDENTIAL":
        return 3;
      default:
        return 5;
    }
  };

  const getRoadColor = (density: string): string => {
    switch (density) {
      case "LOW":
        return "rgba(0, 255, 0, 0.5)"; // Green
      case "MEDIUM":
        return "rgba(255, 255, 0, 0.5)"; // Yellow
      case "HIGH":
        return "rgba(255, 165, 0, 0.5)"; // Orange
      case "CONGESTED":
        return "rgba(255, 0, 0, 0.5)"; // Red
      default:
        return "rgba(0, 255, 0, 0.5)";
    }
  };

  const toggleSimulation = () => {
    setIsSimulationRunning((prev) => !prev);
  };

  const changeSimulationSpeed = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSimulationSpeed(parseFloat(e.target.value));
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-xl text-gray-500">Loading traffic map...</div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      ) : map ? (
        <div>
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <h1 className="text-2xl font-bold mb-2">{map.name}</h1>
            {map.description && (
              <p className="text-gray-600 mb-4">{map.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-4 mb-4">
              <button
                onClick={toggleSimulation}
                className={`px-4 py-2 rounded ${
                  isSimulationRunning
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : "bg-green-500 hover:bg-green-600 text-white"
                }`}
              >
                {isSimulationRunning ? "Pause Simulation" : "Start Simulation"}
              </button>

              <div className="flex items-center">
                <span className="mr-2">Speed:</span>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.5"
                  value={simulationSpeed}
                  onChange={changeSimulationSpeed}
                  className="w-32"
                />
                <span className="ml-2">{simulationSpeed}x</span>
              </div>

              <div className="ml-auto flex gap-4">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-[#00FF00] mr-2"></div>
                  <span>Low Traffic</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-[#FFFF00] mr-2"></div>
                  <span>Medium Traffic</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-[#FFA500] mr-2"></div>
                  <span>High Traffic</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-[#FF0000] mr-2"></div>
                  <span>Congested</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-100 rounded-lg border border-gray-300 overflow-hidden">
            <canvas
              ref={canvasRef}
              width={map.width}
              height={map.height}
              className="max-w-full h-auto"
            />
          </div>

          <div className="mt-6 bg-white rounded-lg shadow-md p-4">
            <h2 className="text-xl font-bold mb-4">Traffic Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-100 p-4 rounded">
                <h3 className="font-medium text-gray-700">Total Roads</h3>
                <p className="text-2xl font-bold">{map.trafficData.length}</p>
              </div>
              <div className="bg-gray-100 p-4 rounded">
                <h3 className="font-medium text-gray-700">Total Vehicles</h3>
                <p className="text-2xl font-bold">{vehicles.length}</p>
              </div>
              <div className="bg-gray-100 p-4 rounded">
                <h3 className="font-medium text-gray-700">Average Speed</h3>
                <p className="text-2xl font-bold">
                  {vehicles.length > 0
                    ? Math.round(
                        (vehicles.reduce((sum, v) => sum + v.speed, 0) /
                          vehicles.length) *
                          10
                      ) / 10
                    : 0}
                </p>
              </div>
              <div className="bg-gray-100 p-4 rounded">
                <h3 className="font-medium text-gray-700">Congestion Level</h3>
                <p className="text-2xl font-bold">
                  {map.trafficData.filter((r) => r.density === "CONGESTED")
                    .length > 0
                    ? "High"
                    : map.trafficData.filter((r) => r.density === "HIGH")
                        .length > 0
                    ? "Medium"
                    : "Low"}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          No map selected. Please select a map to view traffic simulation.
        </div>
      )}
    </div>
  );
};

export default ViewMapPage;
