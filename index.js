const express = require('express');
const cors = require('cors');
const app = express(); 
const port = process.env.PORT || 5000; 
require('dotenv').config(); 
app.use(express.json()); 
app.get('/', (req, res)=>{
    res.send('tools-manufacture website is running as server.'); 
}); 

app.listen(port, ()=>{
    console.log('port is running at ',port); 
}); 