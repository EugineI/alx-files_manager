import { createClient } from 'redis';

class RedisClient {
  constructor() {
    this.client = createClient();

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    this.client.connect().catch((err) => {
      console.error('Redis connection failed:', err);
    });
  }

  /**
   * Checks if the Redis client is connected
   * @returns {boolean}
   */
  isAlive() {
    return this.client.isOpen;
  }

  /**
   * Gets the value stored for the given key
   * @param {string} key 
   * @returns {Promise<string | null>}
   */
  async get(key) {
    try {
      const value = await this.client.get(key);
      return value;
    } catch (err) {
      console.error(`Error getting key "${key}":`, err);
      return null;
    }
  }

  /**
   * Sets a key with value and expiration in seconds
   * @param {string} key 
   * @param {string | number} value 
   * @param {number} duration 
   * @returns {Promise<void>}
   */
  async set(key, value, duration) {
    try {
      await this.client.setEx(key, duration, value.toString());
    } catch (err) {
      console.error(`Error setting key "${key}":`, err);
    }
  }

  /**
   * Deletes a key from Redis
   * @param {string} key 
   * @returns {Promise<void>}
   */
  async del(key) {
    try {
      await this.client.del(key);
    } catch (err) {
      console.error(`Error deleting key "${key}":`, err);
    }
  }
}

const redisClient = new RedisClient();
export default redisClient;
