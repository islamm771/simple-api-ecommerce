const express = require("express");
const { readData, writeData } = require("../middlewares/handleJsonFile");
const authenticateToken = require("../middlewares/auth");

const router = express.Router();
const data = readData();




router.post('/add', authenticateToken, (req, res) => {
    const { userId, productId } = req.body;

    if (!userId || !productId) return res.status(400).json({ message: "Please provide userId and productId" })

    let userFavorites = data.favourites.find(fav => fav.userId === userId);

    if (!userFavorites) {
        userFavorites = { id: data.favourites.length + 1, userId, products: [] };
        data.favourites.push(userFavorites);
    }

    if (!userFavorites.products.includes(productId)) {
        userFavorites.products.push(productId);
    }

    writeData(data);
    res.status(201).json({ success: true, favorites: userFavorites });
});

router.get('/:userId', authenticateToken, (req, res) => {
    const { userId } = req.params;

    const userFavorites = data.favourites.find(fav => fav.userId === parseInt(userId));

    if (!userFavorites) {
        return res.status(200).json({ favourites: [] });
    }

    const favoriteProducts = userFavorites.products.map(productId => {
        const product = data.products.find(product => product.id === productId);
        return product;
    });


    res.status(200).json({ favourites: favoriteProducts });
});

router.delete('/remove', authenticateToken, (req, res) => {
    const { userId, productId } = req.body;
    if (!userId || !productId) return res.status(400).json({ message: "Please provide userId and productId" })

    const userFavorites = data.favourites.find(fav => fav.userId === parseInt(userId));

    if (userFavorites) {
        const updatedFavorites = userFavorites.products.filter(id => id !== productId);

        if (updatedFavorites.length === 0) {
            data.favourites = data.favourites.filter(fav => fav.userId !== userId)
            writeData(data)
            res.status(200).json({ success: true, message: 'Favourites list deleted as it is empty' });
        } else {
            userFavorites.products = updatedFavorites;
            writeData(data)
            res.status(200).json({ success: true, favourites: updatedFavorites });
        }
    } else {
        res.status(404).json({ error: 'Favourites not found' });
    }
});




module.exports = router