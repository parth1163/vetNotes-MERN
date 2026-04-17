const express = require('express');
const cors = require('cors');
require('dotenv').config();
const mongoose = require('mongoose');
const Pet = require('./models/pet');
const User = require('./models/user');
const app = express();
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const mongoose = require('mongoose');
const Pet = require('./models/pet');
const User = require('./models/user');
const app = express();
var api = require('./api.js');

app.use(
  cors({
    // Dynamic CORS configuration based on environment
    origin:
      process.env.NODE_ENV === "production"
        ? process.env.CLIENT_URL || "http://p2t2.aravptulsi.com"
        : "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());
app.use((req, res, next) => 
{
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PATCH, DELETE, OPTIONS'
  );
  next();
});

const url = process.env.MONGODB_URI;
mongoose.connect(url)
  .then(() => console.log('MongoDB connected!'))
  .catch(err => console.log(err));

api.setApp( app, url );

app.listen(process.env.PORT);