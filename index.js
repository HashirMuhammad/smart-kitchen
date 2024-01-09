const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const User = require('./model/Users');
const MenuItem = require('./model/MenuItems');
const Order = require('./model/Order'); // Update the path accordingly
const Feedback = require('./model/Feedback');
const cors = require('cors');

// Enable CORS for all routes
const app = express();
const PORT = 3000;
app.use(cors());

// Middleware
app.use(bodyParser.json());
app.use(session({
  secret: 'your-secret-key', // Replace with a secret key for session encryption
  resave: false,
  saveUninitialized: true,
}));

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/smartKitchen', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// Routes =====================================================================================================

// Middleware to verify the JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  jwt.verify(token, 'your_secret_key', (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    console.log('Decoded Token:', decoded); // Log the decoded token for debugging

    req.userid = decoded.userId; // Set req.userid with the decoded user ID
    console.log(decoded.useriId);
    next();
  });
};

// Signup endpoint
app.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Check if the email is already taken
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already taken' });
    }

    // Create a new user using the User model
    const newUser = new User({ name, email, password });
    await newUser.save();

    // Set up a simple session (replace this with a more secure session management in production)
    req.session.userId = newUser._id;

    res.json({ message: 'Signup successful', user: newUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Add a new endpoint for admin to change user role
app.post('/admin/change-role', verifyToken, async (req, res) => {
    try {  
      const { userId, newRole } = req.body;
  
      // Find the user by ID
      const userToUpdate = await User.findById(userId);
  
      // Check if the user exists
      if (!userToUpdate) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      // Update the user's role
      userToUpdate.role = newRole;
      await userToUpdate.save();
  
      res.json({ message: 'User role updated successfully', user: userToUpdate });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // Endpoint to get all users (only accessible by admins)
app.get('/admin/users', verifyToken, async (req, res) => {
    try {
    //   // Check if the authenticated user is an admin
    //   const authenticatedUser = await User.findById(req.session.userId);
    //   if (authenticatedUser.role !== 'admin') {
    //     return res.status(403).json({ error: 'Forbidden, admin access required' });
    //   }
  
      // Retrieve all users from the database
      const allUsers = await User.find({}, '_id name email role');
  
      // Respond with the list of users
      res.json(allUsers);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
//   login
  // Modify the login endpoint to include the user's role in the response
  app.post('/login', async (req, res) => {
    const { email, password } = req.body;
  
    try {
      // Check if the user exists
      const user = await User.findOne({ email });
  
      if (user) {
        if (user.comparePassword(password)) {
          // Generate a JWT token with user information
          const token = jwt.sign({ userId: user._id, email: email }, 'your_secret_key', { expiresIn: '1h' });
  
          // Include the role in the login response
          const role = email === 'hashirmuhammad73@gmail.com' ? 'admin' : 'client';

// Check if the email is the specific one
if (email === 'hashirmuhammad73@gmail.com') {
  res.json({ message: 'Login successful', user: { ...user.toObject(), role }, token });
} else {
  // If the email is not the specific one, return the default role
  res.json({ message: 'Login successful', user: { ...user.toObject(), role: user.role }, token });
}

        } else {
          res.status(401).json({ error: 'Invalid credentials' });
        }
      } else {
        res.status(401).json({ error: 'Invalid credentials' });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // Endpoint to delete a user by ID
app.delete('/users/:id', async (req, res) => {
  const userId = req.params.id;

  try {

    // Find and delete the user by ID
    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json({ message: 'User deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
  

// get menu
app.get('/menu', async (req, res) => {
  try {
    const menuItems = await MenuItem.find();
    res.json(menuItems);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Endpoint to add a new menu item
app.post('/menu/add', verifyToken, async (req, res) => {
  try {
    const { name, price, imgUrl } = req.body;

    // Create a new MenuItem document
    const newMenuItem = new MenuItem({ name, price, imgUrl });

    // Save the new menu item to the database
    await newMenuItem.save();

    // Respond with the updated menu
    const menu = await MenuItem.find();
    res.json(menu);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

//route for placing an order
app.post('/order/place', verifyToken, async (req, res) => {
  try {
    const { menuIds, deliveryType } = req.body;
    const userId = req.userid; // Extract userId from the URL parameters

    // Optionally, you might want to perform additional validation or checks here

    // Create an array of menu items with their quantities
    const menuItems = menuIds.map((item) => ({
      menuId: item.menuId,
      quantity: item.quantity,
    }));

    // Create a new order with the user, menu items, and delivery type
    const newOrder = new Order({ user: userId, menuItems, deliveryType });
    await newOrder.save();

    // Respond with the details of the placed order
    res.json({ message: 'Order placed successfully', order: newOrder });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// route for updating an order
app.post('/order/update/:orderId', verifyToken, async (req, res) => {
    try {
      const { address, phoneNumber, paymentImage } = req.body;
      const orderId = req.params.orderId; // Extract orderId from the URL parameters
  
      // Ensure the order ID is provided
      if (!orderId) {
        return res.status(400).json({ error: 'Order ID is required' });
      }
  
      // Find the order by ID
      const existingOrder = await Order.findById(orderId);
  
      // Check if the order exists
      if (!existingOrder) {
        return res.status(404).json({ error: 'Order not found' });
      }
  
      // Update the order details
      existingOrder.address = address;
      existingOrder.phoneNumber = phoneNumber;
      existingOrder.paymentImage = paymentImage;
  
      // Save the updated order
      await existingOrder.save();
  
      // Respond with the updated order details
      res.json({ message: 'Order updated successfully', order: existingOrder });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Endpoint for submitting feedback
app.post('/feedback/:orderid', verifyToken, async (req, res) => {
  try {
    const { orderid } = req.params;
    const { feedback, rating } = req.body;
    const userid = req.userid; // Get the user ID from the decoded token

    // Create a new feedback document with userid
    const newFeedback = new Feedback({ userid, orderid, feedback, rating });

    // Save the new feedback to the database
    await newFeedback.save();

    res.json({ message: 'Feedback submitted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// for rider  
const getMenuItemsInfo = async (menuItems) => {
  try {
    const menuItemsIds = menuItems.map(item => item.menuId);
    const menuItemsData = await MenuItem.find({ _id: { $in: menuItemsIds } });

    const menuItemsInfo = [];
    const menuItemsMap = new Map();

    menuItems.forEach(orderItem => {
      const menuItemData = menuItemsData.find(item => item._id.equals(orderItem.menuId));

      if (menuItemData) {
        const itemId = menuItemData._id.toString();
        if (menuItemsMap.has(itemId)) {
          // Item already exists, increment quantity
          menuItemsMap.get(itemId).quantity += orderItem.quantity;
        } else {
          // New item, add to the map
          menuItemsMap.set(itemId, {
            id: itemId,
            name: menuItemData.name,
            quantity: orderItem.quantity,
          });
        }
      }
    });

    menuItemsInfo.push(...menuItemsMap.values());
    return menuItemsInfo;
  } catch (error) {
    console.error('Error fetching menu items info:', error);
    return [];
  }
};

app.get('/rider/:orderid', async (req, res) => {
  try {
    const { orderid } = req.params;

    // Find the order by order ID
    const order = await Order.findById(orderid);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Get user details
    const user = await User.findById(order.user);
    const userName = user ? user.name : 'Unknown User';

    // Get menu items names and quantities using the function
    const menuItemsInfo = await getMenuItemsInfo(order.menuItems);

    // Include additional details in the response
    const enhancedOrder = {
      ...order.toObject(),
      userName,
      menuItemsInfo,
    };

    res.json({ order: enhancedOrder });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get all orders
// Helper function to get menu items info
const getMenuItemsInfo2 = async (menuItems) => {
  try {
    const menuItemsIds = menuItems.map(item => item.menuId);
    const menuItemsData = await MenuItem.find({ _id: { $in: menuItemsIds } });

    const menuItemsInfo = [];
    const menuItemsMap = new Map();

    menuItems.forEach(orderItem => {
      const menuItemData = menuItemsData.find(item => item._id.equals(orderItem.menuId));

      if (menuItemData) {
        const itemId = menuItemData._id.toString();
        if (menuItemsMap.has(itemId)) {
          // Item already exists, increment quantity
          menuItemsMap.get(itemId).quantity += orderItem.quantity;
        } else {
          // New item, add to the map
          menuItemsMap.set(itemId, {
            id: itemId,
            name: menuItemData.name,
            quantity: orderItem.quantity,
          });
        }
      }
    });

    menuItemsInfo.push(...menuItemsMap.values());
    return menuItemsInfo;
  } catch (error) {
    console.error('Error fetching menu items info:', error);
    return [];
  }
};

// Get all orders
app.get('/orders', async (req, res) => {
  try {
    const orders = await Order.find();
    const ordersWithMenuItemsInfo = await Promise.all(orders.map(async (order) => {
      const menuItemsInfo = await getMenuItemsInfo2(order.menuItems);
      return {
        ...order.toObject(),
        menuItemsInfo,
      };
    }));
    res.json({ orders: ordersWithMenuItemsInfo });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
