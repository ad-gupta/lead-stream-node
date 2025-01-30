"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ioredis_1 = require("ioredis");
const redisClient = new ioredis_1.Redis({
    host: 'redis-12185.c11.us-east-1-3.ec2.redns.redis-cloud.com',
    port: 12185,
    password: 'PfFyNYFHE5Dax7SU4pOBWSY31zh0k3E9'
});
exports.default = redisClient;
