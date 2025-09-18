const jwt = require("jsonwebtoken")

// Middleware to check if the user is authenticated
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.sendStatus(401);
    }

    jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
        if (err) {
            console.log("Token verification error:", err);
            return res.sendStatus(403);
        }
        req.user = user;
        next();
    });
};




module.exports = authenticateToken