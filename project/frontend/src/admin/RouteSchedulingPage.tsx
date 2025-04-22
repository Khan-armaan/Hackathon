import React, { useState, useEffect } from "react";

interface TimeSlot {
  id: number;
  startTime: string;
  endTime: string;
  maxVehicles: number;
  currentAllocation: number;
  status: "OPEN" | "FILLING" | "FULL" | "CLOSED";
  entryPoint: string;
}

interface RouteRecommendation {
  id: number;
  entryPoint: string;
  exitPoint: string;
  route: string[];
  expectedDuration: number;
  congestionLevel: "LOW" | "MEDIUM" | "HIGH";
  vehicleTypes: string[];
  timeSlots: string[];
}

const RouteSchedulingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"timeSlots" | "routes">("timeSlots");
  const [isLoading, setIsLoading] = useState(false);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [routeRecommendations, setRouteRecommendations] = useState<RouteRecommendation[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"timeSlot" | "route">("timeSlot");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const entryPoints = ["North Gate", "East Gate", "West Gate", "South Gate"];

  // Mock data for demonstration
  useEffect(() => {
    setIsLoading(true);
    
    // Generate time slots for the selected date
    setTimeout(() => {
      const mockTimeSlots: TimeSlot[] = [];
      const startHours = [6, 8, 10, 12, 14, 16, 18];
      
      startHours.forEach((hour, index) => {
        const status = index < 2 ? "FULL" : (index < 5 ? "FILLING" : "OPEN");
        const currentAllocation = status === "FULL" ? 200 : (status === "FILLING" ? Math.floor(Math.random() * 150) + 50 : Math.floor(Math.random() * 50));
        
        mockTimeSlots.push({
          id: index + 1,
          startTime: `${hour}:00`,
          endTime: `${hour + 2}:00`,
          maxVehicles: 200,
          currentAllocation,
          status: status as "OPEN" | "FILLING" | "FULL" | "CLOSED",
          entryPoint: entryPoints[index % entryPoints.length]
        });
      });
      
      setTimeSlots(mockTimeSlots);
      
      // Mock route recommendations
      const mockRoutes: RouteRecommendation[] = [
        {
          id: 1,
          entryPoint: "North Gate",
          exitPoint: "South Gate",
          route: ["North Gate", "Main Road", "Temple Junction", "Market Square", "South Gate"],
          expectedDuration: 25,
          congestionLevel: "LOW",
          vehicleTypes: ["Car", "Motorcycle"],
          timeSlots: ["6:00 - 8:00", "14:00 - 16:00", "18:00 - 20:00"]
        },
        {
          id: 2,
          entryPoint: "East Gate",
          exitPoint: "West Gate",
          route: ["East Gate", "Temple Road", "Temple Junction", "West Road", "West Gate"],
          expectedDuration: 35,
          congestionLevel: "MEDIUM",
          vehicleTypes: ["Car", "Bus", "Motorcycle"],
          timeSlots: ["8:00 - 10:00", "12:00 - 14:00", "16:00 - 18:00"]
        },
        {
          id: 3,
          entryPoint: "South Gate",
          exitPoint: "North Gate",
          route: ["South Gate", "Market Square", "Temple Junction", "Main Road", "North Gate"],
          expectedDuration: 30,
          congestionLevel: "HIGH",
          vehicleTypes: ["Car"],
          timeSlots: ["10:00 - 12:00"]
        },
        {
          id: 4,
          entryPoint: "West Gate",
          exitPoint: "East Gate",
          route: ["West Gate", "West Road", "Temple Junction", "Temple Road", "East Gate"],
          expectedDuration: 40,
          congestionLevel: "LOW",
          vehicleTypes: ["Car", "Bus", "Motorcycle", "Truck"],
          timeSlots: ["6:00 - 8:00", "8:00 - 10:00", "18:00 - 20:00"]
        }
      ];
      
      setRouteRecommendations(mockRoutes);
      setIsLoading(false);
    }, 1000);
  }, [selectedDate]);

  const handleAddTimeSlot = () => {
    setModalType("timeSlot");
    setIsAddModalOpen(true);
  };

  const handleAddRoute = () => {
    setModalType("route");
    setIsAddModalOpen(true);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OPEN": return "bg-green-100 text-green-800";
      case "FILLING": return "bg-yellow-100 text-yellow-800";
      case "FULL": return "bg-red-100 text-red-800";
      case "CLOSED": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getCongestionColor = (level: string) => {
    switch (level) {
      case "LOW": return "bg-green-100 text-green-800";
      case "MEDIUM": return "bg-yellow-100 text-yellow-800";
      case "HIGH": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Dynamic Route Scheduling</h1>
      
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="flex border-b">
          <button
            className={`py-3 px-6 font-medium ${
              activeTab === "timeSlots"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("timeSlots")}
          >
            Time Slots
          </button>
          <button
            className={`py-3 px-6 font-medium ${
              activeTab === "routes"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("routes")}
          >
            Route Recommendations
          </button>
        </div>
        
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center">
              <label htmlFor="date" className="mr-2">Date:</label>
              <input
                type="date"
                id="date"
                value={selectedDate}
                onChange={handleDateChange}
                className="px-3 py-2 border rounded"
              />
            </div>
            
            <button
              onClick={activeTab === "timeSlots" ? handleAddTimeSlot : handleAddRoute}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
            >
              {activeTab === "timeSlots" ? "Add Time Slot" : "Add Route"}
            </button>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <p className="text-gray-500">Loading data...</p>
            </div>
          ) : activeTab === "timeSlots" ? (
            <div>
              <p className="text-gray-600 mb-4">
                Manage time-based entry slots to distribute vehicle load and reduce congestion.
              </p>
              
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time Slot
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Entry Point
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Capacity
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
                  {timeSlots.map((slot) => (
                    <tr key={slot.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {slot.startTime} - {slot.endTime}
                        </div>
                        <div className="text-sm text-gray-500">
                          {selectedDate}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{slot.entryPoint}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {slot.currentAllocation} / {slot.maxVehicles} vehicles
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                          <div
                            className={`h-2.5 rounded-full ${
                              (slot.currentAllocation / slot.maxVehicles) < 0.5
                                ? "bg-green-500"
                                : (slot.currentAllocation / slot.maxVehicles) < 0.8
                                ? "bg-yellow-500"
                                : "bg-red-500"
                            }`}
                            style={{
                              width: `${(slot.currentAllocation / slot.maxVehicles) * 100}%`,
                            }}
                          ></div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${getStatusColor(
                            slot.status
                          )}`}
                        >
                          {slot.status}
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
              
              <div className="mt-6 bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2">Balance Strategies</h3>
                <p className="text-gray-700 mb-2">
                  The system automatically distributes vehicles based on the following factors:
                </p>
                <ul className="list-disc pl-5 text-gray-700">
                  <li>Historic traffic patterns for similar days</li>
                  <li>Event schedules and expected attendance</li>
                  <li>Weather conditions and their impact on traffic</li>
                  <li>Real-time congestion levels at each entry point</li>
                </ul>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-gray-600 mb-4">
                View and manage recommended routes for different vehicle types and time slots.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {routeRecommendations.map((route) => (
                  <div
                    key={route.id}
                    className="bg-white border rounded-lg shadow-sm overflow-hidden"
                  >
                    <div className="px-4 py-3 bg-gray-50 border-b flex justify-between items-center">
                      <h3 className="font-semibold">
                        {route.entryPoint} to {route.exitPoint}
                      </h3>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${getCongestionColor(
                          route.congestionLevel
                        )}`}
                      >
                        {route.congestionLevel} Congestion
                      </span>
                    </div>
                    
                    <div className="p-4">
                      <div className="mb-3">
                        <div className="text-sm font-medium text-gray-700 mb-1">
                          Route Path:
                        </div>
                        <div className="flex items-center flex-wrap">
                          {route.route.map((stop, index) => (
                            <React.Fragment key={index}>
                              <span className="text-sm">{stop}</span>
                              {index < route.route.length - 1 && (
                                <span className="text-gray-400 mx-2">→</span>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <div className="text-sm font-medium text-gray-700 mb-1">
                          Expected Duration:
                        </div>
                        <div className="text-sm">
                          {route.expectedDuration} minutes
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <div className="text-sm font-medium text-gray-700 mb-1">
                          Vehicle Types:
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {route.vehicleTypes.map((type, index) => (
                            <span
                              key={index}
                              className="text-xs bg-gray-100 text-gray-800 rounded px-2 py-1"
                            >
                              {type}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-1">
                          Recommended Time Slots:
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {route.timeSlots.map((slot, index) => (
                            <span
                              key={index}
                              className="text-xs bg-blue-100 text-blue-800 rounded px-2 py-1"
                            >
                              {slot}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex justify-end mt-4">
                        <button className="text-blue-600 hover:text-blue-900 text-sm font-medium">
                          Edit Route
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Route Scheduling Insights</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-medium text-green-800">Average Wait Time</h3>
            <p className="text-green-600 text-2xl font-bold">8 minutes</p>
            <p className="text-green-700 text-sm">20% improvement from last week</p>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-800">Traffic Distribution</h3>
            <p className="text-blue-600 text-2xl font-bold">85% balanced</p>
            <p className="text-blue-700 text-sm">15% more balanced than default routing</p>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-medium text-purple-800">Vehicles Processed</h3>
            <p className="text-purple-600 text-2xl font-bold">4,850 / day</p>
            <p className="text-purple-700 text-sm">350 more than previous scheduling</p>
          </div>
        </div>
        
        <div className="bg-yellow-50 p-4 rounded-lg">
          <h3 className="font-semibold text-yellow-800 mb-2">Recommendations</h3>
          <ul className="list-disc pl-5 text-gray-700">
            <li>Increase capacity for the 14:00-16:00 time slot at North Gate</li>
            <li>Add additional time slots during the upcoming festival weekend</li>
            <li>Restrict large vehicle entry during 10:00-12:00 slot to reduce congestion</li>
            <li>Consider adding a temporary route from West Gate to Temple Junction</li>
          </ul>
        </div>
      </div>
      
      {/* Add Modal (simplified for this example) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">
              {modalType === "timeSlot" ? "Add Time Slot" : "Add Route Recommendation"}
            </h2>
            
            <p className="text-gray-500 mb-4">
              This would contain a form for adding a new {modalType === "timeSlot" ? "time slot" : "route recommendation"}.
            </p>
            
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteSchedulingPage; 