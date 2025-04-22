import React, { useState, useEffect } from "react";
import { Link} from "react-router-dom";

import { FiPlus, FiEdit, FiTrash2, FiEye } from "react-icons/fi";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

interface MapSummary {
  id: number;
  name: string;
  description: string;
  imageUrl: string;
  createdAt: string;
  updatedAt: string;
}

const MapManagementPage: React.FC = () => {

  const [maps, setMaps] = useState<MapSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteMapId, setDeleteMapId] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    fetchMaps();
  }, []);

  const fetchMaps = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("admin_token");

      if (!token) {
        setError("You must be logged in to view maps");
        setIsLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/traffic-map`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

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

  const handleDeleteClick = (mapId: number) => {
    setDeleteMapId(mapId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteMapId) return;

    try {
      const token = localStorage.getItem("admin_token");

      if (!token) {
        setError("You must be logged in to delete maps");
        setIsDeleteDialogOpen(false);
        return;
      }

      const response = await fetch(
        `${API_URL}/api/traffic-map/${deleteMapId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete map");
      }

      // Remove the deleted map from the state
      setMaps(maps.filter((map) => map.id !== deleteMapId));
      setIsDeleteDialogOpen(false);
      setDeleteMapId(null);
    } catch (error) {
      setError("Error deleting map");
      setIsDeleteDialogOpen(false);
    }
  };

  const cancelDelete = () => {
    setIsDeleteDialogOpen(false);
    setDeleteMapId(null);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Traffic Maps</h1>
        <Link
          to="/admin/maps/add"
          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
        >
          <FiPlus size={18} />
          <span>Add New Map</span>
        </Link>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="bg-white rounded-lg shadow-md p-8 flex justify-center">
          <p className="text-gray-500">Loading maps...</p>
        </div>
      ) : maps.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-500 mb-4">No maps have been created yet.</p>
          <Link
            to="/admin/maps/add"
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
          >
            <FiPlus size={18} />
            <span>Create Your First Map</span>
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Map
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Updated
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {maps.map((map) => (
                <tr key={map.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0 mr-3">
                        <img
                          className="h-10 w-10 rounded object-cover"
                          src={map.imageUrl}
                          alt={map.name}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src =
                              "https://via.placeholder.com/40?text=Map";
                          }}
                        />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {map.name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500 truncate max-w-xs">
                      {map.description || "No description"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {new Date(map.updatedAt).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <Link
                        to={`/admin/maps/edit/${map.id}`}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit"
                      >
                        <FiEdit size={18} />
                      </Link>
                      <button
                        onClick={() => handleDeleteClick(map.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <FiTrash2 size={18} />
                      </button>
                      <Link
                        to={`/user/maps/${map.id}`}
                        className="text-green-600 hover:text-green-900"
                        title="View"
                        target="_blank"
                      >
                        <FiEye size={18} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {isDeleteDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h2 className="text-xl font-bold mb-4">Confirm Delete</h2>
            <p className="mb-6">
              Are you sure you want to delete this map? This action cannot be
              undone.
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapManagementPage;
