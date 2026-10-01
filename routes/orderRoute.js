import express from "express"

import {placeOrder, placeorderStripe, placeRazorpay, allOrders, userOrders, updateStatus, verifyRazorpay}  from "../controllers/orderController.js"
import adminAuth from "../middleware/adminAuth.js";
import authUser from "../middleware/auth.js";

const orderRouter = express.Router();



// ADMIN FEATURES

orderRouter.post('/list',adminAuth, allOrders) 
orderRouter.post('/update-status',adminAuth, updateStatus) 

//PAYMENT FEATURES

orderRouter.post('/place',authUser, placeOrder)
orderRouter.post('/stripe',authUser, placeorderStripe)
orderRouter.post('/razorpay',authUser, placeRazorpay)

//verify Payments 

orderRouter.post('/verify-razorpay',authUser, verifyRazorpay)

//USER FEATURE

orderRouter.post('/userorders', authUser, userOrders)

export default orderRouter
