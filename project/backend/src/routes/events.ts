import express from "express";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const eventRouter = express.Router();

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
eventRouter.get("/", async (req, res) => {
  try {
    const events = await prisma.event.findMany({
      orderBy: {
        startDate: "asc",
      },
    });

    res.status(200).json(events);
  } catch (error) {
    console.error("Get events error:", error);
    res.status(500).json({ error: "Failed to get events" });
  }
});

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
eventRouter.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const event = await prisma.event.findUnique({
      where: {
        id: parseInt(id),
      },
    });

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    res.status(200).json(event);
  } catch (error) {
    console.error("Get event error:", error);
    res.status(500).json({ error: "Failed to get event" });
  }
});

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
eventRouter.post("/", async (req, res) => {
  try {
    const {
      name,
      description,
      startDate,
      endDate,
      impactLevel,
      expectedVisitors,
      location,
      status,
    } = req.body;

    if (!name || !startDate || !endDate || !location) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newEvent = await prisma.event.create({
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
  } catch (error) {
    console.error("Create event error:", error);
    res.status(500).json({ error: "Failed to create event" });
  }
});

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
eventRouter.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      startDate,
      endDate,
      impactLevel,
      expectedVisitors,
      location,
      status,
    } = req.body;

    if (!name || !startDate || !endDate || !location) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const updatedEvent = await prisma.event.update({
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
  } catch (error) {
    console.error("Update event error:", error);
    res.status(500).json({ error: "Failed to update event" });
  }
});

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
eventRouter.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.event.delete({
      where: {
        id: parseInt(id),
      },
    });

    res.status(200).json({
      message: "Event deleted successfully",
    });
  } catch (error) {
    console.error("Delete event error:", error);
    res.status(500).json({ error: "Failed to delete event" });
  }
});

export default eventRouter; 