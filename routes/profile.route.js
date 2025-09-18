const express = require("express");
const { readData, writeData } = require("../middlewares/handleJsonFile");
const authenticateToken = require("../middlewares/auth");
const bcrypt = require('bcryptjs');



const router = express.Router()

const data = readData();

router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id; // Extract user ID from the authenticated token

        // Fetch the user from the database
        const user = data.users.find(user => user.id === userId)

        // Check if user exists
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Respond with the user profile
        res.status(200).json(user);
    } catch (error) {
        console.error("Error fetching user profile:", error);
        res.status(500).json({ error: "An error occurred while fetching the profile" });
    }
});

router.put('/update', authenticateToken, async (req, res) => {
    const { firstName, lastName, email, address, currentPassword, newPassword, confirmPassword } = req.body;
    const userId = req.user.id; // Extract user ID from the authenticated token

    // Fetch the user from the database
    let user = data.users.find(user => user.id === userId)

    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    // Verify the current password
    const passwordMatch = await bcrypt.compare(currentPassword, user.password);
    if (!passwordMatch) {
        return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Handle new password validation
    if (newPassword && newPassword !== confirmPassword) {
        return res.status(400).json({ error: 'New password and confirm password do not match' });
    }

    // Update password if newPassword is provided
    let updatedPassword = user.password;
    if (newPassword) {
        updatedPassword = await bcrypt.hash(newPassword, 10);
    }

    // Update user information
    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.email = email || user.email;
    user.address = address || user.address;
    user.password = updatedPassword;


    writeData(data)
    res.status(200).json({ success: true, message: 'Profile updated successfully' });
});




module.exports = router