import { Redis } from "ioredis";
import { config } from "dotenv";
config();

const redisClient = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 12185,
  password: process.env.REDIS_PASSWORD,
});

export default redisClient;
