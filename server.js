import jsonServer from 'json-server';
import auth from 'json-server-auth';
import cors from 'cors';
import jwt from 'jsonwebtoken';

const server = jsonServer.create();
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();

const rules = auth.rewriter({
  users: 600,
  posts: 644,
  carts: 644,
});

const SECRET_KEY = '#ds@sdfsdf59&ddf#'; // Use a strong secret key

server.use(cors());
server.use(jsonServer.bodyParser);

// Middleware to check if the user is authenticated
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401); // If no token, return 401 Unauthorized

  jwt.verify(token, SECRET_KEY, (err, user) => {
    // if (err) return res.sendStatus(403); // If token is invalid or expired, return 403 Forbidden
    req.user = user;
    next(); // Proceed to the next middleware or route handler
  });
};

server.use((req, res, next) => {
  if (req.method === 'POST' && req.path === '/register') {
    const { email } = req.body;
    const users = router.db.get('users').value();

    const userExists = users.some(user => user.email === email);
    if (userExists) {
      return res.status(400).json({ error: 'Email already exists' });
    }
  }
  next();
});

// Protect the add to cart route with the authenticateToken middleware
server.post('/cart/add', authenticateToken, (req, res) => {
  const { userId, productId, quantity } = req.body;

  const userCart = router.db.get('carts').find({ userId }).value();

  if (userCart) {
    const productInCart = userCart.products.find(p => p.productId === productId);

    if (productInCart) {
      productInCart.quantity += quantity;
    } else {
      userCart.products.push({ productId, quantity });
    }

    router.db.get('carts').find({ userId }).assign(userCart).write();
  } else {
    router.db.get('carts')
      .push({
        id: router.db.get('carts').value().length + 1,
        userId,
        products: [{ productId, quantity }]
      })
      .write();
  }

  res.status(200).json({ success: true, cart: userCart });
});

server.get('/cart/:userId', authenticateToken, (req, res) => {
  const { userId } = req.params;
  const userCart = router.db.get('carts').find({ userId: Number(userId) }).value();

  if (!userCart) {
    return res.status(404).json({ error: 'No products in cart' });
  }

  const detailedCart = userCart.products.map(item => {
    const product = router.db.get('products').find({ id: item.productId }).value();
    return {
      ...product,
      quantity: item.quantity
    };
  });

  res.status(200).json({ cart: detailedCart });
});

server.post('/cart/remove', authenticateToken, (req, res) => {
  const { userId, productId } = req.body;

  const userCart = router.db.get('carts').find({ userId }).value();

  if (userCart) {
    const updatedProducts = userCart.products.filter(p => p.productId !== productId);

    if (updatedProducts.length === 0) {
      router.db.get('carts').remove({ userId }).write();
      res.status(200).json({ success: true, message: 'Cart deleted because it is empty' });
    } else {
      router.db.get('carts').find({ userId }).assign({ products: updatedProducts }).write();
      res.status(200).json({ success: true, cart: updatedProducts });
    }
  } else {
    res.status(404).json({ error: 'Cart not found' });
  }
});

server.db = router.db;

server.use(middlewares);
server.use(rules);
server.use(auth);
server.use(router);

server.listen(3030, () => {
  console.log('JSON Server is running on http://localhost:3030');
});
