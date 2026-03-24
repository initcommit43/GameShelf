const express = require('express');
const router = express.Router();
const pool = require('./database');
const axios = require('axios');

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

router.post('/log', async (req, res) => {
  const { igdb_id, title, cover_url, status, rating } = req.body;
  const user_id = req.user.userId;

  let game = await pool.query('SELECT * FROM games WHERE igdb_id = $1', [igdb_id]);
  
  if (game.rows.length === 0) {
    game = await pool.query(
      'INSERT INTO games (igdb_id, title, cover_url) VALUES ($1, $2, $3) RETURNING *',
      [igdb_id, title, cover_url]
    );
  }

  const game_id = game.rows[0].id;

  const log = await pool.query(
    'INSERT INTO game_logs (user_id, game_id, status, rating) VALUES ($1, $2, $3, $4) RETURNING *',
    [user_id, game_id, status, rating]
  );

  res.json(log.rows[0]);
});

module.exports = router;