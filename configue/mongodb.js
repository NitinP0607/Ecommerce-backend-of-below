import mongoose, { mongo } from "mongoose";

const connectDb = async ()=>{

    mongoose.connection.on('connected', ()=>{
        console.log("DB Connected")
    })
    await mongoose.connect(`${process.env.MONGO_URI}/nytra`)
}

export default connectDb