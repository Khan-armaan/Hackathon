import express from "express";
import prisma from "../lib/prisma";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
export const trafficMapRouter = express.Router();

// Middleware to verify JWT token
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ error: "Access denied" });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = user;
    next();
  });
};

/**
 * @swagger
 * components:
 *   schemas:
 *     TrafficMap:
 *       type: object
 *       required:
 *         - name
 *         - imageUrl
 *         - width
 *         - height
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated id of the map
 *         name:
 *           type: string
 *           description: The name of the map
 *         description:
 *           type: string
 *           description: Description of the map area
 *         imageUrl:
 *           type: string
 *           description: URL to the map image
 *         width:
 *           type: integer
 *           description: Width of the map in pixels
 *         height:
 *           type: integer
 *           description: Height of the map in pixels
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date the map was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date the map was last updated
 *     TrafficData:
 *       type: object
 *       required:
 *         - mapId
 *         - startX
 *         - startY
 *         - endX
 *         - endY
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated id of the traffic data
 *         mapId:
 *           type: integer
 *           description: The id of the related map
 *         startX:
 *           type: integer
 *           description: Starting X coordinate of the road
 *         startY:
 *           type: integer
 *           description: Starting Y coordinate of the road
 *         endX:
 *           type: integer
 *           description: Ending X coordinate of the road
 *         endY:
 *           type: integer
 *           description: Ending Y coordinate of the road
 *         roadType:
 *           type: string
 *           enum: [HIGHWAY, NORMAL, RESIDENTIAL]
 *           description: Type of the road
 *         density:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH, CONGESTED]
 *           description: Traffic density on the road
 */

/**
 * @swagger
 * /api/traffic-map:
 *   post:
 *     summary: Create a new traffic map
 *     tags: [TrafficMap]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TrafficMap'
 *     responses:
 *       201:
 *         description: Map created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
trafficMapRouter.post("/", authenticateToken, async (req, res) => {
  try {
    const { name, description, imageUrl, width, height } = req.body;

    if (!name || !imageUrl || !width || !height) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newMap = await prisma.trafficMap.create({
      data: {
        name,
        description,
        imageUrl,
        width,
        height,
      },
    });

    res.status(201).json({
      message: "Traffic map created successfully",
      map: newMap,
    });
  } catch (error) {
    console.error("Create traffic map error:", error);
    res.status(500).json({ error: "Failed to create traffic map" });
  }
});

/**
 * @swagger
 * /api/traffic-map:
 *   get:
 *     summary: Get all traffic maps
 *     tags: [TrafficMap]
 *     responses:
 *       200:
 *         description: A list of traffic maps
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/TrafficMap'
 *       500:
 *         description: Server error
 */
trafficMapRouter.get("/", async (req, res) => {
  try {
    const maps = await prisma.trafficMap.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json(maps);
  } catch (error) {
    console.error("Get traffic maps error:", error);
    res.status(500).json({ error: "Failed to get traffic maps" });
  }
});

/**
 * @swagger
 * /api/traffic-map/{id}:
 *   get:
 *     summary: Get traffic map by ID
 *     tags: [TrafficMap]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the traffic map
 *     responses:
 *       200:
 *         description: Traffic map details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TrafficMap'
 *       404:
 *         description: Map not found
 *       500:
 *         description: Server error
 */
trafficMapRouter.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const map = await prisma.trafficMap.findUnique({
      where: {
        id: parseInt(id),
      },
      include: {
        trafficData: true,
      },
    });

    if (!map) {
      return res.status(404).json({ error: "Map not found" });
    }

    res.status(200).json(map);
  } catch (error) {
    console.error("Get traffic map error:", error);
    res.status(500).json({ error: "Failed to get traffic map" });
  }
});

/**
 * @swagger
 * /api/traffic-map/{id}:
 *   put:
 *     summary: Update a traffic map
 *     tags: [TrafficMap]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the traffic map
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TrafficMap'
 *     responses:
 *       200:
 *         description: Map updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Map not found
 *       500:
 *         description: Server error
 */
trafficMapRouter.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, imageUrl, width, height } = req.body;

    if (!name || !imageUrl || !width || !height) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const updatedMap = await prisma.trafficMap.update({
      where: {
        id: parseInt(id),
      },
      data: {
        name,
        description,
        imageUrl,
        width,
        height,
      },
    });

    res.status(200).json({
      message: "Traffic map updated successfully",
      map: updatedMap,
    });
  } catch (error) {
    console.error("Update traffic map error:", error);
    res.status(500).json({ error: "Failed to update traffic map" });
  }
});

/**
 * @swagger
 * /api/traffic-map/{id}:
 *   delete:
 *     summary: Delete a traffic map
 *     tags: [TrafficMap]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the traffic map
 *     responses:
 *       200:
 *         description: Map deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Map not found
 *       500:
 *         description: Server error
 */
trafficMapRouter.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // First delete associated traffic data
    await prisma.trafficData.deleteMany({
      where: {
        mapId: parseInt(id),
      },
    });

    // Then delete the map
    await prisma.trafficMap.delete({
      where: {
        id: parseInt(id),
      },
    });

    res.status(200).json({
      message: "Traffic map deleted successfully",
    });
  } catch (error) {
    console.error("Delete traffic map error:", error);
    res.status(500).json({ error: "Failed to delete traffic map" });
  }
});

/**
 * @swagger
 * /api/traffic-map/{mapId}/traffic-data:
 *   post:
 *     summary: Add traffic data to a map
 *     tags: [TrafficData]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: mapId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the map to add traffic data to
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TrafficData'
 *     responses:
 *       201:
 *         description: Traffic data added successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Map not found
 *       500:
 *         description: Server error
 */
trafficMapRouter.post(
  "/:mapId/traffic-data",
  authenticateToken,
  async (req, res) => {
    try {
      const { mapId } = req.params;
      const { startX, startY, endX, endY, roadType, density } = req.body;

      // Check if map exists
      const map = await prisma.trafficMap.findUnique({
        where: {
          id: parseInt(mapId),
        },
      });

      if (!map) {
        return res.status(404).json({ error: "Map not found" });
      }

      if (!startX || !startY || !endX || !endY) {
        return res.status(400).json({ error: "Missing required coordinates" });
      }

      const newTrafficData = await prisma.trafficData.create({
        data: {
          mapId: parseInt(mapId),
          startX,
          startY,
          endX,
          endY,
          roadType: roadType || "NORMAL",
          density: density || "LOW",
        },
      });

      res.status(201).json({
        message: "Traffic data added successfully",
        trafficData: newTrafficData,
      });
    } catch (error) {
      console.error("Add traffic data error:", error);
      res.status(500).json({ error: "Failed to add traffic data" });
    }
  }
);

/**
 * @swagger
 * /api/traffic-map/{mapId}/traffic-data/{dataId}:
 *   put:
 *     summary: Update traffic data
 *     tags: [TrafficData]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: mapId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the map
 *       - in: path
 *         name: dataId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the traffic data
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TrafficData'
 *     responses:
 *       200:
 *         description: Traffic data updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Traffic data not found
 *       500:
 *         description: Server error
 */
trafficMapRouter.put(
  "/:mapId/traffic-data/:dataId",
  authenticateToken,
  async (req, res) => {
    try {
      const { mapId, dataId } = req.params;
      const { startX, startY, endX, endY, roadType, density } = req.body;

      if (!startX || !startY || !endX || !endY) {
        return res.status(400).json({ error: "Missing required coordinates" });
      }

      const updatedTrafficData = await prisma.trafficData.update({
        where: {
          id: parseInt(dataId),
          mapId: parseInt(mapId),
        },
        data: {
          startX,
          startY,
          endX,
          endY,
          roadType,
          density,
        },
      });

      res.status(200).json({
        message: "Traffic data updated successfully",
        trafficData: updatedTrafficData,
      });
    } catch (error) {
      console.error("Update traffic data error:", error);
      res.status(500).json({ error: "Failed to update traffic data" });
    }
  }
);

/**
 * @swagger
 * /api/traffic-map/{mapId}/traffic-data/{dataId}:
 *   delete:
 *     summary: Delete traffic data
 *     tags: [TrafficData]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: mapId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the map
 *       - in: path
 *         name: dataId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the traffic data
 *     responses:
 *       200:
 *         description: Traffic data deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Traffic data not found
 *       500:
 *         description: Server error
 */
trafficMapRouter.delete(
  "/:mapId/traffic-data/:dataId",
  authenticateToken,
  async (req, res) => {
    try {
      const { mapId, dataId } = req.params;

      await prisma.trafficData.delete({
        where: {
          id: parseInt(dataId),
          mapId: parseInt(mapId),
        },
      });

      res.status(200).json({
        message: "Traffic data deleted successfully",
      });
    } catch (error) {
      console.error("Delete traffic data error:", error);
      res.status(500).json({ error: "Failed to delete traffic data" });
    }
  }
);

export default trafficMapRouter;
