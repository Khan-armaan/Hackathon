import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Hackathon projec",
      version: "1.0.0",
      description: "API documentation for Hackathon project",
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [{
      bearerAuth: []
    }],
    servers: [
      {
        //url: "http://localhost:3000",
        url: "http://localhost:3000",
        description: "Development server",
      },
    ],
  },
  apis: ["./src/routes/*.ts"], // Path to the API routes
};

export const specs = swaggerJsdoc(options);