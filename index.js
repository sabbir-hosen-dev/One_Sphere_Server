const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const morgan = require('morgan');

const port = process.env.PORT || 9000;
const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use(helmet());
app.use(morgan('dev'));

// MongoDB connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@main.yolij.mongodb.net/?retryWrites=true&w=majority&appName=Main`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Middleware for verifying JWT
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  // if (!token) return res.status(401).send({ message: 'Unauthorized access' });

  // jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
  //   if (err) return res.status(401).send({ message: 'Unauthorized access' });
  //   req.user = decoded;
  //   next();
  // });
  next();
};

async function run() {
  try {
    await client.connect();
    const db = client.db(process.env.DB_NAME);
    const jobsCollection = db.collection('Jobs');
    const bidsCollection = db.collection('Bids');

    // Generate JWT
    app.post('/jwt', async (req, res) => {
      const email = req.body;
      const token = jwt.sign(email, process.env.SECRET_KEY, { expiresIn: '365d' });
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        })
        .send({ success: true });
    });

    // Logout
    app.get('/logout', (req, res) => {
      res
        .clearCookie('token', {
          maxAge: 0,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        })
        .send({ success: true });
    });

    // Add a job
    app.post('/add-job', async (req, res) => {
      const jobData = req.body;
      const result = await jobsCollection.insertOne(jobData);
      res.send(result);
    });

    // Get all jobs
    app.get('/jobs', async (req, res) => {
      const jobs = await jobsCollection.find().toArray();
      res.send(jobs);
    });
    

    // Get jobs posted by a specific user
    app.get('/jobs/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      const decodedEmail = req.user?.email;
      if (decodedEmail !== email)
        return res.status(401).send({ message: 'Unauthorized access' });

      const query = { 'buyer.email': email };
      const result = await jobsCollection.find(query).toArray();
      res.send(result);
    });

    // Delete a job
    app.delete('/job/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobsCollection.deleteOne(query);
      res.send(result);
    });

    // Update a job
    app.put('/update-job/:id', async (req, res) => {
      const id = req.params.id;
      const jobData = req.body;
      const query = { _id: new ObjectId(id) };
      const updated = { $set: jobData };
      const options = { upsert: true };
      const result = await jobsCollection.updateOne(query, updated, options);
      res.send(result);
    });

    // Add a bid
    app.post('/add-bid', async (req, res) => {
      const bidData = req.body;
      const query = { email: bidData.email, jobId: bidData.jobId };
      const alreadyExist = await bidsCollection.findOne(query);

      if (alreadyExist)
        return res.status(400).send('You have already placed a bid on this job!');

      const result = await bidsCollection.insertOne(bidData);
      const filter = { _id: new ObjectId(bidData.jobId) };
      const update = { $inc: { bid_count: 1 } };
      await jobsCollection.updateOne(filter, update);
      res.send(result);
    });

    // Get bids for a specific user
    app.get('/bids/:email', verifyToken, async (req, res) => {
      const isBuyer = req.query.buyer;
      const email = req.params.email;
      const decodedEmail = req.user?.email;

      if (decodedEmail !== email)
        return res.status(401).send({ message: 'Unauthorized access' });

      let query = {};
      if (isBuyer) {
        query.buyer = email;
      } else {
        query.email = email;
      }

      const result = await bidsCollection.find(query).toArray();
      res.send(result);
    });

    // Update bid status
    app.patch('/bid-status-update/:id', async (req, res) => {
      const id = req.params.id;
      const { status } = req.body;

      const filter = { _id: new ObjectId(id) };
      const updated = { $set: { status } };
      const result = await bidsCollection.updateOne(filter, updated);
      res.send(result);
    });

    console.log('Connected to MongoDB!');
  } catch (err) {
    console.error(err);
  }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello from SoloSphere Server....');
});

app.listen(port, () => console.log(`Server running on port ${port}`));
