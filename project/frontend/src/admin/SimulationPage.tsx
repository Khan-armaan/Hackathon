import React, { useState, useEffect, useRef } from "react";
import { eventsApi } from "../utils/api";

interface SimulationParams {
  trafficMapId: number;
  trafficMapName: string;
  timeOfDay: "MORNING" | "AFTERNOON" | "EVENING" | "NIGHT";
  dayType: "WEEKDAY" | "WEEKEND" | "HOLIDAY";
  vehicleDensity: number;
  hasActiveEvents: boolean;
  weatherCondition: "CLEAR" | "RAIN" | "SNOW" | "FOG";
  routingStrategy: "SHORTEST_PATH" | "BALANCED" | "AVOID_CONGESTION";
  includeLargeVehicles: boolean;
  congestionThreshold: number;
}

interface Event {
  id: number;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  impactLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  expectedVisitors: number;
  location: string;
  status: "UPCOMING" | "ONGOING" | "COMPLETED" | "CANCELLED";
}

interface SimulationResults {
  averageWaitTime: number;
  totalVehicles: number;
  congestionPercentage: number;
  bottlenecks: string[];
}

interface TrafficMap {
  id: number;
  name: string;
  description?: string;
  imageUrl: string;
  width: number;
  height: number;
}

interface OptimalPath {
  algorithm: string;
  path: number[];
  roadPath: {
    id: number;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    roadType: string;
    density: string;
  }[];
  coordinatePath: {x: number, y: number}[];
  totalWeight: number;
  estimatedTimeMinutes: number;
}

interface PathComparison {
  dijkstra: OptimalPath | null;
  astar: OptimalPath | null;
}

//const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const API_URL = import.meta.env.VITE_API_URL || "https://apihack.mybyte.store";

const SimulationPage: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const [availableMaps, setAvailableMaps] = useState<TrafficMap[]>([]);
  const [_, setEvents] = useState<Event[]>([]);
  const [simulationParams, setSimulationParams] = useState<SimulationParams>({
    trafficMapId: 1,
    trafficMapName: "Kachi Dham Main Area",
    timeOfDay: "MORNING",
    dayType: "WEEKDAY",
    vehicleDensity: 70,
    hasActiveEvents: false,
    weatherCondition: "CLEAR",
    routingStrategy: "BALANCED",
    includeLargeVehicles: true,
    congestionThreshold: 75
  });
  const [simulationResults, setSimulationResults] = useState<SimulationResults>({
    averageWaitTime: 0,
    totalVehicles: 0,
    congestionPercentage: 0,
    bottlenecks: []
  });
  
  // Pathfinding state
  const [startPoint, setStartPoint] = useState<{x: number, y: number} | null>(null);
  const [endPoint, setEndPoint] = useState<{x: number, y: number} | null>(null);
  const [optimalPath, setOptimalPath] = useState<OptimalPath | null>(null);
  const [pathComparison, setPathComparison] = useState<PathComparison | null>(null);
  const [showPathComparison, setShowPathComparison] = useState(false);
  const [isCalculatingPath, setIsCalculatingPath] = useState(false);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<string>("astar");

  useEffect(() => {
    // Initialize the canvas when component mounts
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        // Clear the canvas
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.fillStyle = '#333';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Simulation visualization will appear here', canvasRef.current.width / 2, canvasRef.current.height / 2);
      }
    }
    
    // Fetch traffic maps
    fetchTrafficMaps();
    
    // Fetch events
    fetchEvents();
  }, []);

  const fetchTrafficMaps = async () => {
    try {
      const response = await fetch(`${API_URL}/api/traffic-map`);
      if (response.ok) {
        const maps = await response.json();
        setAvailableMaps(maps);
        
        // If we have maps, set the first one as default
        if (maps.length > 0) {
          setSimulationParams(prev => ({
            ...prev,
            trafficMapId: maps[0].id,
            trafficMapName: maps[0].name
          }));
        }
      } else {
        console.error("Failed to fetch traffic maps");
        // Fallback to default maps if API fails
        setAvailableMaps([
          { id: 1, name: "Kachi Dham Main Area", imageUrl: "", width: 800, height: 600 },
          { id: 2, name: "Kachi Dham Extended", imageUrl: "", width: 800, height: 600 },
          { id: 3, name: "Festival Route", imageUrl: "", width: 800, height: 600 }
        ]);
      }
    } catch (error) {
      console.error("Error fetching traffic maps:", error);
    }
  };

  const fetchEvents = async () => {
    try {
      const response = await eventsApi.getEvents();
      if (response.data) {
        setEvents(response.data);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };

  const handleParamChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    
    setSimulationParams({
      ...simulationParams,
      [name]: type === 'checkbox' 
        ? (e.target as HTMLInputElement).checked
        : type === 'number' 
          ? parseFloat(value) 
          : value
    });
    
    // Reset pathfinding when parameters change
    resetPathfinding();
  };

  const handleMapChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const mapId = parseInt(e.target.value);
    const selectedMap = availableMaps.find(map => map.id === mapId);
    
    setSimulationParams({
      ...simulationParams,
      trafficMapId: mapId,
      trafficMapName: selectedMap?.name || ""
    });
    
    // Reset pathfinding when map changes
    resetPathfinding();
  };

  const createSimulation = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`${API_URL}/api/simulation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trafficMapId: simulationParams.trafficMapId,
          timeOfDay: simulationParams.timeOfDay,
          dayType: simulationParams.dayType,
          vehicleDensity: simulationParams.vehicleDensity,
          hasActiveEvents: simulationParams.hasActiveEvents,
          weatherCondition: simulationParams.weatherCondition,
          routingStrategy: simulationParams.routingStrategy,
          includeLargeVehicles: simulationParams.includeLargeVehicles,
          congestionThreshold: simulationParams.congestionThreshold,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create simulation');
      }
      
      const data = await response.json();
      return data.simulation.id;
    } catch (error) {
      console.error('Error creating simulation:', error);
      return null;
    }
  };

  const handleStartSimulation = async () => {
    setIsLoading(true);
    
    try {
      // Step 1: Create a simulation in the backend
      const simulationId = await createSimulation();
      
      if (!simulationId) {
        throw new Error('Failed to create simulation');
      }
      
      // Step 2: Run the simulation
      const resultsResponse = await fetch(`${API_URL}/api/simulation/${simulationId}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!resultsResponse.ok) {
        throw new Error('Failed to run simulation');
      }
      
      const resultsData = await resultsResponse.json();
      
      // Step 3: Update simulation results
      setSimulationResults({
        averageWaitTime: resultsData.result.avgTravelTime,
        totalVehicles: resultsData.result.completedVehicles,
        congestionPercentage: resultsData.result.congestionPercentage,
        bottlenecks: resultsData.result.bottlenecks
      });
      
      setIsSimulationRunning(true);
      
      if (canvasRef.current) {
        startCanvasSimulation();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopSimulation = () => {
    setIsSimulationRunning(false);
    // In a real implementation, you'd stop the animation loop here
  };
  
  const findOptimalPath = async () => {
    if (!startPoint || !endPoint) return;
    
    setIsCalculatingPath(true);
    
    try {
      const response = await fetch(`${API_URL}/api/route-optimization/find-path`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mapId: simulationParams.trafficMapId,
          startX: startPoint.x,
          startY: startPoint.y,
          endX: endPoint.x,
          endY: endPoint.y,
          algorithm: selectedAlgorithm,
          simulationParams: {
            timeOfDay: simulationParams.timeOfDay,
            dayType: simulationParams.dayType,
            weatherCondition: simulationParams.weatherCondition,
            routingStrategy: simulationParams.routingStrategy
          }
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to find optimal path');
      }
      
      const pathData = await response.json();
      setOptimalPath(pathData);
      setPathComparison(null);
      setShowPathComparison(false);
    } catch (error) {
      console.error('Error finding optimal path:', error);
    } finally {
      setIsCalculatingPath(false);
    }
  };
  
  const comparePathAlgorithms = async () => {
    if (!startPoint || !endPoint) return;
    
    setIsCalculatingPath(true);
    
    try {
      const response = await fetch(`${API_URL}/api/route-optimization/compare-paths`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mapId: simulationParams.trafficMapId,
          startX: startPoint.x,
          startY: startPoint.y,
          endX: endPoint.x,
          endY: endPoint.y,
          simulationParams: {
            timeOfDay: simulationParams.timeOfDay,
            dayType: simulationParams.dayType,
            weatherCondition: simulationParams.weatherCondition,
            routingStrategy: simulationParams.routingStrategy
          }
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to compare paths');
      }
      
      const comparisonData = await response.json();
      setPathComparison(comparisonData);
      setOptimalPath(null);
      setShowPathComparison(true);
    } catch (error) {
      console.error('Error comparing paths:', error);
    } finally {
      setIsCalculatingPath(false);
    }
  };
  
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !isSimulationRunning) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (!startPoint) {
      setStartPoint({ x, y });
    } else if (!endPoint) {
      setEndPoint({ x, y });
      
      // Automatically calculate path once both points are set
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
  };

  const startCanvasSimulation = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Get current map dimensions
   // const selectedMap = availableMaps.find(map => map.id === simulationParams.trafficMapId);
    //const mapWidth = selectedMap?.width || 800;
    //const mapHeight = selectedMap?.height || 500;
    
    // This would be replaced with your actual simulation visualization
    // For now, just a placeholder effect
    let frame = 0;
    let animationId: number | null = null;
    
    // Array to store vehicle positions
    const vehicles: {x: number, y: number, color: string, size: number, speed: number, direction: number}[] = [];
    
    // Create initial vehicles based on density
    const vehicleCount = Math.floor((simulationParams.vehicleDensity / 100) * 50) + 10;
    
    for (let i = 0; i < vehicleCount; i++) {
      vehicles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        color: i % 3 === 0 ? '#ff0000' : i % 3 === 1 ? '#00ff00' : '#0000ff',
        size: simulationParams.includeLargeVehicles && Math.random() > 0.7 ? 5 : 3,
        speed: (0.5 + Math.random()) * simulationSpeed,
        direction: Math.random() * Math.PI * 2
      });
    }
    
    // Create map features based on bottlenecks
    const bottlenecks = simulationResults.bottlenecks.map((name, index) => {
      return {
        name,
        x: (canvas.width / (simulationResults.bottlenecks.length + 1)) * (index + 1),
        y: canvas.height / 2,
        congestion: Math.random() * 0.5 + 0.5
      };
    });
    
    function animate() {
      if (!isSimulationRunning || !canvas || !ctx) {
        if (animationId !== null) {
          cancelAnimationFrame(animationId);
        }
        return;
      }
      
      frame++;
      
      // Clear canvas
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw simulated roads
      ctx.strokeStyle = '#ccc';
      ctx.lineWidth = 10;
      
      // Draw horizontal road
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
      
      // Draw vertical roads based on bottlenecks
      bottlenecks.forEach(bottleneck => {
        ctx.beginPath();
        ctx.moveTo(bottleneck.x, 0);
        ctx.lineTo(bottleneck.x, canvas.height);
        ctx.stroke();
        
        // Draw bottleneck label
        ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.arc(bottleneck.x, bottleneck.y, 30, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(bottleneck.name, bottleneck.x, bottleneck.y - 40);
      });
      
      // Draw optimal path if available
      if (optimalPath && optimalPath.roadPath.length > 0) {
        drawOptimalPath(ctx, optimalPath, '#ff9900', 6);
      }
      
      // Draw comparison paths if available
      if (showPathComparison && pathComparison) {
        if (pathComparison.dijkstra) {
          drawOptimalPath(ctx, pathComparison.dijkstra, '#ff5722', 5); // Orange for Dijkstra
        }
        if (pathComparison.astar) {
          drawOptimalPath(ctx, pathComparison.astar, '#8bc34a', 4); // Light green for A*
        }
      }
      
      // Draw start and end points
      if (startPoint) {
        drawPathPoint(ctx, startPoint.x, startPoint.y, '#2196f3'); // Blue for start
      }
      if (endPoint) {
        drawPathPoint(ctx, endPoint.x, endPoint.y, '#f44336'); // Red for end
      }
      
      // Update and draw vehicles
      vehicles.forEach(vehicle => {
        // Check if near bottleneck and adjust direction
        const nearBottleneck = bottlenecks.some(bottleneck => {
          const distance = Math.sqrt(Math.pow(vehicle.x - bottleneck.x, 2) + Math.pow(vehicle.y - bottleneck.y, 2));
          return distance < 50;
        });
        
        // Slow down near bottlenecks
        const speedFactor = nearBottleneck ? 0.3 : 1.0;
        
        // Move vehicle based on direction and speed
        vehicle.x += Math.cos(vehicle.direction) * vehicle.speed * speedFactor;
        vehicle.y += Math.sin(vehicle.direction) * vehicle.speed * speedFactor;
        
        // Bounce off edges
        if (vehicle.x < 0 || vehicle.x > canvas.width) {
          vehicle.direction = Math.PI - vehicle.direction;
        }
        if (vehicle.y < 0 || vehicle.y > canvas.height) {
          vehicle.direction = -vehicle.direction;
        }
        
        // Draw vehicle
        ctx.beginPath();
        ctx.arc(vehicle.x, vehicle.y, vehicle.size, 0, Math.PI * 2);
        ctx.fillStyle = vehicle.color;
        ctx.fill();
      });
      
      // Draw congestion percentage indicator
      const barWidth = 200;
      const barHeight = 15;
      const barX = canvas.width - barWidth - 20;
      const barY = 20;
      
      ctx.fillStyle = '#ddd';
      ctx.fillRect(barX, barY, barWidth, barHeight);
      
      const fillWidth = (simulationResults.congestionPercentage / 100) * barWidth;
      
      // Color based on congestion level
      let barColor = '#4CAF50'; // Green
      if (simulationResults.congestionPercentage > 70) barColor = '#F44336'; // Red
      else if (simulationResults.congestionPercentage > 40) barColor = '#FFC107'; // Yellow
      
      ctx.fillStyle = barColor;
      ctx.fillRect(barX, barY, fillWidth, barHeight);
      
      ctx.strokeStyle = '#333';
      ctx.strokeRect(barX, barY, barWidth, barHeight);
      
      ctx.fillStyle = '#333';
      ctx.font = '12px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`Congestion: ${simulationResults.congestionPercentage}%`, barX, barY - 5);
      
      // Draw simulation info
      ctx.fillStyle = '#333';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(
        `Map: ${simulationParams.trafficMapName} | Time: ${simulationParams.timeOfDay} | Day: ${simulationParams.dayType}`,
        canvas.width / 2, 
        30
      );
      
      // Request next frame
      animationId = requestAnimationFrame(animate);
    }
    
    animate();
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
    
    // Start with coordinates path if available
    if (path.coordinatePath && path.coordinatePath.length > 0) {
      ctx.moveTo(path.coordinatePath[0].x, path.coordinatePath[0].y);
      
      for (let i = 1; i < path.coordinatePath.length; i++) {
        ctx.lineTo(path.coordinatePath[i].x, path.coordinatePath[i].y);
      }
    } 
    // Fallback to road path if coordinates not available
    else if (path.roadPath && path.roadPath.length > 0) {
      // Start with the first point
      const firstRoad = path.roadPath[0];
      ctx.moveTo(firstRoad.startX, firstRoad.startY);
      
      // Connect all road segments
      path.roadPath.forEach(road => {
        ctx.lineTo(road.endX, road.endY);
      });
    }
    
    ctx.stroke();
    
    // Add arrow heads to show direction
    if (path.coordinatePath && path.coordinatePath.length > 1) {
      for (let i = 0; i < path.coordinatePath.length - 1; i += Math.max(1, Math.floor(path.coordinatePath.length / 5))) {
        const current = path.coordinatePath[i];
        const next = path.coordinatePath[i + 1];
        const dx = next.x - current.x;
        const dy = next.y - current.y;
        const angle = Math.atan2(dy, dx);
        
        const mid = {
          x: current.x + dx * 0.6,
          y: current.y + dy * 0.6
        };
        
        // Draw arrow
        drawArrow(ctx, mid.x, mid.y, angle, color);
      }
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

  const getTrafficStatusClass = (percentage: number) => {
    if (percentage < 30) return "text-green-600";
    if (percentage < 60) return "text-yellow-600";
    if (percentage < 85) return "text-orange-600";
    return "text-red-600";
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

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Traffic Simulation</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Simulation Parameters */}
        <div className="md:col-span-1">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Simulation Parameters</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">Traffic Map</label>
                <select
                  name="trafficMapId"
                  value={simulationParams.trafficMapId}
                  onChange={handleMapChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  {availableMaps.map(map => (
                    <option key={map.id} value={map.id}>{map.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">Time of Day</label>
                <select
                  name="timeOfDay"
                  value={simulationParams.timeOfDay}
                  onChange={handleParamChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="MORNING">Morning</option>
                  <option value="AFTERNOON">Afternoon</option>
                  <option value="EVENING">Evening</option>
                  <option value="NIGHT">Night</option>
                </select>
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">Day Type</label>
                <select
                  name="dayType"
                  value={simulationParams.dayType}
                  onChange={handleParamChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="WEEKDAY">Weekday</option>
                  <option value="WEEKEND">Weekend</option>
                  <option value="HOLIDAY">Holiday</option>
                </select>
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">Weather Condition</label>
                <select
                  name="weatherCondition"
                  value={simulationParams.weatherCondition}
                  onChange={handleParamChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="CLEAR">Clear</option>
                  <option value="RAIN">Rain</option>
                  <option value="SNOW">Snow</option>
                  <option value="FOG">Fog</option>
                </select>
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">Routing Strategy</label>
                <select
                  name="routingStrategy"
                  value={simulationParams.routingStrategy}
                  onChange={handleParamChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="SHORTEST_PATH">Shortest Path</option>
                  <option value="BALANCED">Balanced</option>
                  <option value="AVOID_CONGESTION">Avoid Congestion</option>
                </select>
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Vehicle Density: {simulationParams.vehicleDensity}%
                </label>
                <input
                  type="range"
                  name="vehicleDensity"
                  min="10"
                  max="150"
                  value={simulationParams.vehicleDensity}
                  onChange={handleParamChange}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="hasActiveEvents"
                  name="hasActiveEvents"
                  checked={simulationParams.hasActiveEvents}
                  onChange={handleParamChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="hasActiveEvents" className="ml-2 block text-gray-700 text-sm font-medium">
                  Include Active Events
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="includeLargeVehicles"
                  name="includeLargeVehicles"
                  checked={simulationParams.includeLargeVehicles}
                  onChange={handleParamChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="includeLargeVehicles" className="ml-2 block text-gray-700 text-sm font-medium">
                  Include Large Vehicles
                </label>
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Congestion Threshold: {simulationParams.congestionThreshold}%
                </label>
                <input
                  type="range"
                  name="congestionThreshold"
                  min="30"
                  max="95"
                  value={simulationParams.congestionThreshold}
                  onChange={handleParamChange}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              
              <div className="pt-4">
                <button
                  onClick={handleStartSimulation}
                  disabled={isLoading}
                  className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  {isLoading ? "Starting Simulation..." : "Start Simulation"}
                </button>
              </div>
              
              {isSimulationRunning && (
                <div className="pt-2">
                  <button
                    onClick={handleStopSimulation}
                    className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Stop Simulation
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Pathfinding Controls */}
          {isSimulationRunning && (
            <div className="bg-white shadow rounded-lg p-6 mt-6">
              <h2 className="text-xl font-semibold mb-4">Pathfinding</h2>
              
              <div className="space-y-4">
                <div>
                  <p className="text-gray-700 text-sm mb-3">
                    Click on the simulation to set a start and end point for pathfinding.
                  </p>
                  
                  {startPoint && !endPoint && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-3">
                      <p className="text-sm text-blue-700">
                        Start point set! Now click to select a destination.
                      </p>
                    </div>
                  )}
                  
                  <div className="flex flex-col space-y-2">
                    <label className="block text-gray-700 text-sm font-medium">
                      Algorithm
                    </label>
                    <div className="flex gap-2 mb-2">
                      <button
                        onClick={() => {
                          setSelectedAlgorithm("dijkstra");
                          setShowPathComparison(false);
                          if (startPoint && endPoint) findOptimalPath();
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
                          if (startPoint && endPoint) findOptimalPath();
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
                        if (startPoint && endPoint) comparePathAlgorithms();
                      }}
                      className={`py-2 px-3 rounded-md border ${
                        showPathComparison
                          ? "bg-purple-100 border-purple-500 text-purple-700"
                          : "bg-white border-gray-300"
                      }`}
                    >
                      Compare Both Algorithms
                    </button>
                  </div>
                  
                  <div className="mt-4">
                    <button
                      onClick={resetPathfinding}
                      className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      disabled={!startPoint && !endPoint}
                    >
                      Reset Pathfinding
                    </button>
                  </div>
                </div>
                
                {isCalculatingPath && (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                    <span className="ml-2 text-gray-600">Calculating optimal path...</span>
                  </div>
                )}
                
                {/* Path Results */}
                {optimalPath && !showPathComparison && (
                  <div className="border border-gray-200 rounded-md p-3 bg-gray-50 mt-2">
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
                  <div className="border border-gray-200 rounded-md p-3 bg-gray-50 mt-2">
                    <h3 className="font-medium text-gray-800 mb-2">Algorithm Comparison</h3>
                    
                    <div className="flex mb-2">
                      <div className="w-1/3"></div>
                      <div className="w-1/3 text-center text-sm font-medium text-orange-600">Dijkstra</div>
                      <div className="w-1/3 text-center text-sm font-medium text-green-600">A*</div>
                    </div>
                    
                    <div className="mb-1">
                      <div className="text-xs text-gray-600 mb-1">Est. Travel Time:</div>
                      <div className="flex">
                        <div className="w-1/3 text-xs">Time:</div>
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
                        <div className="w-1/3 text-xs">Units:</div>
                        <div className="w-1/3 text-center font-medium">
                          {pathComparison.dijkstra ? `${Math.round(pathComparison.dijkstra.totalWeight * 10) / 10}` : '-'}
                        </div>
                        <div className="w-1/3 text-center font-medium">
                          {pathComparison.astar ? `${Math.round(pathComparison.astar.totalWeight * 10) / 10}` : '-'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-600">
                      <div className="flex items-center mb-1">
                        <span className="w-3 h-3 inline-block bg-orange-500 mr-1 rounded-full"></span>
                        <span>Dijkstra's Algorithm</span>
                      </div>
                      <div className="flex items-center">
                        <span className="w-3 h-3 inline-block bg-green-500 mr-1 rounded-full"></span>
                        <span>A* Algorithm</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Simulation Visualization */}
        <div className="md:col-span-2">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Simulation Visualization</h2>
              {isSimulationRunning && (
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-600">Speed:</label>
                  <select
                    value={simulationSpeed}
                    onChange={(e) => setSimulationSpeed(parseFloat(e.target.value))}
                    className="px-2 py-1 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="0.5">0.5x</option>
                    <option value="1">1x</option>
                    <option value="1.5">1.5x</option>
                    <option value="2">2x</option>
                    <option value="3">3x</option>
                  </select>
                </div>
              )}
            </div>
            
            <div className="border border-gray-300 bg-gray-100 rounded-md">
              <canvas 
                ref={canvasRef} 
                width={800} 
                height={500} 
                className="w-full h-auto"
                onClick={handleCanvasClick}
              />
            </div>

            {isSimulationRunning && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-3 rounded-md">
                  <h3 className="font-medium text-blue-800 text-sm">Total Vehicles</h3>
                  <p className="text-blue-600 text-2xl font-bold">
                    {simulationResults.totalVehicles}
                  </p>
                </div>
                
                <div className="bg-orange-50 p-3 rounded-md">
                  <h3 className="font-medium text-orange-800 text-sm">Average Wait Time</h3>
                  <p className="text-orange-600 text-2xl font-bold">
                    {formatTime(simulationResults.averageWaitTime)}
                  </p>
                </div>
                
                <div className="bg-red-50 p-3 rounded-md">
                  <h3 className="font-medium text-red-800 text-sm">Congestion Level</h3>
                  <p className={`text-2xl font-bold ${getTrafficStatusClass(simulationResults.congestionPercentage)}`}>
                    {simulationResults.congestionPercentage}%
                  </p>
                </div>
              </div>
            )}
            
            {isSimulationRunning && simulationResults.bottlenecks.length > 0 && (
              <div className="mt-4">
                <h3 className="font-medium text-gray-700 mb-2">Bottleneck Areas:</h3>
                <div className="flex flex-wrap gap-2">
                  {simulationResults.bottlenecks.map((bottleneck, index) => (
                    <span 
                      key={index}
                      className="px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full"
                    >
                      {bottleneck}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimulationPage; 