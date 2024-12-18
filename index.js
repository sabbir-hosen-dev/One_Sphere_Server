const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser')
require('dotenv').config();

const port = process.env.PORT || 9000;
const app = express();

app.use(cors({
  origin: ['http://localhost:5173'], 
  credentials: true,
}));

app.use(express.json());
app.use(bodyParser.json());
app.use(cookieParser())

const dbUser = process.env.DB_USER;
const dbPass = process.env.DB_PASS;
const dbName = process.env.DB_NAME;
const SecritKey = process.env.SECRET_KEY;

// const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/';

const uri = `mongodb+srv://${dbUser}:${dbPass}@cluster0.vankq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});


const verefyToken = (req,res,next) => {
    const token = req?.cookies?.token;
    if(!token) {
      return res.status(401).send("Unauthorized")
    }

    jwt.verefyToken(token, SecritKey, (err,decode) => {
      if(err) {
        return res.status(401).send("Unauthorized")
      }
    })
    req.user = decode ;
    next();
} 

async function run() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const jobsCollection = client.db(`${dbName}`).collection('Jobs');

    //jwt
    app.post('/jwt', async (req, res) => {

      const user = req.body;
    
      const token = jwt.sign(user, SecritKey, { expiresIn: '1h' });
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: false,
        })
        .send({ success: true });
    });



    // Add Jopbs
    app.post('/jobs', async (req, res) => {
      const data = req.body;
      const result = await jobsCollection.insertOne(data);
      res.send(result);
    });

    //get All Jobs
    app.get('/jobs', async (req, res) => {
      console.log('rew');
      const result = await jobsCollection.find().toArray();
      res.send(result);
    });

    //get email by jobs
    app.get('/jobs/:email',verefyToken, async (req, res) => {
      const email = req.params.email;

      if (req.user.email !== email) {
        return res.status(403).send({ error: 'Forbidden: Email mismatch' });
      }

      const query = { 'user.email': email };
      const result = await jobsCollection.find(query).toArray();
      res.send(result);
    });

    // get job by id

    app.get('/job/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobsCollection.findOne(query);
      console.log(result);
      res.send(result);
    });

    // filter by category

    app.get('/jobs/category/:category', async (req, res) => {
      const category = req.params.category;
      const query = { category: category };
      const result = await jobsCollection.find(query).toArray();
      res.send(result);
    });
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello from OneSphere Server....');
});

app.listen(port, () => console.log(`Server running on port ${port}`));
