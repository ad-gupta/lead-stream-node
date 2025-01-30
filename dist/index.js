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
const express_1 = __importDefault(require("express"));
const socket_io_1 = require("socket.io");
const http_1 = __importDefault(require("http"));
const redisService_1 = __importDefault(require("./services/redisService"));
const cors_1 = __importDefault(require("cors"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
const PORT = process.env.PORT || 4000;
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, cors_1.default)({
    origin: "http://localhost:3000",
    credentials: true,
}));
dotenv_1.default.config();
app.post("/api", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, leaderboard } = req.body;
        console.log(name, leaderboard);
        let type = yield redisService_1.default.type("leaderboard");
        if (type === 'zset') {
            console.log("leaderboard already exists");
            let leadboard = yield fetchLeaderboard();
            const token = jsonwebtoken_1.default.sign({ id: name }, process.env.JWT_SECRET || "gvhbjnkm");
            const expireIn = 10 * 60 * 1000;
            res
                .status(201)
                .cookie("token", token, { maxAge: expireIn, httpOnly: true })
                .json({ message: "Data stored in DB successfully", data: leadboard });
            return;
        }
        if (leaderboard && Array.isArray(leaderboard)) {
            leaderboard.forEach((element) => __awaiter(void 0, void 0, void 0, function* () {
                let id = element.id, points = element.points, teamName = element.teamName;
                // console.log(id, points, teamName);
                yield redisService_1.default.zadd("leaderboard", points, JSON.stringify({ teamName, id }));
                yield redisService_1.default.expire("leaderboard", 600);
            }));
            const token = jsonwebtoken_1.default.sign({ id: name }, process.env.JWT_SECRET || "gvhbjnkm");
            const expireIn = 10 * 60 * 1000;
            res
                .status(201)
                .cookie("token", token, { maxAge: expireIn, httpOnly: true })
                .json({ message: "Data stored in DB successfully", data: leaderboard });
        }
        else {
            res.status(400).json({ message: "Invalid leaderboard data" });
        }
    }
    catch (error) {
        console.log(error);
    }
}));
function getLeaderboard(_a) {
    return __awaiter(this, arguments, void 0, function* ({ id, teamName, }) {
        let param = JSON.stringify({ teamName, id });
        yield redisService_1.default.zincrby("leaderboard", 1, param);
        // Get leaderboard data sorted in descending order
        const result = yield redisService_1.default.zrevrange("leaderboard", 0, -1, "WITHSCORES");
        let leaderboard = [];
        for (let i = 0; i < result.length; i += 2) {
            const { teamName, id } = JSON.parse(result[i]);
            const points = parseInt(result[i + 1]);
            leaderboard.push({ id, teamName, points });
        }
        return leaderboard;
    });
}
function fetchLeaderboard() {
    return __awaiter(this, void 0, void 0, function* () {
        const result = yield redisService_1.default.zrevrange("leaderboard", 0, -1, "WITHSCORES");
        let leaderboard = [];
        for (let i = 0; i < result.length; i += 2) {
            const { teamName, id } = JSON.parse(result[i]);
            const points = parseInt(result[i + 1]);
            leaderboard.push({ id, teamName, points });
        }
        return leaderboard;
    });
}
app.get("/api", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield fetchLeaderboard();
        console.log(data);
        res.status(200).json(data);
    }
    catch (error) {
        console.log(error);
    }
}));
const httpServer = http_1.default.createServer(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: "http://localhost:3000",
        allowedHeaders: ["*"],
        credentials: true,
    },
});
io.use((socket, next) => {
    //   cookieParser()(socket.request as Request, {} as Response, (err) => {
    //     if (err) return next(err);
    //     const token = (socket.request as Request).cookies.token;
    //     if (!token) return next(new Error("No token provided."));
    //     const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    //     if (!decoded) return next(new Error("Invalid token."));
    // });
    next();
});
io.on("connection", (socket) => {
    console.log("New client connected", socket.id);
    socket.on("message", ({ message }) => {
        console.log(message);
    });
    socket.on("update", (_a) => __awaiter(void 0, [_a], void 0, function* ({ teamId, teamName }) {
        console.log("on click update", { id: teamId, teamName });
        let updatedleaderboard = yield getLeaderboard({ id: teamId, teamName });
        io.emit("update-leaderboard", updatedleaderboard);
        // console.log("Message sent...")
    }));
    socket.on("disconnect", () => {
        console.log("Client disconnected", socket.id);
    });
});
// redisClient.type("leaderboard").then((type) => {
//   if (type !== "zset") {
//     console.error(`Expected "leaderboard" to be a sorted set, but got ${type}`);
//   } else {
//     redisClient.zrange("leaderboard", 0, -1).then((elem) => console.log(elem));
//   }
// });
httpServer.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
