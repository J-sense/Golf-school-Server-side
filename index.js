const express = require('express')
const cors = require('cors')
const app = express()
require('dotenv').config()
const jwt = require('jsonwebtoken')
const port = process.env.PORT || 5000;
const { ObjectId } = require('mongodb');
const veryfyJwt =(req, res, next)=>{
    const authorization = req.headers.authorization
    if(!authorization){
        return res.status(401).send({error : true, massage: 'unathorizes access'})
    }
    const token = authorization.split(' ')[1]
    jwt.verify(token,env.ACESS_TOLEN_SECRET,(err,decoded)=>{
        if(err){
            return res.status(401).send({error : true, massage: 'unathorizes access'})
        }
        req.decoded =decoded
        next();
    })
}


app.use(cors())
app.use(express.json())



const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.xdarlyt.mongodb.net/?retryWrites=true&w=majority`;

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
        const userCollection =client.db('userdb').collection('users')
        app.post('/users',async(req,res)=>{
            const user = req.body;
            console.log(user)
            const result = await userCollection.insertOne(user)
            res.send(result)
        })
        app.post('/jwt',(req,res)=>{
            const user = req.body;
            const token = jwt.sign(user,process.env.ACESS_TOLEN_SECRET,{expiresIn:'1h'})
            res.send({token})
        })
        app.get('/users', async (req,res)=>{
            const result =await userCollection.find().toArray();
            res.send(result)
        })
        app.patch('/users/admin/:id' , async(req, res)=>{
            const id = req.params.id;
            const fillter = {_id : new ObjectId(id)}
            const updateDoc ={
                $set : {
                    role: 'admin'
                }
            }
            const result = await userCollection.updateOne(fillter,updateDoc)
            res.send(result)
        })
        app.patch('/users/instructor/:id' , async(req, res)=>{
            const id = req.params.id;
            const fillter = {_id : new ObjectId(id)}
            const updateDoc ={
                $set : {
                    role: 'instructor'
                }
            }
            const result = await userCollection.updateOne(fillter,updateDoc)
            res.send(result)
        })
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', async (req, res) => {
    res.send('golf is running on port')
})
app.listen(port, () => {
    console.log(`golf server running on por${port}`)
})