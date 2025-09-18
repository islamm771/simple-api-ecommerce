const express = require("express");
const { readData, writeData } = require("../middlewares/handleJsonFile");
const authenticateToken = require("../middlewares/auth");

const router = express.Router();
const data = readData();


router.get("/", (req, res) => {
    const cart = data.carts
    res.json({
        message: "cart is retrived",
        data: cart
    })
})

router.post('/add', authenticateToken, (req, res) => {
    const { userId, products } = req.body;

    if (!userId || products.length === 0) return res.status(400).json({ message: "Please provide userId and products" })

    // Find or create the user's cart
    let userCart = data.carts.find(cart => cart.userId === userId);


    if (!userCart) {
        userCart = {
            id: data.carts.length + 1,
            userId,
            products: []
        };
        data.carts.push(userCart);
    }

    // Iterate over the products array to add/update each product in the cart
    products.forEach(({ productId, quantity }) => {
        const productInCart = userCart.products.find(p => p.productId === productId);

        if (productInCart) {
            // Update the quantity if the product already exists in the cart
            productInCart.quantity = quantity;
        } else {
            // Add the product to the cart if it doesn't exist
            userCart.products.push({ productId, quantity });
        }
    });

    // Update the cart in the database
    writeData(data)

    res.status(200).json({ success: true, cart: userCart });
});

router.get('/:userId', authenticateToken, (req, res) => {
    const { userId } = req.params;
    const userCart = data.carts.find(cart => cart.userId === parseInt(userId));

    if (!userCart) {
        return res.status(200).json({ cart: [] });
    }

    const detailedCart = userCart.products.map(item => {
        const product = data.products.find(product => product.id === item.productId);
        return {
            ...product,
            quantity: item.quantity
        };
    });

    res.status(200).json({ cart: detailedCart });
});

router.delete('/remove', authenticateToken, (req, res) => {
    const { userId, productId } = req.body;

    if (!userId || !productId) return res.status(400).json({ message: "Please provide userId and productId" })

    const userCart = data.carts.find(cart => cart.userId === userId);

    if (userCart) {
        const updatedProducts = userCart.products.filter(p => p.productId !== productId);

        if (updatedProducts.length === 0) {
            data.carts = data.carts.filter(cart => cart.userId !== userId)
            writeData(data)
            res.status(200).json({ success: true, message: 'Cart deleted because it is empty', cart: [] });
        } else {
            userCart.products = updatedProducts;
            writeData(data)
            res.status(200).json({ success: true, cart: updatedProducts });
        }
    } else {
        res.status(404).json({ error: 'Cart not found' });
    }
});



module.exports = router