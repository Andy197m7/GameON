import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import api from '../lib/api';

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const TIMES = ['morning','afternoon','evening'];

export default function Onboarding() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [step, setStep]     = useState(1);
  const [city, setCity]     = useState('');
  const [zip, setZip]       = useState('');
  const [surface, setSurface] = useState('any');
  const [distance, setDistance] = useState(10);
  const [avail, setAvail]   = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function toggleAvail(slot: string) {
    setAvail(prev => prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot]);
  }

  async function finish() {
    if (!zip || !city) { setError('Please enter your city and zip code.'); return; }
    setSubmitting(true);
    setError('');
    try {
      // Geocode zip via Google Maps Geocoding API
      const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${zip}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`;
      const geoRes = await fetch(geoUrl);
      const geoData = await geoRes.json();
      let lat = 0, lng = 0;
      if (geoData.results?.[0]) {
        lat = geoData.results[0].geometry.location.lat;
        lng = geoData.results[0].geometry.location.lng;
      }

      await api.post('/api/auth/onboard', {
        clerkId: user?.id,
        zipCode: zip, city, lat, lng,
        preferredSurface: surface,
        preferredDistance: distance,
        availability: avail,
      });
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '2rem', background: 'var(--surface)',
    }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 800,
            background: 'linear-gradient(135deg, var(--court-light), var(--ball))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>GameOn</h1>
          <p style={{ color: 'var(--muted)', marginTop: '0.5rem' }}>Let's set up your profile</p>
        </div>

        {/* Progress */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
          {[1, 2].map(s => (
            <div key={s} style={{
              flex: 1, height: 4, borderRadius: 2,
              background: s <= step ? 'var(--court-light)' : 'var(--surface-3)',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>

        <div className="card">
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem' }}>Where are you located?</h2>
              <div className="form-group">
                <label>City</label>
                <input type="text" value={city} onChange={e => setCity(e.target.value)}
                  placeholder="e.g. Austin" />
              </div>
              <div className="form-group">
                <label>Zip Code</label>
                <input type="text" value={zip} onChange={e => setZip(e.target.value)}
                  placeholder="e.g. 78701" maxLength={10} />
              </div>
              <div className="form-group">
                <label>Search radius</label>
                <select value={distance} onChange={e => setDistance(Number(e.target.value))}>
                  {[5, 10, 15, 25, 50].map(m => <option key={m} value={m}>{m} miles</option>)}
                </select>
              </div>
              {error && <p style={{ color: '#f87171', fontSize: '0.85rem' }}>{error}</p>}
              <button className="btn btn-primary" onClick={() => {
                if (!city || !zip) { setError('Please fill in both fields.'); return; }
                setError(''); setStep(2);
              }}>
                Continue →
              </button>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem' }}>Your preferences</h2>
              <div className="form-group">
                <label>Preferred surface</label>
                <select value={surface} onChange={e => setSurface(e.target.value)}>
                  <option value="any">Any</option>
                  <option value="hard">Hard</option>
                  <option value="clay">Clay</option>
                  <option value="grass">Grass</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.75rem' }}>Availability</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {DAYS.map(day => (
                    <div key={day}>
                      <p style={{ fontSize: '0.78rem', fontWeight: 600, textTransform: 'capitalize',
                        color: 'var(--muted)', marginBottom: '0.35rem' }}>{day}</p>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {TIMES.map(time => {
                          const slot = `${day}_${time}`;
                          const active = avail.includes(slot);
                          return (
                            <button key={time}
                              className={`btn ${active ? 'btn-primary' : 'btn-outline'}`}
                              style={{ flex: 1, fontSize: '0.75rem', padding: '0.4rem 0.5rem', textTransform: 'capitalize' }}
                              onClick={() => toggleAvail(slot)}>
                              {time}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {error && <p style={{ color: '#f87171', fontSize: '0.85rem' }}>{error}</p>}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn btn-ghost" onClick={() => setStep(1)}>← Back</button>
                <button className="btn btn-primary" style={{ flex: 1 }}
                  disabled={submitting} onClick={finish}>
                  {submitting ? 'Setting up...' : 'Get Started 🎾'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
