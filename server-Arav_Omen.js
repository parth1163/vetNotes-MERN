const express = require('express');
const cors = require('cors');
require('dotenv').config();
const mongoose = require('mongoose');
const Pet = require('./models/pet');
const User = require('./models/user');
const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/ping", (req, res) => {
  res.status(200).json({ message: "Hello World" });
});

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

//loging api
app.post('/api/login', async (req, res, next) => 
{
  const { login, Password } = req.body;
  try
  {
    const user = await User.findOne({ Email: { $regex: new RegExp('^' + login + '$', 'i') }, Password: Password }).lean();
    if( !user )
    {
      return res.status(200).json({ id: -1, FirstName: '', LastName: '', error: 'Invalid Email/Password' });
    }
    var ret = { id: user._id, FirstName: user.FirstName, LastName: user.LastName, error: '' };
    res.status(200).json(ret);
  }
  catch(err)
  {
    res.status(500).json({ id: -1, FirstName: '', LastName: '', error: err.message });
  }
});

app.post('/api/register', async (req, res) =>
{
  const { FirstName, LastName, Email, Password } = req.body;
  try
  {
    const existingUser = await User.findOne({ Email: { $regex: new RegExp('^' + Email + '$', 'i') } });
    if( existingUser )
    {
      return res.status(400).json({ id: -1, error: 'Email already in use' });
    }
    const newUser = new User({
      FirstName,
      LastName,
      Email,
      Password
    });
    await newUser.save();
    res.status(200).json({ id: newUser._id, FirstName: newUser.FirstName, LastName: newUser.LastName, error: '' });
  }
  catch(err)
  {
    res.status(500).json({ id: -1, FirstName: '', LastName: '', error: err.message });
  }
});


//add pet api
app.post('/api/addpet', async (req, res) =>
{
  const { userId, name, species, age, lastFeeding, lastWalk } = req.body;
  try
  {
    const petCount = await Pet.countDocuments({ userId: userId });
    if( petCount >= 3 )
    {
      return res.status(400).json({ error: 'Limit reached: You can only have 3 pets per profile.' });
    }
    const lastFedDate = new Date(lastFeeding);
    const nextFeeding = new Date(lastFedDate.getTime() + (7 * 60 * 60 * 1000));
    const lastWalkDate = new Date(lastWalk);
    const nextWalk = new Date(lastWalkDate.getTime() + (4 * 60 * 60 * 1000));
    const newPet = new Pet({
      userId,
      name,
      species,
      age,
      lastFeeding: lastFedDate,
      nextFeeding: nextFeeding,
      lastWalk: lastWalkDate,
      nextWalk: nextWalk
    });
    await newPet.save();
    res.status(200).json({ error: '' });
  }
  catch(err)
  {
    res.status(500).json({ error: err.message });
  }
});

//search pet api 
app.post('/api/searchpets', async (req, res) => 
{
  const { userId, search } = req.body;
  var _search = search.trim();
  try
  {
    const results = await Pet.find({ 
      userId: userId, 
      name: { $regex: _search + '.*', $options: 'i' } 
    });
    var ret = { results: results, error: '' };
    res.status(200).json(ret);
  }
  catch(err)
  {
    res.status(500).json({ results: [], error: err.message });
  }
});

//retrieve pet api 
app.post('/api/getpets', async (req, res) =>
{
  const { userId } = req.body;
  try
  {
    const results = await Pet.find({ userId: userId });
    res.status(200).json({ results: results, error: '' });
  }
  catch(err)
  {
    res.status(500).json({ results: [], error: err.message });
  }
});

//update pet info 
app.post('/api/updatepet', async (req, res) =>
{
  const { petId, name, species, age, notes } = req.body;
  try
  {
    await Pet.findByIdAndUpdate(petId, { name, species, age, notes });
    res.status(200).json({ error: '' });
  }
  catch(err)
  {
    res.status(500).json({ error: err.message });
  }
});

//delete pet api 
app.post('/api/deletepet', async (req, res) =>
{
  const { petId } = req.body;
  try
  {
    await Pet.findByIdAndDelete(petId);
    res.status(200).json({ error: '' });
  }
  catch(err)
  {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('Server is running on port ' + PORT);
});