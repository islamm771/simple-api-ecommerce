const express = require("express")
const cors = require("cors")
require("dotenv").config()
const cloudinary = require('cloudinary');
const multer = require('multer');
const path = require('path');


const port = process.env.PORT || 3030

const app = express()

const ProductsRoute = require("./routes/products.route")
const AuthRoute = require("./routes/auth.route")
const FavRoute = require("./routes/favourites.route")
const ProfileRoute = require("./routes/profile.route");
const CartRoute = require("./routes/cart.route");
const CategoryRoute = require("./routes/categories.route");
const { readData } = require("./middlewares/handleJsonFile");
const authenticateToken = require("./middlewares/auth");


app.use(express.json())
app.use(cors())


app.get('/users', authenticateToken, (req, res) => {
    const data = readData()
    const users = data.users;
    res.status(200).json({ users });
});


// Route to get counts of users, products, and categories in a single response
app.get('/count-all', authenticateToken, (req, res) => {
    const data = readData();
    const userCount = data.users.length;
    const productCount = data.products.length;
    const categoryCount = data.categories.length;

    res.status(200).json({
        counts: {
            users: userCount,
            products: productCount,
            categories: categoryCount
        }
    });
});



// Configure Cloudinary directly in the code
cloudinary.v2.config({
    cloud_name: 'dmsuevohb',
    api_key: '318648891234848',
    api_secret: 'ayYcWPJAEfHAAMWgagKqWAVMUts',
});

// Configure multer for handling file uploads
const upload = multer({ dest: 'uploads/' });

// Handle the upload route using multer middleware
app.post('/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No image file uploaded' });
    }

    const imageFile = req.file;

    // Upload to Cloudinary
    cloudinary.v2.uploader.upload(imageFile.path, { folder: 'products' }, (error, result) => {
        if (error) {
            return res.status(500).json({ error: 'Failed to upload image' });
        }

        res.status(200).json({ success: true, imageUrl: result.secure_url });
    });
});



app.use("/products", ProductsRoute)
app.use("/auth", AuthRoute)
app.use("/favourites", FavRoute)
app.use("/profile", ProfileRoute)
app.use("/cart", CartRoute)
app.use("/categories", CategoryRoute)



app.listen(port, () => {
    console.log(`JSON Server is running on http://localhost:${port}`);
});
