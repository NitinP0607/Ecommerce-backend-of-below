import express from "express";
import upload from "../middleware/multer.js";
import { addProduct, removingProduct, listProduct, singleProduct } from '../controllers/productController.js'
import adminAuth from "../middleware/adminAuth.js";


const productRouter = express.Router();

productRouter.post('/add', adminAuth, upload.fields([
    { name: "image1", maxCount: 1 }, 
    { name: "image2", maxCount: 1 }, 
    { name: "image3", maxCount: 1 }, 
    { name: "image4", maxCount: 1 }
]),             
    (req, res, next) => {
        console.log("MULTER PASSED");
        console.log(req.files);
        next();
    }, addProduct);

productRouter.post('/remove', adminAuth, removingProduct);

productRouter.post('/single', singleProduct);

productRouter.get('/list', listProduct);


export default productRouter;