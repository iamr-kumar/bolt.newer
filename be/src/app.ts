import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import routes from "@/routes";
import { errorHandler } from "@/middleware/error.middleware";
import { config } from "@/config/environment";

const app: Express = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use("/api", routes);

// Error handling
app.use(errorHandler);

export default app;
