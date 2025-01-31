import express, { Request, Response } from "express";
import { Server } from "socket.io";
import http from "http";
import redisClient from "./services/redisService";
import cors from "cors";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

const PORT = process.env.PORT || 4000;
const app = express();
app.use(express.json());
app.use(
  cors()
);
dotenv.config();

app.post("/api", async (req: Request, res: Response) => {
  try {
    const { leaderboard } = req.body;
    console.log(leaderboard);

    let type = await redisClient.type("leaderboard");

    if (type === 'zset' ) {
      console.log("leaderboard already exists");

      let leadboard = await fetchLeaderboard();
      const token = jwt.sign(
        { id: 'name' },
        process.env.JWT_SECRET || "gvhbjnkm"
      );
      const expireIn = 10 * 60 * 1000;

      res
        .status(201)
        .cookie("token", token, { maxAge: expireIn, httpOnly: true })
        .json({ message: "Data stored in DB successfully", data: leadboard });
      return;
    }

    if (leaderboard && Array.isArray(leaderboard)) {
      leaderboard.forEach(async (element: any) => {
        let id = element.id,
          points = element.points,
          teamName = element.teamName;

        // console.log(id, points, teamName);
        await redisClient.zadd(
          "leaderboard",
          points,
          JSON.stringify({ teamName, id })
        );
        await redisClient.expire("leaderboard", 600);
      });

      const token = jwt.sign(
        { id: 'name' },
        process.env.JWT_SECRET || "gvhbjnkm"
      );
      const expireIn = 10 * 60 * 1000;
      res
        .status(201)
        .cookie("token", token, { maxAge: expireIn, httpOnly: true })
        .json({ message: "Data stored in DB successfully", data: leaderboard });
    } else {
      res.status(400).json({ message: "Invalid leaderboard data" });
    }
  } catch (error) {
    console.log(error);
  }
});
async function getLeaderboard({
  id,
  teamName,
}: {
  id: number;
  teamName: string;
}) {
  let param = JSON.stringify({ teamName, id });

  await redisClient.zincrby("leaderboard", 1, param);

  // Get leaderboard data sorted in descending order
  const result = await redisClient.zrevrange(
    "leaderboard",
    0,
    -1,
    "WITHSCORES"
  );

  let leaderboard = [];

  for (let i = 0; i < result.length; i += 2) {
    const { teamName, id } = JSON.parse(result[i]);
    const points = parseInt(result[i + 1]);

    leaderboard.push({ id, teamName, points });
  }
  return leaderboard;
}

async function fetchLeaderboard() {
  const result = await redisClient.zrevrange(
    "leaderboard",
    0,
    -1,
    "WITHSCORES"
  );

  let leaderboard = [];

  for (let i = 0; i < result.length; i += 2) {
    const { teamName, id } = JSON.parse(result[i]);
    const points = parseInt(result[i + 1]);

    leaderboard.push({ id, teamName, points });
  }
  return leaderboard;
}

app.get("/api", async (req: Request, res: Response) => {
  try {
    const data = await fetchLeaderboard();

    console.log(data);
    res.status(200).json(data);
  } catch (error) {
    console.log(error);
  }
});

app.get('/', (req: Request, res: Response) => {
  res.json({message: "Hello"})
})
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    allowedHeaders: ["*"],
    // credentials: true,
  },
});

// io.use((socket, next) => {
//   //   cookieParser()(socket.request as Request, {} as Response, (err) => {
//   //     if (err) return next(err);

//   //     const token = (socket.request as Request).cookies.token;
//   //     if (!token) return next(new Error("No token provided."));

//   //     const decoded = jwt.verify(token, process.env.JWT_SECRET as string);

//   //     if (!decoded) return next(new Error("Invalid token."));
//   // });
//   next();
// });

io.on("connection", (socket) => {
  console.log("New client connected", socket.id);

  socket.on("message", ({ message }) => {
    console.log(message);
  });

  socket.on(
    "update",
    async({ teamId, teamName }: { teamId: number; teamName: string }) => {
      console.log("on click update", { id: teamId, teamName });
      let updatedleaderboard = await getLeaderboard({ id: teamId, teamName })
      io.emit("update-leaderboard", updatedleaderboard);
      console.log("Message sent...")
    }
  );

  socket.on('show-leaderboard', async() => {
    let updatedleaderboard = await fetchLeaderboard()
    io.emit("update-leaderboard", updatedleaderboard);
  })
  socket.on("disconnect", () => {
    console.log("Client disconnected", socket.id);
  });
});


httpServer.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
