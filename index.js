require('dotenv').config();
console.log(process.env.DATABASE_URL);
const express = require('express');
const axios = require('axios');
const pool = require('./database');

const app = express();
app.use(express.json());

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

const authRoutes = require('./auth');
app.use('/auth', authRoutes);

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});