import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";


//const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const API_URL = import.meta.env.VITE_API_URL || "https://apihack.mybyte.store";

interface MapSummary {
  id: number;
  name: string;
  description: string;
  imageUrl: string;
  createdAt: string;
}

const MapSelectionPage: React.FC = () => {
  const [maps, setMaps] = useState<MapSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMaps();
  }, []);

  const fetchMaps = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/api/traffic-map`);

      if (!response.ok) {
        throw new Error("Failed to fetch maps");
      }

      const data = await response.json();
      setMaps(data);
      setIsLoading(false);
    } catch (error) {
      setError("Error loading maps");
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h1 className="text-2xl font-bold mb-2">Traffic Maps</h1>
        <p className="text-gray-600">
          Select a map to view real-time traffic simulation and density
          information.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-xl text-gray-500">Loading maps...</div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      ) : maps.length === 0 ? (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          No maps available. Please check back later.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {maps.map((map) => (
            <div
              key={map.id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="relative h-48 bg-gray-200">
                <img
                  src={map.imageUrl}
                  alt={map.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src =
                      "https://via.placeholder.com/400x200?text=Map+Image+Unavailable";
                  }}
                />
              </div>
              <div className="p-4">
                <h2 className="text-xl font-semibold mb-2">{map.name}</h2>
                {map.description && (
                  <p className="text-gray-600 mb-4 line-clamp-2">
                    {map.description}
                  </p>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">
                    Added: {new Date(map.createdAt).toLocaleDateString()}
                  </span>
                  <Link
                    to={`/user/maps/${map.id}`}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                  >
                    View Traffic
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MapSelectionPage;
