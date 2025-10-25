import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: process.env.PORT || 3003,
  jwtSecret: process.env.JWT_SECRET || "dev-secret", // ojo: en prod cámbialo
  allowOrigin: process.env.ALLOW_ORIGIN || "*",
  nodeEnv: process.env.NODE_ENV || "development",
};
