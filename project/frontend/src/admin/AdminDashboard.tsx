import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { adminApi } from "../utils/api";

interface AdminUser {
  id: number;
  name: string;
  email: string;
}

interface TrafficStats {
  totalMaps: number;
  activeMaps: number;
  congestionLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  peakHours: string[];
  totalVehicles: number;
  eventsToday: number;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [trafficStats, setTrafficStats] = useState<TrafficStats>({
    totalMaps: 3,
    activeMaps: 1,
    congestionLevel: "HIGH",
    peakHours: ["9:00 AM - 11:00 AM", "5:00 PM - 7:00 PM"],
    totalVehicles: 5200,
    eventsToday: 2
  });
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);

  useEffect(() => {
    // Get the user from localStorage
    const storedUser = localStorage.getItem("admin_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    
    // In a real implementation, we would fetch actual traffic stats here
    // fetchTrafficStats();
  }, []);

  const handleLogout = () => {
    adminApi.logout();
    navigate("/admin/login");
  };

  const handleStartSimulation = () => {
    setIsSimulationRunning(true);
    // Here you would trigger the actual simulation to start
  };

  const handleStopSimulation = () => {
    setIsSimulationRunning(false);
    // Here you would stop the actual simulation
  };

  const getCongestionColor = (level: string): string => {
    switch(level) {
      case "LOW": return "text-green-600";
      case "MEDIUM": return "text-yellow-600";
      case "HIGH": return "text-orange-600";
      case "CRITICAL": return "text-red-600";
      default: return "text-gray-600";
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Kachi Dham Traffic Management System</h1>
          <div className="flex items-center">
            {user && (
              <span className="mr-4 text-gray-600">Welcome, {user.name}</span>
            )}
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Link 
              to="/admin/maps" 
              className="flex items-center justify-center bg-blue-50 hover:bg-blue-100 p-4 rounded-lg transition"
            >
              <span>Manage Maps</span>
            </Link>
            <Link 
              to="/admin/maps/add" 
              className="flex items-center justify-center bg-green-50 hover:bg-green-100 p-4 rounded-lg transition"
            >
              <span>Add New Map</span>
            </Link>
            <Link 
              to="/admin/events" 
              className="flex items-center justify-center bg-purple-50 hover:bg-purple-100 p-4 rounded-lg transition"
            >
              <span>Manage Events</span>
            </Link>
            <Link 
              to="/admin/simulation" 
              className="flex items-center justify-center bg-orange-50 hover:bg-orange-100 p-4 rounded-lg transition"
            >
              <span>Advanced Simulation</span>
            </Link>
          </div>
        </div>

        {/* Current Traffic Status */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Current Traffic Status</h2>
            <div className="flex items-center">
              <span className="mr-2">Live Simulation:</span>
              {isSimulationRunning ? (
                <button 
                  onClick={handleStopSimulation}
                  className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 flex items-center"
                >
                  <span className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></span>
                  Stop
                </button>
              ) : (
                <button 
                  onClick={handleStartSimulation}
                  className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Start
                </button>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 p-4 rounded-lg shadow-sm">
              <div className="flex justify-between">
                <h3 className="font-medium text-blue-800">Total Vehicles</h3>
              </div>
              <p className="text-blue-600 text-2xl font-bold">{trafficStats.totalVehicles.toLocaleString()}</p>
              <p className="text-blue-500 text-sm">Current vehicle count in Kachi Dham area</p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg shadow-sm">
              <div className="flex justify-between">
                <h3 className="font-medium text-green-800">Peak Hours</h3>
              </div>
              <div className="mt-2">
                {trafficStats.peakHours.map((hour, index) => (
                  <span key={index} className="inline-block bg-green-100 text-green-800 rounded px-2 py-1 text-sm mr-2 mb-2">
                    {hour}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-orange-50 p-4 rounded-lg shadow-sm">
              <div className="flex justify-between">
                <h3 className="font-medium text-orange-800">Congestion Level</h3>
              </div>
              <p className={`text-2xl font-bold ${getCongestionColor(trafficStats.congestionLevel)}`}>
                {trafficStats.congestionLevel}
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                <div className={`h-2.5 rounded-full ${
                  trafficStats.congestionLevel === "LOW" ? "bg-green-500 w-1/4" :
                  trafficStats.congestionLevel === "MEDIUM" ? "bg-yellow-500 w-2/4" :
                  trafficStats.congestionLevel === "HIGH" ? "bg-orange-500 w-3/4" :
                  "bg-red-500 w-full"
                }`}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Traffic Analytics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white shadow rounded-lg p-6 col-span-2">
            <h2 className="text-xl font-semibold mb-4">Traffic Flow Overview</h2>
            <div className="bg-gray-100 rounded-lg p-4 h-64 flex items-center justify-center">
              {/* In a real implementation, this would be a chart or map visualization */}
              <p className="text-gray-500">Traffic flow visualization would be displayed here</p>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="bg-blue-50 p-3 rounded">
                <h4 className="text-sm font-medium text-blue-800">Entry Point A</h4>
                <p className="text-xl font-semibold text-blue-600">187 <span className="text-sm font-normal">vehicles/hr</span></p>
              </div>
              <div className="bg-green-50 p-3 rounded">
                <h4 className="text-sm font-medium text-green-800">Entry Point B</h4>
                <p className="text-xl font-semibold text-green-600">143 <span className="text-sm font-normal">vehicles/hr</span></p>
              </div>
              <div className="bg-purple-50 p-3 rounded">
                <h4 className="text-sm font-medium text-purple-800">Exit Point</h4>
                <p className="text-xl font-semibold text-purple-600">167 <span className="text-sm font-normal">vehicles/hr</span></p>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Upcoming Events</h2>
            <div className="space-y-4">
              <div className="border-l-4 border-orange-500 pl-3">
                <p className="font-semibold">Festival Celebration</p>
                <p className="text-sm text-gray-600">Today, 6:00 PM - 10:00 PM</p>
                <div className="mt-1 text-xs px-2 py-1 bg-orange-100 text-orange-800 rounded inline-block">
                  High Impact
                </div>
              </div>
              <div className="border-l-4 border-yellow-500 pl-3">
                <p className="font-semibold">Market Day</p>
                <p className="text-sm text-gray-600">Tomorrow, 8:00 AM - 2:00 PM</p>
                <div className="mt-1 text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded inline-block">
                  Medium Impact
                </div>
              </div>
              <Link to="/admin/events" className="block text-blue-600 hover:underline text-sm mt-4">
                View all events →
              </Link>
            </div>
          </div>
        </div>

        {/* Recommended Actions */}
        <div className="bg-white shadow rounded-lg p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">Recommended Actions</h2>
          <ul className="space-y-3">
            <li className="flex items-start">
              <span className="bg-red-100 text-red-800 rounded-full p-1 mr-2 mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </span>
              <div>
                <p className="font-medium">Implement one-way traffic flow on North Road</p>
                <p className="text-sm text-gray-600">Heavy congestion detected, recommended during 5:00 PM - 7:00 PM</p>
              </div>
            </li>
            <li className="flex items-start">
              <span className="bg-yellow-100 text-yellow-800 rounded-full p-1 mr-2 mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </span>
              <div>
                <p className="font-medium">Add temporary traffic controllers at Junction B</p>
                <p className="text-sm text-gray-600">Bottleneck identified during market hours</p>
              </div>
            </li>
            <li className="flex items-start">
              <span className="bg-green-100 text-green-800 rounded-full p-1 mr-2 mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </span>
              <div>
                <p className="font-medium">Restrict large vehicle entry during festival hours</p>
                <p className="text-sm text-gray-600">Simulation shows 30% congestion reduction</p>
              </div>
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
