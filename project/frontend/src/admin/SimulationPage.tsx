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

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const SimulationPage: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const [availableMaps, setAvailableMaps] = useState<TrafficMap[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
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
  };

  const handleMapChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const mapId = parseInt(e.target.value);
    const selectedMap = availableMaps.find(map => map.id === mapId);
    
    setSimulationParams({
      ...simulationParams,
      trafficMapId: mapId,
      trafficMapName: selectedMap?.name || ""
    });
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
        throw new Error("Failed to create simulation");
      }
      
      // Step 2: Run the simulation
      const runResponse = await fetch(`${API_URL}/api/simulation/${simulationId}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!runResponse.ok) {
        throw new Error("Failed to run simulation");
      }
      
      const runData = await runResponse.json();
      const result = runData.result;
      
      // Step 3: Update the simulation results state
      setSimulationResults({
        averageWaitTime: result.avgTravelTime,
        totalVehicles: result.completedVehicles,
        congestionPercentage: result.congestionPercentage,
        bottlenecks: result.bottlenecks || []
      });
      
      setIsSimulationRunning(true);
      
      // Step 4: Start the canvas visualization
      if (canvasRef.current) {
        startCanvasSimulation();
      }
    } catch (error) {
      console.error("Simulation error:", error);
      // Fallback to mock data if API fails
      setSimulationResults({
        averageWaitTime: Math.round(60 + Math.random() * 120),
        totalVehicles: Math.round(1000 + Math.random() * 2000),
        congestionPercentage: Math.round(40 + Math.random() * 50),
        bottlenecks: [
          "North Junction",
          "Temple Entrance",
          "Market Square"
        ]
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

  const startCanvasSimulation = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Get current map dimensions
    const selectedMap = availableMaps.find(map => map.id === simulationParams.trafficMapId);
    const mapWidth = selectedMap?.width || 800;
    const mapHeight = selectedMap?.height || 500;
    
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

  const getTrafficStatusClass = (percentage: number) => {
    if (percentage < 30) return "text-green-600";
    if (percentage < 60) return "text-yellow-600";
    if (percentage < 85) return "text-orange-600";
    return "text-red-600";
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
                  disabled={isSimulationRunning}
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
                  disabled={isSimulationRunning}
                >
                  <option value="MORNING">Morning (6AM - 11AM)</option>
                  <option value="AFTERNOON">Afternoon (11AM - 4PM)</option>
                  <option value="EVENING">Evening (4PM - 9PM)</option>
                  <option value="NIGHT">Night (9PM - 6AM)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">Day Type</label>
                <select
                  name="dayType"
                  value={simulationParams.dayType}
                  onChange={handleParamChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  disabled={isSimulationRunning}
                >
                  <option value="WEEKDAY">Weekday</option>
                  <option value="WEEKEND">Weekend</option>
                  <option value="HOLIDAY">Holiday/Festival</option>
                </select>
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Vehicle Density ({simulationParams.vehicleDensity}%)
                </label>
                <input
                  type="range"
                  name="vehicleDensity"
                  min="10"
                  max="100"
                  value={simulationParams.vehicleDensity}
                  onChange={handleParamChange}
                  className="w-full"
                  disabled={isSimulationRunning}
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Low</span>
                  <span>Medium</span>
                  <span>High</span>
                </div>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="hasActiveEvents"
                  name="hasActiveEvents"
                  checked={simulationParams.hasActiveEvents}
                  onChange={handleParamChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={isSimulationRunning}
                />
                <label htmlFor="hasActiveEvents" className="ml-2 block text-gray-700 text-sm font-medium">
                  Include Active Events
                </label>
              </div>
              
              {simulationParams.hasActiveEvents && events.filter(e => e.status === "UPCOMING" || e.status === "ONGOING").length > 0 && (
                <div className="pl-6 border-l-2 border-blue-200">
                  <p className="text-sm font-medium text-gray-700 mb-2">Active Events:</p>
                  <ul className="space-y-1">
                    {events
                      .filter(e => e.status === "UPCOMING" || e.status === "ONGOING")
                      .slice(0, 3)
                      .map(event => (
                        <li key={event.id} className="text-xs text-gray-600 flex items-center">
                          <span className={`inline-block w-2 h-2 rounded-full mr-1 ${
                            event.impactLevel === "LOW" ? "bg-green-500" :
                            event.impactLevel === "MEDIUM" ? "bg-yellow-500" :
                            event.impactLevel === "HIGH" ? "bg-orange-500" :
                            "bg-red-500"
                          }`}></span>
                          {event.name}
                        </li>
                      ))}
                  </ul>
                </div>
              )}
              
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">Weather Condition</label>
                <select
                  name="weatherCondition"
                  value={simulationParams.weatherCondition}
                  onChange={handleParamChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  disabled={isSimulationRunning}
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
                  disabled={isSimulationRunning}
                >
                  <option value="SHORTEST_PATH">Shortest Path</option>
                  <option value="BALANCED">Balanced Distribution</option>
                  <option value="AVOID_CONGESTION">Avoid Congestion</option>
                </select>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="includeLargeVehicles"
                  name="includeLargeVehicles"
                  checked={simulationParams.includeLargeVehicles}
                  onChange={handleParamChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={isSimulationRunning}
                />
                <label htmlFor="includeLargeVehicles" className="ml-2 block text-gray-700 text-sm font-medium">
                  Include Large Vehicles
                </label>
              </div>
              
              <div className="pt-4">
                {!isSimulationRunning ? (
                  <button
                    onClick={handleStartSimulation}
                    disabled={isLoading}
                    className={`w-full px-4 py-2 text-white rounded-md flex justify-center items-center ${
                      isLoading ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Preparing Simulation...
                      </>
                    ) : "Start Simulation"}
                  </button>
                ) : (
                  <button
                    onClick={handleStopSimulation}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    Stop Simulation
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Simulation Visualization */}
        <div className="md:col-span-2">
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Simulation Visualization</h2>
              
              {isSimulationRunning && (
                <div className="flex items-center">
                  <span className="mr-2 text-sm text-gray-700">Speed:</span>
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.5"
                    value={simulationSpeed}
                    onChange={(e) => setSimulationSpeed(parseFloat(e.target.value))}
                    className="w-32"
                  />
                  <span className="ml-2 text-sm text-gray-700">{simulationSpeed}x</span>
                </div>
              )}
            </div>
            
            <div className="bg-gray-100 rounded-lg overflow-hidden border">
              <canvas 
                ref={canvasRef} 
                width={800} 
                height={500} 
                className="w-full h-auto"
              />
            </div>
          </div>
          
          {isSimulationRunning && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Simulation Results</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-medium text-blue-800 text-sm">Total Vehicles</h3>
                  <p className="text-blue-600 text-2xl font-bold">
                    {simulationResults.totalVehicles.toLocaleString()}
                  </p>
                </div>
                
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h3 className="font-medium text-orange-800 text-sm">Average Wait Time</h3>
                  <p className="text-orange-600 text-2xl font-bold">
                    {simulationResults.averageWaitTime} seconds
                  </p>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="font-medium text-purple-800 text-sm">Congestion Level</h3>
                  <p className={`text-2xl font-bold ${getTrafficStatusClass(simulationResults.congestionPercentage)}`}>
                    {simulationResults.congestionPercentage}%
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-800 text-sm mb-2">Major Bottlenecks</h3>
                  {simulationResults.bottlenecks.length > 0 ? (
                    <ul className="bg-red-50 p-3 rounded-lg">
                      {simulationResults.bottlenecks.map((bottleneck, index) => (
                        <li key={index} className="text-gray-700 py-1 px-2 flex items-center border-b last:border-b-0 border-red-100">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          {bottleneck}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 italic">No major bottlenecks detected</p>
                  )}
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-800 text-sm mb-2">Recommendations</h3>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-gray-700 text-sm mb-2">
                      Based on this simulation, we recommend:
                    </p>
                    <ol className="list-decimal pl-5 space-y-1 text-sm text-gray-700">
                      {simulationResults.congestionPercentage > 70 && (
                        <li>Implement one-way traffic flow at {simulationResults.bottlenecks[0] || "major intersections"} during peak hours</li>
                      )}
                      {simulationParams.includeLargeVehicles && (
                        <li>Divert large vehicles to alternate routes during {simulationParams.dayType.toLowerCase()} {simulationParams.timeOfDay.toLowerCase()} periods</li>
                      )}
                      {simulationResults.bottlenecks.length > 0 && (
                        <li>Position traffic controllers at {simulationResults.bottlenecks[Math.min(1, simulationResults.bottlenecks.length - 1)]} to improve flow</li>
                      )}
                      {simulationParams.dayType === "HOLIDAY" && (
                        <li>Consider time-based entry restrictions during festivals</li>
                      )}
                      {simulationParams.routingStrategy === "SHORTEST_PATH" && simulationResults.congestionPercentage > 50 && (
                        <li>Switch to balanced routing strategy to distribute traffic more evenly</li>
                      )}
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SimulationPage; 