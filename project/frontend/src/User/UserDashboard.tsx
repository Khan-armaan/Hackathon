import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

interface TrafficInfo {
  location: string;
  congestionLevel: "LOW" | "MEDIUM" | "HIGH" | "SEVERE";
  waitTime: number;
  entryPoint: string;
  bestTravelTime: string;
}

const UserDashboard: React.FC = () => {
  const [trafficInfo, setTrafficInfo] = useState<TrafficInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching traffic data
    setTimeout(() => {
      setTrafficInfo([
        {
          location: "Kachi Dham Temple",
          congestionLevel: "HIGH",
          waitTime: 35,
          entryPoint: "North Gate",
          bestTravelTime: "Before 9:00 AM or after 7:00 PM"
        },
        {
          location: "Market Area",
          congestionLevel: "MEDIUM",
          waitTime: 15,
          entryPoint: "East Gate",
          bestTravelTime: "Weekdays between 2:00 PM - 4:00 PM"
        },
        {
          location: "Community Hall",
          congestionLevel: "LOW",
          waitTime: 5,
          entryPoint: "Any Gate",
          bestTravelTime: "Any time"
        }
      ]);
      setIsLoading(false);
    }, 1000);
  }, []);

  const getCongestionColor = (level: string) => {
    switch (level) {
      case "LOW": return "bg-green-100 text-green-800";
      case "MEDIUM": return "bg-yellow-100 text-yellow-800";
      case "HIGH": return "bg-orange-100 text-orange-800";
      case "SEVERE": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6">Kachi Dham Traffic Dashboard</h1>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-green-800 mb-2">Welcome to the Kachi Dham Traffic Information System</h2>
          <p className="text-gray-700">
            This dashboard provides real-time traffic information for Kachi Dham area. 
            Plan your visit to avoid congestion and reduce waiting times.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg shadow-sm">
            <h3 className="font-medium text-blue-800 mb-2">Current Visitors</h3>
            <p className="text-blue-600 text-2xl font-bold">2,847</p>
            <p className="text-blue-500 text-sm">Across all Kachi Dham areas</p>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg shadow-sm">
            <h3 className="font-medium text-purple-800 mb-2">Today's Events</h3>
            <p className="text-purple-600 text-2xl font-bold">2</p>
            <p className="text-purple-500 text-sm">Market Day + Evening Prayer</p>
          </div>

          <div className="bg-orange-50 p-4 rounded-lg shadow-sm">
            <h3 className="font-medium text-orange-800 mb-2">Overall Congestion</h3>
            <p className="text-orange-600 text-2xl font-bold">Medium</p>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
              <div className="bg-yellow-500 h-2.5 rounded-full w-1/2"></div>
            </div>
          </div>
        </div>
        
        <h2 className="text-xl font-semibold mb-4">Current Traffic Conditions</h2>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <p className="text-gray-500">Loading traffic information...</p>
          </div>
        ) : (
          <div className="bg-white border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Traffic Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Est. Wait Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recommended Entry
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Best Time to Visit
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {trafficInfo.map((info, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{info.location}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${getCongestionColor(info.congestionLevel)}`}>
                        {info.congestionLevel}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{info.waitTime} minutes</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{info.entryPoint}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{info.bestTravelTime}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        <div className="mt-6 flex justify-center">
          <Link 
            to="/user/maps" 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            View Interactive Traffic Maps
          </Link>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Travel Tips for Kachi Dham</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border-l-4 border-blue-500 pl-4">
            <h3 className="font-medium text-gray-800 mb-2">Best Times to Visit</h3>
            <ul className="list-disc pl-5 text-gray-700 space-y-1">
              <li>Early mornings (6:00 AM - 9:00 AM) typically have the least congestion</li>
              <li>Weekday afternoons are generally less crowded than weekends</li>
              <li>Avoid peak prayer times if visiting the temple</li>
              <li>Market days (Saturdays) have higher traffic in the central area</li>
            </ul>
          </div>
          
          <div className="border-l-4 border-green-500 pl-4">
            <h3 className="font-medium text-gray-800 mb-2">Parking Information</h3>
            <ul className="list-disc pl-5 text-gray-700 space-y-1">
              <li>North Gate parking area: 120 spaces (currently 80% full)</li>
              <li>East Gate parking area: 75 spaces (currently 50% full)</li>
              <li>West Gate parking area: 45 spaces (currently 30% full)</li>
              <li>Consider using shuttle services from outer parking areas</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <h3 className="font-medium text-yellow-800 mb-2">Upcoming Events Affecting Traffic</h3>
          <div className="space-y-3">
            <div>
              <p className="font-medium">Festival Celebration</p>
              <p className="text-sm text-gray-600">Tomorrow, 6:00 PM - 10:00 PM</p>
              <p className="text-sm text-gray-700 mt-1">
                Expected to increase congestion by 60%. Consider visiting before 3:00 PM.
              </p>
            </div>
            
            <div>
              <p className="font-medium">Weekly Market Day</p>
              <p className="text-sm text-gray-600">Saturday, 8:00 AM - 2:00 PM</p>
              <p className="text-sm text-gray-700 mt-1">
                Market area will have heavy congestion. North route recommended for temple visits.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
