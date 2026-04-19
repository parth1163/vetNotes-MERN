require('express');
require('mongodb');
const Pet = require('./models/pet');
const User = require('./models/user');
const nodemailer = require('nodemailer');

// Configure SendGrid Transporter
const transporter = nodemailer.createTransport({
  service: 'SendGrid',
  auth: {
    user: 'apikey', // This must be exactly 'apikey'
    pass: process.env.SENDGRID_API_KEY
  }
});

exports.setApp = function (app, client)
{
  // ping api
  app.get("/api/ping", (req, res, next) => {
    res.status(200).json({ message: "Hello World" });
  });

  // login api
  app.post('/api/login', async (req, res) => {
    const { login, Password } = req.body;
    try {
      // Escape special characters in login for regex
      const safeLogin = login.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const user = await User.findOne({ 
        Email: { $regex: new RegExp('^' + safeLogin + '$', 'i') }, 
        Password: Password 
      }).lean();

      if (!user) {
        return res.status(200).json({ id: -1, FirstName: '', LastName: '', error: 'Invalid Email/Password' });
      }

      res.status(200).json({ 
        id: user._id, 
        FirstName: user.FirstName, 
        LastName: user.LastName, 
        IsVerified: user.IsVerified, 
        error: '' 
      });
    } catch (err) {
      res.status(500).json({ id: -1, FirstName: '', LastName: '', error: err.message });
    }
  });
  
  // register api
    // register api
  app.post('/api/register', async (req, res) => {
    const { FirstName, LastName, Email, Password } = req.body;
    try {
      const safeEmail = Email.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const existingUser = await User.findOne({ Email: { $regex: new RegExp('^' + safeEmail + '$', 'i') } });

      if (existingUser) {
        return res.status(400).json({ id: -1, error: 'Email already in use' });
      }

      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

      const newUser = new User({
        FirstName,
        LastName,
        Email: Email.trim(),
        Password,
        VerificationCode: verificationCode,
        IsVerified: false
      });

      await newUser.save();

      // Your Custom HTML Template
      const emailTemplate = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
      <html data-editor-version="2" class="sg-campaigns" xmlns="http://www.w3.org/1999/xhtml">
          <head>
            <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1">
            <meta http-equiv="X-UA-Compatible" content="IE=Edge">
            <style type="text/css">
              body, p, div { font-family: inherit; font-size: 14px; }
              body { color: #000000; }
              body a { color: #1188E6; text-decoration: none; }
              p { margin: 0; padding: 0; }
              table.wrapper { width:100% !important; table-layout: fixed; }
              img.max-width { max-width: 100% !important; }
              .column.of-2 { width: 50%; }
              @media screen and (max-width:480px) {
                .preheader .rightColumnContent, .footer .rightColumnContent { text-align: left !important; }
                .columns { width: 100% !important; }
                .column { display: block; width: 100% !important; padding-left: 0 !important; padding-right: 0 !important; }
              }
            </style>
            <link href="https://fonts.googleapis.com/css?family=Muli&display=swap" rel="stylesheet">
            <style>body {font-family: 'Muli', sans-serif;}</style>
          </head>
          <body>
            <center class="wrapper" style="background-color:#FFFFFF;">
              <div class="webkit">
                <table cellpadding="0" cellspacing="0" border="0" width="100%" class="wrapper" bgcolor="#FFFFFF">
                  <tr>
                    <td valign="top" bgcolor="#FFFFFF" width="100%">
                      <table width="100%" role="content-container" class="outer" align="center" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td width="100%">
                            <table width="100%" cellpadding="0" cellspacing="0" border="0">
                              <tr>
                                <td>
                                          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; max-width:600px;" align="center">
                                            <tr>
                                              <td role="modules-container" style="padding:0px; color:#000000; text-align:left;" bgcolor="#FFFFFF" width="100%" align="left">
                                                <table border="0" cellpadding="0" cellspacing="0" align="center" width="100%" role="module" style="padding:30px 20px;" bgcolor="#ffbe00">
                                                  <tbody>
                                                    <tr>
                                                      <td height="100%" valign="top">
                                                        <table width="100%" style="background-color:#ffffff; padding:50px 30px; border-radius:8px;">
                                                          <tr>
                                                            <td style="text-align: center;">
                                                              <h1 style="font-size: 36px; margin-bottom: 20px;">Welcome to Pet Tracker 22!</h1>
                                                              <p style="font-size: 16px; margin-bottom: 20px;">Please verify your email address to use the app and website.</p>
                                                              <p style="color: #ffbe00; font-size: 18px; font-weight: bold;">Your verification code is:</p>
                                                              <div style="margin-top: 25px;">
                                                                <span style="background-color:#ffbe00; color:#000000; padding:12px 40px; font-size:24px; font-weight:bold; border-radius:6px; letter-spacing:4px;">${verificationCode}</span>
                                                              </div>
                                                              <p style="margin-top: 30px; color: #ffbe00; font-size: 18px; font-weight: bold;">Thank you!</p>
                                                            </td>
                                                          </tr>
                                                        </table>
                                                      </td>
                                                    </tr>
                                                  </tbody>
                                                </table>
                                              </td>
                                            </tr>
                                          </table>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </div>
            </center>
          </body>
      </html>`;

      // SEND SENDGRID VERIFICATION EMAIL
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: Email.trim(),
        subject: 'Verify your Pet Tracker Account',
        html: emailTemplate
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) console.log("SendGrid Error: " + error);
        else console.log('Verification Email sent successfully');
      });

      res.status(200).json({ 
        id: newUser._id, 
        FirstName: newUser.FirstName, 
        LastName: newUser.LastName, 
        IsVerified: false, 
        error: '' 
      });

    } catch (err) {
      res.status(500).json({ id: -1, FirstName: '', LastName: '', error: err.message });
    }
  });

  // verify email api
  app.post('/api/verifyemail', async (req, res) => {
    const { userId, code } = req.body;
    try {
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ error: 'User not found' });

      if (user.VerificationCode !== code) {
        return res.status(400).json({ error: 'Invalid verification code' });
      }

      user.IsVerified = true;
      user.VerificationCode = ''; 
      await user.save();

      res.status(200).json({ error: '' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  
  // add pet api
  app.post('/api/addpet', async (req, res) => {
    const { userId, name, species, age, lastFeeding, lastWalk } = req.body;
    try {
      const petCount = await Pet.countDocuments({ userId: userId });
      if (petCount >= 3) {
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
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  
  // search pet api 
  app.post('/api/searchpets', async (req, res) => {
    const { userId, search } = req.body;
    var _search = search.trim();
    try {
      const results = await Pet.find({ 
        userId: userId, 
        name: { $regex: _search + '.*', $options: 'i' } 
      });
      res.status(200).json({ results: results, error: '' });
    } catch (err) {
      res.status(500).json({ results: [], error: err.message });
    }
  });
  
  // retrieve pet api 
  app.post('/api/getpets', async (req, res) => {
    const { userId } = req.body;
    try {
      const results = await Pet.find({ userId: userId });
      res.status(200).json({ results: results, error: '' });
    } catch (err) {
      res.status(500).json({ results: [], error: err.message });
    }
  });
  
  // update pet info 
  app.post('/api/updatepet', async (req, res) => {
    const { petId, name, species, age, notes } = req.body;
    try {
      await Pet.findByIdAndUpdate(petId, { name, species, age, notes });
      res.status(200).json({ error: '' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  
  // delete pet api 
  app.post('/api/deletepet', async (req, res) => {
    const { petId } = req.body;
    try {
      await Pet.findByIdAndDelete(petId);
      res.status(200).json({ error: '' });
    } 
    
    catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  //send verif code to email 
  app.post('/api/forgotpassword', async (req, res) =>
  {
    const { email } = req.body;
    try
    {
      const user = await User.findOne({ email: { $regex: new RegExp('^' + email + '$', 'i') } });
      if( !user )
      {
        return res.status(200).json({ error: 'No account found with that email' });
      }
      //generates 6 dig code 
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      //saves code to user
      user.VerificationCode = code;
      user.VerificationAttempts = 0;
      await user.save();
      res.status(200).json({ code: code, error: '' });
    }
    catch(err)
    {
      res.status(500).json({ error: err.message });
    }
  });

  //verify code given 
  app.post('/api/verifycode', async (req, res) =>
  {
    const { email, code } = req.body;
    try
    {
      const user = await User.findOne({ email: { $regex: new RegExp('^' + email + '$', 'i') } });
      if( !user )
      {
        return res.status(200).json({ verified: false, error: 'No account found with that email' });
      }
      if( user.VerificationAttempts >= 3 )
      {
        return res.status(200).json({ verified: false, error: 'Too many attempts' });
      }
      if( user.VerificationCode !== code )
      {
        user.VerificationAttempts += 1;
        await user.save();
        return res.status(200).json({ verified: false, error: 'Invalid verification code' });
      }
      //verifies code matches 
      user.VerificationAttempts = 0;
      user.VerificationCode = '';
      await user.save();
      res.status(200).json({ verified: true, error: '' });
    }
    catch(err)
    {
      res.status(500).json({ verified: false, error: err.message });
    }
  });

  //reset password api 
  app.post('/api/resetpassword', async (req, res) =>
  {
    const { email, newPassword } = req.body;
    try
    {
      const user = await User.findOne({ email: { $regex: new RegExp('^' + email + '$', 'i') } });
      if( !user )
      {
        return res.status(200).json({ error: 'No account found with that email' });
      }
      user.password = newPassword;
      await user.save();
      res.status(200).json({ error: '' });
    }
    catch(err)
    {
      res.status(500).json({ error: err.message });
    }
  });

  //send verif code to email 
  app.post('/api/forgotpassword', async (req, res) =>
  {
    const { email } = req.body;
    try
    {
      const user = await User.findOne({ email: { $regex: new RegExp('^' + email + '$', 'i') } });
      if( !user )
      {
        return res.status(200).json({ error: 'No account found with that email' });
      }
      //generates 6 dig code 
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      //saves code to user
      user.VerificationCode = code;
      user.VerificationAttempts = 0;
      await user.save();
      res.status(200).json({ code: code, error: '' });
    }
    catch(err)
    {
      res.status(500).json({ error: err.message });
    }
  });

  //verify code given 
  app.post('/api/verifycode', async (req, res) =>
  {
    const { email, code } = req.body;
    try
    {
      const user = await User.findOne({ email: { $regex: new RegExp('^' + email + '$', 'i') } });
      if( !user )
      {
        return res.status(200).json({ verified: false, error: 'No account found with that email' });
      }
      if( user.VerificationAttempts >= 3 )
      {
        return res.status(200).json({ verified: false, error: 'Too many attempts' });
      }
      if( user.VerificationCode !== code )
      {
        user.VerificationAttempts += 1;
        await user.save();
        return res.status(200).json({ verified: false, error: 'Invalid verification code' });
      }
      //verifies code matches 
      user.VerificationAttempts = 0;
      user.VerificationCode = '';
      await user.save();
      res.status(200).json({ verified: true, error: '' });
    }
    catch(err)
    {
      res.status(500).json({ verified: false, error: err.message });
    }
  });

  //reset password api 
  app.post('/api/resetpassword', async (req, res) =>
  {
    const { email, newPassword } = req.body;
    try
    {
      const user = await User.findOne({ email: { $regex: new RegExp('^' + email + '$', 'i') } });
      if( !user )
      {
        return res.status(200).json({ error: 'No account found with that email' });
      }
      user.password = newPassword;
      await user.save();
      res.status(200).json({ error: '' });
    }
    catch(err)
    {
      res.status(500).json({ error: err.message });
    }
  });
  
}
