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
// Serve Swagger documentation
app.use("/api-docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.specs));
// Use PORT from environment variables
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
