import React, { useState, useEffect } from "react";

import { eventsApi, trafficApi, routeApi } from "../utils/api";

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

// New interface for vehicle statistics
interface VehicleStats {
  totalEstimatedVehicles: number;
  totalVehicleCapacity: number;
  capacityUsagePercentage: number;
  upcomingEvents: number;
  ongoingEvents: number;
}

// New interfaces for route management
interface TimeSlot {
  id: number;
  startTime: string;
  endTime: string;
  maxVehicles: number;
  currentAllocation: number;
  status: "OPEN" | "FILLING" | "FULL" | "CLOSED";
  entryPoint: string;
  createdAt: string;
  updatedAt: string;
}

interface RouteRecommendation {
  id: number;
  entryPoint: string;
  exitPoint: string;
  route: string[];
  expectedDuration: number;
  congestionLevel: "LOW" | "MEDIUM" | "HIGH";
  vehicleTypes: string[];
  timeSlotIds: number[];
  timeSlots: TimeSlot[];
  createdAt: string;
  updatedAt: string;
}

interface TrafficDiversion {
  entryPoint: string;
  exitPoint: string;
  route: string[];
  alternativeRoutes: { route: string[], reason: string }[];
  congestionStatus: "LOW" | "MEDIUM" | "HIGH";
  diversionReason: string;
  affectedEvents: Event[];
  suggestedAction: string;
  vehiclesAffected: number;
  timeSlots: TimeSlot[];
  isActive: boolean;
}

const EventManagementPage: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  const [isEditEventModalOpen, setIsEditEventModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
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
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("date");
  const [searchQuery, setSearchQuery] = useState<string>("");
  // New state for vehicle statistics
  const [vehicleStats, setVehicleStats] = useState<VehicleStats>({
    totalEstimatedVehicles: 0,
    totalVehicleCapacity: 10000, // Default total capacity, can be adjusted
    capacityUsagePercentage: 0,
    upcomingEvents: 0,
    ongoingEvents: 0
  });
  
  // New states for route management
  const [routes, setRoutes] = useState<RouteRecommendation[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [trafficDiversions, setTrafficDiversions] = useState<TrafficDiversion[]>([]);
  const [isRouteDiversionModalOpen, setIsRouteDiversionModalOpen] = useState(false);
  const [selectedDiversion, setSelectedDiversion] = useState<TrafficDiversion | null>(null);
  const [trafficStats, setTrafficStats] = useState<any>(null);
  const [trafficSnapshots, setTrafficSnapshots] = useState<any[]>([]);
  const [isCreatingTimeSlot, setIsCreatingTimeSlot] = useState(false);
  const [newTimeSlot, setNewTimeSlot] = useState({
    startTime: new Date().toISOString().slice(0, 16),
    endTime: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
    maxVehicles: 500,
    entryPoint: "North Gate"
  });

  useEffect(() => {
    fetchEvents();
    fetchRoutes();
    fetchTimeSlots();
    fetchTrafficStats();
    fetchTrafficSnapshots();
  }, []);

  // Calculate vehicle statistics whenever events change
  useEffect(() => {
    calculateVehicleStats();
  }, [events]);

  // Generate traffic diversions whenever routes, events, or traffic stats change
  useEffect(() => {
    generateTrafficDiversions();
  }, [routes, events, trafficStats, timeSlots]);

  // Fetch events from API
  const fetchEvents = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await eventsApi.getEvents();
      if (response.error) {
        setError(response.error);
      } else if (response.data) {
        setEvents(response.data);
      }
    } catch (err) {
      setError("Failed to load events. Please try again.");
      console.error("Error fetching events:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch routes from API
  const fetchRoutes = async () => {
    try {
      const response = await routeApi.getRoutes();
      if (response.error) {
        console.error("Error fetching routes:", response.error);
      } else if (response.data) {
        setRoutes(response.data);
      }
    } catch (err) {
      console.error("Error fetching routes:", err);
    }
  };

  // Fetch time slots from API
  const fetchTimeSlots = async () => {
    try {
      const response = await routeApi.getTimeSlots();
      if (response.error) {
        console.error("Error fetching time slots:", response.error);
      } else if (response.data) {
        setTimeSlots(response.data);
      }
    } catch (err) {
      console.error("Error fetching time slots:", err);
    }
  };

  // Fetch traffic stats from API
  const fetchTrafficStats = async () => {
    try {
      const response = await trafficApi.getTrafficStats();
      if (response.error) {
        console.error("Error fetching traffic stats:", response.error);
      } else if (response.data) {
        setTrafficStats(response.data);
      }
    } catch (err) {
      console.error("Error fetching traffic stats:", err);
    }
  };

  // Fetch traffic snapshots from API
  const fetchTrafficSnapshots = async () => {
    try {
      const response = await trafficApi.getTrafficSnapshots();
      if (response.error) {
        console.error("Error fetching traffic snapshots:", response.error);
      } else if (response.data) {
        setTrafficSnapshots(response.data);
      }
    } catch (err) {
      console.error("Error fetching traffic snapshots:", err);
    }
  };

  // Generate traffic diversions based on events, routes, and traffic stats
  const generateTrafficDiversions = () => {
    if (!events.length || !trafficStats) return;

    // Get active events (upcoming or ongoing)
    const activeEvents = events.filter(event => 
      event.status === "UPCOMING" || event.status === "ONGOING"
    );

    if (!activeEvents.length) return;

    // Generate diversions for each entry point based on congestion level
    const entryPoints = ["North Gate", "East Gate", "South Gate", "West Gate"];
    const exitPoints = ["Kachi Dham Main Area", "Exhibition Center", "Parking Area", "Food Court"];
    
    // Create a mapping of active events by location
    const eventsByLocation = activeEvents.reduce((acc, event) => {
      if (!acc[event.location]) {
        acc[event.location] = [];
      }
      acc[event.location].push(event);
      return acc;
    }, {} as Record<string, Event[]>);

    // Calculate visitors by entry point
    const visitorsByEntryPoint: Record<string, number> = {};
    
    // Assume even distribution across entry points initially
    const totalVisitors = activeEvents.reduce((sum, event) => sum + event.expectedVisitors, 0);
    entryPoints.forEach(entryPoint => {
      visitorsByEntryPoint[entryPoint] = Math.ceil(totalVisitors / entryPoints.length);
    });

    // Create diversions for each entry point
    const newDiversions: TrafficDiversion[] = [];
    
    entryPoints.forEach(entryPoint => {
      exitPoints.forEach(exitPoint => {
        // Only create diversions for locations with active events
        if (eventsByLocation[exitPoint]) {
          // Check if we already have routes for this pair
          const existingRoutes = routes.filter(r => 
            r.entryPoint === entryPoint && r.exitPoint === exitPoint
          );

          // Calculate congestion status based on visitors and capacity
          const vehiclesAffected = Math.ceil(visitorsByEntryPoint[entryPoint] / 4); // Assume 4 people per vehicle on average
          let congestionStatus: "LOW" | "MEDIUM" | "HIGH" = "LOW";
          
          if (vehiclesAffected > 5000) {
            congestionStatus = "HIGH";
          } else if (vehiclesAffected > 2000) {
            congestionStatus = "MEDIUM";
          }

          // Get relevant time slots for this entry point
          const relevantTimeSlots = timeSlots.filter(ts => ts.entryPoint === entryPoint);

          // Create main route and alternatives
          const mainRoute = [`From ${entryPoint}`, `Via Main Road`, `To ${exitPoint}`];
          const alternativeRoutes = [
            { 
              route: [`From ${entryPoint}`, `Via Secondary Road`, `To ${exitPoint}`], 
              reason: "Less congested"
            },
            { 
              route: [`From ${entryPoint}`, `Via Bypass Road`, `To ${exitPoint}`], 
              reason: "Longer but faster during peak hours"
            }
          ];

          // Generate a diversion only if congestion is medium or high
          if (congestionStatus !== "LOW") {
            newDiversions.push({
              entryPoint,
              exitPoint,
              route: mainRoute,
              alternativeRoutes,
              congestionStatus,
              diversionReason: `High traffic volume due to ${eventsByLocation[exitPoint].map(e => e.name).join(", ")}`,
              affectedEvents: eventsByLocation[exitPoint],
              suggestedAction: congestionStatus === "HIGH" 
                ? "Divert traffic to alternative routes immediately" 
                : "Monitor traffic and prepare for diversion if needed",
              vehiclesAffected,
              timeSlots: relevantTimeSlots,
              isActive: congestionStatus === "HIGH"
            });
          }
        }
      });
    });

    setTrafficDiversions(newDiversions);
  };

  // Create a new time slot
  const handleCreateTimeSlot = async () => {
    try {
      const response = await routeApi.createTimeSlot({
        startTime: newTimeSlot.startTime,
        endTime: newTimeSlot.endTime,
        maxVehicles: newTimeSlot.maxVehicles,
        entryPoint: newTimeSlot.entryPoint
      });

      if (response.error) {
        setError(response.error);
      } else {
        fetchTimeSlots();
        setIsCreatingTimeSlot(false);
        setNewTimeSlot({
          startTime: new Date().toISOString().slice(0, 16),
          endTime: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
          maxVehicles: 500,
          entryPoint: "North Gate"
        });
      }
    } catch (err) {
      console.error("Error creating time slot:", err);
      setError("Failed to create time slot");
    }
  };

  // Activate or deactivate a traffic diversion
  const toggleDiversionStatus = async (diversion: TrafficDiversion) => {
    // First, update local state
    const updatedDiversions = trafficDiversions.map(d => {
      if (d.entryPoint === diversion.entryPoint && d.exitPoint === diversion.exitPoint) {
        return { ...d, isActive: !d.isActive };
      }
      return d;
    });
    setTrafficDiversions(updatedDiversions);

    try {
      // If activating a diversion, create or update route recommendations
      if (!diversion.isActive) {
        // Check if we have time slots for this entry point
        if (diversion.timeSlots.length === 0) {
          // Create a default time slot if none exists
          const now = new Date();
          const endTime = new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 hours later
          
          const timeSlotResponse = await routeApi.createTimeSlot({
            startTime: now.toISOString(),
            endTime: endTime.toISOString(),
            maxVehicles: Math.ceil(diversion.vehiclesAffected * 1.2), // 20% buffer
            entryPoint: diversion.entryPoint
          });
          
          if (timeSlotResponse.error) {
            console.error("Error creating time slot:", timeSlotResponse.error);
            return;
          }
          
          // Add this time slot to the diversion
          if (timeSlotResponse.data) {
            diversion.timeSlots = [timeSlotResponse.data];
          }
        }
        
        // Get time slot IDs
        const timeSlotIds = diversion.timeSlots.map(ts => ts.id);
        
        // For each alternative route, create a route recommendation
        for (const [index, alternativeRoute] of diversion.alternativeRoutes.entries()) {
          // Estimate duration based on route complexity
          const expectedDuration = 10 + alternativeRoute.route.length * 5; // Simple estimation
          
          // Create a route recommendation
          const routeResponse = await routeApi.createRoute({
            entryPoint: diversion.entryPoint,
            exitPoint: diversion.exitPoint,
            route: alternativeRoute.route,
            expectedDuration,
            congestionLevel: diversion.congestionStatus,
            vehicleTypes: ["CAR", "BUS", "TRUCK"], // Default to all vehicle types
            timeSlotIds
          });
          
          if (routeResponse.error) {
            console.error(`Error creating route recommendation ${index + 1}:`, routeResponse.error);
          }
        }
        
        // Display success message
        setError("Route diversions activated successfully. Alternative routes have been created.");
      } else {
        // No need to do anything special when deactivating a diversion
        // The existing route recommendations will remain but won't be actively used
        setError("Route diversion deactivated. Primary route restored.");
      }

      // Refresh the time slots and routes
      setTimeout(async () => {
        await fetchTimeSlots();
        await fetchRoutes();
      }, 1000);
    } catch (err) {
      console.error("Error managing route diversion:", err);
      setError("Failed to manage route diversion. Please try again.");
    }
  };

  // New function to calculate vehicle statistics
  const calculateVehicleStats = () => {
    // Count upcoming and ongoing events
    const upcomingEvents = events.filter(event => event.status === "UPCOMING").length;
    const ongoingEvents = events.filter(event => event.status === "ONGOING").length;
    
    // Only count upcoming and ongoing events for vehicle estimates
    const relevantEvents = events.filter(
      event => event.status === "UPCOMING" || event.status === "ONGOING"
    );
    
    // Calculate total estimated vehicles using the helper function
    const totalEstimatedVehicles = relevantEvents.reduce((sum, event) => {
      return sum + calculateEstimatedVehicles(event.expectedVisitors);
    }, 0);
    
    // Assume a fixed total capacity for all vehicles (can be adjusted)
    const totalVehicleCapacity = 10000;
    
    // Calculate percentage of capacity being used
    const capacityUsagePercentage = (totalEstimatedVehicles / totalVehicleCapacity) * 100;
    
    setVehicleStats({
      totalEstimatedVehicles,
      totalVehicleCapacity,
      capacityUsagePercentage: Math.min(100, capacityUsagePercentage), // Cap at 100%
      upcomingEvents,
      ongoingEvents
    });
  };

  // Add a new event
  const handleAddEvent = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await eventsApi.createEvent(newEvent);
      if (response.error) {
        setError(response.error);
      } else {
        setIsAddEventModalOpen(false);
        await fetchEvents(); // Refresh the list
        // Reset form
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
      }
    } catch (err) {
      setError("Failed to add event. Please try again.");
      console.error("Error adding event:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Update existing event
  const handleUpdateEvent = async () => {
    if (!currentEvent) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const response = await eventsApi.updateEvent(currentEvent.id, currentEvent);
      if (response.error) {
        setError(response.error);
      } else {
        setIsEditEventModalOpen(false);
        await fetchEvents(); // Refresh the list
      }
    } catch (err) {
      setError("Failed to update event. Please try again.");
      console.error("Error updating event:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete an event
  const handleDeleteEvent = async () => {
    if (!currentEvent) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const response = await eventsApi.deleteEvent(currentEvent.id);
      if (response.error) {
        setError(response.error);
      } else {
        setIsDeleteConfirmOpen(false);
        setCurrentEvent(null);
        await fetchEvents(); // Refresh the list
      }
    } catch (err) {
      setError("Failed to delete event. Please try again.");
      console.error("Error deleting event:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewEvent({
      ...newEvent,
      [name]: name === "expectedVisitors" ? parseInt(value) || 0 : value
    });
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (!currentEvent) return;
    
    const { name, value } = e.target;
    setCurrentEvent({
      ...currentEvent,
      [name]: name === "expectedVisitors" ? parseInt(value) || 0 : value
    });
  };

  const handleEditEvent = (event: Event) => {
    setCurrentEvent(event);
    setIsEditEventModalOpen(true);
  };

  const handleConfirmDelete = (event: Event) => {
    setCurrentEvent(event);
    setIsDeleteConfirmOpen(true);
  };

  // Filter and sort events
  const filteredAndSortedEvents = () => {
    // First filter by status
    let filtered = events.filter(event => {
      if (filterStatus === "ALL") return true;
      return event.status === filterStatus;
    });

    // Then filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        event => 
          event.name.toLowerCase().includes(query) || 
          event.description.toLowerCase().includes(query) ||
          event.location.toLowerCase().includes(query)
      );
    }
    
    // Then sort
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "date":
          return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        case "name":
          return a.name.localeCompare(b.name);
        case "impact":
          const impactOrder = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
          return impactOrder[a.impactLevel] - impactOrder[b.impactLevel];
        case "visitors":
          return a.expectedVisitors - b.expectedVisitors;
        case "vehicles":
          return calculateEstimatedVehicles(a.expectedVisitors) - calculateEstimatedVehicles(b.expectedVisitors);
        default:
          return 0;
      }
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

  // Helper function to calculate estimated vehicles from expected visitors
  const calculateEstimatedVehicles = (visitorCount: number): number => {
    // Assuming an average of 2 people per vehicle
    const averageOccupancyPerVehicle = 2;
    return Math.ceil(visitorCount / averageOccupancyPerVehicle);
  };

  return (
    <div className="bg-gray-100 min-h-screen pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Event Management</h1>
            <p className="text-gray-600 mt-1">Manage events that affect traffic patterns in Kachi Dham</p>
          </div>
          <button
            onClick={() => setIsAddEventModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add New Event
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded shadow-sm">
            <div className="flex items-center">
              <svg className="h-6 w-6 text-red-500 mr-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p>{error}</p>
            </div>
            <button 
              onClick={() => setError(null)} 
              className="text-red-500 font-medium hover:text-red-700 mt-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Vehicle Statistics Dashboard */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Vehicle Capacity Dashboard</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Estimated Vehicles Card */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">Estimated Vehicles</p>
                  <p className="text-2xl font-bold text-blue-800 mt-1">{vehicleStats.totalEstimatedVehicles.toLocaleString()}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h8a1 1 0 001-1z" />
                  </svg>
                </div>
              </div>
              <div className="mt-2 text-sm text-blue-600">
                Based on {vehicleStats.upcomingEvents + vehicleStats.ongoingEvents} upcoming/ongoing events
              </div>
            </div>

            {/* Total Capacity Card */}
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-medium">Total Vehicle Capacity</p>
                  <p className="text-2xl font-bold text-purple-800 mt-1">{vehicleStats.totalVehicleCapacity.toLocaleString()}</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>
              <div className="mt-2 text-sm text-purple-600">
                Maximum vehicle capacity for the area
              </div>
            </div>

            {/* Capacity Usage Card */}
            <div className="bg-green-50 rounded-lg p-4 border border-green-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">Capacity Usage</p>
                  <p className="text-2xl font-bold text-green-800 mt-1">{vehicleStats.capacityUsagePercentage.toFixed(1)}%</p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className={`h-2.5 rounded-full ${
                      vehicleStats.capacityUsagePercentage > 85 ? 'bg-red-600' : 
                      vehicleStats.capacityUsagePercentage > 70 ? 'bg-yellow-500' : 
                      'bg-green-600'
                    }`} 
                    style={{ width: `${vehicleStats.capacityUsagePercentage}%` }}
                  ></div>
                </div>
                <p className="text-sm mt-1 text-green-600">
                  {vehicleStats.capacityUsagePercentage > 85 ? 'Critical - Consider limiting new events' : 
                   vehicleStats.capacityUsagePercentage > 70 ? 'High - Monitor closely' : 
                   'Normal - Good capacity available'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Traffic Diversion Management */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Traffic Diversion Management</h2>
              <p className="text-gray-600 mt-1">Manage traffic flow and route recommendations based on event congestion</p>
            </div>
            <div className="mt-3 sm:mt-0 flex space-x-3">
              <button
                onClick={() => setIsCreatingTimeSlot(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center shadow-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Create Time Slot
              </button>
            </div>
          </div>

          {/* Active Diversions */}
          <div className="mb-6">
            <h3 className="text-md font-medium text-gray-800 mb-3">Active Diversions</h3>
            {trafficDiversions.filter(d => d.isActive).length === 0 ? (
              <div className="bg-gray-50 p-4 rounded-md text-center">
                <p className="text-gray-500">No active traffic diversions</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {trafficDiversions.filter(d => d.isActive).map((diversion, idx) => (
                  <div key={idx} className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-red-800">{diversion.entryPoint} → {diversion.exitPoint}</h4>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 mt-1">
                          High Congestion
                        </span>
                      </div>
                      <button 
                        onClick={() => toggleDiversionStatus(diversion)}
                        className="text-xs rounded-full px-3 py-1 bg-white text-red-600 border border-red-200 hover:bg-red-50"
                      >
                        Deactivate
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      <strong>Reason:</strong> {diversion.diversionReason}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      <strong>Vehicles affected:</strong> {diversion.vehiclesAffected.toLocaleString()}
                    </p>
                    <div className="mt-2">
                      <p className="text-sm font-medium text-gray-700">Recommended alternative routes:</p>
                      <ul className="mt-1 ml-4 text-sm text-gray-600 list-disc">
                        {diversion.alternativeRoutes.map((route, i) => (
                          <li key={i}>{route.route.join(" → ")} <span className="text-xs text-gray-500">({route.reason})</span></li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recommended Diversions */}
          <div className="mb-6">
            <h3 className="text-md font-medium text-gray-800 mb-3">Recommended Diversions</h3>
            {trafficDiversions.filter(d => !d.isActive && d.congestionStatus === "MEDIUM").length === 0 ? (
              <div className="bg-gray-50 p-4 rounded-md text-center">
                <p className="text-gray-500">No recommended diversions at this time</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {trafficDiversions.filter(d => !d.isActive && d.congestionStatus === "MEDIUM").map((diversion, idx) => (
                  <div key={idx} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-yellow-800">{diversion.entryPoint} → {diversion.exitPoint}</h4>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 mt-1">
                          Medium Congestion
                        </span>
                      </div>
                      <button 
                        onClick={() => toggleDiversionStatus(diversion)}
                        className="text-xs rounded-full px-3 py-1 bg-white text-yellow-600 border border-yellow-200 hover:bg-yellow-50"
                      >
                        Activate
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      <strong>Reason:</strong> {diversion.diversionReason}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      <strong>Vehicles affected:</strong> {diversion.vehiclesAffected.toLocaleString()}
                    </p>
                    <div className="mt-2">
                      <p className="text-sm font-medium text-gray-700">Recommended alternative routes:</p>
                      <ul className="mt-1 ml-4 text-sm text-gray-600 list-disc">
                        {diversion.alternativeRoutes.map((route, i) => (
                          <li key={i}>{route.route.join(" → ")} <span className="text-xs text-gray-500">({route.reason})</span></li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Time Slots */}
          <div>
            <h3 className="text-md font-medium text-gray-800 mb-3">Entry Time Slots</h3>
            {timeSlots.length === 0 ? (
              <div className="bg-gray-50 p-4 rounded-md text-center">
                <p className="text-gray-500">No time slots configured</p>
                <button
                  onClick={() => setIsCreatingTimeSlot(true)}
                  className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Create your first time slot
                </button>
              </div>
            ) : (
              <div className="bg-white overflow-x-auto border rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Entry Point
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Time Range
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Capacity
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {timeSlots.map((slot) => (
                      <tr key={slot.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{slot.entryPoint}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                            {new Date(slot.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(slot.startTime).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {slot.currentAllocation}/{slot.maxVehicles} vehicles
                          </div>
                          <div className="w-24 bg-gray-200 rounded-full h-1.5 mt-1">
                            <div 
                              className={`h-1.5 rounded-full ${
                                (slot.currentAllocation / slot.maxVehicles) > 0.9 ? 'bg-red-600' : 
                                (slot.currentAllocation / slot.maxVehicles) > 0.7 ? 'bg-yellow-500' : 
                                'bg-green-600'
                              }`} 
                              style={{ width: `${(slot.currentAllocation / slot.maxVehicles) * 100}%` }}
                            ></div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            slot.status === "OPEN" ? "bg-green-100 text-green-800" :
                            slot.status === "FILLING" ? "bg-blue-100 text-blue-800" :
                            slot.status === "FULL" ? "bg-yellow-100 text-yellow-800" :
                            "bg-red-100 text-red-800"
                          }`}>
                            {slot.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <button className="text-blue-600 hover:text-blue-900 mr-2">Edit</button>
                          <button className="text-red-600 hover:text-red-900">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Create Time Slot Modal */}
        {isCreatingTimeSlot && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Time Slot</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="entryPoint" className="block text-sm font-medium text-gray-700 mb-1">Entry Point</label>
                  <select
                    id="entryPoint"
                    value={newTimeSlot.entryPoint}
                    onChange={(e) => setNewTimeSlot({ ...newTimeSlot, entryPoint: e.target.value })}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="North Gate">North Gate</option>
                    <option value="East Gate">East Gate</option>
                    <option value="South Gate">South Gate</option>
                    <option value="West Gate">West Gate</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                    <input
                      type="datetime-local"
                      id="startTime"
                      value={newTimeSlot.startTime}
                      onChange={(e) => setNewTimeSlot({ ...newTimeSlot, startTime: e.target.value })}
                      className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                    <input
                      type="datetime-local"
                      id="endTime"
                      value={newTimeSlot.endTime}
                      onChange={(e) => setNewTimeSlot({ ...newTimeSlot, endTime: e.target.value })}
                      className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="maxVehicles" className="block text-sm font-medium text-gray-700 mb-1">Max Vehicles</label>
                  <input
                    type="number"
                    id="maxVehicles"
                    value={newTimeSlot.maxVehicles}
                    onChange={(e) => setNewTimeSlot({ ...newTimeSlot, maxVehicles: parseInt(e.target.value) })}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    min="1"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setIsCreatingTimeSlot(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTimeSlot}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0 md:space-x-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
              <div className="w-full sm:w-auto">
                <label htmlFor="filter-status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  id="filter-status"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm w-full"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="UPCOMING">Upcoming</option>
                  <option value="ONGOING">Ongoing</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
              
              <div className="w-full sm:w-auto">
                <label htmlFor="sort-by" className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                <select
                  id="sort-by"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm w-full"
                >
                  <option value="date">Date (Earliest First)</option>
                  <option value="name">Name (A-Z)</option>
                  <option value="impact">Impact Level</option>
                  <option value="visitors">Visitor Count</option>
                  <option value="vehicles">Estimated Vehicles</option>
                </select>
              </div>
            </div>
            
            <div className="w-full md:w-80">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  type="text"
                  id="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                  placeholder="Search events..."
                />
              </div>
            </div>
          </div>
          
          {(filterStatus !== "ALL" || searchQuery) && (
            <div className="flex items-center mt-4 bg-blue-50 p-2 rounded">
              <span className="text-sm text-blue-700 mr-2">Filters active:</span>
              {filterStatus !== "ALL" && (
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mr-2">
                  Status: {filterStatus}
                </span>
              )}
              {searchQuery && (
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mr-2">
                  Search: "{searchQuery}"
                </span>
              )}
              <button
                onClick={() => {
                  setSearchQuery("");
                  setFilterStatus("ALL");
                }}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center ml-auto"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Clear All Filters
              </button>
            </div>
          )}
        </div>

        {/* Events Table */}
        {isLoading ? (
          <div className="bg-white rounded-lg shadow-md p-8 flex justify-center">
            <div className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-gray-600 text-lg">Loading events...</p>
            </div>
          </div>
        ) : filteredAndSortedEvents().length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <svg className="h-12 w-12 text-gray-400 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No events found</h3>
            <p className="text-gray-500 mb-4">{searchQuery ? "Try adjusting your search or filters" : "Add your first event to get started"}</p>
            <div className="flex justify-center space-x-3">
              <button
                onClick={() => {
                  setSearchQuery("");
                  setFilterStatus("ALL");
                }}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Reset Filters
              </button>
              <button
                onClick={() => setIsAddEventModalOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Event
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Events ({filteredAndSortedEvents().length})</h2>
                <p className="text-sm text-gray-600">
                  {filterStatus !== "ALL" 
                    ? `Showing ${filterStatus.toLowerCase()} events` 
                    : "Showing all events"}
                  {searchQuery ? ` matching "${searchQuery}"` : ""}
                </p>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Event
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Traffic Impact
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estimated Vehicles
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAndSortedEvents().map((event) => (
                    <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <div className="text-sm font-medium text-gray-900">{event.name}</div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">{event.description}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col space-y-1">
                          <div className="flex items-center text-sm text-gray-900">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {formatDate(event.startDate)}
                          </div>
                          <div className="flex items-center text-sm text-gray-500">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {formatDate(event.endDate)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{event.location}</div>
                        <div className="text-sm text-gray-500">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          {event.expectedVisitors.toLocaleString()} visitors
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${getImpactBadgeColor(event.impactLevel)}`}>
                          {event.impactLevel}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <div className="text-sm font-medium text-gray-900">
                            {calculateEstimatedVehicles(event.expectedVisitors).toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            Based on {event.expectedVisitors.toLocaleString()} visitors
                          </div>
                          {event.status === "UPCOMING" || event.status === "ONGOING" ? (
                            <div className="mt-1">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                <svg className="mr-1 h-2 w-2 text-blue-400" fill="currentColor" viewBox="0 0 8 8">
                                  <circle cx="4" cy="4" r="3" />
                                </svg>
                                Active
                              </span>
                            </div>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeColor(event.status)}`}>
                          {event.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button 
                          onClick={() => handleEditEvent(event)}
                          className="text-blue-600 hover:text-blue-900 mr-4 inline-flex items-center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>
                        <button 
                          onClick={() => handleConfirmDelete(event)}
                          className="text-red-600 hover:text-red-900 inline-flex items-center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add Event Modal */}
        {isAddEventModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Add New Event</h2>
                <button 
                  onClick={() => setIsAddEventModalOpen(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="name">
                    Event Name*
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={newEvent.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="location">
                    Location*
                  </label>
                  <input
                    id="location"
                    name="location"
                    type="text"
                    value={newEvent.location}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="startDate">
                    Start Date & Time*
                  </label>
                  <input
                    id="startDate"
                    name="startDate"
                    type="datetime-local"
                    value={newEvent.startDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="endDate">
                    End Date & Time*
                  </label>
                  <input
                    id="endDate"
                    name="endDate"
                    type="datetime-local"
                    value={newEvent.endDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="impactLevel">
                    Traffic Impact Level*
                  </label>
                  <select
                    id="impactLevel"
                    name="impactLevel"
                    value={newEvent.impactLevel}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="expectedVisitors">
                    Expected Visitors*
                  </label>
                  <input
                    id="expectedVisitors"
                    name="expectedVisitors"
                    type="number"
                    min="0"
                    value={newEvent.expectedVisitors}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="description">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={newEvent.description}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-4 mt-6">
                <button
                  onClick={() => setIsAddEventModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddEvent}
                  disabled={isLoading}
                  className={`px-4 py-2 rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 flex items-center ${
                    isLoading ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Adding...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add Event
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Event Modal */}
        {isEditEventModalOpen && currentEvent && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Edit Event</h2>
                <button 
                  onClick={() => setIsEditEventModalOpen(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="edit-name">
                    Event Name*
                  </label>
                  <input
                    id="edit-name"
                    name="name"
                    type="text"
                    value={currentEvent.name}
                    onChange={handleEditInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="edit-location">
                    Location*
                  </label>
                  <input
                    id="edit-location"
                    name="location"
                    type="text"
                    value={currentEvent.location}
                    onChange={handleEditInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="edit-startDate">
                    Start Date & Time*
                  </label>
                  <input
                    id="edit-startDate"
                    name="startDate"
                    type="datetime-local"
                    value={currentEvent.startDate ? new Date(currentEvent.startDate).toISOString().slice(0, 16) : ""}
                    onChange={handleEditInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="edit-endDate">
                    End Date & Time*
                  </label>
                  <input
                    id="edit-endDate"
                    name="endDate"
                    type="datetime-local"
                    value={currentEvent.endDate ? new Date(currentEvent.endDate).toISOString().slice(0, 16) : ""}
                    onChange={handleEditInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="edit-impactLevel">
                    Traffic Impact Level*
                  </label>
                  <select
                    id="edit-impactLevel"
                    name="impactLevel"
                    value={currentEvent.impactLevel}
                    onChange={handleEditInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="edit-expectedVisitors">
                    Expected Visitors*
                  </label>
                  <input
                    id="edit-expectedVisitors"
                    name="expectedVisitors"
                    type="number"
                    min="0"
                    value={currentEvent.expectedVisitors}
                    onChange={handleEditInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="edit-status">
                    Status*
                  </label>
                  <select
                    id="edit-status"
                    name="status"
                    value={currentEvent.status}
                    onChange={handleEditInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="UPCOMING">Upcoming</option>
                    <option value="ONGOING">Ongoing</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="edit-description">
                    Description
                  </label>
                  <textarea
                    id="edit-description"
                    name="description"
                    value={currentEvent.description}
                    onChange={handleEditInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-4 mt-6">
                <button
                  onClick={() => setIsEditEventModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateEvent}
                  disabled={isLoading}
                  className={`px-4 py-2 rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                    isLoading ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Updating...
                    </span>
                  ) : (
                    "Update Event"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {isDeleteConfirmOpen && currentEvent && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Confirm Delete</h2>
                <button 
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="bg-red-50 p-4 rounded-md mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Are you sure you want to delete this event?
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>This action cannot be undone. This will permanently delete the event:</p>
                      <p className="font-semibold mt-1">{currentEvent.name}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteEvent}
                  disabled={isLoading}
                  className={`px-4 py-2 rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${
                    isLoading ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Deleting...
                    </span>
                  ) : (
                    "Delete Event"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventManagementPage; 