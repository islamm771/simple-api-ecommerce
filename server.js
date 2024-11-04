import jsonServer from 'json-server';
import auth from 'json-server-auth';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import cloudinary from 'cloudinary';
import multer from 'multer';
import bcrypt from 'bcryptjs';


const server = jsonServer.create();
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();
const port = process.env.PORT || 3030; // Choose port like 8080, 3001

const rules = auth.rewriter({
  users: 660,
  products: 661,
  carts: 644,
});

const SECRET_KEY = '#ds@sdfsdf59&ddf#'; // Use a strong secret key
const TOKEN_EXPIRATION = '7d'; // Set desired expiration, e.g., '7d' for 7 days


server.use(cors());
server.use(jsonServer.bodyParser);

// Configure Cloudinary directly in the code
cloudinary.v2.config({
  cloud_name: 'dmsuevohb',
  api_key: '318648891234848',
  api_secret: 'ayYcWPJAEfHAAMWgagKqWAVMUts',
});


// Middleware to check if the user is authenticated
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log("No token provided");
    return res.sendStatus(401);
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      console.log("Token verification error:", err);
      return res.sendStatus(403);
    }
    req.user = user;
    next();
  });
};



server.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = router.db.get('users').find({ email }).value();

  if (user) {
    const match = await bcrypt.compare(password, user.password); // Compare hashed password
    if (match) {
      const token = jwt.sign({ sub: user.id }, SECRET_KEY, { expiresIn: TOKEN_EXPIRATION });
      return res.status(200).json({ token , user });
    }
  }
  res.status(401).json({ error: 'Invalid credentials' });
});

// Configure multer for handling file uploads
const upload = multer({ dest: 'uploads/' });

// Handle the upload route using multer middleware
server.post('/upload', upload.single('image'), (req, res) => {
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


server.get('/users', authenticateToken, (req, res) => {
  const users = router.db.get('users').value();
  res.status(200).json({ users });
});

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


// Route to get products by category
server.get('/products/category/:categoryName', (req, res) => {
  const { categoryName } = req.params;
  
  // Find the category ID associated with the provided category name
  const category = router.db.get('categories').find({ name: categoryName }).value();

  if (!category) {
    return res.status(404).json({ error: 'Category not found' });
  }

  // Find products associated with this category ID
  const products = router.db
    .get('products')
    .filter(product => product.category === category.name) // Assuming products have an array of category IDs
    .value();

  res.status(200).json(products);
});

// Route to get related products by product ID
server.get('/products/:productId/related', (req, res) => {
  const { productId } = req.params;

  // Find the target product by ID
  const targetProduct = router.db.get('products').find({ id: Number(productId) }).value();

  if (!targetProduct) {
    return res.status(404).json({ error: 'Product not found' });
  }

  // Find products that share at least one category with the target product, excluding the target product itself
  const relatedProducts = router.db
    .get('products')
    .filter(product => 
      product.id !== targetProduct.id &&
      product.category == targetProduct.category
    )
    .value();

  // Return the array of related products directly
  res.status(200).json(relatedProducts);
});




// Protect the add to cart route with the authenticateToken middleware
server.post('/cart/add', authenticateToken, (req, res) => {
  const { userId, products } = req.body;

  // Find or create the user's cart
  let userCart = router.db.get('carts').find({ userId }).value();

  if (!userCart) {
    userCart = {
      id: router.db.get('carts').value().length + 1,
      userId,
      products: []
    };
    router.db.get('carts').push(userCart).write();
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
  router.db.get('carts').find({ userId }).assign(userCart).write();

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

server.delete('/cart/remove', authenticateToken, (req, res) => {
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

// Route to get counts of users, products, and categories in a single response
server.get('/count/all', authenticateToken, (req, res) => {
  const userCount = router.db.get('users').size().value();
  const productCount = router.db.get('products').size().value();
  const categoryCount = router.db.get('categories').size().value();

  res.status(200).json({ 
    counts: {
      users: userCount,
      products: productCount,
      categories: categoryCount
    } 
  });
});

server.db = router.db;

server.use(middlewares);
server.use(rules);
server.use(auth);
server.use(router);

server.listen(port, () => {
  console.log('JSON Server is running on http://localhost:3030');
});







/*
The numbers in the json-server-auth rules represent access control permissions, similar to Unix file system permissions, 
in the format of three digits:

First digit: Permissions for the owner of the resource.
Second digit: Permissions for authenticated users (non-owners).
Third digit: Permissions for public (unauthenticated users).
The values for each digit range from 0 to 7 and represent different levels of access:

0: No access.
1: Read-only access (GET requests).
2: Write-only access (POST requests).
3: Read and write access (GET, POST).
4: Update-only access (PUT, PATCH).
5: Read and update access (GET, PUT, PATCH).
6: Write and update access (POST, PUT, PATCH).
7: Read, write, and update access (GET, POST, PUT, PATCH).

*/