import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL;

let redis: Redis | null = null;

if (redisUrl) {
    console.log('Initializing Redis client...');
    redis = new Redis(redisUrl);

    redis.on('connect', () => {
        console.log('Redis client connected');
    });

    redis.on('error', (err) => {
        console.error('Redis connection error:', err);
    });
} else {
    console.warn('REDIS_URL not found, Redis caching will be disabled.');
}

export default redis;
