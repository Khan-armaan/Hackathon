import { Outlet } from "react-router-dom";
import { Link, useLocation } from "react-router-dom";
import { Colors } from "../Colors";
import {
  FiHome,
  FiShoppingBag,
  FiShoppingCart,
  FiUser,
  FiHeart,
  FiPackage,
} from "react-icons/fi";

export default function UserLayout() {
  const location = useLocation();

  const menuItems = [
    { path: "/user/dashboard", label: "Dashboard", icon: <FiHome size={20} /> },
    {
      path: "/user/products",
      label: "Products",
      icon: <FiShoppingBag size={20} />,
    },
    { path: "/user/cart", label: "Cart", icon: <FiShoppingCart size={20} /> },
    { path: "/user/orders", label: "Orders", icon: <FiPackage size={20} /> },
    { path: "/user/wishlist", label: "Wishlist", icon: <FiHeart size={20} /> },
    { path: "/user/profile", label: "Profile", icon: <FiUser size={20} /> },
  ];

  return (
    <div className="flex flex-col h-screen bg-[#F5F7FA] overflow-hidden">
      {/* Top Navigation Bar */}
      <div className="w-full bg-white shadow-md">
        <div className="container mx-auto px-4">
          <div className="flex items-center h-16">
            {/* Logo */}
            <div className="flex-shrink-0 mr-8">
              <span
                className="text-xl font-bold"
                style={{ color: Colors.primaryGreen }}
              >
                TrafficControl
              </span>
            </div>

            {/* Navigation Items - Horizontal at the top */}
            <nav className="flex space-x-6">
              {menuItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center px-3 py-2 rounded-md transition-all duration-200 ${
                    location.pathname === item.path
                      ? "bg-[#E8F5E9] text-[#2E7D32] font-medium"
                      : "text-gray-600 hover:bg-gray-100 hover:text-[#4CAF50]"
                  }`}
                >
                  <span
                    className={`mr-2 ${
                      location.pathname === item.path ? "text-[#4CAF50]" : ""
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
