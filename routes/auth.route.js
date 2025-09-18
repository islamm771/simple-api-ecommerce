const express = require("express");
const bcrypt = require('bcryptjs');
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");


const { readData, writeData } = require("../middlewares/handleJsonFile");

const router = express.Router()
const data = readData()
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = data.users.find(user => user.email === email);

    if (user) {
        const match = await bcrypt.compare(password, user.password); // Compare hashed password
        if (match) {
            const token = jwt.sign({ id: user.id }, process.env.SECRET_KEY, { expiresIn: process.env.TOKEN_EXPIRATION });
            return res.status(200).json({ token, user });
        }
    }
    res.status(401).json({ message: 'Invalid credentials' });
});


router.post("/register", async (req, res) => {
    const { username, email, gender, password } = req.body
    const users = data.users;

    const userExists = users.some(user => user.email === email);
    if (userExists) {
        return res.status(400).json({ message: 'Email already exists' });
    }
    if (password && password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" })
    const salt = await bcrypt.genSalt(10);
    const newUser = {
        id: users.length + 1,
        username,
        email,
        gender,
        password: await bcrypt.hash(password, salt),
        address: "",
        firstName: "",
        lastName: ""
    }
    data.users.push(newUser)
    writeData(data)

    res.json({
        message: "Account is created successfully",
        user: newUser
    })
})



// Route: Google Login
router.post("/google", async (req, res) => {
    try {
        const { token } = req.body;

        // Verify Google token
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();

        if (!payload) {
            return res.status(401).json({ error: "Invalid Google token" });
        }

        // Create your own JWT for app sessions
        const userJwt = jwt.sign(
            { id: payload.sub, email: payload.email, name: payload.name },
            process.env.SECRET_KEY,
            { expiresIn: process.env.TOKEN_EXPIRATION || "7d" }
        );

        console.log(payload);

        res.json({
            token: userJwt,
            user: {
                id: payload.sub,
                email: payload.email,
                username: payload.name,
                firstName: payload.given_name,
                lastName: payload.family_name,
                image: payload.picture,
            },
        });
    } catch (error) {
        console.error("Google login error:", error);
        res.status(401).json({ error: "Invalid Google token" });
    }
});




module.exports = router