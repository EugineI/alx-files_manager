import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const dbName = process.env.DB_DATABASE || 'files_manager';

    const uri = `mongodb://${host}:${port}`;
    this.client = new MongoClient(uri, { useUnifiedTopology: true });
    this.dbName = dbName;

    this.client.connect()
      .then(() => {
        this.db = this.client.db(this.dbName);
      })
      .catch((err) => {
        console.error('MongoDB connection error:', err.message);
      });
  }

  isAlive() {
    return this.client && this.client.topology && this.client.topology.isConnected();
  }

  async nbUsers() {
    return this.db?.collection('users')?.countDocuments() || 0;
  }

  async nbFiles() {
    return this.db?.collection('files')?.countDocuments() || 0;
  }
}

const dbClient = new DBClient();
export default dbClient;
