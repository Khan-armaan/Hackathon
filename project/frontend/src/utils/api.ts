// Base URL for API calls
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

// Generic function to handle API calls
export async function apiCall<T>(
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  body?: any,
  requiresAuth: boolean = false
): Promise<ApiResponse<T>> {
  try {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    // Add authorization token if required
    if (requiresAuth) {
      const token = localStorage.getItem("admin_token");
      if (!token) {
        return { error: "Authentication required" };
      }
      headers["Authorization"] = `Bearer ${token}`;
    }

    const options: RequestInit = {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    };

    const response = await fetch(`${API_URL}${endpoint}`, options);
    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || "Something went wrong" };
    }

    return { data };
  } catch (error) {
    console.error("API call failed:", error);
    return { error: "Network error. Please try again." };
  }
}

// Admin authentication functions
export const adminApi = {
  login: async (email: string, password: string) => {
    return apiCall<{
      message: string;
      user: { id: number; name: string; email: string };
      token: string;
    }>("/api/admin/login", "POST", { email, password });
  },

  signup: async (name: string, email: string, password: string) => {
    return apiCall<{
      message: string;
      user: { id: number; name: string; email: string };
    }>("/api/admin/signup", "POST", { name, email, password });
  },

  // Helper function to check if user is logged in
  isLoggedIn: () => {
    return !!localStorage.getItem("admin_token");
  },

  // Helper function to log out user
  logout: () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
  },
};

// Events API
export const eventsApi = {
  // Get all events
  getEvents: async () => {
    return apiCall<any[]>("/api/events", "GET");
  },

  // Get a specific event
  getEvent: async (id: number) => {
    return apiCall<any>(`/api/events/${id}`, "GET");
  },

  // Create a new event
  createEvent: async (eventData: any) => {
    return apiCall<any>("/api/events", "POST", eventData, true);
  },

  // Update an event
  updateEvent: async (id: number, eventData: any) => {
    return apiCall<any>(`/api/events/${id}`, "PUT", eventData, true);
  },

  // Delete an event
  deleteEvent: async (id: number) => {
    return apiCall<any>(`/api/events/${id}`, "DELETE", null, true);
  },
};

// Traffic API
export const trafficApi = {
  // Get traffic stats
  getTrafficStats: async (mapId?: number) => {
    const endpoint = mapId ? `/api/traffic-stats/${mapId}` : "/api/traffic-stats";
    return apiCall<any>(endpoint, "GET");
  },

  // Get daily traffic data
  getDailyTrafficData: async (days?: number) => {
    const query = days ? `?days=${days}` : "";
    return apiCall<any[]>(`/api/traffic-analytics/daily${query}`, "GET");
  },

  // Get traffic snapshots
  getTrafficSnapshots: async (date?: string, limit?: number) => {
    let query = "";
    if (date || limit) {
      const params = [];
      if (date) params.push(`date=${date}`);
      if (limit) params.push(`limit=${limit}`);
      query = `?${params.join("&")}`;
    }
    return apiCall<any[]>(`/api/traffic-analytics/snapshots${query}`, "GET");
  },
};

// Traffic Analytics API
export const trafficAnalyticsApi = {
  // Get daily traffic data
  getDailyTraffic: async (days?: number) => {
    const query = days ? `?days=${days}` : "";
    return apiCall<any[]>(`/api/traffic-analytics/daily${query}`, "GET");
  },

  // Get traffic snapshots
  getTrafficSnapshots: async (limit?: number, date?: string) => {
    let query = "";
    if (date || limit) {
      const params = [];
      if (date) params.push(`date=${date}`);
      if (limit) params.push(`limit=${limit}`);
      query = `?${params.join("&")}`;
    }
    return apiCall<any[]>(`/api/traffic-analytics/snapshots${query}`, "GET");
  },

  // Create a new traffic snapshot
  createTrafficSnapshot: async (snapshotData: {
    time?: string;
    totalVehicles: number;
    congestionLevel: number;
    avgSpeed: number;
    entryPoints?: Record<string, { count: number }>;
  }) => {
    return apiCall<any>("/api/traffic-analytics/snapshots", "POST", snapshotData, true);
  },

  // Create or update daily traffic data
  updateDailyTraffic: async (dailyData: {
    date: string;
    totalVehicles: number;
    peakCongestion: number;
    avgWaitTime: number;
  }) => {
    return apiCall<any>("/api/traffic-analytics/daily", "POST", dailyData, true);
  }
};

// Route Scheduling API
export const routeApi = {
  // Get all route recommendations
  getRoutes: async () => {
    return apiCall<any[]>("/api/route-scheduling/routes", "GET");
  },

  // Get a specific route recommendation
  getRoute: async (id: number) => {
    return apiCall<any>(`/api/route-scheduling/routes/${id}`, "GET");
  },

  // Create a new route recommendation
  createRoute: async (routeData: {
    entryPoint: string;
    exitPoint: string;
    route: string[];
    expectedDuration: number;
    congestionLevel?: "LOW" | "MEDIUM" | "HIGH";
    vehicleTypes?: string[];
    timeSlotIds: number[];
  }) => {
    return apiCall<any>("/api/route-scheduling/routes", "POST", routeData, true);
  },

  // Update a route recommendation
  updateRoute: async (id: number, routeData: {
    entryPoint?: string;
    exitPoint?: string;
    route?: string[];
    expectedDuration?: number;
    congestionLevel?: "LOW" | "MEDIUM" | "HIGH";
    vehicleTypes?: string[];
    timeSlotIds?: number[];
  }) => {
    return apiCall<any>(`/api/route-scheduling/routes/${id}`, "PUT", routeData, true);
  },

  // Delete a route recommendation
  deleteRoute: async (id: number) => {
    return apiCall<any>(`/api/route-scheduling/routes/${id}`, "DELETE", null, true);
  },

  // Get all time slots
  getTimeSlots: async () => {
    return apiCall<any[]>("/api/route-scheduling/time-slots", "GET");
  },

  // Get a specific time slot
  getTimeSlot: async (id: number) => {
    return apiCall<any>(`/api/route-scheduling/time-slots/${id}`, "GET");
  },

  // Create a new time slot
  createTimeSlot: async (timeSlotData: {
    startTime: string;
    endTime: string;
    maxVehicles: number;
    currentAllocation?: number;
    status?: "OPEN" | "FILLING" | "FULL" | "CLOSED";
    entryPoint: string;
  }) => {
    return apiCall<any>("/api/route-scheduling/time-slots", "POST", timeSlotData, true);
  },

  // Update a time slot
  updateTimeSlot: async (id: number, timeSlotData: {
    startTime?: string;
    endTime?: string;
    maxVehicles?: number;
    currentAllocation?: number;
    status?: "OPEN" | "FILLING" | "FULL" | "CLOSED";
    entryPoint?: string;
  }) => {
    return apiCall<any>(`/api/route-scheduling/time-slots/${id}`, "PUT", timeSlotData, true);
  },

  // Delete a time slot
  deleteTimeSlot: async (id: number) => {
    return apiCall<any>(`/api/route-scheduling/time-slots/${id}`, "DELETE", null, true);
  },
};
