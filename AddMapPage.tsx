import React, { useState } from 'react';

// Update the TrafficData interface to include vehicle properties
interface TrafficData {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  roadType: string;
  density: string;
  vehicleDensity?: string; // Add vehicle density property
  vehicleType?: string; // Add vehicle type property
}

const AddMapPage: React.FC = () => {
  // Update state to include vehicle-related properties
  const [selectedVehicleDensity, setSelectedVehicleDensity] = useState<string>("low");
  const [selectedVehicleType, setSelectedVehicleType] = useState<string>("car");

  // ... existing code ...

  // Add to the drawRoad function to include drawing vehicles
  const drawRoad = (
    context: CanvasRenderingContext2D,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    roadType: string,
    density: string,
    isSelected: boolean = false,
    vehicleDensity: string = "low",
    vehicleType: string = "car"
  ) => {
    // Existing road drawing code
    // ... existing code ...
    
    // Draw vehicles on the road
    if (vehicleDensity !== "none") {
      drawVehiclesOnRoad(
        context,
        startX,
        startY,
        endX,
        endY,
        vehicleDensity,
        vehicleType
      );
    }
  };

  // Add function to draw vehicles on the road
  const drawVehiclesOnRoad = (
    context: CanvasRenderingContext2D,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    vehicleDensity: string,
    vehicleType: string
  ) => {
    // Calculate road length and angle
    const dx = endX - startX;
    const dy = endY - startY;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    
    // Determine number of vehicles based on density
    let numVehicles = 0;
    switch (vehicleDensity) {
      case "low":
        numVehicles = Math.max(1, Math.floor(length / 100));
        break;
      case "medium":
        numVehicles = Math.max(2, Math.floor(length / 50));
        break;
      case "high":
        numVehicles = Math.max(3, Math.floor(length / 25));
        break;
      default:
        numVehicles = 0;
    }
    
    // Draw vehicles
    for (let i = 0; i < numVehicles; i++) {
      // Position vehicle along the road
      const ratio = (i + 1) / (numVehicles + 1);
      const x = startX + ratio * dx;
      const y = startY + ratio * dy;
      
      // Draw vehicle based on type
      drawVehicle(context, x, y, angle, vehicleType);
    }
  };

  // Add function to draw a single vehicle
  const drawVehicle = (
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number,
    vehicleType: string
  ) => {
    context.save();
    context.translate(x, y);
    context.rotate(angle);
    
    // Set vehicle color based on type
    let color = "";
    let size = 0;
    
    switch (vehicleType) {
      case "car":
        color = "#3498db"; // Blue
        size = 6;
        break;
      case "bus":
        color = "#e74c3c"; // Red
        size = 10;
        break;
      case "truck":
        color = "#2ecc71"; // Green
        size = 8;
        break;
      default:
        color = "#3498db"; // Default blue
        size = 6;
    }
    
    // Draw vehicle as a circle
    context.fillStyle = color;
    context.beginPath();
    context.arc(0, 0, size, 0, Math.PI * 2);
    context.fill();
    
    context.restore();
  };

  // ... existing code ...

  // Update the drawCanvas function to pass vehicle properties
  const drawCanvas = () => {
    // ... existing code ...
    
    // Update where roads are drawn to include vehicle properties
    trafficData.forEach((data, index) => {
      drawRoad(
        context,
        data.startX,
        data.startY,
        data.endX,
        data.endY,
        data.roadType,
        data.density,
        selectedRoadIndex === index,
        data.vehicleDensity || "low", // Add vehicle density
        data.vehicleType || "car" // Add vehicle type
      );
    });
    
    // ... existing code ...
  };

  // ... existing code ...

  // Update handleRoadComplete to include vehicle properties
  const handleRoadComplete = () => {
    // ... existing code ...
    
    // When adding to trafficData, include vehicle properties
    setTrafficData([
      ...trafficData,
      {
        startX: drawStartX,
        startY: drawStartY,
        endX: drawEndX,
        endY: drawEndY,
        roadType: selectedRoadType,
        density: selectedDensity,
        vehicleDensity: selectedVehicleDensity,
        vehicleType: selectedVehicleType,
      },
    ]);
    
    // ... existing code ...
  };

  // ... existing code ...

  // Add UI controls for vehicle properties in the control panel section
  <div className="mb-4">
    <label className="block text-gray-700 text-sm font-bold mb-2">
      Vehicle Density
    </label>
    <select
      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
      value={selectedVehicleDensity}
      onChange={(e) => setSelectedVehicleDensity(e.target.value)}
    >
      <option value="none">None</option>
      <option value="low">Low</option>
      <option value="medium">Medium</option>
      <option value="high">High</option>
    </select>
  </div>

  <div className="mb-4">
    <label className="block text-gray-700 text-sm font-bold mb-2">
      Vehicle Type
    </label>
    <select
      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
      value={selectedVehicleType}
      onChange={(e) => setSelectedVehicleType(e.target.value)}
    >
      <option value="car">Car</option>
      <option value="bus">Bus</option>
      <option value="truck">Truck</option>
    </select>
  </div>
  // ... existing code ...

  return (
    // ... existing JSX ...
  );
};

export default AddMapPage; 