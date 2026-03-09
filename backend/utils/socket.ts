import { Server } from "socket.io";
import { Server as HttpServer } from "http";

let io: Server;

export const initSocket = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("join", (userId: string) => {
      socket.join(`user_${userId}`);
      console.log(`User ${userId} joined room user_${userId}`);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

export const notifyUser = (userId: number, type: string, content: string) => {
  if (io) {
    io.to(`user_${userId}`).emit("notification", { type, content, created_at: new Date() });
  }
};
