import express from "express";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const trafficStatsRouter = express.Router();

/**
 * @swagger
 * /api/traffic-stats:
 *   get:
 *     summary: Get traffic statistics
 *     tags: [TrafficStats]
 *     parameters:
 *       - in: query
 *         name: mapId
 *         schema:
 *           type: integer
 *         description: Optional filter by map ID
 *     responses:
 *       200:
 *         description: Current traffic statistics
 *       500:
 *         description: Server error
 */
trafficStatsRouter.get("/", async (req, res) => {
  try {
    const { mapId } = req.query;
    
    let whereClause = {};
    if (mapId) {
      whereClause = {
        mapId: parseInt(mapId as string),
      };
    }

    const stats = await prisma.trafficStats.findFirst({
      where: whereClause,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        map: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!stats) {
      // Create default stats if none exist
      const maps = await prisma.trafficMap.findMany({
        take: 1,
      });
      
      if (maps.length === 0) {
        return res.status(200).json({
          totalVehicles: 0,
          activeMaps: 0,
          congestionLevel: "LOW",
          peakHours: [],
          eventsToday: 0,
        });
      }
      
      const defaultMapId = maps[0].id;
      
      // Count upcoming events for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const eventsCount = await prisma.event.count({
        where: {
          startDate: {
            gte: today,
            lt: tomorrow,
          },
        },
      });
      
      const defaultStats = {
        mapId: defaultMapId,
        totalVehicles: 1200 + Math.floor(Math.random() * 4000),
        activeMaps: 1,
        congestionLevel: "MEDIUM",
        peakHours: ["9:00 AM - 11:00 AM", "5:00 PM - 7:00 PM"],
        eventsToday: eventsCount,
      };
      
      return res.status(200).json(defaultStats);
    }

    res.status(200).json(stats);
  } catch (error) {
    console.error("Get traffic stats error:", error);
    res.status(500).json({ error: "Failed to get traffic statistics" });
  }
});

/**
 * @swagger
 * /api/traffic-stats/{mapId}:
 *   get:
 *     summary: Get traffic statistics for a specific map
 *     tags: [TrafficStats]
 *     parameters:
 *       - in: path
 *         name: mapId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the map
 *     responses:
 *       200:
 *         description: Traffic statistics for the specified map
 *       404:
 *         description: Map not found
 *       500:
 *         description: Server error
 */
trafficStatsRouter.get("/:mapId", async (req, res) => {
  try {
    const { mapId } = req.params;
    
    const map = await prisma.trafficMap.findUnique({
      where: {
        id: parseInt(mapId),
      },
    });
    
    if (!map) {
      return res.status(404).json({ error: "Map not found" });
    }
    
    const stats = await prisma.trafficStats.findFirst({
      where: {
        mapId: parseInt(mapId),
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    
    if (!stats) {
      // Count upcoming events for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const eventsCount = await prisma.event.count({
        where: {
          startDate: {
            gte: today,
            lt: tomorrow,
          },
        },
      });
      
      // Generate synthetic stats for the map
      const vehicles = 1000 + Math.floor(Math.random() * 5000);
      const congestionLevels = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
      const congestionIndex = Math.min(Math.floor(vehicles / 1500), 3);
      
      const defaultStats = {
        mapId: parseInt(mapId),
        totalVehicles: vehicles,
        activeMaps: 1,
        congestionLevel: congestionLevels[congestionIndex],
        peakHours: ["9:00 AM - 11:00 AM", "5:00 PM - 7:00 PM"],
        eventsToday: eventsCount,
      };
      
      return res.status(200).json(defaultStats);
    }
    
    res.status(200).json(stats);
  } catch (error) {
    console.error("Get map traffic stats error:", error);
    res.status(500).json({ error: "Failed to get traffic statistics for this map" });
  }
});

/**
 * @swagger
 * /api/traffic-stats/{mapId}:
 *   post:
 *     summary: Create or update traffic statistics for a map
 *     tags: [TrafficStats]
 *     parameters:
 *       - in: path
 *         name: mapId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the map
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               totalVehicles:
 *                 type: integer
 *               congestionLevel:
 *                 type: string
 *               peakHours:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Traffic statistics updated successfully
 *       201:
 *         description: Traffic statistics created successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Map not found
 *       500:
 *         description: Server error
 */
trafficStatsRouter.post("/:mapId", async (req, res) => {
  try {
    const { mapId } = req.params;
    const { totalVehicles, congestionLevel, peakHours } = req.body;
    
    const map = await prisma.trafficMap.findUnique({
      where: {
        id: parseInt(mapId),
      },
    });
    
    if (!map) {
      return res.status(404).json({ error: "Map not found" });
    }
    
    // Count upcoming events for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const eventsCount = await prisma.event.count({
      where: {
        startDate: {
          gte: today,
          lt: tomorrow,
        },
      },
    });
    
    const existingStats = await prisma.trafficStats.findFirst({
      where: {
        mapId: parseInt(mapId),
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
    });
    
    if (existingStats) {
      // Update existing stats
      const updatedStats = await prisma.trafficStats.update({
        where: {
          id: existingStats.id,
        },
        data: {
          totalVehicles: totalVehicles !== undefined ? totalVehicles : existingStats.totalVehicles,
          congestionLevel: congestionLevel || existingStats.congestionLevel,
          peakHours: peakHours || existingStats.peakHours,
          eventsToday: eventsCount,
        },
      });
      
      return res.status(200).json({
        message: "Traffic statistics updated successfully",
        stats: updatedStats,
      });
    } else {
      // Create new stats
      const newStats = await prisma.trafficStats.create({
        data: {
          mapId: parseInt(mapId),
          totalVehicles: totalVehicles || 0,
          congestionLevel: congestionLevel || "LOW",
          peakHours: peakHours || [],
          eventsToday: eventsCount,
        },
      });
      
      return res.status(201).json({
        message: "Traffic statistics created successfully",
        stats: newStats,
      });
    }
  } catch (error) {
    console.error("Create/update traffic stats error:", error);
    res.status(500).json({ error: "Failed to create/update traffic statistics" });
  }
});

export default trafficStatsRouter; 