import "dotenv/config";
import express from "express";
import app from "@/app";
import { config } from "@/config/environment";
import logger from "@/utils/logger";

const PORT = config.port || 3000;

app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});
