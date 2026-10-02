const fs = require('fs');
const path = require('path');

class CloudAdapter {
  constructor() {
    this.provider = null;
    this.mongoClient = null;
    this.isDirty = false;
    this.cache = null;
    this.lastPull = 0;
    this.init();
  }

  init() {
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      this.provider = 'upstash';
      this.upstashUrl = process.env.UPSTASH_REDIS_REST_URL.replace(/\/$/, '');
      this.upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
      console.log('☁️ [Cloud DB] Active: Upstash Redis REST');
    } else if (process.env.MONGODB_URI) {
      this.provider = 'mongodb';
      this.mongoUri = process.env.MONGODB_URI;
      console.log('☁️ [Cloud DB] Active: MongoDB Atlas');
    } else if (process.env.JSONBIN_BIN_ID && process.env.JSONBIN_API_KEY) {
      this.provider = 'jsonbin';
      this.jsonbinId = process.env.JSONBIN_BIN_ID;
      this.jsonbinKey = process.env.JSONBIN_API_KEY;
      console.log('☁️ [Cloud DB] Active: JSONBin.io');
    } else {
      this.provider = 'local';
    }
  }

  isConfigured() {
    return this.provider !== 'local';
  }

  getProviderName() {
    switch (this.provider) {
      case 'upstash': return 'Upstash Redis (Serverless)';
      case 'mongodb': return 'MongoDB Atlas Cloud';
      case 'jsonbin': return 'JSONBin Cloud';
      default: return 'Local Disk (/tmp)';
    }
  }

  async getMongoClient() {
    if (!this.mongoClient) {
      const { MongoClient } = require('mongodb');
      this.mongoClient = new MongoClient(this.mongoUri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000
      });
      await this.mongoClient.connect();
    }
    return this.mongoClient;
  }

  async pull(defaultData) {
    if (!this.isConfigured()) return null;

    try {
      if (this.provider === 'upstash') {
        const res = await fetch(`${this.upstashUrl}/get/classroom_data`, {
          headers: { Authorization: `Bearer ${this.upstashToken}` }
        });
        if (!res.ok) {
          console.error('[Upstash] HTTP Error:', res.status, res.statusText);
          return null;
        }
        const json = await res.json();
        if (json && json.result) {
          const parsed = typeof json.result === 'string' ? JSON.parse(json.result) : json.result;
          this.cache = parsed;
          this.lastPull = Date.now();
          return parsed;
        } else {
          // Inisialisasi awal ke cloud jika masih kosong
          console.log('🌱 [Upstash] Seeding initial data to Upstash Redis...');
          await this.push(defaultData);
          this.cache = defaultData;
          this.lastPull = Date.now();
          return defaultData;
        }
      }

      if (this.provider === 'mongodb') {
        const client = await this.getMongoClient();
        const col = client.db('aiclassroom').collection('app_storage');
        const doc = await col.findOne({ _id: 'classroom_data' });
        if (doc && doc.data) {
          this.cache = doc.data;
          this.lastPull = Date.now();
          return doc.data;
        } else {
          console.log('🌱 [MongoDB] Seeding initial data to MongoDB Atlas...');
          await col.updateOne(
            { _id: 'classroom_data' },
            { $set: { _id: 'classroom_data', data: defaultData, updated_at: new Date() } },
            { upsert: true }
          );
          this.cache = defaultData;
          this.lastPull = Date.now();
          return defaultData;
        }
      }

      if (this.provider === 'jsonbin') {
        const res = await fetch(`https://api.jsonbin.io/v3/b/${this.jsonbinId}/latest`, {
          headers: { 'X-Master-Key': this.jsonbinKey }
        });
        if (res.ok) {
          const json = await res.json();
          this.cache = json.record;
          this.lastPull = Date.now();
          return json.record;
        }
      }
    } catch (err) {
      console.error(`❌ [Cloud DB Pull Error - ${this.provider}]:`, err.message);
    }
    return null;
  }

  async push(data) {
    if (!this.isConfigured()) return false;

    try {
      if (this.provider === 'upstash') {
        const payload = JSON.stringify(data);
        const res = await fetch(`${this.upstashUrl}/set/classroom_data`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.upstashToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          this.isDirty = false;
          this.cache = data;
          return true;
        } else {
          console.error('[Upstash Push Failed]:', res.status);
        }
      }

      if (this.provider === 'mongodb') {
        const client = await this.getMongoClient();
        const col = client.db('aiclassroom').collection('app_storage');
        await col.updateOne(
          { _id: 'classroom_data' },
          { $set: { _id: 'classroom_data', data: data, updated_at: new Date() } },
          { upsert: true }
        );
        this.isDirty = false;
        this.cache = data;
        return true;
      }

      if (this.provider === 'jsonbin') {
        const res = await fetch(`https://api.jsonbin.io/v3/b/${this.jsonbinId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Master-Key': this.jsonbinKey
          },
          body: JSON.stringify(data)
        });
        if (res.ok) {
          this.isDirty = false;
          this.cache = data;
          return true;
        }
      }
    } catch (err) {
      console.error(`❌ [Cloud DB Push Error - ${this.provider}]:`, err.message);
    }
    return false;
  }
}

module.exports = new CloudAdapter();
