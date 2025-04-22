"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_1 = require("./config/swagger");
const upload_1 = require("./routes/upload");
const admin_1 = require("./routes/admin");
const trafficMap_1 = __importDefault(require("./routes/trafficMap"));
const events_1 = __importDefault(require("./routes/events"));
const trafficStats_1 = __importDefault(require("./routes/trafficStats"));
const simulation_1 = __importDefault(require("./routes/simulation"));
const routeScheduling_1 = __importDefault(require("./routes/routeScheduling"));
const trafficAnalytics_1 = __importDefault(require("./routes/trafficAnalytics"));
const routeOptimization_1 = __importDefault(require("./routes/routeOptimization"));
const app = (0, express_1.default)();
// Get the client origin from environment variables
const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
// Configure CORS with environment variables
app.use((0, cors_1.default)({
    origin: clientOrigin, // Use environment variable with fallback
}));
app.use(express_1.default.json());
// Basic health check endpoint
app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});
// API Routes
app.use("/api/admin", admin_1.adminRouter);
app.use("/api/upload", upload_1.uploadRouter);
app.use("/api/traffic-map", trafficMap_1.default);
app.use("/api/events", events_1.default);
app.use("/api/traffic-stats", trafficStats_1.default);
app.use("/api/simulation", simulation_1.default);
app.use("/api/route-scheduling", routeScheduling_1.default);
app.use("/api/traffic-analytics", trafficAnalytics_1.default);
app.use("/api/route-optimization", routeOptimization_1.default);
// Serve Swagger documentation
app.use("/api-docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.specs));
// Use PORT from environment variables
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
