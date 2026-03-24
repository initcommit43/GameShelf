require('dotenv').config();
const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const pool = require('./database');
const authRoutes = require('./auth');
const gameRoutes = require('./games');

const app = express();
app.use(express.json());

function authenticateToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

async function getAccessToken() {
  const response = await axios.post(`https://id.twitch.tv/oauth2/token`, null, {
    params: {
      client_id: process.env.TWITCH_CLIENT_ID,
      client_secret: process.env.TWITCH_CLIENT_SECRET,
      grant_type: 'client_credentials'
    }
  });
  return response.data.access_token;
}

app.get('/games/search', async (req, res) => {
  const { query } = req.query;
  const accessToken = await getAccessToken();
  const response = await axios.post('https://api.igdb.com/v4/games',
    `search "${query}"; fields name,cover; limit 10;`,
    {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );
  res.json(response.data);
});

app.use('/auth', authRoutes);
app.use('/games', authenticateToken, gameRoutes);

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});