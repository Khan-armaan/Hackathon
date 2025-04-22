import express from "express";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import multer from "multer";

const upload = multer();
export const uploadRouter = express.Router();

const s3Client = new S3Client({
  region: "ap-south-1",
  credentials: {
    accessKeyId: "AKIAQLVQRACKIQ3EJT5G",
    secretAccessKey: "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",
  },
});

/**
 * @swagger
 * /api/upload:
 *   post:
 *     summary: Upload image to S3
 *     tags: [Upload]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Image uploaded successfully
 *       500:
 *         description: Server error
 */
uploadRouter.post("/", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const file = req.file;
    const fileName = `${Date.now()}-${file.originalname}`;

    const command = new PutObjectCommand({
      Bucket: "mybytebucket1708",
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await s3Client.send(command);
    const fileUrl = `https://mybytebucket1708.s3.ap-south-1.amazonaws.com/${fileName}`;

    res.json({
      url: fileUrl,
      message: "Image uploaded successfully",
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Failed to upload image" });
  }
});
