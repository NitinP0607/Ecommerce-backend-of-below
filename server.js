import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import connectDb from './configue/mongodb.js';
import connectCloudinary from './cloudinary/cloudinary.js';
import userRouter from './routes/userRoute.js';
import productRouter from './routes/productRoute.js';
import cartRouter from './routes/cartRoute.js';
import orderRouter from './routes/orderRoute.js';

//App config

const app = express();
const port = process.env.PORT||4000
connectDb();
connectCloudinary();


//middlewares

app.use(cors({
  origin: [
    "https://ecommerce-rose-chi.vercel.app/",
    "https://ecommerce-rose-chi.vercel.app",
    "http://localhost:5174/",
    "http://localhost:5174",
    "http://localhost:5173",
    "http://localhost:5173"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());

//API endpoints
app.use('/api/user', userRouter)
app.use('/api/product', productRouter)
app.use('/api/cart', cartRouter)
app.use('/api/order', orderRouter)

app.get('/',(req,res)=>{
    res.send("API WORKING")
})

app.listen(port, ()=>{
    console.log("server started on PORT :" + port)
})