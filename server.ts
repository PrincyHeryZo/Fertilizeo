import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import apiRoutes from "./backend/routes/api.ts";
import { initSocket } from "./backend/utils/socket.ts";

dotenv.config();

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const PORT = parseInt(process.env.PORT || '3000', 10);

  // Trust the first proxy (Cloud Run / Nginx)
  app.set('trust proxy', 1);

  // Security Headers
  app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for development/iframe compatibility
    crossOriginEmbedderPolicy: false
  }));

  // Rate Limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: { message: "Trop de requêtes, veuillez réessayer plus tard." },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    // Use the client's IP address from Express (which uses X-Forwarded-For because of trust proxy)
    keyGenerator: (req) => req.ip || "unknown",
  });
  app.use("/api/", limiter);

  // Initialize Socket.io
  initSocket(httpServer);

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // API routes
  app.use("/api", apiRoutes);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve static files from dist
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

startServer();
