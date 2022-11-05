const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const app = express()
const port = process.env.PORT || 5000
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config() /* to hide DB credential */

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
    res.send('server is running')
})

app.listen(port, () => {
    console.log(`listening from port ${port}`)
})

/*--------------------
  mongoDB connection 
  -------------------*/
/* hide DB credential */
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.mniec4l.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

/* verify and decode JWT token from client */
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    // console.log(authHeader)
    if (!authHeader) {
        return res.status(401).send({ message: 'Unauthorized Access' })
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden User' })
        }
        req.decoded = decoded;
        next();
    });
}

async function run() {
    try {
        /* create a DB in mongoDB for all services */
        const serviceCollection = client.db('cool-car').collection('services');

        /* to show DB's data to UI */
        /* API to get all services */
        app.get('/services', async (req, res) => {
            const query = {}
            const cursor = serviceCollection.find(query)
            const services = await cursor.toArray()
            res.send(services)
        });

        /* API to get a specific service/data */
        app.get('/services/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const service = await serviceCollection.findOne(query);
            res.send(service)
        });

        /* create a DB in mongoDB for all orders */
        const orderCollection = client.db('cool-car').collection('orders');

        /* (CREATE)create single single data from client side info */
        app.post('/orders', async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send(result);
        })

        /* create JWT token API */
        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '7d' })
            res.send({ token })
        })

        /* (READ)create API to get all orders data */
        app.get('/orders', verifyJWT, async (req, res) => {
            /* verify user with jwt token */
            const decoded = req.decoded;
            // console.log(decoded)
            if (decoded.email !== req.query.email) {
                return res.status(403).send({ message: 'Forbidden User' })
            }
            let query = {}
            /* find specific user's order with email */
            if (req.query.email) {
                query = {
                    email: req.query.email
                }
            }
            const cursor = orderCollection.find(query)
            const orders = await cursor.toArray()
            res.send(orders)
        });

        /* (UPDATE) create API to partially update a specific data from server and DB */
        app.patch('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const status = req.body.status;
            const query = { _id: ObjectId(id) }
            const updatedDoc = {
                $set: {
                    status: status
                }
            }
            const result = await orderCollection.updateOne(query, updatedDoc);
            res.send(result)
        });

        /* (DELETE) create API to delete a specific data from server and DB */
        app.delete('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await orderCollection.deleteOne(query)
            res.send(result)
        });
    }
    finally {

    }
}
run().catch(error => console.error(error))
