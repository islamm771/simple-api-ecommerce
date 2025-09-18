const express = require("express");
const { readData, writeData } = require("../middlewares/handleJsonFile");

const router = express.Router()
const data = readData()


// Route to get all categories
router.get("/", (req, res) => {
    res.json({
        message: "categories are retrived",
        data: data.categories
    })
})

// Route to add new category
router.post("/", (req, res) => {
    const newCategory = req.body
    newCategory.id = data.products.length + 1
    const categoryExists = data.categories.find(category => category.name === newCategory.name)
    if (categoryExists) return res.status(400).json({ message: "Category already exists" })
    data.categories.push(newCategory)
    writeData(data)
    res.status(201).json({
        message: "Category is added successfully",
        data: data.categories[data.products.length - 1]
    })
})


// Route to get a category
router.get("/:categoryId", (req, res) => {
    const { categoryId } = req.params
    const category = data.categories.find(category => category.id === parseInt(categoryId))

    if (!category) return res.json({ message: "Category is not found" })

    res.json({
        message: "product is found",
        data: category
    })
})


// Route to edit a category
router.put("/:categoryId", (req, res) => {
    const { categoryId } = req.params
    const categoryName = req.body.name
    const category = data.categories.find(category => category.id === parseInt(categoryId))

    if (!category) return res.json({ message: "Category is not found" })

    category.name = categoryName
    writeData(data)

    res.json({
        message: "product is updated",
        data: category
    })
})






module.exports = router