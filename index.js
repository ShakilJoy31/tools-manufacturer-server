const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;
require('dotenv').config();
app.use(cors());
app.use(express.json());
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPT_SECRET_KEY);


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { query } = require('express');

const uri = `mongodb+srv://${process.env.USER}:${process.env.PASSWORD}@cluster0.1tedy.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized Access' });
    }
    else {
        const token = authHeader.split(' ')[1];
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (error, decoded) {
            if (error) {
                return res.status(403).send({ message: 'Forbidden Access' })
            }
            req.decoded = decoded;
            next();
        })
    }
}



async function run() {
    try {
        // Setting connection first. 
        await client.connect();

        const toolsCollection = client.db('toolNeeded').collection('tools');

        const infoCollection = client.db('toolNeeded').collection('information');

        const reviewCollection = client.db('toolNeeded').collection('review');

        const updatedCollection = client.db('toolNeeded').collection('updateduser');

        const userCollection = client.db('toolNeeded').collection('allUsers');

        // getting all data from db; 
        app.get('/tools', async (req, res) => {
            const result = await toolsCollection.find().toArray();
            const data = result.reverse().slice(0, 6);
            const tools = data.reverse();
            res.send(tools);
        });


        // Get a particullar product clicking place order button. 

        app.get('/parchas/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await toolsCollection.findOne(query);
            res.send(result);
        });

        app.get('/toolForPayment/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await infoCollection.findOne(query);
            res.send(result);
        });


        // Add user info and products info

        app.post('/addUserProduct', async (req, res) => {
            const info = req.body;
            const result = await infoCollection.insertOne(info);
            res.send(result);
        });


        app.get('/getOrderedProducts/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const decodedEmail = req.decoded.email;
            if (email === decodedEmail) {
                const query = { email: email };
                const result = await infoCollection.find(query).toArray();
                return res.send(result);
            }
            else {
                return res.status(403).send({ message: 'Forbidden Access' });
            }
        });

        // Delete product. 
        app.delete('/deleteProduct/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await infoCollection.deleteOne(filter);
            res.send(result);
        });


        // Add user review to the database

        app.post('/review', async (req, res) => {
            const data = req.body;
            const result = await reviewCollection.insertOne(data);
            res.send(result);
        });


        // Get the user review. 
        app.get('/userReview', async (req, res) => {
            const result = await reviewCollection.find().toArray();
            res.send(result);
        })


        // Update profile and save to the database

        app.post('/updateProfile', async (req, res) => {
            const updatedData = req.body;
            const result = await updatedCollection.insertOne(updatedData);
            res.send(result);
        });

        // Add all user
        app.put('/adduser/:email', async (req, res) => {
            const email = req.params.email;
            const newUser = req.body;
            console.log(newUser);
            const filter = { email: email };
            const option = { upsert: true };
            const updateDoc = {
                $set: {
                    email: newUser?.userEmail,
                    name: newUser?.userName
                }
            }
            const result = await userCollection.updateOne(filter, updateDoc, option);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' });
            res.send({ result, token });
        });


        // Get all the users for admin
        app.get('/users/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const decodedEmail = req.decoded.email;
            const requesterEmail = await userCollection.findOne({ email: decodedEmail });
            ;
            if (requesterEmail?.act === 'admin') {
                const result = await userCollection.find().toArray();
                res.send(result);
            }
            else {
                res.status(401).send({ message: 'Forbidden access' });
            }
        })


        // make a user as admin
        app.put('/user/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const decodedEmail = req.decoded.email;
            const requester = req.body;
            const requesterEmail = await userCollection.findOne({ email: requester?.requester });
            ;

            if (decodedEmail) {
                if (requesterEmail.act === 'admin') {

                    const filter = { email: email };
                    const updateDoc = {
                        $set: { act: 'admin' }
                    }
                    const result = await userCollection.updateOne(filter, updateDoc);
                    res.send(result);
                }
                else {
                    res.send('Sorry, Only admin can make someone admin');
                }
            }
            else {
                return res.status(403).send({ message: 'Forbidden Access' });
            }

        });

        // Checking a general user admin or not
        app.get('/adminUser/:email', verifyJWT, async (req, res) => {
            const decodedEmail = req.decoded.email;
            const requesterEmail = await userCollection.findOne({ email: decodedEmail });
            ;
            if (requesterEmail?.act === 'admin') {
                res.status(200).send({message: 'This is admin email logged in'});
            }
            else {
                res.status(401).send({ message: 'Forbidden access' });
            }
        });

        // Add a product to database by user
        app.post('/addproduct', verifyJWT, async (req, res) => {

            const decodedEmail = req.decoded.email;
            const requesterEmail = await userCollection.findOne({ email: decodedEmail });
            ;
            if (requesterEmail?.act === 'admin') {
                const data = req.body;
                const result = await toolsCollection.insertOne(data);
                res.send(result)
            }
            else {
                res.status(401).send({ message: 'Forbidden access' });
            }
        });


        // For payment
        app.post('/create-payment-intent', async (req, res) => {
            const service = req?.body;
            const price = service.totalPrice;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });
            res.send({ clientSecret: paymentIntent.client_secret })
        });



        // Updating the quantity
        app.put('/product/:id', async (req, res) => {
            const id = req.params.id;
            const updatedProduct = req.body;
            const filter = { _id: ObjectId(id) };
            const option = { upsert: true };
            const updateDoc = {
                $set: {
                    availableQuantity: updatedProduct.updatedProduct
                }
            };
            const result = await toolsCollection.updateOne(filter, updateDoc, option);
            res.send(result);
        });


        // Get all the product for admin
        app.get('/allProductForAdmin', verifyJWT, async (req, res) => {
            const decodedEmail = req.decoded.email;
            const requesterEmail = await userCollection.findOne({ email: decodedEmail });
            ;
            if (requesterEmail?.act === 'admin') {
                const result = await infoCollection.find().toArray();
                res.send(result);
            }
            else {
                res.status(401).send({ message: 'Forbidden access' });
            }
        });



        // Delete a product by admin
        app.delete('/deleteProduct/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { id: ObjectId(id) };
            const result = await infoCollection.deleteOne(filter);
            res.send(result);
        });


        // Get all product for users. 
        app.get('/allAvailableProduct/:email', verifyJWT, async (req, res) => {

            const email = req.params.email;
            const decodedEmail = req.decoded.email;
            const requesterEmail = await userCollection.findOne({ email: decodedEmail });
            ;
            if (requesterEmail?.act === 'admin') {
                const result = await toolsCollection.find().toArray();
                res.send(result);
            }
            else {
                res.status(401).send({ message: 'Forbidden access' });
            }
        });

        // Delete a product by admin 
        app.delete('/deletebyAdmin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await toolsCollection.deleteOne(filter);
            res.send(result);
        });


        // Payment 
        app.put('/paid/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const option = { upsert: true };
            const updateDoc = {
                $set: {
                    paymentStatus: 'paid'
                }
            }
            const result = await infoCollection.updateOne(filter, updateDoc, option);
            res.send(result);
        });


        app.get('/getName/:email', async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const getName = await userCollection.findOne(filter);
            res.send(getName);
        }); 

        app.put('/shippedProduct/:id', async (req, res)=>{
            const id = req.params.id;
            console.log(id);  
            const filter = {_id: ObjectId(id)}; 
            const shipped = req.body; 
            const option = {upsert: true}; 
            console.log(shipped);  
            const updateDoc = {
                $set: {
                    paymentStatus: shipped?.paymentStatus
                }
            }; 
            const result = await infoCollection.updateOne(filter, updateDoc, option); 
            res.send(result); 
        })

    }
    finally {

    }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send('tools-manufacture website is running as server.');
});

app.listen(port, () => {
    console.log('port is running at ', port);
}); 