import express from "express";
import cors from "cors";

import swaggerUi from "swagger-ui-express";
import { specs } from "./config/swagger";

import { uploadRouter } from "./routes/upload";
import { PrismaClient } from "./generated/prisma";

const prisma = new PrismaClient();
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

// Serve Swagger documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

// Use PORT from environment variables
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
