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

function verifyJWT(req, res, next){
    const authHeader = req.headers.authorization; 
    if(!authHeader){
        return res.status(401).send({message: 'UnAuthorized Access'}); 
    }
    else{
        const token = authHeader.split(' ')[1]; 
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (error, decoded){
            if(error){
                return res.status(403).send({message: 'Forbidden Access'})
            }
            req.decoded = decoded; 
            next(); 
        })
    }
}



async function run(){
    try{
        // Setting connection first. 
        await client.connect(); 

        const toolsCollection = client.db('toolNeeded').collection('tools'); 

        const infoCollection = client.db('toolNeeded').collection('information'); 

        const reviewCollection = client.db('toolNeeded').collection('review');

        const updatedCollection = client.db('toolNeeded').collection('updateduser'); 

        const userCollection = client.db('toolNeeded').collection('allUsers'); 

        // getting all data from db; 
        app.get('/tools', async (req, res)=>{
            const query = {}; 
            const result = await toolsCollection.find().toArray(); 
            res.send(result); 
        }); 


        // Get a particullar product clicking place order button. 

        app.get('/parchas/:id', async (req, res)=>{
            const id = req.params.id; 
            const query = {_id: ObjectId(id)}; 
            const result = await toolsCollection.findOne(query); 
            res.send(result); 
        }); 

        app.get('/toolForPayment/:id', async (req, res)=>{
            const id = req.params.id; 
            const query = {_id: ObjectId(id)}; 
            const result = await infoCollection.findOne(query); 
            res.send(result); 
        }); 


        // Add user info and products info

        app.post('/addUserProduct', async (req, res)=>{
            const info = req.body; 
            const result = await infoCollection.insertOne(info); 
            res.send(result); 
        }); 


        app.get('/getOrderedProducts/:email', verifyJWT, async (req, res)=>{
            const email = req.params.email;
            const decodedEmail = req.decoded.email; 
            if(email === decodedEmail){
            const query = {email: email}; 
            const result = await infoCollection.find(query).toArray(); 
            return res.send(result); 
            }
            else{
                return res.status(403).send({message: 'Forbidden Access'}); 
            }
        }); 

        // Delete product. 
        app.delete('/deleteProduct/:id', async (req, res) => {
            const id = req.params.id; 
            const filter = {_id: ObjectId(id)};
            const result = await infoCollection.deleteOne(filter);
            res.send(result);   
        }); 


        // Add user review to the database

        app.post('/review', async (req, res)=>{
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
        app.put('/adduser/:email', async (req, res)=>{
            const email = req.params.email; 
            const newUser = req.body; 
            const filter = {email: email}; 
            const option = {upsert: true}; 
            const updateDoc = {
                $set: {
                    name: newUser?.userName, 
                    email: newUser?.userEmail
                }
            }
            const result = await userCollection.updateOne(filter, updateDoc, option);
            const token = jwt.sign({email: email}, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1d'}); 
            res.send({result, token}); 
        }); 


        // Get all the users for admin
        app.get('/users', async (req, res)=>{
            const result = await userCollection.find().toArray(); 
            res.send(result); 
        })


        // make a user as admin
        app.put('/user/admin/:email', verifyJWT, async (req, res)=>{
            const email = req.params.email;
            const decodedEmail = req.decoded.email; 
            const requester = req.body; 
            const requesterEmail = await userCollection.findOne({email:requester?.requester}); 
            console.log('email',email); 
            console.log('decoded email',email); 
            console.log('requester',requesterEmail); 
            if(email === decodedEmail){
                if(requesterEmail.act === 'admin'){
                    console.log('got inter'); 
                    const filter = {email: email}; 
                    const updateDoc = {
                        $set: {act: 'admin'}
                    }
                    const result = await userCollection.updateOne(filter, updateDoc); 
                    res.send(result); 
                    console.log(result);
                }
                else{
                    res.send('Sorry, Only admin can make someone admin'); 
                }
            }
            else{
                return res.status(403).send({message: 'Forbidden Access'}); 
            }
            
        }); 

        // Checking a general user admin or not
        app.get('/adminUser/:email', async (req, res) => {
            const email = req.params.email; 
            const query = {email: email}; 
            const result = await userCollection.findOne(query); 
            if(result?.act === 'admin'){
                res.send(result); 
            }
        }); 

        // Add a product to database by user
        app.post('/addproduct', async (req, res) =>{
            const data = req.body; 
            const result = await toolsCollection.insertOne(data); 
            res.send(result) 
        }); 


        // For payment
        app.post('/create-payment-intent', async(req, res) =>{
            const service = req?.body;
            console.log('service ',service); 
            const price = parseInt(service.price);
            const amount = price*100;
            const paymentIntent = await stripe.paymentIntents.create({
              amount : amount,
              currency: 'usd',
              payment_method_types:['card']
            });
            res.send({clientSecret: paymentIntent.client_secret})
          });



        // Updating the quantity
        app.put('/product/:id', async (req, res)=>{
            const id = req.params.id; 
            const updatedProduct = req.body; 
            const filter = {_id:ObjectId(id)}; 
            const option = {upsert: true}; 
            const updateDoc = {
                $set: {
                    availableQuantity : updatedProduct.updatedProduct 
                }
            }; 
            const result = await toolsCollection.updateOne(filter, updateDoc, option); 
            res.send(result); 
        }); 


        // Get all the product for admin
        app.get('/allProductForAdmin', async (req, res) => {
            const result = await infoCollection.find().toArray(); 
            res.send(result); 
        }); 

        // Delete a product by admin
        app.delete('/deleteProduct/:id', async (req, res)=>{
            const id = req.params.id; 
            const filter = {id: ObjectId(id)}; 
            const result = await infoCollection.deleteOne(filter); 
            res.send(result); 
        })




    }
    finally{

    }
}
run().catch(console.dir);




app.get('/', (req, res)=>{
    res.send('tools-manufacture website is running as server.'); 
}); 

app.listen(port, ()=>{
    console.log('port is running at ',port); 
}); 