import redisClient from '../utils/redis.js';
import dbClient from '../utils/db.js';
import { ObjectId } from 'mongodb';

class UsersController {
  // Already existing postNew method...

  static async getMe(req, res) {
    const token = req.headers['x-token'];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await dbClient.db.collection('users').findOne({ _id: new ObjectId(userId) });
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    return res.status(200).json({ id: user._id.toString(), email: user.email });
  }
}

export default UsersController;
