// server.js (Backend)
import express from "express";
import mongoose from "mongoose";
import OpenAI from "openai";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
app.use(express.json());
const allowedOrigins = ['https://orsanjiv-supplier-product-chatbot.netlify.app']; // Removed trailing slash

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true // If you are using cookies or authentication headers
}));

// Connect to MongoDB Compass
const connectdb = async()=>{
    try{
       await mongoose.connect(process.env.MONGO_URI)
        console.log('db is connected')
    }  catch(error){
        console.log("Something went wrong while connecting to db")
    }
}
connectdb()


// Define Supplier & Product Schema
const supplierSchema = new mongoose.Schema({
    name: String,
    contact: String,
    location: String,
    products: [String],
});

const productSchema = new mongoose.Schema({
    name: String,
    description: String,
    price: Number,
    supplier: String,
});

const Supplier = mongoose.model("Supplier", supplierSchema);
const Product = mongoose.model("Product", productSchema);

// OpenAI Initialization
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Chatbot API Endpoint
app.post("/chat", async (req, res) => {
    const { message } = req.body;

    try {
        // Check if the message relates to supplier/product info
        const product = await Product.findOne({ name: { $regex: message, $options: "i" } });
        const supplier = await Supplier.findOne({ name: { $regex: message, $options: "i" } });

        let responseText = "";
        if (product) {
            responseText = `Product: ${product.name}\nDescription: ${product.description}\nPrice: $${product.price}\nSupplier: ${product.supplier}`;
        } else if (supplier) {
            responseText = `Supplier: ${supplier.name}\nContact: ${supplier.contact}\nLocation: ${supplier.location}\nProducts: ${supplier.products.join(", ")}`;
        } else {
            // Call OpenAI API if no direct match
            const completion = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [{ role: "user", content: message }],
            });
            responseText = completion.choices[0].message.content;
        }

        res.json({ response: responseText });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
