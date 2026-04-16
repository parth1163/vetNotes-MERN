require('express');
require('mongodb');

exports.setApp = function (app, client)
{
    //login api
    app.post('/api/login', async (req, res) => 
    {
      const { login, password } = req.body;
      try
      {
        const user = await User.findOne({ email: { $regex: new RegExp('^' + login + '$', 'i') }, password: password }).lean();
        if( !user )
        {
          return res.status(200).json({ id: -1, firstName: '', lastName: '', error: 'Invalid email/password' });
        }
        var ret = { id: user._id, firstName: user.firstName, lastName: user.lastName, error: '' };
        res.status(200).json(ret);
      }
      catch(err)
      {
        res.status(500).json({ id: -1, firstName: '', lastName: '', error: err.message });
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
}