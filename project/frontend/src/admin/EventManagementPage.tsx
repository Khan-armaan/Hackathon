import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

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

const EventManagementPage: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  const [newEvent, setNewEvent] = useState<Omit<Event, "id">>({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    impactLevel: "MEDIUM",
    expectedVisitors: 0,
    location: "Kachi Dham Main Area",
    status: "UPCOMING"
  });

  // Simulated data for demonstration
  useEffect(() => {
    // In a real implementation, fetch from API
    // For now, populate with mock data
    setTimeout(() => {
      setEvents([
        {
          id: 1,
          name: "Annual Festival",
          description: "Major religious festival with high visitor turnout",
          startDate: "2023-10-15T08:00:00Z",
          endDate: "2023-10-15T20:00:00Z",
          impactLevel: "HIGH",
          expectedVisitors: 5000,
          location: "Kachi Dham Temple Complex",
          status: "UPCOMING"
        },
        {
          id: 2,
          name: "Weekly Market Day",
          description: "Regular market event every Saturday",
          startDate: "2023-10-14T06:00:00Z",
          endDate: "2023-10-14T14:00:00Z",
          impactLevel: "MEDIUM",
          expectedVisitors: 1200,
          location: "Kachi Dham Market Area",
          status: "UPCOMING"
        },
        {
          id: 3,
          name: "Cultural Program",
          description: "Evening cultural performances",
          startDate: "2023-10-20T16:00:00Z",
          endDate: "2023-10-20T21:00:00Z",
          impactLevel: "MEDIUM",
          expectedVisitors: 800,
          location: "Community Hall",
          status: "UPCOMING"
        },
        {
          id: 4,
          name: "Religious Ceremony",
          description: "Special prayer ceremony",
          startDate: "2023-09-30T07:00:00Z",
          endDate: "2023-09-30T12:00:00Z",
          impactLevel: "HIGH",
          expectedVisitors: 3000,
          location: "Kachi Dham Temple Complex",
          status: "COMPLETED"
        }
      ]);
      setIsLoading(false);
    }, 500);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewEvent({
      ...newEvent,
      [name]: name === "expectedVisitors" ? parseInt(value) : value
    });
  };

  const handleAddEvent = () => {
    // In a real implementation, save to API
    // For now, just add to local state
    const id = Math.max(0, ...events.map(e => e.id)) + 1;
    setEvents([...events, { ...newEvent, id }]);
    setIsAddEventModalOpen(false);
    setNewEvent({
      name: "",
      description: "",
      startDate: "",
      endDate: "",
      impactLevel: "MEDIUM",
      expectedVisitors: 0,
      location: "Kachi Dham Main Area",
      status: "UPCOMING"
    });
  };

  const getImpactBadgeColor = (level: string) => {
    switch (level) {
      case "LOW": return "bg-green-100 text-green-800";
      case "MEDIUM": return "bg-yellow-100 text-yellow-800";
      case "HIGH": return "bg-orange-100 text-orange-800";
      case "CRITICAL": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "UPCOMING": return "bg-blue-100 text-blue-800";
      case "ONGOING": return "bg-green-100 text-green-800";
      case "COMPLETED": return "bg-gray-100 text-gray-800";
      case "CANCELLED": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    });
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Event Management</h1>
        <button
          onClick={() => setIsAddEventModalOpen(true)}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
        >
          Add New Event
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="bg-white rounded-lg shadow-md p-8 flex justify-center">
          <p className="text-gray-500">Loading events...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Upcoming and Recent Events</h2>
            <p className="text-sm text-gray-600">These events will affect traffic patterns in Kachi Dham</p>
          </div>
          
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Event
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Traffic Impact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {events.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <div className="text-sm font-medium text-gray-900">{event.name}</div>
                      <div className="text-sm text-gray-500">{event.description}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{formatDate(event.startDate)}</div>
                    <div className="text-sm text-gray-500">to</div>
                    <div className="text-sm text-gray-900">{formatDate(event.endDate)}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{event.location}</div>
                    <div className="text-sm text-gray-500">{event.expectedVisitors.toLocaleString()} visitors expected</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${getImpactBadgeColor(event.impactLevel)}`}>
                      {event.impactLevel}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeColor(event.status)}`}>
                      {event.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900 mr-3">
                      Edit
                    </button>
                    <button className="text-red-600 hover:text-red-900">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Event Modal */}
      {isAddEventModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h2 className="text-xl font-bold mb-4">Add New Event</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 mb-2" htmlFor="name">
                  Event Name*
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={newEvent.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2" htmlFor="location">
                  Location*
                </label>
                <input
                  id="location"
                  name="location"
                  type="text"
                  value={newEvent.location}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2" htmlFor="startDate">
                  Start Date & Time*
                </label>
                <input
                  id="startDate"
                  name="startDate"
                  type="datetime-local"
                  value={newEvent.startDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2" htmlFor="endDate">
                  End Date & Time*
                </label>
                <input
                  id="endDate"
                  name="endDate"
                  type="datetime-local"
                  value={newEvent.endDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2" htmlFor="impactLevel">
                  Traffic Impact Level*
                </label>
                <select
                  id="impactLevel"
                  name="impactLevel"
                  value={newEvent.impactLevel}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded"
                  required
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2" htmlFor="expectedVisitors">
                  Expected Visitors*
                </label>
                <input
                  id="expectedVisitors"
                  name="expectedVisitors"
                  type="number"
                  min="0"
                  value={newEvent.expectedVisitors}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-gray-700 mb-2" htmlFor="description">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={newEvent.description}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded"
                  rows={3}
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => setIsAddEventModalOpen(false)}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleAddEvent}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Add Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventManagementPage; 