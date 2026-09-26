import userModel from "../models/userModel.js";
import validator from "validator";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"


const createToken = (id)=>{
    return jwt.sign({id}, process.env.JWT_SECRET)
}

//Route for user Login
const loginUser = async (req, res) => {
    try {
        const {email, password} = req.body;
        const user = await userModel.findOne({email})



        if(!user){
            return res.json({
                success: false,
                message: "No user found"
            });
        }
        const isMatch = await bcrypt.compare(password, user.password);

        if(isMatch){
            const token = createToken(user._id)
            res.json({
                success:true,
                message:"Congratulation! you are logged successfully",
                token
            })
        }
        else{
            res.json({
                success:false,
                message: "Invalid credentials"
            })
        }
    } catch (error) {
        console.log(error);
        res.json({
            success:false,
            message:error.message
        })
    }

}

//Route for user Registration
const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body

        const exist = await userModel.findOne({ email });
        if (exist) {
            return res.json({
                success: false,
                message: "user already exist"
            });
        }
        //validating email formate and  strong formate
        if (!validator.isEmail(email)) {
            return res.json({
                success: false,
                message: "Please enter a valid email"
            })
        }
        if (password.length < 8) {
            return res.json({
                success: false,
                message: "Please enter a strong password"
            })
        }
        // Hashing User password
        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)

        const newUser = new userModel({
            name,
            email,
            password: hashedPassword
        })

        const user = await newUser.save();

        const token = createToken(user._id)

        res.json({
            success:true,
            message: "Account created successfully",
            token
        })

    } catch (error) {
        console.log(error);
        res.json({
            success:false,
            message:error.message
        })
    }
}

//Route for Admin Login
const adminLogin = async (req, res) => {
    const {email, password} = req.body
    if(email ===process.env.ADMIN_EMAIL && password ===process.env.ADMIN_PASSWORD){
        const token = jwt.sign(email+password, process.env.JWT_SECRET)
        res.json({
            success:true,
            token
        })
    }
    else{
        res.json({
            success:false,
            message:"Invalid Credentials"
        })
    }

}

export { loginUser, registerUser, adminLogin }