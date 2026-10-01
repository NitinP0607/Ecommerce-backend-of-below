import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import razorpay from "razorpay"

// Instaces of RazorPay

const razorPayInstances = new razorpay({
    key_id: process.env.RP_API_KEY,
    key_secret: process.env.RP_SECRET_KEY
});

// PlacingOrders COD
const placeOrder = async (req, res) => {
    try {
        const { userId, items, amount, address } = req.body;

        const orderData = {
            userId,
            items,
            address,
            amount,
            paymentMethod: "COD",
            payment: false,
            date: Date.now()
        }

        const newOrder = new orderModel(orderData);
        await newOrder.save();

        await userModel.findByIdAndUpdate(userId, { cartData: {} })

        res.json({
            success: true,
            message: "Order placed successfully"
        })

    } catch (error) {
        console.log(error);
        res.json({
            success: false,
            message: error.message
        })
    }

}

const placeorderStripe = async (req, res) => {

}

const placeRazorpay = async (req, res) => {

    try {
        const { userId, items, amount, address } = req.body;
        const { origin } = req.headers;

        const orderData = {
            userId,
            items,
            address,
            amount,
            paymentMethod: "Razorpay",
            payment: false,
            date: Date.now()
        }

        const newOrder = new orderModel(orderData);

        await newOrder.save();
        const options = {
            amount: amount * 100,
            currency: "INR",
            receipt: newOrder._id.toString()
        }

        await razorPayInstances.orders.create(options, (error, order) => {
            if (error) {
                console.log(error);
                return res.json({
                    success: false,
                    message: error.message
                })
            }
            res.json({
                success: true,
                order,
                message: "Order placed successfully"
            })
        })



    } catch (error) {
        console.log(error);
        res.json({
            success: false,
            message: error.message
        })
    }
}

const verifyRazorpay = async (req, res) => {
    try {
        
        const {userId,razorpay_order_id} = req.body

        const ordereInfo = await razorPayInstances.orders.fetch(razorpay_order_id)
        if(ordereInfo.status === "paid") {
            await orderModel.findByIdAndUpdate(ordereInfo.receipt, {payment:true});
            await userModel.findByIdAndUpdate(userId, {cartData:{}})

            res.json({
                success:true,
                message:"Payment verified and order placed successfully"
            })
        }else{
            res.json({
                success:false,
                message:"Payment failed"
            })
        }

    } catch (error) {
        console.log(error);
        res.json({
            success: false,
            message: error.message
        })
    }
}
//All orders data for admin panel

const allOrders = async (req, res) => {
    try {
        const orders = await orderModel.find({})
        res.json({
            success: true,
            orders
        })
    } catch (error) {
        console.log(error);
        res.json({
            success: false,
            message: error.message
        })
    }
}

//user Order Data for frontedn // display the all data of user
const userOrders = async (req, res) => {
    try {
        const { userId } = req.body

        const orders = await orderModel.find({ userId })
        res.json({
            success: true,
            orders
        })

    } catch (error) {
        console.log(error)
        res.json({
            success: false,
            message: error.message
        })
    }

}

//update the order Status from admin panel
const updateStatus = async (req, res) => {
    try {
        const { orderId, status } = req.body

        await orderModel.findByIdAndUpdate(orderId, { status })

        res.json({
            success: true,
            message: "Order status updated successfully"
        })

    } catch (error) {
        console.log(error);
        res.json({
            success: false,
            message: error.message
        })
    }

}

export { placeOrder, placeorderStripe, placeRazorpay, allOrders, userOrders, updateStatus, verifyRazorpay }