import React, { useState, useEffect, useRef } from "react";

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

const SimulationPage: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const [availableMaps, setAvailableMaps] = useState([
    { id: 1, name: "Kachi Dham Main Area" },
    { id: 2, name: "Kachi Dham Extended" },
    { id: 3, name: "Festival Route" }
  ]);
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
  const [simulationResults, setSimulationResults] = useState({
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
  }, []);

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

  const handleStartSimulation = () => {
    setIsLoading(true);
    
    // Simulate a delay for processing
    setTimeout(() => {
      setIsLoading(false);
      setIsSimulationRunning(true);
      
      // Mock simulation results
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
      
      // In a real implementation, you'd start the simulation on the canvas here
      if (canvasRef.current) {
        startCanvasSimulation();
      }
    }, 1500);
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
    
    // This would be replaced with your actual simulation visualization
    // For now, just a placeholder effect
    let frame = 0;
    
    function animate() {
      if (!isSimulationRunning || !canvas || !ctx) return;
      
      frame++;
      
      // Clear canvas
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw some moving dots to represent vehicles
      for (let i = 0; i < 50; i++) {
        const x = (Math.sin((frame + i * 10) / 20) * canvas.width / 3) + canvas.width / 2;
        const y = (Math.cos((frame + i * 10) / 15) * canvas.height / 3) + canvas.height / 2;
        
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = i % 3 === 0 ? '#ff0000' : i % 3 === 1 ? '#00ff00' : '#0000ff';
        ctx.fill();
      }
      
      // Draw some text
      ctx.fillStyle = '#333';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Simulation in progress...', canvas.width / 2, 30);
      
      requestAnimationFrame(animate);
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
                <label className="block text-gray-700 mb-2">Traffic Map</label>
                <select
                  name="trafficMapId"
                  value={simulationParams.trafficMapId}
                  onChange={handleMapChange}
                  className="w-full px-3 py-2 border rounded"
                  disabled={isSimulationRunning}
                >
                  {availableMaps.map(map => (
                    <option key={map.id} value={map.id}>{map.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2">Time of Day</label>
                <select
                  name="timeOfDay"
                  value={simulationParams.timeOfDay}
                  onChange={handleParamChange}
                  className="w-full px-3 py-2 border rounded"
                  disabled={isSimulationRunning}
                >
                  <option value="MORNING">Morning (6AM - 11AM)</option>
                  <option value="AFTERNOON">Afternoon (11AM - 4PM)</option>
                  <option value="EVENING">Evening (4PM - 9PM)</option>
                  <option value="NIGHT">Night (9PM - 6AM)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2">Day Type</label>
                <select
                  name="dayType"
                  value={simulationParams.dayType}
                  onChange={handleParamChange}
                  className="w-full px-3 py-2 border rounded"
                  disabled={isSimulationRunning}
                >
                  <option value="WEEKDAY">Weekday</option>
                  <option value="WEEKEND">Weekend</option>
                  <option value="HOLIDAY">Holiday/Festival</option>
                </select>
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2">
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
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="hasActiveEvents"
                  name="hasActiveEvents"
                  checked={simulationParams.hasActiveEvents}
                  onChange={handleParamChange}
                  className="mr-2"
                  disabled={isSimulationRunning}
                />
                <label htmlFor="hasActiveEvents" className="text-gray-700">
                  Include Active Events
                </label>
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2">Weather Condition</label>
                <select
                  name="weatherCondition"
                  value={simulationParams.weatherCondition}
                  onChange={handleParamChange}
                  className="w-full px-3 py-2 border rounded"
                  disabled={isSimulationRunning}
                >
                  <option value="CLEAR">Clear</option>
                  <option value="RAIN">Rain</option>
                  <option value="SNOW">Snow</option>
                  <option value="FOG">Fog</option>
                </select>
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2">Routing Strategy</label>
                <select
                  name="routingStrategy"
                  value={simulationParams.routingStrategy}
                  onChange={handleParamChange}
                  className="w-full px-3 py-2 border rounded"
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
                  className="mr-2"
                  disabled={isSimulationRunning}
                />
                <label htmlFor="includeLargeVehicles" className="text-gray-700">
                  Include Large Vehicles
                </label>
              </div>
              
              <div className="pt-4">
                {!isSimulationRunning ? (
                  <button
                    onClick={handleStartSimulation}
                    disabled={isLoading}
                    className={`w-full px-4 py-2 text-white rounded ${
                      isLoading ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"
                    }`}
                  >
                    {isLoading ? "Preparing Simulation..." : "Start Simulation"}
                  </button>
                ) : (
                  <button
                    onClick={handleStopSimulation}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
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
                  <span className="mr-2">Speed:</span>
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.5"
                    value={simulationSpeed}
                    onChange={(e) => setSimulationSpeed(parseFloat(e.target.value))}
                    className="w-32"
                  />
                  <span className="ml-2">{simulationSpeed}x</span>
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
                  <h3 className="font-medium text-blue-800">Total Vehicles</h3>
                  <p className="text-blue-600 text-2xl font-bold">
                    {simulationResults.totalVehicles.toLocaleString()}
                  </p>
                </div>
                
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h3 className="font-medium text-orange-800">Average Wait Time</h3>
                  <p className="text-orange-600 text-2xl font-bold">
                    {simulationResults.averageWaitTime} seconds
                  </p>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="font-medium text-purple-800">Congestion Level</h3>
                  <p className={`text-2xl font-bold ${getTrafficStatusClass(simulationResults.congestionPercentage)}`}>
                    {simulationResults.congestionPercentage}%
                  </p>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-800 mb-2">Major Bottlenecks</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {simulationResults.bottlenecks.map((bottleneck, index) => (
                    <li key={index} className="text-gray-700">{bottleneck}</li>
                  ))}
                </ul>
              </div>
              
              <div className="mt-6">
                <h3 className="font-medium text-gray-800 mb-2">Recommendations</h3>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-gray-700">
                    Based on this simulation, we recommend the following actions:
                  </p>
                  <ol className="list-decimal pl-5 mt-2 space-y-1 text-gray-700">
                    <li>Implement one-way traffic flow at Temple Entrance during peak hours</li>
                    <li>Divert large vehicles to alternate routes during {simulationParams.dayType.toLowerCase()} {simulationParams.timeOfDay.toLowerCase()} periods</li>
                    <li>Position traffic controllers at Market Square to improve flow</li>
                    <li>Consider time-based entry restrictions during festivals</li>
                  </ol>
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