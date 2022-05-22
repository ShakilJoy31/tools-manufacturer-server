const express = require('express');
const cors = require('cors');
const app = express(); 
const port = process.env.PORT || 5000; 
require('dotenv').config(); 
app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { query } = require('express');

const uri = `mongodb+srv://${process.env.USER}:${process.env.PASSWORD}@cluster0.1tedy.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });



async function run(){
    try{
        // Setting connection first. 
        await client.connect(); 

        const toolsCollection = client.db('toolNeeded').collection('tools'); 

        const infoCollection = client.db('toolNeeded').collection('information'); 

        const reviewCollection = client.db('toolNeeded').collection('review');

        const updatedCollection = client.db('toolNeeded').collection('updateduser'); 

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


        // Add user info and products info

        app.post('/addUserProduct', async (req, res)=>{
            const info = req.body; 
            const result = await infoCollection.insertOne(info); 
            res.send(result); 
        }); 


        app.get('/getOrderedProducts/:email', async (req, res)=>{
            const email = req.params.email; 
            const query = {email: email}; 
            const result = await infoCollection.find(query).toArray(); 
            res.send(result); 
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


        // Update profile and save to the database

        app.post('/updateProfile', async (req, res) => {
            const updatedData = req.body; 
            const result = await updatedCollection.insertOne(updatedData);
            res.send(result); 
        })


        // Updating the quantity
        // app.put('/product/:id', async (req, res)=>{
        //     const id = req.params.id; 
        //     console.log(id); 
        //     const updatedProduct = req.body; 
        //     const filter = {_id:ObjectId(id)}; 
        //     const option = {upsert: true}; 
        //     console.log(updatedProduct); 
        //     const updateDoc = {
        //         $set: {
        //             availableQuantity : updatedProduct.updatedProduct 
        //         }
        //     }; 
        //     const result = await toolsCollection.updateOne(filter, updateDoc, option); 
        //     res.send(result); 
        // }); 




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