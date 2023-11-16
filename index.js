const express = require('express');
const app = express();
require('dotenv').config();
const jwt = require('jsonwebtoken');
const cors = require('cors');
const port = process.env.PORT || 5000;

// middleware

app.use(cors());
app.use(express.json());

const verifyJWT = (req,res,next) =>{
  const authorization = req.headers.authorization;
  if(!authorization){
    return res.status(401).send({error: true, message: 'Unauthorized access'});
  }
  // bearer token
  const token = authorization.split(' ')[1];
  jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded) =>{
    if(err){
      return res.status(401).send({error: true, message: 'Unauthorized access'})
    }
    req.decoded = decoded;
    next();
  })
}


// db connection
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cn37c5v.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const usersCollection = client.db("eRestaurant").collection("users");
    const menuCollection = client.db("eRestaurant").collection("menu");
    const reviewCollection = client.db("eRestaurant").collection("review");
    const cartCollection = client.db("eRestaurant").collection("carts");
    const testCollection = client.db("eRestaurant").collection("test");

    // jWT token

    app.post('/jwt',(req,res)=>{
      const user = req.body;
      const token = jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{expiresIn: '1h'})
      res.send({token})
    })

    // User related apis
    app.get('/users', async(req,res)=>{
      const result = await usersCollection.find().toArray();
      res.send(result);
    })

    app.post('/users',async(req,res)=>{
      const user = req.body;
      console.log(user);
      const query = {email:user.email}
      const existingUser = await usersCollection.findOne(query);
      if(existingUser){
        return res.send({message: "user already exists"})
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    })

    // security layer: verifyJWT
    // same email
    // check admin
    app.get('/users/admin/:email', verifyJWT, async(req,res)=>{
          const email = req.params.email;
          // 
          if(req.decoded.email !==email){
            res.send({admin: false})
          }
          const query = {email: email};
          const user = await usersCollection.findOne(query);
          const result = {admin: user?.role === 'admin'}
          res.send(result);
    })

    app.patch('/users/admin/:id',async(req,res)=>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)}
      const updateDoc = {
        $set: {
          role: 'admin'
        },
      };
      const result = await usersCollection.updateOne(filter,updateDoc);
      res.send(result);
    })


    // Menu related apis
    app.get('/menu',async(req,res)=>{
      const result = await menuCollection.find().toArray();
      res.send(result);
    })

    // Review related apis
    app.get('/review',async(req,res)=>{
      const result = await reviewCollection.find().toArray();
      res.send(result);
    })
    
    // cart collection apis

    app.get('/carts', verifyJWT, async(req,res)=>{
      const email = req.query.email;
      if(!email){
        return [];
      }
      const decodedEmail = req.decoded.email;
      if(email !== decodedEmail){
        return res.status(403).send({error: true, message: 'Forbidden access'})
      }
      const query = {email: email};
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    })

    app.post('/carts',async(req,res)=>{
      const item = req.body;
      // console.log("geting ing",item);
      const result = await cartCollection.insertOne(item);
      res.send(result);
    })

    // delete data from api

    app.delete('/carts/:id', async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    })
    
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.get('/',(req,res)=>{
    res.send("boss is running");
})

app.listen(port,()=>{
    console.log(`the app is running of port: ${port}`);
})