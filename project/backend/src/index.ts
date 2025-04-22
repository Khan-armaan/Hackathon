import express from "express";
import cors from "cors";

import swaggerUi from "swagger-ui-express";
import { specs } from "./config/swagger";

import { uploadRouter } from "./routes/upload";
import { adminRouter } from "./routes/admin";
import trafficMapRouter from "./routes/trafficMap";
import eventRouter from "./routes/events";
import trafficStatsRouter from "./routes/trafficStats";
import simulationRouter from "./routes/simulation";
import routeSchedulingRouter from "./routes/routeScheduling";
import trafficAnalyticsRouter from "./routes/trafficAnalytics";

const app = express();

// Get the client origin from environment variables
const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";

// Configure CORS with environment variables
app.use(
  cors({
    origin: clientOrigin, // Use environment variable with fallback
  })
);

app.use(express.json());

// Basic health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// API Routes
app.use("/api/admin", adminRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/traffic-map", trafficMapRouter);
app.use("/api/events", eventRouter);
app.use("/api/traffic-stats", trafficStatsRouter);
app.use("/api/simulation", simulationRouter);
app.use("/api/route-scheduling", routeSchedulingRouter);
app.use("/api/traffic-analytics", trafficAnalyticsRouter);

// Serve Swagger documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

// Use PORT from environment variables
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
