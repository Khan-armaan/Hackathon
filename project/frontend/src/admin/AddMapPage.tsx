import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Colors } from "../Colors";

// Mock API calls (replace with actual API calls)
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

interface TrafficData {
  id?: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setImage(img);
        setMapData({
          ...mapData,
          imageUrl: event.target?.result as string,
          width: img.width,
          height: img.height,
        });
        drawCanvas(img, trafficData);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
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
  };

  const drawRoad = (
    ctx: CanvasRenderingContext2D,
    road: TrafficData,
    isSelected: boolean = false
  ) => {
    const { startX, startY, endX, endY, roadType, density } = road;

    // Set line style based on road type and density
    ctx.lineWidth = getRoadWidth(roadType);
    ctx.strokeStyle = getRoadColor(density);

    // Draw the road
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);

    // Add highlight for selected road
    if (isSelected) {
      ctx.save();
      ctx.shadowColor = "#FFFF00";
      ctx.shadowBlur = 10;
    }

    ctx.stroke();

    if (isSelected) {
      ctx.restore();
    }

    // Draw small circles at start and end points
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.beginPath();
    ctx.arc(startX, startY, 5, 0, Math.PI * 2);
    ctx.fill();

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

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!image) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicking on an existing road
    const clickedRoadIndex = trafficData.findIndex((road) => {
      return isPointOnLine(
        { x, y },
        { x: road.startX, y: road.startY },
        { x: road.endX, y: road.endY }
      );
    });

    if (clickedRoadIndex !== -1) {
      setSelectedRoad(clickedRoadIndex);
      return;
    }

    // Start drawing a new road
    setSelectedRoad(null);
    setDrawing(true);
    setStartPoint({ x, y });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing || !startPoint || !image) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Redraw canvas with temporary line
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear and redraw
    drawCanvas(image, trafficData);

    // Draw the line being created
    ctx.lineWidth = getRoadWidth(selectedRoadType);
    ctx.strokeStyle = getRoadColor(selectedDensity);
    ctx.beginPath();
    ctx.moveTo(startPoint.x, startPoint.y);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handleCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing || !startPoint || !image) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Only add if the line has some length
    const distance = Math.sqrt(
      Math.pow(x - startPoint.x, 2) + Math.pow(y - startPoint.y, 2)
    );
    if (distance > 10) {
      // Minimum distance threshold
      const newRoad: TrafficData = {
        startX: startPoint.x,
        startY: startPoint.y,
        endX: x,
        endY: y,
        roadType: selectedRoadType,
        density: selectedDensity,
      };

      const updatedTrafficData = [...trafficData, newRoad];
      setTrafficData(updatedTrafficData);
      drawCanvas(image, updatedTrafficData);
    }

    setDrawing(false);
    setStartPoint(null);
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
          await fetch(`${API_URL}/api/traffic-map/${mapId}/traffic-data`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(road),
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
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="w-full"
            />
            {!image && !isLoading && (
              <p className="text-sm text-gray-500 mt-2">
                Upload a map image to start adding traffic data
              </p>
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
                <li>Click and drag on the map to create roads</li>
                <li>Set road type and traffic density before drawing</li>
                <li>Click on existing roads to select them for editing</li>
              </ul>
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
                onMouseLeave={() => {
                  if (drawing) {
                    setDrawing(false);
                    setStartPoint(null);
                    if (image) drawCanvas(image, trafficData);
                  }
                }}
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
