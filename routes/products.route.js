const express = require("express");
const { readData, writeData } = require("../middlewares/handleJsonFile");

const router = express.Router()
const data = readData()


// Route to get all products
router.get("/", (req, res) => {
    res.json({
        message: "products are retrived",
        data: data.products
    })
})

// Route to add new product
router.post("/", (req, res) => {
    const newProduct = req.body
    newProduct.id = data.products.length + 1
    data.products.push(newProduct)
    writeData(data)
    res.status(201).json({
        message: "Product is added successfully",
        data: data.products[data.products.length - 1]
    })
})


router.get("/:productId", (req, res) => {
    const { productId } = req.params
    const product = data.products.find(product => product.id === parseInt(productId))

    if (!product) return res.json({ message: "Product is not found" })

    res.json(product)
})


// Route to search for product by title or category or description
router.get('/search', (req, res) => {
    const { q } = req.query;
    const data = productsData
        .filter(product =>
            product.title.toLowerCase().includes(q.toLowerCase()) ||
            product.description.toLowerCase().includes(q.toLowerCase()) ||
            product.category.toLowerCase().includes(q.toLowerCase())
        )

    res.json(data); // respond with the filtered products
});

// Route to get products by category
router.get('/category/:categoryName', (req, res) => {
    const { categoryName } = req.params;

    // Find the category ID associated with the provided category name
    const category = data.categories.find(category => category.name === categoryName)

    if (!category) {
        return res.status(404).json({ error: 'Category not found' });
    }

    // Find products associated with this category ID
    const products = data.products
        .filter(product => product.category === category.name) // Assuming products have an array of category IDs

    res.status(200).json(products);
});

// Route to get related products by product ID
router.get('/:productId/related', (req, res) => {
    const { productId } = req.params;

    // Find the target product by ID
    const targetProduct = data.products.find(product => product.id === parseInt(productId));

    if (!targetProduct) {
        return res.status(404).json({ error: 'Product not found' });
    }

    // Find products that share at least one category with the target product, excluding the target product itself
    const relatedProducts = data.products
        .filter(product =>
            product.id !== targetProduct.id &&
            product.category == targetProduct.category
        )

    // Return the array of related products directly
    res.status(200).json(relatedProducts);
});




module.exports = router