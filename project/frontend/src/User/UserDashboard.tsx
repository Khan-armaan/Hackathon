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
      case "LOW": return "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-600/20";
      case "MEDIUM": return "bg-amber-100 text-amber-800 ring-1 ring-amber-600/20";
      case "HIGH": return "bg-rose-100 text-rose-800 ring-1 ring-rose-600/20";
      case "SEVERE": return "bg-red-100 text-red-800 ring-1 ring-red-600/20";
      default: return "bg-gray-100 text-gray-800 ring-1 ring-gray-600/20";
    }
  };

  return (
    <div className="min-h-screen bg-[#E8F5E9] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden transform transition-all hover:shadow-xl">
          <div className="bg-gradient-to-r from-[#2E7D32] to-[#4CAF50] px-8 py-12">
            <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">Kachi Dham Traffic Dashboard</h1>
            <p className="text-green-100 max-w-3xl text-lg">
              Real-time traffic information system for Kachi Dham area. 
              Plan your visit efficiently and avoid congestion.
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Current Visitors</h3>
              <span className="p-2 bg-[#E8F5E9] rounded-lg">
                <svg className="w-6 h-6 text-[#2E7D32]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </span>
            </div>
            <p className="text-4xl font-bold text-[#2E7D32]">2,847</p>
            <p className="text-sm text-gray-500 mt-1">Across all areas</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Today's Events</h3>
              <span className="p-2 bg-[#E8F5E9] rounded-lg">
                <svg className="w-6 h-6 text-[#2E7D32]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </span>
            </div>
            <p className="text-4xl font-bold text-[#2E7D32]">2</p>
            <p className="text-sm text-gray-500 mt-1">Market Day + Evening Prayer</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Overall Congestion</h3>
              <span className="p-2 bg-[#E8F5E9] rounded-lg">
                <svg className="w-6 h-6 text-[#2E7D32]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </span>
            </div>
            <p className="text-4xl font-bold text-[#2E7D32]">Medium</p>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-3">
              <div className="bg-[#4CAF50] h-2.5 rounded-full w-1/2 transition-all duration-500"></div>
            </div>
          </div>
        </div>

        {/* Traffic Conditions Table */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden transform transition-all hover:shadow-xl">
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="text-2xl font-semibold text-gray-900">Current Traffic Conditions</h2>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2E7D32]"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-[#E8F5E9]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#2E7D32] uppercase tracking-wider">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#2E7D32] uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#2E7D32] uppercase tracking-wider">Wait Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#2E7D32] uppercase tracking-wider">Entry Point</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#2E7D32] uppercase tracking-wider">Best Time</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {trafficInfo.map((info, index) => (
                    <tr key={index} className="hover:bg-[#E8F5E9] transition-colors duration-200">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{info.location}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getCongestionColor(info.congestionLevel)}`}>
                          {info.congestionLevel}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                        {info.waitTime} minutes
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                        {info.entryPoint}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                        {info.bestTravelTime}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="px-6 py-4 border-t border-gray-100 bg-[#E8F5E9]">
            <Link
              to="/user/maps"
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-gradient-to-r from-[#2E7D32] to-[#4CAF50] hover:from-[#1B5E20] hover:to-[#2E7D32] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4CAF50] transition-all duration-300 transform hover:-translate-y-0.5"
            >
              View Interactive Traffic Maps
              <svg className="ml-2 -mr-1 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Travel Tips Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 transform transition-all hover:shadow-xl">
            <div className="flex items-center space-x-3 mb-6">
              <span className="p-2 bg-[#E8F5E9] rounded-lg">
                <svg className="w-6 h-6 text-[#2E7D32]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
              <h3 className="text-xl font-semibold text-gray-900">Best Times to Visit</h3>
            </div>
            <ul className="space-y-4">
              <li className="flex items-start group">
                <span className="flex-shrink-0 h-2 w-2 mt-2 rounded-full bg-[#4CAF50] group-hover:bg-[#2E7D32] transition-colors"></span>
                <span className="ml-3 text-gray-600 group-hover:text-gray-900 transition-colors">Early mornings (6:00 AM - 9:00 AM) typically have the least congestion</span>
              </li>
              <li className="flex items-start group">
                <span className="flex-shrink-0 h-2 w-2 mt-2 rounded-full bg-[#4CAF50] group-hover:bg-[#2E7D32] transition-colors"></span>
                <span className="ml-3 text-gray-600 group-hover:text-gray-900 transition-colors">Weekday afternoons are generally less crowded than weekends</span>
              </li>
              <li className="flex items-start group">
                <span className="flex-shrink-0 h-2 w-2 mt-2 rounded-full bg-[#4CAF50] group-hover:bg-[#2E7D32] transition-colors"></span>
                <span className="ml-3 text-gray-600 group-hover:text-gray-900 transition-colors">Avoid peak prayer times if visiting the temple</span>
              </li>
              <li className="flex items-start group">
                <span className="flex-shrink-0 h-2 w-2 mt-2 rounded-full bg-[#4CAF50] group-hover:bg-[#2E7D32] transition-colors"></span>
                <span className="ml-3 text-gray-600 group-hover:text-gray-900 transition-colors">Market days (Saturdays) have higher traffic in the central area</span>
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 transform transition-all hover:shadow-xl">
            <div className="flex items-center space-x-3 mb-6">
              <span className="p-2 bg-[#E8F5E9] rounded-lg">
                <svg className="w-6 h-6 text-[#2E7D32]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </span>
              <h3 className="text-xl font-semibold text-gray-900">Parking Information</h3>
            </div>
            <ul className="space-y-4">
              <li className="flex items-start group">
                <span className="flex-shrink-0 h-2 w-2 mt-2 rounded-full bg-[#4CAF50] group-hover:bg-[#2E7D32] transition-colors"></span>
                <span className="ml-3 text-gray-600 group-hover:text-gray-900 transition-colors">North Gate parking area: 120 spaces (currently 80% full)</span>
              </li>
              <li className="flex items-start group">
                <span className="flex-shrink-0 h-2 w-2 mt-2 rounded-full bg-[#4CAF50] group-hover:bg-[#2E7D32] transition-colors"></span>
                <span className="ml-3 text-gray-600 group-hover:text-gray-900 transition-colors">East Gate parking area: 75 spaces (currently 50% full)</span>
              </li>
              <li className="flex items-start group">
                <span className="flex-shrink-0 h-2 w-2 mt-2 rounded-full bg-[#4CAF50] group-hover:bg-[#2E7D32] transition-colors"></span>
                <span className="ml-3 text-gray-600 group-hover:text-gray-900 transition-colors">West Gate parking area: 45 spaces (currently 30% full)</span>
              </li>
              <li className="flex items-start group">
                <span className="flex-shrink-0 h-2 w-2 mt-2 rounded-full bg-[#4CAF50] group-hover:bg-[#2E7D32] transition-colors"></span>
                <span className="ml-3 text-gray-600 group-hover:text-gray-900 transition-colors">Consider using shuttle services from outer parking areas</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Upcoming Events Section */}
        <div className="bg-gradient-to-r from-[#E8F5E9] to-[#C8E6C9] rounded-xl shadow-lg border border-[#A5D6A7] p-6 transform transition-all hover:shadow-xl">
          <div className="flex items-center space-x-3 mb-6">
            <span className="p-2 bg-[#A5D6A7] rounded-lg">
              <svg className="w-6 h-6 text-[#2E7D32]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </span>
            <h3 className="text-xl font-semibold text-gray-900">Upcoming Events Affecting Traffic</h3>
          </div>
          <div className="space-y-6">
            <div className="bg-white bg-opacity-60 rounded-lg p-4 transform transition-all hover:bg-opacity-80">
              <h4 className="font-semibold text-gray-900">Festival Celebration</h4>
              <p className="text-sm text-gray-600 mt-1">Tomorrow, 6:00 PM - 10:00 PM</p>
              <p className="text-sm text-gray-700 mt-2">
                Expected to increase congestion by 60%. Consider visiting before 3:00 PM.
              </p>
            </div>
            <div className="bg-white bg-opacity-60 rounded-lg p-4 transform transition-all hover:bg-opacity-80">
              <h4 className="font-semibold text-gray-900">Weekly Market Day</h4>
              <p className="text-sm text-gray-600 mt-1">Saturday, 8:00 AM - 2:00 PM</p>
              <p className="text-sm text-gray-700 mt-2">
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
