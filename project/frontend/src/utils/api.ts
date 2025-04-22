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
