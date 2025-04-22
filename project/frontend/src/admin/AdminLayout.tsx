import { Outlet } from "react-router-dom";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Colors } from "../Colors";
import {
  
  FiHome,

  FiMap,
  FiCalendar,
  FiTrendingUp,
  FiClock,
  FiBarChart2
} from "react-icons/fi";

export default function AdminLayout() {
  const [isHovered, setIsHovered] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Redirect to dashboard if at /admin
  if (location.pathname === "/admin") {
    navigate("/admin/dashboard");
  }

  const menuItems = [
    {
      path: "/admin/dashboard",
      label: "Dashboard",
      icon: <FiHome size={20} />,
    },
    { 
      path: "/admin/maps", 
      label: "Traffic Maps", 
      icon: <FiMap size={20} /> 
    },
    { 
      path: "/admin/events", 
      label: "Event Management", 
      icon: <FiCalendar size={20} /> 
    },
    { 
      path: "/admin/simulation", 
      label: "Traffic Simulation", 
      icon: <FiTrendingUp size={20} /> 
    },
    { 
      path: "/admin/routes", 
      label: "Route Scheduling", 
      icon: <FiClock size={20} /> 
    },
    { 
      path: "/admin/analytics", 
      label: "Traffic Analytics", 
      icon: <FiBarChart2 size={20} /> 
    },
    
  ];

  return (
    <div className="flex h-screen w-screen bg-[#E8F5E9] overflow-hidden">
      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-full bg-white shadow-xl transition-all duration-300 ease-in-out z-10 ${
          isHovered ? "w-64" : "w-16"
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Logo Area */}
        <div
          className="h-16 flex items-center justify-center border-b border-gray-100"
          style={{ backgroundColor: Colors.primaryGreen }}
        >
          {isHovered ? (
            <span className="text-xl font-bold text-white">Kachi Dham TMS</span>
          ) : (
            <span className="text-xl text-white">K</span>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="mt-6">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center px-4 py-3 mb-2 transition-all duration-200 ${
                location.pathname.startsWith(item.path)
                  ? "bg-[#C8E6C9] text-[#2E7D32] font-medium"
                  : "text-gray-600 hover:bg-[#E8F5E9] hover:text-[#4CAF50]"
              }`}
            >
              <span
                className={`text-xl min-w-[24px] ${
                  location.pathname.startsWith(item.path)
                    ? "text-[#4CAF50]"
                    : ""
                }`}
              >
                {item.icon}
              </span>
              <span
                className={`ml-4 font-medium whitespace-nowrap transition-opacity duration-300 ${
                  isHovered ? "opacity-100" : "opacity-0"
                }`}
              >
                {item.label}
              </span>
            </Link>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div
        className={`flex-1 transition-all duration-300 ${
          isHovered ? "ml-64" : "ml-16"
        }`}
      >
        <div className="p-8 h-full overflow-y-auto text-black">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
