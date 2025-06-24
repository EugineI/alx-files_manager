// worker.js
import { promisify } from 'util';
import { writeFile } from 'fs';
import imageThumbnail from 'image-thumbnail';
import { ObjectId } from 'mongodb';
import dbClient from './utils/db';
import { fileQueue } from './utils/queue';
import path from 'path';

const writeFileAsync = promisify(writeFile);

fileQueue.process(async (job, done) => {
  const { fileId, userId } = job.data;

  if (!fileId) {
    done(new Error('Missing fileId'));
    return;
  }

  if (!userId) {
    done(new Error('Missing userId'));
    return;
  }

  const file = await dbClient.db.collection('files').findOne({
    _id: new ObjectId(fileId),
    userId: new ObjectId(userId),
  });

  if (!file) {
    done(new Error('File not found'));
    return;
  }

  if (file.type !== 'image') {
    done(); // Not an image, nothing to do
    return;
  }

  try {
    const sizes = [500, 250, 100];
    for (const size of sizes) {
      const thumbnail = await imageThumbnail(file.localPath, { width: size });
      await writeFileAsync(`${file.localPath}_${size}`, thumbnail);
    }
    done();
  } catch (err) {
    done(err);
  }
});
