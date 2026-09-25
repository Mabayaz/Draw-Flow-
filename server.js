const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const rootDir = __dirname;
const port = Number(process.env.PORT || 5000);
let admin = null;
let db = null;

try {
  const firebaseAdmin = require('firebase-admin');
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    const serviceAccount = JSON.parse(serviceAccountJson);
    firebaseAdmin.initializeApp({ credential: firebaseAdmin.credential.cert(serviceAccount) });
    admin = firebaseAdmin;
    db = firebaseAdmin.firestore();
    console.log('Firebase Admin initialized.');
  } else {
    console.warn('Firebase Admin disabled: FIREBASE_SERVICE_ACCOUNT_JSON is not configured.');
  }
} catch (error) {
  console.warn(`Firebase Admin disabled: ${error.message}`);
}

app.use(cors({ origin: true }));
app.use(express.json({ limit: '12mb' }));
app.use(express.static(rootDir, { extensions: ['html'] }));

function requireFirebase(req, res, next) {
  if (!admin || !db) return res.status(503).json({ error: 'Cloud sync is not configured.' });
  next();
}

async function verifyAuthToken(req, res, next) {
  if (!admin) return res.status(503).json({ error: 'Cloud sync is not configured.' });
  const authorization = req.headers.authorization || '';
  if (!authorization.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing Firebase ID token.' });

  try {
    req.user = await admin.auth().verifyIdToken(authorization.slice(7));
    next();
  } catch {
    res.status(403).json({ error: 'Invalid or expired Firebase ID token.' });
  }
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'DrawFlow API online', cloudSync: Boolean(db), time: new Date().toISOString() });
});

app.get('/api/progress', verifyAuthToken, requireFirebase, async (req, res) => {
  try {
    const snapshot = await db.collection('users').doc(req.user.uid).get();
    res.json({ progress: snapshot.exists ? snapshot.data().progress || {} : {} });
  } catch (error) {
    res.status(500).json({ error: 'Could not load progress.', details: error.message });
  }
});

app.post('/api/progress/sync', verifyAuthToken, requireFirebase, async (req, res) => {
  const { progressData } = req.body || {};
  if (!progressData || typeof progressData !== 'object') return res.status(400).json({ error: 'progressData must be an object.' });

  try {
    await db.collection('users').doc(req.user.uid).set({
      profile: { email: req.user.email || '', lastActive: admin.firestore.FieldValue.serverTimestamp() },
      progress: progressData
    }, { merge: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Could not sync progress.', details: error.message });
  }
});

app.post('/api/drawing/save', verifyAuthToken, requireFirebase, async (req, res) => {
  const { moduleName, level, imageBase64, score } = req.body || {};
  if (!moduleName || !level || !imageBase64) return res.status(400).json({ error: 'moduleName, level, and imageBase64 are required.' });

  try {
    await db.collection('users').doc(req.user.uid).collection('drawings').add({
      moduleName,
      level: Number(level),
      score: Number(score || 0),
      imageBase64,
      savedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Could not save drawing.', details: error.message });
  }
});

app.get('/', (req, res) => res.sendFile(path.join(rootDir, 'index.html')));

app.listen(port, () => {
  console.log(`DrawFlow server running at http://localhost:${port}`);
});
