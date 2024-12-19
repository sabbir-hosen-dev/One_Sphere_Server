const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const port = process.env.PORT || 9000;
const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:5173', // Ensure the frontend URL is correct
  credentials: true,
}));
app.use(express.json());
app.use(bodyParser.json());
app.use(cookieParser());

// MongoDB credentials and connection URI
const dbUser = process.env.DB_USER;
const dbPass = process.env.DB_PASS;
const dbName = process.env.DB_NAME;
const SecritKey = process.env.SECRET_KEY;

const uri = `mongodb+srv://${dbUser}:${dbPass}@cluster0.vankq.mongodb.net/${dbName}?retryWrites=true&w=majority`;


const client = new MongoClient(uri, {
  serverApi: ServerApiVersion.v1,
});

// Verify Token middleware
const verifyToken = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).send('Unauthorized');
  }

  jwt.verify(token, SecritKey, (err, decoded) => {
    if (err) {
      return res.status(401).send('Unauthorized');
    }

    req.user = decoded;
    next();
  });
};

app.use((req, res, next) => {
  console.log(`Received request at ${req.method} ${req.url}`);
  next();
});

async function run() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const jobsCollection = client.db(dbName).collection('Jobs');

    // Route to handle JWT creation and cookie setting
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      if (!user.email) {
        return res.status(400).send({ error: 'Email is required' });
      }

      const token = jwt.sign(user, SecritKey, { expiresIn: '1h' });
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        })
        .send({ success: true, token });
    });

    // Route for posting jobs (protected by verifyToken)
    app.post('/jobs', verifyToken, async (req, res) => {
      const jobData = req.body;
      try {
        const result = await jobsCollection.insertOne(jobData);
        res.status(201).send(result);
      } catch (error) {
        res.status(500).send({ error: 'Failed to add job' });
      }
    });

    // Route to get all jobs
    app.get('/jobs', async (req, res) => {
      try {
        const jobs = await jobsCollection.find().toArray();
        res.send(jobs);
      } catch (error) {
        res.status(500).send({ error: 'Failed to fetch jobs' });
      }
    });

    // Get job by ID
    app.get('/job/:id', async (req, res) => {
      const { id } = req.params;
      try {
        const job = await jobsCollection.findOne({ _id: new ObjectId(id) });
        res.send(job);
      } catch (error) {
        res.status(500).send({ error: 'Failed to fetch job' });
      }
    });

    // Filter jobs by category
    app.get('/jobs/category/:category', async (req, res) => {
      const { category } = req.params;
      try {
        const jobs = await jobsCollection.find({ category }).toArray();
        res.send(jobs);
      } catch (error) {
        res.status(500).send({ error: 'Failed to fetch jobs by category' });
      }
    });

  } catch (error) {
    console.error('MongoDB connection error:', error);
  }
}

run().catch(console.error);

// Test route
app.get('/', (req, res) => {
  res.send('Hello from OneSphere Server....');
});

// Start the server
app.listen(port, () => console.log(`Server running on port ${port}`));
