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
exports.adminRouter = void 0;
const express_1 = __importDefault(require("express"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const SALT_ROUNDS = 10; // Number of salt rounds for bcrypt
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"; // Better to use environment variable
exports.adminRouter = express_1.default.Router();
/**
 * @swagger
 * /api/admin/signup:
 *   post:
 *     summary: Register a new admin
 *     tags: [Admins]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Admin created successfully
 *       400:
 *         description: Admin already exists
 *       500:
 *         description: Server error
 */
exports.adminRouter.post("/signup", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("Inside signupo");
    try {
        const { name, email, password } = req.body;
        // Check if admin already exist
        const existingUser = yield prisma_1.default.users.findFirst({
            where: {
                email: email,
            },
        });
        if (existingUser) {
            return res
                .status(400)
                .json({ error: "Admin already exists with this email" });
        }
        // Hash the password
        const hashedPassword = yield bcrypt_1.default.hash(password, SALT_ROUNDS);
        // Create new admin user with hashed password
        const newAdmin = yield prisma_1.default.users.create({
            data: {
                name,
                email,
                password: hashedPassword,
            },
        });
        res.status(201).json({
            message: "Admin created successfully",
            user: {
                id: newAdmin.id,
                name: newAdmin.name,
                email: newAdmin.email,
            },
        });
    }
    catch (error) {
        console.error("Admin signup error:", error);
        res.status(500).json({ error: "Failed to create admin" });
    }
}));
/**
 * @swagger
 * /api/admin/login:
 *   post:
 *     summary: Login for admins
 *     tags: [Admins]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                 token:
 *                   type: string
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Server error
 */
exports.adminRouter.post("/login", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        // Find admin user by email
        const admin = yield prisma_1.default.users.findFirst({
            where: {
                email: email,
            },
        });
        if (!admin) {
            return res.status(401).json({ error: "Admin not found" });
        }
        // Compare the provided password with the hashed password
        const passwordMatch = yield bcrypt_1.default.compare(password, admin.password);
        if (!passwordMatch) {
            return res.status(401).json({ error: "Invalid credentials" });
        }
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({
            userId: admin.id,
            email: admin.email,
        }, JWT_SECRET, { expiresIn: "24h" } // Token expires in 24 hours
        );
        res.status(200).json({
            message: "Login successful",
            user: {
                id: admin.id,
                name: admin.name,
                email: admin.email,
            },
            token: token, // Include the token in the response
        });
    }
    catch (error) {
        console.error("Admin login error:", error);
        res.status(500).json({ error: "Login failed" });
    }
}));
