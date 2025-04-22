import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { adminApi, eventsApi, trafficApi } from "../utils/api";

interface AdminUser {
  id: number;
  name: string;
  email: string;
}

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

interface TrafficStats {
  totalMaps: number;
  activeMaps: number;
  congestionLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  peakHours: string[];
  totalVehicles: number;
  eventsToday: number;
}

interface DailyTrafficData {
  id: number;
  date: string;
  totalVehicles: number;
  peakCongestion: number;
  avgWaitTime: number;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [trafficStats, setTrafficStats] = useState<TrafficStats | null>(null);
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dailyTrafficData, setDailyTrafficData] = useState<DailyTrafficData[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [trafficEntryPoints, setTrafficEntryPoints] = useState({
    "North Gate": { count: 210 },
    "East Gate": { count: 175 },
    "West Gate": { count: 150 },
    "South Gate": { count: 185 }
  });

  useEffect(() => {
    // Get the user from localStorage
    const storedUser = localStorage.getItem("admin_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    
    // Fetch traffic stats
    fetchTrafficStats();
    
    // Fetch events
    fetchEvents();
    
    // Fetch daily traffic data
    fetchDailyTrafficData();
    
    // Fetch traffic snapshots for entry points data
    fetchTrafficSnapshots();
  }, []);

  // Fetch traffic stats
  const fetchTrafficStats = async () => {
    setIsLoading(true);
    const response = await trafficApi.getTrafficStats();
    if (response.data) {
      setTrafficStats(response.data);
    } else {
      // Fallback to default data if API fails
      setTrafficStats({
        totalMaps: 3,
        activeMaps: 1,
        congestionLevel: "HIGH",
        peakHours: ["9:00 AM - 11:00 AM", "5:00 PM - 7:00 PM"],
        totalVehicles: 5200,
        eventsToday: 2
      });
    }
    setIsLoading(false);
  };

  // Fetch events
  const fetchEvents = async () => {
    const response = await eventsApi.getEvents();
    if (response.data) {
      setEvents(response.data);
    }
  };

  // Fetch daily traffic data
  const fetchDailyTrafficData = async (days = 30) => {
    const response = await trafficApi.getDailyTrafficData(days);
    if (response.data) {
      setDailyTrafficData(response.data);
    }
  };

  // Fetch traffic snapshots for entry points
  const fetchTrafficSnapshots = async () => {
    const response = await trafficApi.getTrafficSnapshots(undefined, 1);
    if (response.data && response.data.length > 0) {
      const snapshot = response.data[0];
      if (snapshot.entryPoints) {
        setTrafficEntryPoints(snapshot.entryPoints);
      }
    }
  };

  // Filter traffic data by selected month
  const filteredTrafficData = dailyTrafficData.filter(item => {
    const itemDate = new Date(item.date);
    const month = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}`;
    return month === selectedMonth;
  });

  // Calculate monthly total vehicles
  const monthlyTotalVehicles = filteredTrafficData.reduce((total, item) => total + item.totalVehicles, 0);

  // Calculate monthly average daily vehicles
  const avgDailyVehicles = filteredTrafficData.length > 0 
    ? Math.round(monthlyTotalVehicles / filteredTrafficData.length) 
    : 0;

  // Generate months for dropdown (last 12 months)
  const getMonthOptions = () => {
    const options = [];
    const today = new Date();
    
    for (let i = 0; i < 12; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthValue = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      options.push({ value: monthValue, label: monthLabel });
    }
    
    return options;
  };

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

  const getImpactColor = (level: string): string => {
    switch(level) {
      case "LOW": return "border-green-500";
      case "MEDIUM": return "border-yellow-500";
      case "HIGH": return "border-orange-500";
      case "CRITICAL": return "border-red-500";
      default: return "border-gray-500";
    }
  };
  
  const getImpactBadgeColor = (level: string): string => {
    switch(level) {
      case "LOW": return "bg-green-100 text-green-800";
      case "MEDIUM": return "bg-yellow-100 text-yellow-800";
      case "HIGH": return "bg-orange-100 text-orange-800";
      case "CRITICAL": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  // Format date to readable string
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get upcoming events (next 3)
  const upcomingEvents = events
    .filter(event => new Date(event.startDate) > new Date())
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 3);

  // Generate reasonable recommendations based on traffic stats and events
  const generateRecommendations = () => {
    const recommendations = [];
    
    // Check for high traffic and upcoming events
    if (trafficStats?.congestionLevel === "HIGH" || trafficStats?.congestionLevel === "CRITICAL") {
      recommendations.push({
        type: "critical",
        title: "Implement one-way traffic flow on North Road",
        description: "Heavy congestion detected, recommended during peak hours (5:00 PM - 7:00 PM)"
      });
    }
    
    // Check for events with high impact
    if (upcomingEvents.some(event => event.impactLevel === "HIGH" || event.impactLevel === "CRITICAL")) {
      recommendations.push({
        type: "warning",
        title: "Deploy additional traffic controllers at key junctions",
        description: `Upcoming high-impact events require extra staffing at checkpoints`
      });
    }
    
    // Check if average daily traffic is increasing
    if (avgDailyVehicles > 8000) {
      recommendations.push({
        type: "warning",
        title: "Add temporary parking facilities",
        description: "High traffic volume detected, additional parking needed to prevent congestion"
      });
    }
    
    // Include smart routing recommendation
    recommendations.push({
      type: "success",
      title: "Activate smart routing for vehicles entering through East Gate",
      description: "AI simulation shows potential 35% reduction in waiting times"
    });
    
    return recommendations;
  };

  const recommendations = generateRecommendations();

  if (isLoading && !trafficStats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-xl text-gray-600">Loading dashboard data...</div>
      </div>
    );
  }

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
              className="flex items-center justify-center bg-blue-50 hover:bg-blue-100 p-4 rounded-lg transition shadow-sm"
            >
              <div className="text-center">
                <div className="h-10 w-10 mx-auto mb-2 bg-blue-200 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
                <span className="text-blue-800 font-medium">Manage Maps</span>
              </div>
            </Link>
            <Link 
              to="/admin/maps/add" 
              className="flex items-center justify-center bg-green-50 hover:bg-green-100 p-4 rounded-lg transition shadow-sm"
            >
              <div className="text-center">
                <div className="h-10 w-10 mx-auto mb-2 bg-green-200 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <span className="text-green-800 font-medium">Add New Map</span>
              </div>
            </Link>
            <Link 
              to="/admin/events" 
              className="flex items-center justify-center bg-purple-50 hover:bg-purple-100 p-4 rounded-lg transition shadow-sm"
            >
              <div className="text-center">
                <div className="h-10 w-10 mx-auto mb-2 bg-purple-200 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-purple-800 font-medium">Manage Events</span>
              </div>
            </Link>
            <Link 
              to="/admin/simulation" 
              className="flex items-center justify-center bg-orange-50 hover:bg-orange-100 p-4 rounded-lg transition shadow-sm"
            >
              <div className="text-center">
                <div className="h-10 w-10 mx-auto mb-2 bg-orange-200 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-orange-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="text-orange-800 font-medium">Advanced Simulation</span>
              </div>
            </Link>
          </div>
        </div>

        {/* Current Traffic Status */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-semibold">Current Traffic Status</h2>
              <p className="text-gray-500 text-sm">Real-time traffic monitoring for Kachi Dham area</p>
            </div>
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
          
          <div className="mb-4">
            <div className="flex items-center">
              <span className="text-gray-700 mr-2">Traffic Period:</span>
              <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {getMonthOptions().map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-blue-50 p-4 rounded-lg shadow-sm">
              <div className="flex justify-between">
                <h3 className="font-medium text-blue-800">Total Vehicles</h3>
              </div>
              <p className="text-blue-600 text-2xl font-bold">{trafficStats?.totalVehicles.toLocaleString() || "0"}</p>
              <p className="text-blue-500 text-sm">Current vehicle count in Kachi Dham area</p>
            </div>

            <div className="bg-indigo-50 p-4 rounded-lg shadow-sm">
              <div className="flex justify-between">
                <h3 className="font-medium text-indigo-800">Monthly Total</h3>
              </div>
              <p className="text-indigo-600 text-2xl font-bold">{monthlyTotalVehicles.toLocaleString()}</p>
              <p className="text-indigo-500 text-sm">Total vehicles for {new Date(selectedMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg shadow-sm">
              <div className="flex justify-between">
                <h3 className="font-medium text-green-800">Peak Hours</h3>
              </div>
              <div className="mt-2">
                {trafficStats?.peakHours.map((hour, index) => (
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
              <p className={`text-2xl font-bold ${getCongestionColor(trafficStats?.congestionLevel || "MEDIUM")}`}>
                {trafficStats?.congestionLevel || "MEDIUM"}
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                <div className={`h-2.5 rounded-full ${
                  (trafficStats?.congestionLevel || "MEDIUM") === "LOW" ? "bg-green-500 w-1/4" :
                  (trafficStats?.congestionLevel || "MEDIUM") === "MEDIUM" ? "bg-yellow-500 w-2/4" :
                  (trafficStats?.congestionLevel || "MEDIUM") === "HIGH" ? "bg-orange-500 w-3/4" :
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
              <div className="text-center">
                <p className="text-gray-500 mb-2">Traffic flow visualization would be displayed here</p>
                <div className="inline-block bg-blue-100 text-blue-800 rounded px-2 py-1 text-xs">
                  Daily Average: {avgDailyVehicles.toLocaleString()} vehicles
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4">
              {Object.entries(trafficEntryPoints).map(([gate, data]) => (
                <div key={gate} className="bg-blue-50 p-3 rounded shadow-sm">
                  <h4 className="text-sm font-medium text-blue-800">{gate}</h4>
                  <p className="text-xl font-semibold text-blue-600">{data.count} <span className="text-sm font-normal">vehicles/hr</span></p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Upcoming Events</h2>
            {upcomingEvents.length > 0 ? (
              <div className="space-y-4">
                {upcomingEvents.map(event => (
                  <div key={event.id} className={`border-l-4 ${getImpactColor(event.impactLevel)} pl-3 py-2 hover:bg-gray-50 transition rounded`}>
                    <div className="flex justify-between items-start">
                      <p className="font-semibold text-gray-800">{event.name}</p>
                      <span className={`text-xs px-2 py-1 ${getImpactBadgeColor(event.impactLevel)} rounded-full inline-block ml-2`}>
                        {event.impactLevel}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {formatDate(event.startDate)}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700">
                        {event.location}
                      </div>
                      <div className="text-xs font-medium text-gray-700">
                        {event.expectedVisitors.toLocaleString()} visitors
                      </div>
                    </div>
                  </div>
                ))}
                <Link to="/admin/events" className="block text-blue-600 hover:text-blue-800 text-sm mt-4 flex items-center">
                  <span>View all events</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            ) : (
              <div className="p-4 border border-gray-200 rounded-lg text-center text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="font-medium mb-1">No upcoming events</p>
                <p className="text-sm">Schedule an event to see it here</p>
                <Link to="/admin/events" className="mt-3 inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-md text-sm font-medium hover:bg-blue-200 transition">
                  Add Event
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Recommended Actions */}
        <div className="bg-white shadow rounded-lg p-6 mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Recommended Actions</h2>
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">AI-powered suggestions</span>
          </div>
          <ul className="space-y-4">
            {recommendations.map((recommendation, index) => (
              <li key={index} className="flex items-start p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition">
                <span className={`
                  ${recommendation.type === 'critical' ? 'bg-red-100 text-red-800' : 
                    recommendation.type === 'warning' ? 'bg-yellow-100 text-yellow-800' : 
                    'bg-green-100 text-green-800'} 
                  rounded-full p-1 mr-3 mt-0.5 flex-shrink-0
                `}>
                  {recommendation.type === 'critical' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  ) : recommendation.type === 'warning' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </span>
                <div>
                  <p className="font-medium">{recommendation.title}</p>
                  <p className="text-sm text-gray-600">{recommendation.description}</p>
                  
                  <div className="flex mt-2">
                    <button className="text-blue-600 hover:text-blue-800 text-xs mr-3 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                      Apply Now
                    </button>
                    <button className="text-gray-500 hover:text-gray-700 text-xs flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Schedule
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
