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
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [trafficStats] = useState<TrafficStats>({
    totalMaps: 3,
    activeMaps: 1,
    congestionLevel: "HIGH",
    peakHours: ["9:00 AM - 11:00 AM", "5:00 PM - 7:00 PM"],
    totalVehicles: 5200,
    eventsToday: 2
  });
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("admin_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogout = () => {
    adminApi.logout();
    navigate("/admin/login");
  };

  const handleStartSimulation = () => {
    setIsSimulationRunning(true);
  };

  const handleStopSimulation = () => {
    setIsSimulationRunning(false);
  };

  const getCongestionColor = (level: string): string => {
    switch(level) {
      case "LOW": return "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-600/20";
      case "MEDIUM": return "bg-amber-100 text-amber-800 ring-1 ring-amber-600/20";
      case "HIGH": return "bg-rose-100 text-rose-800 ring-1 ring-rose-600/20";
      case "CRITICAL": return "bg-red-100 text-red-800 ring-1 ring-red-600/20";
      default: return "bg-gray-100 text-gray-800 ring-1 ring-gray-600/20";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                Kachi Dham Traffic Management
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold flex items-center justify-center hover:from-blue-600 hover:to-blue-700 transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  {user?.name.charAt(0).toUpperCase()}
                </button>
                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 ring-1 ring-black ring-opacity-5">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Link 
            to="/admin/maps" 
            className="bg-white p-6 rounded-xl shadow-sm hover:bg-blue-50 transition-all duration-200 transform hover:-translate-y-1 border border-gray-100"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <span className="font-medium text-blue-600">Manage Maps</span>
            </div>
          </Link>
          <Link 
            to="/admin/maps/add" 
            className="bg-white p-6 rounded-xl shadow-sm hover:bg-green-50 transition-all duration-200 transform hover:-translate-y-1 border border-gray-100"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <span className="font-medium text-green-600">Add New Map</span>
            </div>
          </Link>
          <Link 
            to="/admin/events" 
            className="bg-white p-6 rounded-xl shadow-sm hover:bg-purple-50 transition-all duration-200 transform hover:-translate-y-1 border border-gray-100"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="font-medium text-purple-600">Manage Events</span>
            </div>
          </Link>
          <Link 
            to="/admin/simulation" 
            className="bg-white p-6 rounded-xl shadow-sm hover:bg-orange-50 transition-all duration-200 transform hover:-translate-y-1 border border-gray-100"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-50 rounded-lg">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="font-medium text-orange-600">Advanced Simulation</span>
            </div>
          </Link>
        </div>

        {/* Current Traffic Status */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Current Traffic Status</h2>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Live Simulation:</span>
              {isSimulationRunning ? (
                <button 
                  onClick={handleStopSimulation}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center space-x-2"
                >
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                  <span>Stop</span>
                </button>
              ) : (
                <button 
                  onClick={handleStartSimulation}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  Start
                </button>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl">
              <h3 className="font-medium text-blue-800 mb-2">Total Vehicles</h3>
              <p className="text-3xl font-bold text-blue-600">{trafficStats.totalVehicles.toLocaleString()}</p>
              <p className="text-sm text-blue-500 mt-1">Current vehicle count in Kachi Dham area</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl">
              <h3 className="font-medium text-green-800 mb-2">Peak Hours</h3>
              <div className="space-y-2">
                {trafficStats.peakHours.map((hour, index) => (
                  <span key={index} className="inline-block bg-green-100 text-green-800 rounded-lg px-3 py-1 text-sm">
                    {hour}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl">
              <h3 className="font-medium text-orange-800 mb-2">Congestion Level</h3>
              <p className={`text-3xl font-bold ${getCongestionColor(trafficStats.congestionLevel)}`}>
                {trafficStats.congestionLevel}
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2.5 mt-3">
                <div className={`h-2.5 rounded-full transition-all duration-500 ${
                  trafficStats.congestionLevel === "LOW" ? "bg-emerald-500 w-1/4" :
                  trafficStats.congestionLevel === "MEDIUM" ? "bg-amber-500 w-2/4" :
                  trafficStats.congestionLevel === "HIGH" ? "bg-rose-500 w-3/4" :
                  "bg-red-500 w-full"
                }`}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Traffic Analytics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 col-span-2">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Traffic Flow Overview</h2>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 h-64 flex items-center justify-center">
              <p className="text-gray-500">Traffic flow visualization would be displayed here</p>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-blue-800">Entry Point A</h4>
                <p className="text-2xl font-semibold text-blue-600">187 <span className="text-sm font-normal">vehicles/hr</span></p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-green-800">Entry Point B</h4>
                <p className="text-2xl font-semibold text-green-600">143 <span className="text-sm font-normal">vehicles/hr</span></p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-purple-800">Exit Point</h4>
                <p className="text-2xl font-semibold text-purple-600">167 <span className="text-sm font-normal">vehicles/hr</span></p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Upcoming Events</h2>
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4">
                <p className="font-semibold text-orange-800">Festival Celebration</p>
                <p className="text-sm text-orange-600">Today, 6:00 PM - 10:00 PM</p>
                <div className="mt-2 inline-block px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs">
                  High Impact
                </div>
              </div>
              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4">
                <p className="font-semibold text-yellow-800">Market Day</p>
                <p className="text-sm text-yellow-600">Tomorrow, 8:00 AM - 2:00 PM</p>
                <div className="mt-2 inline-block px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                  Medium Impact
                </div>
              </div>
              <Link to="/admin/events" className="block text-blue-600 hover:text-blue-700 text-sm mt-4 transition-colors">
                View all events →
              </Link>
            </div>
          </div>
        </div>

        {/* Recommended Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recommended Actions</h2>
          <ul className="space-y-4">
            <li className="flex items-start group">
              <span className="flex-shrink-0 p-2 bg-red-100 rounded-lg mr-3 group-hover:bg-red-200 transition-colors">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </span>
              <div>
                <p className="font-medium text-gray-900 group-hover:text-red-600 transition-colors">Implement one-way traffic flow on North Road</p>
                <p className="text-sm text-gray-600">Heavy congestion detected, recommended during 5:00 PM - 7:00 PM</p>
              </div>
            </li>
            <li className="flex items-start group">
              <span className="flex-shrink-0 p-2 bg-yellow-100 rounded-lg mr-3 group-hover:bg-yellow-200 transition-colors">
                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
              <div>
                <p className="font-medium text-gray-900 group-hover:text-yellow-600 transition-colors">Add temporary traffic controllers at Junction B</p>
                <p className="text-sm text-gray-600">Bottleneck identified during market hours</p>
              </div>
            </li>
            <li className="flex items-start group">
              <span className="flex-shrink-0 p-2 bg-green-100 rounded-lg mr-3 group-hover:bg-green-200 transition-colors">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
              <div>
                <p className="font-medium text-gray-900 group-hover:text-green-600 transition-colors">Restrict large vehicle entry during festival hours</p>
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
