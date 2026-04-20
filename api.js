require('express');
require('mongodb');
const Pet = require('./models/pet');
const User = require('./models/user');

// initialise sengrid
const sgMail = require('@sendgrid/mail')
sgMail.setApiKey(process.env.SENDGRID_API_KEY)

// Verification check for the SDK (Optional but good for logs)
console.log("SUCCESS: SendGrid SDK initialized (HTTP mode)");

exports.setApp = function (app, client)
{
  // Ping
  app.get("/api/ping", (req, res) => res.status(200).json({ message: "Hello World" }));

  // Login
  app.post('/api/login', async (req, res) => {
    const { login, Password } = req.body;
    try {
      const safeLogin = login.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const user = await User.findOne({ 
        Email: { $regex: new RegExp('^' + safeLogin + '$', 'i') }, 
        Password: Password 
      }).lean();

      if (!user) return res.status(200).json({ id: -1, error: 'Invalid Email/Password' });

      res.status(200).json({ 
        id: user._id, FirstName: user.FirstName, LastName: user.LastName, 
        IsVerified: user.IsVerified, error: '' 
      });
    } catch (err) { res.status(500).json({ id: -1, error: err.message }); }
  });
  
  // Register
  app.post('/api/register', async (req, res) => {
    const { FirstName, LastName, Email, Password } = req.body;
    try {
      const safeEmail = Email.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const existingUser = await User.findOne({ Email: { $regex: new RegExp('^' + safeEmail + '$', 'i') } });
      if (existingUser) return res.status(400).json({ id: -1, error: 'Email already in use' });

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const newUser = new User({ FirstName, LastName, Email: Email.trim(), Password, VerificationCode: code, IsVerified: false });
      await newUser.save();

      // Custom HTML Template using the new code
      const emailTemplate =`<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
        <html data-editor-version="2" class="sg-campaigns" xmlns="http://www.w3.org/1999/xhtml">
            <head>
              <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1">
              <meta http-equiv="X-UA-Compatible" content="IE=Edge">
              <style type="text/css">
                body, p, div { font-family: 'Muli', sans-serif; font-size: 14px; color: #000000; }
                p { margin: 0; padding: 0; }
                @media screen and (max-width:480px) {
                  .column { display: block !important; width: 100% !important; padding: 0 !important; }
                }
              </style>
              <link href="https://fonts.googleapis.com/css?family=Muli&display=swap" rel="stylesheet">
            </head>
            <body style="margin: 0; padding: 0; background-color: #FFFFFF;">
              <center>
                <table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#ffbe00" style="padding: 30px 20px;">
                  <tr>
                    <td align="center">
                      <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; padding: 50px 30px; border-radius: 8px; text-align: center;">
                        <tr>
                          <td>
                            <h1 style="font-size: 43px; margin: 0 0 20px 0;">Welcome to Pet Tracker 22!</h1>
                            <p style="font-size: 16px; margin: 0 0 10px 0;">Please verify your email address to use the app and website.</p>
                            <p style="color: #ffbe00; font-size: 18px; font-weight: bold; margin: 0 0 25px 0;">Your verification code is:</p>
                            <div style="display: inline-block; background-color: #ffbe00; padding: 12px 40px; border-radius: 6px;">
                              <span style="color: #000000; font-size: 24px; font-weight: bold; letter-spacing: 4px;">${code}</span>
                            </div>
                            <p style="color: #ffbe00; font-size: 18px; font-weight: bold; margin: 30px 0 0 0;">Thank you!</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </center>
            </body>
        </html>`;

      const msg = {
        to: Email.trim(),
        from: process.env.EMAIL_USER,
        subject: 'Verify your Pet Tracker Account',
        text: `Your verification code is: ${code}`,
        html: emailTemplate
      };

      // Send via HTTP SDK
      sgMail
        .send(msg)
        .then(() => console.log('Email sent via HTTP SDK'))
        .catch(err => console.error('SendGrid SDK Error:', err.response ? err.response.body : err));

      res.status(200).json({ id: newUser._id, FirstName, LastName, IsVerified: false, error: '' });
    } catch (err) { res.status(500).json({ id: -1, error: err.message }); }
  });

  // Verify Email
  app.post('/api/verifyemail', async (req, res) => {
    const { userId, code } = req.body;
    try {
      const user = await User.findById(userId);
      if (!user || user.VerificationCode !== code) return res.status(400).json({ error: 'Invalid code' });
      user.IsVerified = true; user.VerificationCode = ''; await user.save();
      res.status(200).json({ error: '' });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Forgot Password
  app.post('/api/forgotpassword', async (req, res) => {
    const { email } = req.body;
    try {
      const user = await User.findOne({ Email: { $regex: new RegExp('^' + email.trim() + '$', 'i') } });
      if (!user) return res.status(200).json({ error: 'Email not found' });
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      user.VerificationCode = code;
      await user.save();

      // Custom HTML Template using the new code
      const emailTemplate =`<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
        <html data-editor-version="2" class="sg-campaigns" xmlns="http://www.w3.org/1999/xhtml">
            <head>
              <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1">
              <meta http-equiv="X-UA-Compatible" content="IE=Edge">
              <style type="text/css">
                body, p, div { font-family: 'Muli', sans-serif; font-size: 14px; color: #000000; }
                p { margin: 0; padding: 0; }
                @media screen and (max-width:480px) {
                  .column { display: block !important; width: 100% !important; padding: 0 !important; }
                }
              </style>
              <link href="https://fonts.googleapis.com/css?family=Muli&display=swap" rel="stylesheet">
            </head>
            <body style="margin: 0; padding: 0; background-color: #FFFFFF;">
              <center>
                <table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#ffbe00" style="padding: 30px 20px;">
                  <tr>
                    <td align="center">
                      <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; padding: 50px 30px; border-radius: 8px; text-align: center;">
                        <tr>
                          <td>
                            <h1 style="font-size: 43px; margin: 0 0 20px 0;">Welcome to Pet Tracker 22!</h1>
                            <p style="font-size: 16px; margin: 0 0 10px 0;">Please verify your email address to use the app and website.</p>
                            <p style="color: #ffbe00; font-size: 18px; font-weight: bold; margin: 0 0 25px 0;">Your verification code is:</p>
                            <div style="display: inline-block; background-color: #ffbe00; padding: 12px 40px; border-radius: 6px;">
                              <span style="color: #000000; font-size: 24px; font-weight: bold; letter-spacing: 4px;">${code}</span>
                            </div>
                            <p style="color: #ffbe00; font-size: 18px; font-weight: bold; margin: 30px 0 0 0;">Thank you!</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </center>
            </body>
        </html>`;

      const msg = {
        to: Email.trim(),
        from: process.env.EMAIL_USER,
        subject: 'Verify your Pet Tracker Account',
        text: `Your verification code is: ${code}`,
        html: emailTemplate
      };
      
      sgMail.send(msg).catch(err => console.error('SendGrid SDK Error:', err));
      res.status(200).json({ error: '' });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Reset Password
  app.post('/api/resetpassword', async (req, res) => {
    const { email, newPassword } = req.body;
    try {
      const user = await User.findOne({ Email: { $regex: new RegExp('^' + email.trim() + '$', 'i') } });
      if (!user) return res.status(200).json({ error: 'Email not found' });
      user.Password = newPassword; user.VerificationCode = ''; await user.save();
      res.status(200).json({ error: '' });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Delete Account endpoint
  app.post('/api/deleteaccount', async (req, res) => {
    const { userId } = req.body;
    try {
      // 1. Delete all pets belonging to this user
      await Pet.deleteMany({ userId: userId });
      
      // 2. Delete the user
      const result = await User.findByIdAndDelete(userId);
      
      if (!result) return res.status(404).json({ error: 'User not found' });
      
      res.status(200).json({ error: '' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });


  // --- Pet Management ---
  app.post('/api/addpet', async (req, res) => {
    const { userId, name, species, age, FeedingFrequency, WalkingFrequency } = req.body;
    try {
      const petCount = await Pet.countDocuments({ userId: userId });
      if (petCount >= 3) return res.status(400).json({ error: 'Limit reached: 3 pets max.' });

      const now = new Date();
      const feedFreq = parseInt(FeedingFrequency) || 8;
      const walkFreq = parseInt(WalkingFrequency) || 0;

      const newPet = new Pet({ 
        userId, 
        name, 
        species, 
        age, 
        FeedingFrequency: feedFreq,
        WalkingFrequency: walkFreq,
        lastFeeding: now,
        nextFeeding: new Date(now.getTime() + (feedFreq * 60 * 60 * 1000)),
        lastWalk: walkFreq > 0 ? now : null,
        nextWalk: walkFreq > 0 ? new Date(now.getTime() + (walkFreq * 60 * 60 * 1000)) : null
      });

      await newPet.save();
      res.status(200).json({ error: '' });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.post('/api/updatepet', async (req, res) => {
    const { petId, name, species, age, notes, FeedingFrequency, WalkingFrequency, logFeeding, logWalk } = req.body;
    try {
      const pet = await Pet.findById(petId);
      if (!pet) return res.status(404).json({ error: 'Pet not found' });

      if (name) pet.name = name;
      if (species) pet.species = species;
      if (age !== undefined) pet.age = age;
      if (notes !== undefined) pet.notes = notes;

      const now = new Date();

      // Handle Feeding
      if (FeedingFrequency !== undefined) pet.FeedingFrequency = parseInt(FeedingFrequency);
      if (logFeeding) {
        pet.lastFeeding = now;
        pet.nextFeeding = new Date(now.getTime() + (pet.FeedingFrequency * 60 * 60 * 1000));
      } else if (FeedingFrequency !== undefined && pet.lastFeeding) {
        pet.nextFeeding = new Date(pet.lastFeeding.getTime() + (pet.FeedingFrequency * 60 * 60 * 1000));
      }

      // Handle Walking
      if (WalkingFrequency !== undefined) pet.WalkingFrequency = parseInt(WalkingFrequency);
      if (pet.WalkingFrequency > 0) {
        if (logWalk) {
          pet.lastWalk = now;
          pet.nextWalk = new Date(now.getTime() + (pet.WalkingFrequency * 60 * 60 * 1000));
        } else if (WalkingFrequency !== undefined && pet.lastWalk) {
          pet.nextWalk = new Date(pet.lastWalk.getTime() + (pet.WalkingFrequency * 60 * 60 * 1000));
        }
      } else {
        pet.lastWalk = null;
        pet.nextWalk = null;
      }

      await pet.save();
      res.status(200).json({ error: '' });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.post('/api/searchpets', async (req, res) => {
    const { userId, search } = req.body;
    try {
      const results = await Pet.find({ userId, name: { $regex: search.trim() + '.*', $options: 'i' } });
      res.status(200).json({ results, error: '' });
    } catch (err) { res.status(500).json({ results: [], error: err.message }); }
  });

  app.post('/api/getpets', async (req, res) => {
    try {
      const results = await Pet.find({ userId: req.body.userId });
      res.status(200).json({ results, error: '' });
    } catch (err) { res.status(500).json({ results: [], error: err.message }); }
  });

  app.post('/api/deletepet', async (req, res) => {
    try {
      await Pet.findByIdAndDelete(req.body.petId);
      res.status(200).json({ error: '' });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });
}