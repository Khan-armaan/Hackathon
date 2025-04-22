"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventRouter = void 0;
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
exports.eventRouter = express_1.default.Router();
/**
 * @swagger
 * /api/events:
 *   get:
 *     summary: Get all events
 *     tags: [Events]
 *     responses:
 *       200:
 *         description: A list of events
 *       500:
 *         description: Server error
 */
exports.eventRouter.get("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const events = yield prisma.event.findMany({
            orderBy: {
                startDate: "asc",
            },
        });
        res.status(200).json(events);
    }
    catch (error) {
        console.error("Get events error:", error);
        res.status(500).json({ error: "Failed to get events" });
    }
}));
/**
 * @swagger
 * /api/events/{id}:
 *   get:
 *     summary: Get event by ID
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the event
 *     responses:
 *       200:
 *         description: Event details
 *       404:
 *         description: Event not found
 *       500:
 *         description: Server error
 */
exports.eventRouter.get("/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const event = yield prisma.event.findUnique({
            where: {
                id: parseInt(id),
            },
        });
        if (!event) {
            return res.status(404).json({ error: "Event not found" });
        }
        res.status(200).json(event);
    }
    catch (error) {
        console.error("Get event error:", error);
        res.status(500).json({ error: "Failed to get event" });
    }
}));
/**
 * @swagger
 * /api/events:
 *   post:
 *     summary: Create a new event
 *     tags: [Events]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               impactLevel:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH, CRITICAL]
 *               expectedVisitors:
 *                 type: integer
 *               location:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [UPCOMING, ONGOING, COMPLETED, CANCELLED]
 *     responses:
 *       201:
 *         description: Event created successfully
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
exports.eventRouter.post("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, description, startDate, endDate, impactLevel, expectedVisitors, location, status, } = req.body;
        if (!name || !startDate || !endDate || !location) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        const newEvent = yield prisma.event.create({
            data: {
                name,
                description,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                impactLevel: impactLevel || "MEDIUM",
                expectedVisitors: expectedVisitors || 0,
                location,
                status: status || "UPCOMING",
            },
        });
        res.status(201).json({
            message: "Event created successfully",
            event: newEvent,
        });
    }
    catch (error) {
        console.error("Create event error:", error);
        res.status(500).json({ error: "Failed to create event" });
    }
}));
/**
 * @swagger
 * /api/events/{id}:
 *   put:
 *     summary: Update an event
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the event
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               impactLevel:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH, CRITICAL]
 *               expectedVisitors:
 *                 type: integer
 *               location:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [UPCOMING, ONGOING, COMPLETED, CANCELLED]
 *     responses:
 *       200:
 *         description: Event updated successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Event not found
 *       500:
 *         description: Server error
 */
exports.eventRouter.put("/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, description, startDate, endDate, impactLevel, expectedVisitors, location, status, } = req.body;
        if (!name || !startDate || !endDate || !location) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        const updatedEvent = yield prisma.event.update({
            where: {
                id: parseInt(id),
            },
            data: {
                name,
                description,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                impactLevel,
                expectedVisitors,
                location,
                status,
            },
        });
        res.status(200).json({
            message: "Event updated successfully",
            event: updatedEvent,
        });
    }
    catch (error) {
        console.error("Update event error:", error);
        res.status(500).json({ error: "Failed to update event" });
    }
}));
/**
 * @swagger
 * /api/events/{id}:
 *   delete:
 *     summary: Delete an event
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the event
 *     responses:
 *       200:
 *         description: Event deleted successfully
 *       404:
 *         description: Event not found
 *       500:
 *         description: Server error
 */
exports.eventRouter.delete("/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prisma.event.delete({
            where: {
                id: parseInt(id),
            },
        });
        res.status(200).json({
            message: "Event deleted successfully",
        });
    }
    catch (error) {
        console.error("Delete event error:", error);
        res.status(500).json({ error: "Failed to delete event" });
    }
}));
exports.default = exports.eventRouter;
