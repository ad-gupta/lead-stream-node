"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ioredis_1 = require("ioredis");
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const redisClient = new ioredis_1.Redis({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 12185,
    password: process.env.REDIS_PASSWORD,
});
exports.default = redisClient;
