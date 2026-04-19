const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const app = express();
var api = require('./api.js');
require('dotenv').config();
const url = process.env.MONGODB_URI;

app.use(express.json());

app.use(
  cors({
    // Dynamic CORS configuration based on environment
    origin:
      process.env.NODE_ENV === "production"
        ? process.env.CLIENT_URL || "https://p2t2.aravptulsi.com"
        : "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);


mongoose.connect(url)
  .then(() => console.log('MongoDB connected!'))
  .catch(err => console.log(err));

api.setApp( app, url );

app.listen(process.env.PORT);