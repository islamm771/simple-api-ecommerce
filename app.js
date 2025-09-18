const express = require("express");
const cors = require("cors");
const cloudinary = require("cloudinary");
const multer = require("multer");
const { readData } = require("./middlewares/handleJsonFile");
const authenticateToken = require("./middlewares/auth");

const ProductsRoute = require("./routes/products.route");
const AuthRoute = require("./routes/auth.route");
const FavRoute = require("./routes/favourites.route");
const ProfileRoute = require("./routes/profile.route");
const CartRoute = require("./routes/cart.route");
const CategoryRoute = require("./routes/categories.route");

const serverless = require("serverless-http");

const app = express();

app.use(express.json());
app.use(cors());

// Protected users route
app.get("/users", authenticateToken, (req, res) => {
    const data = readData();
    res.status(200).json({ users: data.users });
});

// Count-all route
app.get("/count-all", authenticateToken, (req, res) => {
    const data = readData();
    res.status(200).json({
        counts: {
            users: data.users.length,
            products: data.products.length,
            categories: data.categories.length,
        },
    });
});

// Configure Cloudinary (use env vars from Vercel settings)
cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer for file upload
const upload = multer({ dest: "uploads/" });

app.post("/upload", upload.single("image"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No image uploaded" });
    }
    cloudinary.v2.uploader.upload(
        req.file.path,
        { folder: "products" },
        (error, result) => {
            if (error) return res.status(500).json({ error: "Upload failed" });
            res.status(200).json({ success: true, imageUrl: result.secure_url });
        }
    );
});

// Routes
app.use("/products", ProductsRoute);
app.use("/auth", AuthRoute);
app.use("/favourites", FavRoute);
app.use("/profile", ProfileRoute);
app.use("/cart", CartRoute);
app.use("/categories", CategoryRoute);

// Root route
app.get("/", (req, res) => {
    res.send("Welcome to simple e-commerce API");
});


// app.listen(port, () => {
//     console.log(JSON Server is running on http://localhost:${port}); });

// ❌ Remove app.listen()
// ✅ Export handler for Vercel
module.exports = app;
module.exports.handler = serverless(app);
