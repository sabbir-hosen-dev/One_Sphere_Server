const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const port = process.env.PORT || 9000;
const app = express();

app.use(cors());
app.use(express.json());

// const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/';

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vankq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const jobsCollection = client.db(`${process.DB_NAME}`).collection('Jobs');

    // Add Jopbs  
    app.post('/jobs', async (req, res) => {
      const data = req.body;
      const result = await jobsCollection.insertOne(data);
      res.send(result)
    });

    //get All Jobs
    app.get("/jobs", async (req,res) => {
      console.log("rew")
      const result = await jobsCollection.find().toArray();
      res.send(result)
    })


    //get email by jobs
    app.get("/jobs/:email", async(req,res) => {
      const email = req.params.email;

      const query = {"user.email" : email};
      const result = await jobsCollection.find(query).toArray();
      res.send(result)
    })

    // get job by id 

    app.get("/job/:id",async(req,res) => {
      const id = req.params.id;
      const query = {_id : new ObjectId(id)}
      const result = await jobsCollection.findOne(query);
      console.log(result)
      res.send(result)
    })

    // filter by category 

    app.get("/jobs/category/:category",async(req,res) => {
      const category = req.params.category;
      const query = {category : category};
      const result = await jobsCollection.find(query).toArray();
      res.send(result)
    })

  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello from OneSphere Server....');
});

app.listen(port, () => console.log(`Server running on port ${port}`));
