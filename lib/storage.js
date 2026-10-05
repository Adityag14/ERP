const fs = require('fs');
const path = require('path');
const { GetObjectCommand, PutObjectCommand, S3Client } = require('@aws-sdk/client-s3');

const seedFiles = {
  activities: 'activities.json',
  campaigns: 'campaigns.json',
  contacts: 'contacts.json',
  deals: 'deals.json',
  tasks: 'tasks.json',
  tickets: 'tickets.json',
};

let client;
const localCollections = new Map();

function getStore() {
  const bucket = process.env.AWS_S3_BUCKET;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!bucket) throw new Error('AWS_S3_BUCKET is required for persistent storage.');
  if (!accessKeyId || !secretAccessKey) {
    throw new Error('AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are required for persistent storage.');
  }

  if (!client) {
    const endpoint = process.env.AWS_ENDPOINT_URL_S3;
    client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: { accessKeyId, secretAccessKey },
      ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    });
  }

  return { bucket, client };
}

function getSeedData(collection) {
  const fileName = seedFiles[collection];
  if (!fileName) throw new Error(`Unknown data collection: ${collection}`);
  const filePath = path.join(__dirname, '..', 'data', fileName);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

async function bodyToString(body) {
  if (typeof body.transformToString === 'function') return body.transformToString();
  const chunks = [];
  for await (const chunk of body) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

async function readCollection(collection) {
  if (!process.env.AWS_S3_BUCKET && !process.env.VERCEL) {
    if (!localCollections.has(collection)) localCollections.set(collection, getSeedData(collection));
    return localCollections.get(collection);
  }

  const { bucket, client: s3 } = getStore();
  const key = `crm/${collection}.json`;

  try {
    const response = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    return JSON.parse(await bodyToString(response.Body));
  } catch (error) {
    const isMissing = error.name === 'NoSuchKey' || error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404;
    if (!isMissing) throw error;

    const seedData = getSeedData(collection);
    await writeCollection(collection, seedData);
    return seedData;
  }
}

async function writeCollection(collection, data) {
  if (!seedFiles[collection]) throw new Error(`Unknown data collection: ${collection}`);
  if (!process.env.AWS_S3_BUCKET && !process.env.VERCEL) {
    localCollections.set(collection, data);
    return;
  }

  const { bucket, client: s3 } = getStore();
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: `crm/${collection}.json`,
    Body: JSON.stringify(data),
    ContentType: 'application/json',
  }));
}

module.exports = { readCollection, writeCollection };
