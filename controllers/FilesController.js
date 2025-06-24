import { ObjectId } from 'mongodb';
import fs from 'fs';
import mime from 'mime-types';
import { promisify } from 'util';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import fileQueue from '../utils/fileQueue';

const readFile = promisify(fs.readFile);

class FilesController {
  static async postUpload(req, res) {
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await dbClient.db.collection('users').findOne({ _id: new ObjectId(userId) });
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { name, type, parentId = 0, isPublic = false, data } = req.body;
    if (!name) return res.status(400).json({ error: 'Missing name' });
    if (!type || !['folder', 'file', 'image'].includes(type)) {
      return res.status(400).json({ error: 'Missing type' });
    }
    if (type !== 'folder' && !data) return res.status(400).json({ error: 'Missing data' });

    let parent = null;
    if (parentId !== 0) {
      parent = await dbClient.db.collection('files').findOne({ _id: new ObjectId(parentId) });
      if (!parent) return res.status(400).json({ error: 'Parent not found' });
      if (parent.type !== 'folder') return res.status(400).json({ error: 'Parent is not a folder' });
    }

    const fileData = {
      userId: user._id,
      name,
      type,
      isPublic,
      parentId,
    };

    if (type === 'folder') {
      const result = await dbClient.db.collection('files').insertOne(fileData);
      return res.status(201).json({ id: result.insertedId, ...fileData });
    }

    const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';
    if (!fs.existsSync(FOLDER_PATH)) fs.mkdirSync(FOLDER_PATH, { recursive: true });

    const localPath = `${FOLDER_PATH}/${new ObjectId()}`;
    await fs.promises.writeFile(localPath, Buffer.from(data, 'base64'));

    fileData.localPath = localPath;
    const result = await dbClient.db.collection('files').insertOne(fileData);

    if (type === 'image') {
      await fileQueue.add({ userId: user._id.toString(), fileId: result.insertedId.toString() });
    }

    return res.status(201).json({ id: result.insertedId, ...fileData });
  }

  static async getShow(req, res) {
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const file = await dbClient.db.collection('files').findOne({
      _id: new ObjectId(req.params.id),
      userId: new ObjectId(userId),
    });

    if (!file) return res.status(404).json({ error: 'Not found' });

    return res.status(200).json({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId,
    });
  }

  static async getIndex(req, res) {
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const parentId = req.query.parentId || 0;
    const page = Number(req.query.page) || 0;

    const files = await dbClient.db.collection('files')
      .aggregate([
        { $match: { userId: new ObjectId(userId), parentId: parentId } },
        { $skip: page * 20 },
        { $limit: 20 },
      ]).toArray();

    return res.status(200).json(files.map(file => ({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId,
    })));
  }

  static async putPublish(req, res) {
    return FilesController.togglePublic(req, res, true);
  }

  static async putUnpublish(req, res) {
    return FilesController.togglePublic(req, res, false);
  }

  static async togglePublic(req, res, isPublic) {
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const file = await dbClient.db.collection('files').findOne({
      _id: new ObjectId(req.params.id),
      userId: new ObjectId(userId),
    });

    if (!file) return res.status(404).json({ error: 'Not found' });

    await dbClient.db.collection('files').updateOne(
      { _id: file._id },
      { $set: { isPublic } },
    );

    return res.status(200).json({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic,
      parentId: file.parentId,
    });
  }

  static async getFile(req, res) {
    const file = await dbClient.db.collection('files').findOne({ _id: new ObjectId(req.params.id) });
    if (!file) return res.status(404).json({ error: 'Not found' });

    const token = req.headers['x-token'];
    const userId = token ? await redisClient.get(`auth_${token}`) : null;
    if (!file.isPublic && (!userId || file.userId.toString() !== userId)) {
      return res.status(404).json({ error: 'Not found' });
    }

    if (file.type === 'folder') return res.status(400).json({ error: "A folder doesn't have content" });

    let path = file.localPath;
    const size = req.query.size;
    if (['100', '250', '500'].includes(size)) path = `${path}_${size}`;

    if (!fs.existsSync(path)) return res.status(404).json({ error: 'Not found' });

    const mimeType = mime.lookup(file.name);
    res.setHeader('Content-Type', mimeType);
    return res.send(await readFile(path));
  }
	const size = req.query.size;
let filePath = file.localPath;

if (size && ['100', '250', '500'].includes(size)) {
  filePath = `${filePath}_${size}`;
}

if (!fs.existsSync(filePath)) {
  return res.status(404).json({ error: 'Not found' });
}

const mimeType = mime.lookup(file.name) || 'application/octet-stream';
res.setHeader('Content-Type', mimeType);
fs.createReadStream(filePath).pipe(res);
}

export default FilesController;
