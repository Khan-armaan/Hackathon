import express from "express";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const routeSchedulingRouter = express.Router();

/**
 * @swagger
 * /api/route-scheduling/time-slots:
 *   get:
 *     summary: Get all time slots
 *     tags: [RouteScheduling]
 *     responses:
 *       200:
 *         description: List of time slots
 *       500:
 *         description: Server error
 */
routeSchedulingRouter.get("/time-slots", async (req, res) => {
  try {
    const timeSlots = await prisma.timeSlot.findMany({
      orderBy: {
        startTime: "asc",
      },
    });

    res.status(200).json(timeSlots);
  } catch (error) {
    console.error("Get time slots error:", error);
    res.status(500).json({ error: "Failed to get time slots" });
  }
});

/**
 * @swagger
 * /api/route-scheduling/time-slots/{id}:
 *   get:
 *     summary: Get time slot by ID
 *     tags: [RouteScheduling]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the time slot
 *     responses:
 *       200:
 *         description: Time slot details
 *       404:
 *         description: Time slot not found
 *       500:
 *         description: Server error
 */
routeSchedulingRouter.get("/time-slots/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const timeSlot = await prisma.timeSlot.findUnique({
      where: {
        id: parseInt(id),
      },
      include: {
        routeRecommendations: true,
      },
    });

    if (!timeSlot) {
      return res.status(404).json({ error: "Time slot not found" });
    }

    res.status(200).json(timeSlot);
  } catch (error) {
    console.error("Get time slot error:", error);
    res.status(500).json({ error: "Failed to get time slot" });
  }
});

/**
 * @swagger
 * /api/route-scheduling/time-slots:
 *   post:
 *     summary: Create a new time slot
 *     tags: [RouteScheduling]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - startTime
 *               - endTime
 *               - maxVehicles
 *               - entryPoint
 *             properties:
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *               maxVehicles:
 *                 type: integer
 *               currentAllocation:
 *                 type: integer
 *               status:
 *                 type: string
 *                 enum: [OPEN, FILLING, FULL, CLOSED]
 *               entryPoint:
 *                 type: string
 *     responses:
 *       201:
 *         description: Time slot created successfully
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
routeSchedulingRouter.post("/time-slots", async (req, res) => {
  try {
    const { startTime, endTime, maxVehicles, currentAllocation, status, entryPoint } = req.body;

    if (!startTime || !endTime || !maxVehicles || !entryPoint) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newTimeSlot = await prisma.timeSlot.create({
      data: {
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        maxVehicles,
        currentAllocation: currentAllocation || 0,
        status: status || "OPEN",
        entryPoint,
      },
    });

    res.status(201).json({
      message: "Time slot created successfully",
      timeSlot: newTimeSlot,
    });
  } catch (error) {
    console.error("Create time slot error:", error);
    res.status(500).json({ error: "Failed to create time slot" });
  }
});

/**
 * @swagger
 * /api/route-scheduling/time-slots/{id}:
 *   put:
 *     summary: Update a time slot
 *     tags: [RouteScheduling]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the time slot
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *               maxVehicles:
 *                 type: integer
 *               currentAllocation:
 *                 type: integer
 *               status:
 *                 type: string
 *                 enum: [OPEN, FILLING, FULL, CLOSED]
 *               entryPoint:
 *                 type: string
 *     responses:
 *       200:
 *         description: Time slot updated successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Time slot not found
 *       500:
 *         description: Server error
 */
routeSchedulingRouter.put("/time-slots/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { startTime, endTime, maxVehicles, currentAllocation, status, entryPoint } = req.body;

    const updatedTimeSlot = await prisma.timeSlot.update({
      where: {
        id: parseInt(id),
      },
      data: {
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: endTime ? new Date(endTime) : undefined,
        maxVehicles,
        currentAllocation,
        status,
        entryPoint,
      },
    });

    res.status(200).json({
      message: "Time slot updated successfully",
      timeSlot: updatedTimeSlot,
    });
  } catch (error) {
    console.error("Update time slot error:", error);
    res.status(500).json({ error: "Failed to update time slot" });
  }
});

/**
 * @swagger
 * /api/route-scheduling/time-slots/{id}:
 *   delete:
 *     summary: Delete a time slot
 *     tags: [RouteScheduling]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the time slot
 *     responses:
 *       200:
 *         description: Time slot deleted successfully
 *       404:
 *         description: Time slot not found
 *       500:
 *         description: Server error
 */
routeSchedulingRouter.delete("/time-slots/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.timeSlot.delete({
      where: {
        id: parseInt(id),
      },
    });

    res.status(200).json({
      message: "Time slot deleted successfully",
    });
  } catch (error) {
    console.error("Delete time slot error:", error);
    res.status(500).json({ error: "Failed to delete time slot" });
  }
});

/**
 * @swagger
 * /api/route-scheduling/routes:
 *   get:
 *     summary: Get all route recommendations
 *     tags: [RouteScheduling]
 *     responses:
 *       200:
 *         description: List of route recommendations
 *       500:
 *         description: Server error
 */
routeSchedulingRouter.get("/routes", async (req, res) => {
  try {
    const routes = await prisma.routeRecommendation.findMany({
      include: {
        timeSlots: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
          },
        },
      },
    });

    res.status(200).json(routes);
  } catch (error) {
    console.error("Get routes error:", error);
    res.status(500).json({ error: "Failed to get route recommendations" });
  }
});

/**
 * @swagger
 * /api/route-scheduling/routes/{id}:
 *   get:
 *     summary: Get route recommendation by ID
 *     tags: [RouteScheduling]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the route recommendation
 *     responses:
 *       200:
 *         description: Route recommendation details
 *       404:
 *         description: Route recommendation not found
 *       500:
 *         description: Server error
 */
routeSchedulingRouter.get("/routes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const route = await prisma.routeRecommendation.findUnique({
      where: {
        id: parseInt(id),
      },
      include: {
        timeSlots: true,
      },
    });

    if (!route) {
      return res.status(404).json({ error: "Route recommendation not found" });
    }

    res.status(200).json(route);
  } catch (error) {
    console.error("Get route error:", error);
    res.status(500).json({ error: "Failed to get route recommendation" });
  }
});

/**
 * @swagger
 * /api/route-scheduling/routes:
 *   post:
 *     summary: Create a new route recommendation
 *     tags: [RouteScheduling]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - entryPoint
 *               - exitPoint
 *               - route
 *               - expectedDuration
 *               - timeSlotIds
 *             properties:
 *               entryPoint:
 *                 type: string
 *               exitPoint:
 *                 type: string
 *               route:
 *                 type: array
 *                 items:
 *                   type: string
 *               expectedDuration:
 *                 type: integer
 *               congestionLevel:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH]
 *               vehicleTypes:
 *                 type: array
 *                 items:
 *                   type: string
 *               timeSlotIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       201:
 *         description: Route recommendation created successfully
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
routeSchedulingRouter.post("/routes", async (req, res) => {
  try {
    const { entryPoint, exitPoint, route, expectedDuration, congestionLevel, vehicleTypes, timeSlotIds } = req.body;

    if (!entryPoint || !exitPoint || !route || !expectedDuration || !timeSlotIds) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if timeslots exist
    const timeslots = await prisma.timeSlot.findMany({
      where: {
        id: {
          in: timeSlotIds.map((id: string) => parseInt(id)),
        },
      },
    });

    if (timeslots.length !== timeSlotIds.length) {
      return res.status(400).json({ error: "One or more time slots not found" });
    }

    const newRoute = await prisma.routeRecommendation.create({
      data: {
        entryPoint,
        exitPoint,
        route,
        expectedDuration,
        congestionLevel: congestionLevel || "MEDIUM",
        vehicleTypes: vehicleTypes || [],
        timeSlotIds: timeSlotIds.map((id: string) => parseInt(id)),
        timeSlots: {
          connect: timeSlotIds.map((id: string) => ({ id: parseInt(id) })),
        },
      },
    });

    res.status(201).json({
      message: "Route recommendation created successfully",
      route: newRoute,
    });
  } catch (error) {
    console.error("Create route error:", error);
    res.status(500).json({ error: "Failed to create route recommendation" });
  }
});

/**
 * @swagger
 * /api/route-scheduling/routes/{id}:
 *   put:
 *     summary: Update a route recommendation
 *     tags: [RouteScheduling]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the route recommendation
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               entryPoint:
 *                 type: string
 *               exitPoint:
 *                 type: string
 *               route:
 *                 type: array
 *                 items:
 *                   type: string
 *               expectedDuration:
 *                 type: integer
 *               congestionLevel:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH]
 *               vehicleTypes:
 *                 type: array
 *                 items:
 *                   type: string
 *               timeSlotIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Route recommendation updated successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Route recommendation not found
 *       500:
 *         description: Server error
 */
routeSchedulingRouter.put("/routes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { entryPoint, exitPoint, route, expectedDuration, congestionLevel, vehicleTypes, timeSlotIds } = req.body;

    let timeSlotConnections;
    if (timeSlotIds && timeSlotIds.length > 0) {
      // Check if timeslots exist
      const timeslots = await prisma.timeSlot.findMany({
        where: {
          id: {
            in: timeSlotIds.map((id: string) => parseInt(id)),
          },
        },
      });

      if (timeslots.length !== timeSlotIds.length) {
        return res.status(400).json({ error: "One or more time slots not found" });
      }

      timeSlotConnections = {
        set: timeSlotIds.map((id: string) => ({ id: parseInt(id) })),
      };
    }

    const updatedRoute = await prisma.routeRecommendation.update({
      where: {
        id: parseInt(id),
      },
      data: {
        entryPoint,
        exitPoint,
        route,
        expectedDuration,
        congestionLevel,
        vehicleTypes,
        timeSlotIds: timeSlotIds ? timeSlotIds.map((id: string) => parseInt(id)) : undefined,
        timeSlots: timeSlotConnections,
      },
      include: {
        timeSlots: true,
      },
    });

    res.status(200).json({
      message: "Route recommendation updated successfully",
      route: updatedRoute,
    });
  } catch (error) {
    console.error("Update route error:", error);
    res.status(500).json({ error: "Failed to update route recommendation" });
  }
});

/**
 * @swagger
 * /api/route-scheduling/routes/{id}:
 *   delete:
 *     summary: Delete a route recommendation
 *     tags: [RouteScheduling]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the route recommendation
 *     responses:
 *       200:
 *         description: Route recommendation deleted successfully
 *       404:
 *         description: Route recommendation not found
 *       500:
 *         description: Server error
 */
routeSchedulingRouter.delete("/routes/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.routeRecommendation.delete({
      where: {
        id: parseInt(id),
      },
    });

    res.status(200).json({
      message: "Route recommendation deleted successfully",
    });
  } catch (error) {
    console.error("Delete route error:", error);
    res.status(500).json({ error: "Failed to delete route recommendation" });
  }
});

export default routeSchedulingRouter; 