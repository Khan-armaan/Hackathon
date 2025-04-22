import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";


// Mock API calls (replace with actual API calls)
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

interface TrafficData {
  id?: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  points?: {x: number, y: number}[]; // Array of intermediate points for curved paths
  roadType: "HIGHWAY" | "NORMAL" | "RESIDENTIAL";
  density: "LOW" | "MEDIUM" | "HIGH" | "CONGESTED";
}

interface MapData {
  id?: number;
  name: string;
  description: string;
  imageUrl: string;
  width: number;
  height: number;
  trafficData?: TrafficData[];
}

const AddMapPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(
    null
  );
  const [trafficData, setTrafficData] = useState<TrafficData[]>([]);
  const [selectedRoadType, setSelectedRoadType] = useState<
    "HIGHWAY" | "NORMAL" | "RESIDENTIAL"
  >("NORMAL");
  const [selectedDensity, setSelectedDensity] = useState<
    "LOW" | "MEDIUM" | "HIGH" | "CONGESTED"
  >("LOW");
  const [mapData, setMapData] = useState<MapData>({
    name: "",
    description: "",
    imageUrl: "",
    width: 800,
    height: 600,
  });
  const [selectedRoad, setSelectedRoad] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentPoints, setCurrentPoints] = useState<{x: number, y: number}[]>([]);
  const [isCreatingPath, setIsCreatingPath] = useState(false);

  // Fetch map data if editing
  useEffect(() => {
    if (isEditing && id) {
      fetchMapData(parseInt(id));
    }
  }, [isEditing, id]);

  const fetchMapData = async (mapId: number) => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("admin_token");
      const response = await fetch(`${API_URL}/api/traffic-map/${mapId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch map data");
      }

      const data = await response.json();
      setMapData({
        id: data.id,
        name: data.name,
        description: data.description || "",
        imageUrl: data.imageUrl,
        width: data.width,
        height: data.height,
      });

      if (data.trafficData) {
        setTrafficData(data.trafficData);
      }

      // Load the image
      const img = new Image();
      img.onload = () => {
        setImage(img);
        drawCanvas(img, data.trafficData || []);
      };
      img.src = data.imageUrl;

      setIsLoading(false);
    } catch (error) {
      setError("Error loading map data");
      setIsLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setMapData({
      ...mapData,
      [name]: value,
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setIsLoading(true);
    setError("");

    try {
      // Create a FormData object to send the file
      const formData = new FormData();
      formData.append("image", file);

      // Send the file to the upload endpoint
      const response = await fetch(`${API_URL}/api/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload image");
      }

      const data = await response.json();
      
      // Load the image to get dimensions
      const img = new Image();
      img.onload = () => {
        setImage(img);
        setMapData({
          ...mapData,
          imageUrl: data.url,
          width: img.width,
          height: img.height,
        });
        drawCanvas(img, trafficData);
        setIsLoading(false);
      };
      img.onerror = () => {
        setError("Failed to load the uploaded image");
        setIsLoading(false);
      };
      img.src = data.url;
    } catch (error) {
      console.error("Upload error:", error);
      setError("Failed to upload image. Please try again.");
      setIsLoading(false);
    }
  };

  const drawCanvas = (img: HTMLImageElement, roads: TrafficData[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = img.width;
    canvas.height = img.height;

    // Draw the image
    ctx.drawImage(img, 0, 0, img.width, img.height);

    // Draw all roads
    roads.forEach((road, index) => {
      drawRoad(ctx, road, index === selectedRoad);
    });
    
    // Draw current path being created
    if (isCreatingPath && currentPoints.length > 0) {
      ctx.lineWidth = getRoadWidth(selectedRoadType);
      ctx.strokeStyle = getRoadColor(selectedDensity);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // Start from the first point
      ctx.beginPath();
      ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
      
      // Draw through all intermediate points
      for (let i = 1; i < currentPoints.length; i++) {
        ctx.lineTo(currentPoints[i].x, currentPoints[i].y);
      }
      
      // If there's a temporary end point from mousemove, draw to it
      if (startPoint) {
        ctx.lineTo(startPoint.x, startPoint.y);
      }
      
      ctx.stroke();
      
      // Draw points as small circles
      currentPoints.forEach(point => {
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  };

  const drawRoad = (
    ctx: CanvasRenderingContext2D,
    road: TrafficData,
    isSelected: boolean = false
  ) => {
    const { startX, startY, endX, endY, roadType, density, points } = road;

    // Set line style based on road type and density
    ctx.lineWidth = getRoadWidth(roadType);
    ctx.strokeStyle = getRoadColor(density);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Add highlight for selected road
    if (isSelected) {
      ctx.save();
      ctx.shadowColor = "#FFFF00";
      ctx.shadowBlur = 10;
    }

    // Draw the road
    ctx.beginPath();
    
    if (points && points.length > 0) {
      // Draw curved path with all points
      ctx.moveTo(startX, startY);
      
      // Draw through all points
      points.forEach(point => {
        ctx.lineTo(point.x, point.y);
      });
      
      // Finally connect to end point
      ctx.lineTo(endX, endY);
    } else {
      // Draw straight line (legacy format)
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
    }
    
    ctx.stroke();

    if (isSelected) {
      ctx.restore();
    }

    // Draw small circles at start and end points
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    
    // Start point
    ctx.beginPath();
    ctx.arc(startX, startY, 5, 0, Math.PI * 2);
    ctx.fill();

    // Intermediate points
    if (points) {
      points.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // End point
    ctx.beginPath();
    ctx.arc(endX, endY, 5, 0, Math.PI * 2);
    ctx.fill();
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
        return "#00FF00"; // Green
      case "MEDIUM":
        return "#FFFF00"; // Yellow
      case "HIGH":
        return "#FFA500"; // Orange
      case "CONGESTED":
        return "#FF0000"; // Red
      default:
        return "#00FF00";
    }
  };

  // Helper function to check if a point is near a line
  const isPointOnLine = (
    point: { x: number; y: number },
    lineStart: { x: number; y: number },
    lineEnd: { x: number; y: number }
  ): boolean => {
    const distanceThreshold = 10; // Pixels

    // Calculate the distance from point to line
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;

    if (param < 0) {
      xx = lineStart.x;
      yy = lineStart.y;
    } else if (param > 1) {
      xx = lineEnd.x;
      yy = lineEnd.y;
    } else {
      xx = lineStart.x + param * C;
      yy = lineStart.y + param * D;
    }

    const dx = point.x - xx;
    const dy = point.y - yy;

    return Math.sqrt(dx * dx + dy * dy) < distanceThreshold;
  };

  // Enhanced function to check if a point is near any segment of a road (straight or curved)
  const isPointOnRoad = (point: { x: number; y: number }, road: TrafficData): boolean => {
    // Get all points in order
    const allPoints = [
      { x: road.startX, y: road.startY },
      ...(road.points || []),
      { x: road.endX, y: road.endY }
    ];
    
    // Check each segment
    for (let i = 0; i < allPoints.length - 1; i++) {
      if (isPointOnLine(point, allPoints[i], allPoints[i + 1])) {
        return true;
      }
    }
    
    return false;
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!image) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    e.preventDefault(); // Prevent default context menu on right-click

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Right click to complete the path
    if (e.button === 2) {
      if (isCreatingPath && currentPoints.length > 0) {
        // Complete the path on right click
        completePath({ x, y });
      }
      return;
    }

    // Left click (button === 0) proceeds as normal
    // Check if clicking on an existing road
    const clickedRoadIndex = trafficData.findIndex((road) => {
      return isPointOnRoad({ x, y }, road);
    });

    if (clickedRoadIndex !== -1) {
      setSelectedRoad(clickedRoadIndex);
      setIsCreatingPath(false);
      setCurrentPoints([]);
      return;
    }

    // If we're already creating a path, add a new point
    if (isCreatingPath) {
      setCurrentPoints([...currentPoints, { x, y }]);
    } else {
      // Start creating a new path
      setSelectedRoad(null);
      setIsCreatingPath(true);
      setCurrentPoints([{ x, y }]);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isCreatingPath || !image || currentPoints.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Update the temporary end point
    setStartPoint({ x, y });
    
    // Redraw the canvas with the current path
    drawCanvas(image, trafficData);
  };

  const handleCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // We don't complete the path on mouse up anymore
    // Instead, we'll have a "Complete Path" button
  };
  
  const handleCompletePath = () => {
    if (!startPoint) return;
    completePath(startPoint);
  };
  
  const handleCancelPath = () => {
    if (!image) return;
    
    setIsCreatingPath(false);
    setCurrentPoints([]);
    setStartPoint(null);
    
    // Redraw canvas
    drawCanvas(image, trafficData);
  };

  const handleDeleteSelectedRoad = () => {
    if (selectedRoad === null || !image) return;

    const updatedTrafficData = trafficData.filter(
      (_, index) => index !== selectedRoad
    );
    setTrafficData(updatedTrafficData);
    setSelectedRoad(null);
    drawCanvas(image, updatedTrafficData);
  };

  const handleUpdateSelectedRoad = () => {
    if (selectedRoad === null || !image) return;

    const updatedTrafficData = [...trafficData];
    updatedTrafficData[selectedRoad] = {
      ...updatedTrafficData[selectedRoad],
      roadType: selectedRoadType,
      density: selectedDensity,
      points: updatedTrafficData[selectedRoad].points || undefined
    };

    setTrafficData(updatedTrafficData);
    drawCanvas(image, updatedTrafficData);
  };

  const handleSaveMap = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("admin_token");

      if (!token) {
        setError("You must be logged in to save maps");
        setIsLoading(false);
        return;
      }

      if (!mapData.name || !mapData.imageUrl) {
        setError("Map name and image are required");
        setIsLoading(false);
        return;
      }

      // Create or update the map first
      const mapPayload = {
        name: mapData.name,
        description: mapData.description,
        imageUrl: mapData.imageUrl,
        width: mapData.width,
        height: mapData.height,
      };

      let mapResponse;
      if (isEditing && mapData.id) {
        // Update existing map
        mapResponse = await fetch(`${API_URL}/api/traffic-map/${mapData.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(mapPayload),
        });
      } else {
        // Create new map
        mapResponse = await fetch(`${API_URL}/api/traffic-map`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(mapPayload),
        });
      }

      if (!mapResponse.ok) {
        throw new Error("Failed to save map data");
      }

      const savedMapData = await mapResponse.json();
      const mapId = savedMapData.map.id;

      // If editing, first delete existing traffic data
      if (isEditing) {
        // For simplicity, we'll just add new traffic data
        // In a real application, you would update existing entries
      }

      // Save all traffic data
      for (const road of trafficData) {
        if (!road.id) {
          // Only save new roads
          // Make sure to include the points array for curved paths
          await fetch(`${API_URL}/api/traffic-map/${mapId}/traffic-data`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              startX: road.startX,
              startY: road.startY,
              endX: road.endX,
              endY: road.endY,
              points: road.points || [],
              roadType: road.roadType,
              density: road.density,
            }),
          });
        }
      }

      setIsLoading(false);
      navigate("/admin/maps");
    } catch (error) {
      setError("Error saving map data");
      setIsLoading(false);
    }
  };

  // Add this new function to prevent the context menu on right-click
  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    return false;
  };

  // Extract the path completion logic into a separate function so it can be called from multiple places
  const completePath = (endPoint: { x: number, y: number }) => {
    if (!isCreatingPath || currentPoints.length < 1 || !image) return;
    
    // Get the first and last points for start/end
    const firstPoint = currentPoints[0];
    const lastPoint = endPoint;
    
    // Extract intermediate points (all except first)
    const intermediatePoints = currentPoints.slice(1);
    
    // Create the new road with curved path
    const newRoad: TrafficData = {
      startX: firstPoint.x,
      startY: firstPoint.y,
      endX: lastPoint.x,
      endY: lastPoint.y,
      points: intermediatePoints, // Store intermediate points
      roadType: selectedRoadType,
      density: selectedDensity,
    };
    
    // Add to traffic data
    const updatedTrafficData = [...trafficData, newRoad];
    setTrafficData(updatedTrafficData);
    
    // Reset path creation state
    setIsCreatingPath(false);
    setCurrentPoints([]);
    setStartPoint(null);
    
    // Redraw canvas
    drawCanvas(image, updatedTrafficData);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">
        {isEditing ? "Edit Traffic Map" : "Add New Traffic Map"}
      </h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 bg-white p-4 rounded shadow">
          <h2 className="text-lg font-semibold mb-4">Map Details</h2>

          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="name">
              Map Name*
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={mapData.name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={mapData.description}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border rounded"
              rows={3}
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Map Image*</label>
            {isLoading && mapData.imageUrl === "" ? (
              <div className="border-2 border-dashed border-gray-300 rounded p-4 text-center">
                <div className="flex flex-col items-center justify-center">
                  <svg className="animate-spin h-6 w-6 text-blue-500 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-blue-500">Uploading image...</span>
                </div>
              </div>
            ) : mapData.imageUrl ? (
              <div className="relative border rounded overflow-hidden mb-2">
                <img 
                  src={mapData.imageUrl} 
                  alt="Map Preview" 
                  className="w-full h-48 object-cover"
                />
                <button
                  onClick={() => {
                    setMapData({...mapData, imageUrl: ""});
                    setImage(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1"
                  title="Remove image"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <div 
                className="border-2 border-dashed border-gray-300 rounded p-4 text-center cursor-pointer hover:bg-gray-50 transition"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex flex-col items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm text-gray-500">Click to select a map image</p>
                  <p className="text-xs text-gray-400 mt-1">or drag and drop</p>
                </div>
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
            {error && error.includes("image") && (
              <p className="text-red-500 text-sm mt-1">{error}</p>
            )}
          </div>

          <div className="mt-6">
            <button
              onClick={handleSaveMap}
              disabled={isLoading || !image}
              className={`w-full px-4 py-2 text-white rounded ${
                isLoading || !image
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {isLoading ? "Saving..." : "Save Map"}
            </button>
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="bg-white p-4 rounded shadow mb-4">
            <h2 className="text-lg font-semibold mb-4">Traffic Data</h2>

            <div className="flex flex-wrap gap-4 mb-4">
              <div>
                <label className="block text-gray-700 mb-2">Road Type</label>
                <select
                  value={selectedRoadType}
                  onChange={(e) => setSelectedRoadType(e.target.value as any)}
                  className="px-3 py-2 border rounded"
                >
                  <option value="HIGHWAY">Highway</option>
                  <option value="NORMAL">Normal</option>
                  <option value="RESIDENTIAL">Residential</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 mb-2">
                  Traffic Density
                </label>
                <select
                  value={selectedDensity}
                  onChange={(e) => setSelectedDensity(e.target.value as any)}
                  className="px-3 py-2 border rounded"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CONGESTED">Congested</option>
                </select>
              </div>

              {isCreatingPath && (
                <>
                  <button
                    onClick={handleCompletePath}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Complete Path
                  </button>

                  <button
                    onClick={handleCancelPath}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Cancel Path
                  </button>
                </>
              )}

              {selectedRoad !== null && (
                <>
                  <button
                    onClick={handleUpdateSelectedRoad}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Update Selected Road
                  </button>

                  <button
                    onClick={handleDeleteSelectedRoad}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Delete Selected Road
                  </button>
                </>
              )}
            </div>

            <div className="instructions text-sm text-gray-600 mb-4">
              <p>
                <strong>Instructions:</strong>
              </p>
              <ul className="list-disc pl-5">
                <li>First, upload a map image of your area</li>
                <li>Select road type and traffic density before drawing</li>
                <li>Click on the map to start creating a road path</li>
                <li>Click multiple times to create curved/angled roads</li>
                <li><strong>Right-click</strong> or click "Complete Path" button to finish the current road</li>
                <li>Click on existing roads to select them for editing or deletion</li>
                <li>Use the buttons to update road properties or delete roads</li>
                <li>Click "Save Map" when you're done to save all changes</li>
              </ul>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-2 bg-blue-50 rounded border border-blue-200">
                  <p className="font-semibold text-blue-700">Traffic Density Colors:</p>
                  <div className="grid grid-cols-1 gap-1 mt-2">
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
                <div className="p-2 bg-gray-50 rounded border border-gray-200">
                  <p className="font-semibold text-gray-700">Road Width by Type:</p>
                  <div className="grid grid-cols-1 gap-1 mt-2">
                    <div className="flex items-center">
                      <div className="h-2 w-8 bg-black mr-2"></div>
                      <span>Highway</span>
                    </div>
                    <div className="flex items-center">
                      <div className="h-1.5 w-8 bg-black mr-2"></div>
                      <span>Normal</span>
                    </div>
                    <div className="flex items-center">
                      <div className="h-1 w-8 bg-black mr-2"></div>
                      <span>Residential</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            className="relative bg-gray-200 rounded border overflow-auto"
            style={{ maxHeight: "600px" }}
          >
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-gray-500">Loading map data...</p>
              </div>
            ) : !image ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-gray-500">Upload a map image to start</p>
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onContextMenu={handleContextMenu}
                className="cursor-crosshair"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddMapPage;