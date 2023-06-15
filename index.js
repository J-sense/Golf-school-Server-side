const express = require('express')
const cors = require('cors')
const app = express()
require('dotenv').config()
const jwt = require('jsonwebtoken')
const port = process.env.PORT || 5000;
const stripe= require('stripe')(process.env.PAYMENT_SECRET_KEY)
const { ObjectId } = require('mongodb');



app.use(cors())
app.use(express.json())
const veryfyJwt = (req, res, next) => {
    const authorization = req.headers.authorization
    if (!authorization) {
        return res.status(401).send({ error: true, massage: 'unathorizes access' })
    }
    const token = authorization.split(' ')[1]
    jwt.verify(token, process.env.ACESS_TOLEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: true, massage: 'unathorizes access' })
        }
        req.decoded = decoded
        next()
    })
}



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
        const userCollection = client.db('userdb').collection('users')
        const classCollection = client.db('userdb').collection('classes')
        const selectedClassesCollection = client.db('userdb').collection('selectedClass')
        const paymentsCollection = client.db('userdb').collection('payment')
        const enrolledClassesCollection = client.db('userdb').collection('enrolledClasses')




        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACESS_TOLEN_SECRET, { expiresIn: '1h' })
            res.send({ token })
        })

        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await userCollection.findOne(query);
            // if (user?.role !== 'admin') {
            // if (!user || user.role !== 'admin')
            if (user?.role !== 'admin') {
                return res.status(403).send({ error: true, message: 'forbidden message' });
            }
            next();
        }


        // Warning: use verifyJWT before using verifyInstructor
        const verifyInstructor = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await userCollection.findOne(query);
            // if (!user || (user.role !== 'instructor' && user.role !== 'admin')) {
            if (user.role !== 'instructor') {
                return res.status(403).send({ error: true, message: 'forbidden message' });
            }
            next();
        }

        // Warning: use verifyJWT before using veryfystudent
        const verifyStudent = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await userCollection.findOne(query);
            // if (!user || (user.role !== 'atudent' && user.role !== 'admin')) {
            if (user.role !== 'student') {
                return res.status(403).send({ error: true, message: 'forbidden message' });
            }
            next();
        }


        // post the user in api
        app.post('/users', async (req, res) => {
            const user = req.body;
            console.log(user);
            user.role = 'student';
            const query = { email: user.email };
            const existingUser = await userCollection.findOne(query);
            if (existingUser) {
                console.log('User already exists');
                return res.send({ message: 'User already exists' });
            }
            const result = await userCollection.insertOne(user);
            res.send(result);
        })


        app.get('/users/admin/:email', veryfyJwt, async (req, res) => {
            const email = req.params.email;
            if (req.decoded.email !== email) {
                res.send({ admin: false })
            }
            const query = { email: email }
            const user = await userCollection.findOne(query);
            const result = { admin: user?.role === 'admin' }
            res.send(result)
        })


        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const fillter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await userCollection.updateOne(fillter, updateDoc)
            res.send(result)
        })


        app.get('/users/instructor/:email', veryfyJwt, async (req, res) => {
            const email = req.params.email;
            if (req.decoded.email !== email) {
                res.send({ instructor: false })
            }
            const query = { email: email }
            const user = await userCollection.findOne(query);
            const result = { instructor: user?.role === 'instructor' }
            res.send(result)
        })


        app.patch('/users/instructor/:id', async (req, res) => {
            const id = req.params.id;
            const fillter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    role: 'instructor'
                }
            }
            const result = await userCollection.updateOne(fillter, updateDoc)
            res.send(result)
        })



        app.get('/users', veryfyJwt, verifyAdmin, async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result)
        })

        // add to course classes
        app.post('/addClasses', async (req, res) => {
            const addclass = req.body
            console.log(addclass)
            const result = await classCollection.insertOne(addclass)
            res.send(result)
        })


        app.get('/addClasses', veryfyJwt, async (req, res) => {
            console.log(req.query.email);
            let query = {};
            if (req.query?.email) {
                query = { instructorEmail: req.query.email }
            }
            const result = await classCollection.find(query).toArray()
            res.send(result)
        })



        app.get('/allClasses', async (req, res) => {
            const result = await classCollection.find().toArray()
            res.send(result)
        })


        // make class status approved
        app.patch('/addClasses/approve/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }; // Update the filter to match the email field
            const updatedDoc = {
                $set: {
                    status: "approved",
                },
            };
            const result = await classCollection.updateOne(filter, updatedDoc);
            res.send(result);
        });

        // make class status deny
        app.patch('/addClasses/deny/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }; // Update the filter to match the email field
            const updatedDoc = {
                $set: {
                    status: "denied",
                },
            };
            const result = await classCollection.updateOne(filter, updatedDoc);
            res.send(result);
        });



        // for display all the instructor : by get operation
        app.get('/instructors', async (req, res) => {
            // const role = req.query.role;
            const role = 'instructor';
            const query = { role: role };
            const result = await userCollection.find(query).toArray();
            res.send(result);
        })

        // for display approved card
        app.get('/approvedCard', async (req, res) => {
            const status = 'approved';
            const query = { status: status };
            const result = await classCollection.find(query).toArray();

            res.send(result);
        })



        app.post('/selectedClasses', async (req, res) => {
            const selectedClass = req.body;
            const result = await selectedClassesCollection.insertOne(selectedClass);
            res.send(result);
        })

        app.get('/selectedClasses/:email', veryfyJwt, verifyStudent, async (req, res) => {
            const email = req.params.email;
            const query = { studentEmail: email };
            console.log(query);
            const result = await selectedClassesCollection.find(query).toArray();
            // console.log(result);
            res.send(result);
        })

        // for delete class
        app.delete('/selectedClasses/:id', veryfyJwt, verifyStudent, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await selectedClassesCollection.deleteOne(query);
            // console.log(result);
            res.send(result);
        })


        // payment
        app.post('/create-payment-intent', veryfyJwt, async (req, res) => {
            const { price } = req.body;
            console.log(price);
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });

            res.send({
                clientSecret: paymentIntent.client_secret,
            })
        });

      
        app.post('/payments', veryfyJwt, async (req, res) => {
            const payment = req.body;
            console.log(payment);
            const insertedResult = await paymentsCollection.insertOne(payment); // ok

            const queryClass = {
                _id: new ObjectId(payment.selectedClassId)
            };

            const query = {
                selectClassId: payment.selectedClassId
            };

            const findEnrolledClasses = await selectedClassesCollection.findOne(query);
            const insertOnEnrollment = await enrolledClassesCollection.insertOne(findEnrolledClasses);
            const deletedResult = await selectedClassesCollection.deleteOne(query);

            const updateClass = {
                $inc: {
                    availableSeats: -1,
                    enrolled: 1
                }
            }

            const updateClassCollection = await classCollection.updateOne(queryClass, updateClass);
            res.send({ insertedResult, deletedResult, insertOnEnrollment, updateClassCollection });
        })
        // payment


        // payment history query by email
        app.get('/paymentSuccessfull/:email', veryfyJwt, verifyStudent, async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const result = await paymentsCollection.find(query).sort({ date: -1 }).toArray();
            res.send(result);
        })

        // enrolled class 
        app.get('/enrolledStudent/:email', veryfyJwt, verifyStudent, async (req, res) => {
            const email = req.params.email;
            const query = { studentEmail: email };
            const result = await enrolledClassesCollection.find(query).toArray();
            res.send(result);
        })

        // top classes base on enroll by student
        // app.get('/topClasses', async (req, res) => {
        //     const result = await classCollection.find().sort({ enrolled: -1 }).limit(6).toArray();
        //     res.send(result);
        // })


       
        app.get('/instructors', async (req, res) => {
            // const role = req.query.role;
            const role = 'instructor';
            const query = { role: role };
            const result = await userCollection.find(query).toArray();
            res.send(result);
        })

        app.get('/popularInstructors', async (req, res) => {
            const role = 'instructor';
            const query = { role: role };
            const result = await userCollection.find(query).limit(6).toArray();
            res.send(result);
        })

        
        app.get('/topClasses', async (req, res) => {
            const result = await classCollection.find().sort({ enrolled: -1 }).limit(6).toArray();
            res.send(result);
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