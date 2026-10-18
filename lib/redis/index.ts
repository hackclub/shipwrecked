const isMock = process.env.MOCK_API === 'true';

console.log('[redis] isMock', isMock);
const { redis } = isMock ? require('./redis.mock') : require('./redis');

export { redis };
