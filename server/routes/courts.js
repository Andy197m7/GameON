const express = require('express');
const router = express.Router();
const Court = require('../models/Court');
const https = require('https');

/**
 * GET /api/courts/nearby
 * Query: ?lat=&lng=&maxMiles=5
 */
router.get('/nearby', async (req, res, next) => {
  try {
    const { lat, lng, maxMiles = 10 } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });

    const maxMeters = parseFloat(maxMiles) * 1609.34;

    const courts = await Court.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          distanceField: 'distanceMeters',
          maxDistance: maxMeters,
          spherical: true,
        },
      },
      { $limit: 15 },
    ]);

    res.json({ courts });
  } catch (err) { next(err); }
});

/**
 * GET /api/courts/midpoint
 * Find courts nearest to the midpoint between two players.
 * Query: ?lat1=&lng1=&lat2=&lng2=&maxMiles=10
 */
router.get('/midpoint', async (req, res, next) => {
  try {
    const { lat1, lng1, lat2, lng2, maxMiles = 10 } = req.query;
    if (!lat1 || !lng1 || !lat2 || !lng2)
      return res.status(400).json({ error: 'lat1, lng1, lat2, lng2 required' });

    const midLat = (parseFloat(lat1) + parseFloat(lat2)) / 2;
    const midLng = (parseFloat(lng1) + parseFloat(lng2)) / 2;
    const maxMeters = parseFloat(maxMiles) * 1609.34;

    const courts = await Court.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [midLng, midLat] },
          distanceField: 'distanceMeters',
          maxDistance: maxMeters,
          spherical: true,
        },
      },
      { $limit: 3 },
    ]);

    res.json({ courts, midpoint: { lat: midLat, lng: midLng } });
  } catch (err) { next(err); }
});

/**
 * GET /api/courts/:id
 */
router.get('/:id', async (req, res, next) => {
  try {
    const court = await Court.findById(req.params.id);
    if (!court) return res.status(404).json({ error: 'Court not found' });
    res.json({ court });
  } catch (err) { next(err); }
});

/**
 * POST /api/courts/seed
 * Seeds courts from Google Places API for a given location.
 * Body: { lat, lng, radiusMiles }
 * Admin use only — protect with API key check in production.
 */
router.post('/seed', async (req, res, next) => {
  try {
    const { lat, lng, radiusMiles = 10 } = req.body;
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Google Maps API key not configured' });

    const radiusMeters = Math.round(parseFloat(radiusMiles) * 1609.34);
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
      `?location=${lat},${lng}&radius=${radiusMeters}&type=tennis_court&key=${apiKey}`;

    // Fetch from Google Places
    const data = await new Promise((resolve, reject) => {
      https.get(url, (resp) => {
        let body = '';
        resp.on('data', (chunk) => body += chunk);
        resp.on('end', () => {
          try { resolve(JSON.parse(body)); }
          catch (e) { reject(e); }
        });
      }).on('error', reject);
    });

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      return res.status(502).json({ error: `Google Places error: ${data.status}` });
    }

    let seeded = 0;
    for (const place of data.results || []) {
      const exists = await Court.findOne({ googlePlaceId: place.place_id });
      if (exists) continue;

      await Court.create({
        name: place.name,
        address: place.vicinity,
        location: {
          type: 'Point',
          coordinates: [place.geometry.location.lng, place.geometry.location.lat],
        },
        googlePlaceId: place.place_id,
      });
      seeded++;
    }

    res.json({ seeded, total: (data.results || []).length });
  } catch (err) { next(err); }
});

module.exports = router;
