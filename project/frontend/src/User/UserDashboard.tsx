import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { eventsApi, trafficApi, routeApi } from "../utils/api";

interface TrafficInfo {
  location: string;
  congestionLevel: "LOW" | "MEDIUM" | "HIGH" | "SEVERE";
  waitTime: number;
  entryPoint: string;
  bestTravelTime: string;
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
  timeSlots: TimeSlot[];
}

const UserDashboard: React.FC = () => {
  const [trafficInfo, setTrafficInfo] = useState<TrafficInfo[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [routeRecommendations, setRouteRecommendations] = useState<RouteRecommendation[]>([]);
  const [totalVisitors, setTotalVisitors] = useState<number>(0);
  const [congestionLevel, setCongestionLevel] = useState<string>("MEDIUM");
  const [isLoading, setIsLoading] = useState(true);
  const [trafficStats, setTrafficStats] = useState<any>(null);

  useEffect(() => {
    // Fetch real data from API
    fetchEvents();
    fetchTimeSlots();
    fetchRoutes();
    fetchTrafficStats();
  }, []);

  // Generate traffic information whenever data changes
  useEffect(() => {
    if (events.length > 0 && timeSlots.length > 0 && routeRecommendations.length > 0) {
      generateTrafficInfo();
    }
  }, [events, timeSlots, routeRecommendations, trafficStats]);

  const fetchEvents = async () => {
    try {
      const response = await eventsApi.getEvents();
      if (response.data) {
        setEvents(response.data);
        
        // Calculate total estimated visitors from active events
        const activeEvents = response.data.filter((event: Event) => 
          event.status === "UPCOMING" || event.status === "ONGOING"
        );
        const totalVisitors = activeEvents.reduce((sum: number, event: Event) => 
          sum + event.expectedVisitors, 0
        );
        setTotalVisitors(totalVisitors);
      }
    } catch (err) {
      console.error("Error fetching events:", err);
    }
  };

  const fetchTimeSlots = async () => {
    try {
      const response = await routeApi.getTimeSlots();
      if (response.data) {
        setTimeSlots(response.data);
      }
    } catch (err) {
      console.error("Error fetching time slots:", err);
    }
  };

  const fetchRoutes = async () => {
    try {
      const response = await routeApi.getRoutes();
      if (response.data) {
        setRouteRecommendations(response.data);
      }
    } catch (err) {
      console.error("Error fetching routes:", err);
    }
  };

  const fetchTrafficStats = async () => {
    try {
      const response = await trafficApi.getTrafficStats();
      if (response.data) {
        setTrafficStats(response.data);
        setCongestionLevel(response.data.congestionLevel || "MEDIUM");
      }
    } catch (err) {
      console.error("Error fetching traffic stats:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const generateTrafficInfo = () => {
    // Get active events
    const activeEvents = events.filter(event => 
      event.status === "UPCOMING" || event.status === "ONGOING"
    );

    if (!activeEvents.length) {
      setTrafficInfo([
        {
          location: "Kachi Dham Temple",
          congestionLevel: "LOW",
          waitTime: 5,
          entryPoint: "Any Gate",
          bestTravelTime: "Any time (No events active)"
        }
      ]);
      return;
    }

    // Create mapping of events by location
    const eventsByLocation = activeEvents.reduce((acc: Record<string, Event[]>, event) => {
      if (!acc[event.location]) {
        acc[event.location] = [];
      }
      acc[event.location].push(event);
      return acc;
    }, {});

    // Generate traffic info for each location with active events
    const newTrafficInfo: TrafficInfo[] = [];
    
    Object.entries(eventsByLocation).forEach(([location, events]) => {
      // Calculate congestion based on expected visitors and impact level
      const totalVisitors = events.reduce((sum, event) => sum + event.expectedVisitors, 0);
      const highestImpactEvent = events.reduce((highest, event) => {
        const impactOrder = { 
          LOW: 1, 
          MEDIUM: 2, 
          HIGH: 3, 
          CRITICAL: 4 
        };
        return impactOrder[event.impactLevel] > impactOrder[highest.impactLevel] ? event : highest;
      }, events[0]);
      
      // Determine congestion level
      let congestionLevel: "LOW" | "MEDIUM" | "HIGH" | "SEVERE" = "LOW";
      if (totalVisitors > 10000 || highestImpactEvent.impactLevel === "CRITICAL") {
        congestionLevel = "SEVERE";
      } else if (totalVisitors > 5000 || highestImpactEvent.impactLevel === "HIGH") {
        congestionLevel = "HIGH";
      } else if (totalVisitors > 1000 || highestImpactEvent.impactLevel === "MEDIUM") {
        congestionLevel = "MEDIUM";
      }
      
      // Calculate estimated wait time based on congestion
      let waitTime = 5;
      if (congestionLevel === "SEVERE") waitTime = 45;
      else if (congestionLevel === "HIGH") waitTime = 30;
      else if (congestionLevel === "MEDIUM") waitTime = 15;
      
      // Find best entry point based on routes and time slots
      const availableEntryPoints = ["North Gate", "East Gate", "South Gate", "West Gate"];
      let bestEntryPoint = "Any Gate";
      let lowestCongestion = Infinity;
      
      availableEntryPoints.forEach(entryPoint => {
        // Look for time slots with capacity
        const entryTimeSlots = timeSlots.filter(slot => 
          slot.entryPoint === entryPoint && 
          slot.status !== "FULL" && 
          slot.status !== "CLOSED"
        );
        
        if (entryTimeSlots.length > 0) {
          // Calculate current congestion at this entry point
          const totalCapacity = entryTimeSlots.reduce((sum, slot) => sum + slot.maxVehicles, 0);
          const currentUtilization = entryTimeSlots.reduce((sum, slot) => sum + slot.currentAllocation, 0);
          const congestionPercentage = (currentUtilization / totalCapacity) * 100;
          
          if (congestionPercentage < lowestCongestion) {
            lowestCongestion = congestionPercentage;
            bestEntryPoint = entryPoint;
          }
        }
      });
      
      // Find best travel time based on events schedule
      const eventStartTimes = events.map(event => new Date(event.startDate));
     
      
      // Determine best time to visit
      let bestTravelTime = "Before 9:00 AM or after 7:00 PM";
      
      // For ongoing events, recommend off-peak hours
      if (events.some(event => event.status === "ONGOING")) {
        if (congestionLevel === "SEVERE" || congestionLevel === "HIGH") {
          bestTravelTime = "Before 8:00 AM or after 8:00 PM";
        } else if (congestionLevel === "MEDIUM") {
          bestTravelTime = "Avoid 10:00 AM - 2:00 PM";
        } else {
          bestTravelTime = "Any time (Light traffic)";
        }
      } 
      // For upcoming events, recommend before they start
      else if (events.every(event => event.status === "UPCOMING")) {
        const earliestEvent = new Date(Math.min(...eventStartTimes.map(date => date.getTime())));
        const formattedDate = earliestEvent.toLocaleDateString();
        const formattedTime = earliestEvent.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        bestTravelTime = `Before ${formattedTime} on ${formattedDate}`;
      }
      
      newTrafficInfo.push({
        location,
        congestionLevel,
        waitTime,
        entryPoint: bestEntryPoint,
        bestTravelTime
      });
    });
    
    setTrafficInfo(newTrafficInfo);
  };

  const getCongestionColor = (level: string) => {
    switch (level) {
      case "LOW": return "bg-green-100 text-green-800";
      case "MEDIUM": return "bg-yellow-100 text-yellow-800";
      case "HIGH": return "bg-orange-100 text-orange-800";
      case "SEVERE": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getCongestionPercentage = (level: string) => {
    switch (level) {
      case "LOW": return "25%";
      case "MEDIUM": return "50%";
      case "HIGH": return "75%";
      case "SEVERE": return "95%";
      default: return "50%";
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
            <p className="text-blue-600 text-2xl font-bold">
              {isLoading ? "Loading..." : totalVisitors > 0 ? totalVisitors.toLocaleString() : "No data"}
            </p>
            <p className="text-blue-500 text-sm">Across all Kachi Dham areas</p>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg shadow-sm">
            <h3 className="font-medium text-purple-800 mb-2">Today's Events</h3>
            <p className="text-purple-600 text-2xl font-bold">
              {isLoading ? "Loading..." : events.filter(e => 
                e.status === "UPCOMING" || e.status === "ONGOING"
              ).length}
            </p>
            <p className="text-purple-500 text-sm">
              {isLoading ? "Loading event data..." : events.filter(e => 
                e.status === "UPCOMING" || e.status === "ONGOING"
              ).length > 0 
                ? events.filter(e => e.status === "UPCOMING" || e.status === "ONGOING").map(e => e.name).join(", ")
                : "No events today"
              }
            </p>
          </div>

          <div className="bg-orange-50 p-4 rounded-lg shadow-sm">
            <h3 className="font-medium text-orange-800 mb-2">Overall Congestion</h3>
            <p className="text-orange-600 text-2xl font-bold">{congestionLevel}</p>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
              <div 
                className={`${
                  congestionLevel === "CRITICAL" ? "bg-red-600" :
                  congestionLevel === "HIGH" ? "bg-orange-500" :
                  congestionLevel === "MEDIUM" ? "bg-yellow-500" :
                  "bg-green-500"
                } h-2.5 rounded-full`} 
                style={{ width: getCongestionPercentage(congestionLevel) }}
              ></div>
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
      
      {/* Events Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Events Schedule</h2>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <p className="text-gray-500">Loading events information...</p>
          </div>
        ) : events.filter(e => e.status === "UPCOMING" || e.status === "ONGOING").length === 0 ? (
          <div className="p-4 text-center bg-gray-50 rounded-lg">
            <p className="text-gray-600">No upcoming or ongoing events.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {events
              .filter(e => e.status === "UPCOMING" || e.status === "ONGOING")
              .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
              .map(event => (
                <div key={event.id} className="border rounded-lg overflow-hidden">
                  <div className={`${
                    event.impactLevel === "CRITICAL" ? "bg-red-50 border-red-200" :
                    event.impactLevel === "HIGH" ? "bg-orange-50 border-orange-200" :
                    event.impactLevel === "MEDIUM" ? "bg-yellow-50 border-yellow-200" :
                    "bg-green-50 border-green-200"
                  } p-4 border-b`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-gray-900">{event.name}</h3>
                        <p className="text-sm text-gray-600">{event.description}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        event.status === "ONGOING" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
                      }`}>
                        {event.status}
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-white">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date & Time
                        </h4>
                        <p className="mt-1 text-sm text-gray-900">
                          From: {new Date(event.startDate).toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-900">
                          To: {new Date(event.endDate).toLocaleString()}
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Location
                        </h4>
                        <p className="mt-1 text-sm text-gray-900">{event.location}</p>
                      </div>
                      
                      <div>
                        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Traffic Impact
                        </h4>
                        <div className="mt-1 flex items-center">
                          <span className={`px-2 py-1 text-xs rounded-full ${getCongestionColor(event.impactLevel)}`}>
                            {event.impactLevel}
                          </span>
                          <span className="ml-2 text-sm text-gray-600">
                            {event.expectedVisitors.toLocaleString()} expected visitors
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="text-sm font-medium text-gray-900">
                        Travel Recommendations
                      </h4>
                      
                      <div className="mt-2 bg-blue-50 p-3 rounded-md">
                        <div className="flex items-start">
                          <svg className="h-5 w-5 text-blue-500 mt-0.5 mr-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          <div>
                            <p className="text-sm text-blue-800">
                              {event.impactLevel === "CRITICAL" ? 
                                `This event will cause severe traffic congestion. Consider using ${
                                  trafficInfo.find(t => t.location === event.location)?.entryPoint || "recommended entry points"
                                } and visit before ${new Date(event.startDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} or after the event ends.` :
                                event.impactLevel === "HIGH" ?
                                `This event will cause significant traffic congestion. We recommend using the ${
                                  trafficInfo.find(t => t.location === event.location)?.entryPoint || "less congested gates"
                                } to enter Kachi Dham.` :
                                `Moderate traffic expected for this event. Best time to visit: ${
                                  trafficInfo.find(t => t.location === event.location)?.bestTravelTime || "Early morning or evening"
                                }.`
                              }
                            </p>
                            {timeSlots.filter(slot => 
                              new Date(slot.startTime) > new Date() && 
                              slot.status !== "FULL" && 
                              slot.status !== "CLOSED"
                            ).length > 0 && (
                              <p className="text-sm text-blue-800 mt-2">
                                Available time slots: {timeSlots.filter(slot => 
                                  new Date(slot.startTime) > new Date() && 
                                  slot.status !== "FULL" && 
                                  slot.status !== "CLOSED"
                                ).slice(0, 2).map(slot => (
                                  `${slot.entryPoint} at ${new Date(slot.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`
                                )).join(", ")}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            }
          </div>
        )}
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
            <h3 className="font-medium text-gray-800 mb-2">Entry Points & Routes</h3>
            <ul className="list-disc pl-5 text-gray-700 space-y-1">
              {timeSlots.length > 0 ? (
                timeSlots
                  .filter(slot => slot.status !== "FULL" && slot.status !== "CLOSED")
                  .slice(0, 4)
                  .map((slot, idx) => (
                    <li key={idx}>
                      {slot.entryPoint}: {slot.currentAllocation}/{slot.maxVehicles} vehicles currently
                      {slot.status === "OPEN" ? " (Open)" : slot.status === "FILLING" ? " (Filling Up)" : ""}
                    </li>
                  ))
              ) : (
                <>
                  <li>North Gate: Recommended for temple access</li>
                  <li>East Gate: Best for market area</li>
                  <li>West Gate: Shortest wait times currently</li>
                  <li>South Gate: Access to parking and shuttle services</li>
                </>
              )}
            </ul>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <h3 className="font-medium text-yellow-800 mb-2">Traffic Alerts & Diversions</h3>
          {timeSlots.length > 0 && routeRecommendations.length > 0 ? (
            <div className="space-y-3">
              {routeRecommendations.slice(0, 2).map((route, idx) => (
                <div key={idx}>
                  <p className="font-medium">Route Recommendation: {route.entryPoint} to {route.exitPoint}</p>
                  <p className="text-sm text-gray-600">Duration: ~{route.expectedDuration} minutes</p>
                  <p className="text-sm text-gray-700 mt-1">
                    {route.congestionLevel === "HIGH" 
                      ? "Heavy congestion expected on this route. Consider alternative paths."
                      : route.congestionLevel === "MEDIUM"
                      ? "Moderate traffic expected. Allow extra travel time."
                      : "Light traffic expected on this route."
                    }
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    Suggested route: {route.route.join(" → ")}
                  </p>
                </div>
              ))}
              {routeRecommendations.length === 0 && (
                <p className="text-sm text-gray-700">No traffic diversions currently active.</p>
              )}
            </div>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
