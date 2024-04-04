import express from 'express'
import 'dotenv/config' 
const app = express()


app.get('/', (req, res) => {
  res.send('Hello World!')
})


app.get('/fuck',(req,res) =>{
    res.send('send hello');
})

app.get('/login',(req,res) =>{
    res.send("<h1>Please login</h1>");
})


app.listen(process.env.PORT, () => {
  console.log(`Example app listening on port ${port}`)
})