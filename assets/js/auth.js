import { firebaseConfig, cloudAuthEnabled } from './auth-config.js';

const PROGRESS_KEY = 'drawflow_progression';
const QUIZ_KEY = 'drawflow_quiz';
const ACCOUNT_KEY = 'drawflow_account';

function grantAccountAccess(mode, user = null) {
  localStorage.setItem(ACCOUNT_KEY, JSON.stringify({
    mode,
    uid: user?.uid || null,
    displayName: user?.displayName || user?.email || 'Guest'
  }));
}

const defaultProgression = () => ({
  form: { unlocked: true, level1: true, level2: false, level3: false, completed: false },
  shadow: { unlocked: false, level1: false, level2: false, level3: false, completed: false },
  perspective: { unlocked: false, level1: false, level2: false, level3: false, completed: false },
  depth: { unlocked: false, level1: false, level2: false, level3: false, completed: false }
});

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function localSnapshot() {
  return {
    progression: readJson(PROGRESS_KEY, defaultProgression()),
    quiz: readJson(QUIZ_KEY, { score: null, attempts: [] }),
    updatedAt: new Date().toISOString()
  };
}

function saveLocalSnapshot(snapshot) {
  if (snapshot.progression) localStorage.setItem(PROGRESS_KEY, JSON.stringify(snapshot.progression));
  if (snapshot.quiz) localStorage.setItem(QUIZ_KEY, JSON.stringify(snapshot.quiz));
}

function mergeProgress(local, cloud) {
  const merged = structuredClone(local || defaultProgression());
  Object.keys(merged).forEach((topic) => {
    const remote = cloud?.[topic] || {};
    Object.keys(merged[topic]).forEach((key) => {
      if (typeof merged[topic][key] === 'boolean') merged[topic][key] = Boolean(merged[topic][key] || remote[key]);
    });
  });
  return merged;
}

let firebaseApi = null;

async function loadFirebase() {
  if (!cloudAuthEnabled || firebaseApi) return firebaseApi;
  const [{ initializeApp }, authModule, firestoreModule] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js'),
    import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js')
  ]);
  const app = initializeApp(firebaseConfig);
  const auth = authModule.getAuth(app);
  const db = firestoreModule.getFirestore(app);
  firebaseApi = { auth, db, authModule, firestoreModule };
  return firebaseApi;
}

async function syncWithCloud(user) {
  const api = await loadFirebase();
  if (!api) return localSnapshot();

  const { doc, getDoc, setDoc } = api.firestoreModule;
  const userRef = doc(api.db, 'users', user.uid);
  const local = localSnapshot();
  const remoteSnapshot = await getDoc(userRef);
  const remote = remoteSnapshot.exists() ? remoteSnapshot.data() : {};
  const merged = {
    profile: { email: user.email || '', displayName: user.displayName || 'Student', role: 'student' },
    progression: mergeProgress(local.progression, remote.progression),
    quiz: remote.quiz || local.quiz,
    updatedAt: new Date().toISOString()
  };
  saveLocalSnapshot(merged);
  await setDoc(userRef, merged, { merge: true });
  return merged;
}

async function signIn(email, password, register = false) {
  const api = await loadFirebase();
  if (!api) throw new Error('Cloud accounts are not configured yet. Guest mode is available now.');
  const { signInWithEmailAndPassword, createUserWithEmailAndPassword } = api.authModule;
  const result = register
    ? await createUserWithEmailAndPassword(api.auth, email, password)
    : await signInWithEmailAndPassword(api.auth, email, password);
  await syncWithCloud(result.user);
  grantAccountAccess('user', result.user);
  return result.user;
}

async function signInWithGoogle() {
  const api = await loadFirebase();
  if (!api) throw new Error('Cloud accounts are not configured yet. Guest mode is available now.');
  const provider = new api.authModule.GoogleAuthProvider();
  const result = await api.authModule.signInWithPopup(api.auth, provider);
  await syncWithCloud(result.user);
  grantAccountAccess('user', result.user);
  return result.user;
}

async function signOut() {
  const api = await loadFirebase();
  if (api) await api.authModule.signOut(api.auth);
  localStorage.removeItem(ACCOUNT_KEY);
}

function continueAsGuest() {
  grantAccountAccess('guest');
  return localSnapshot();
}

async function watchAuth(onChange) {
  const api = await loadFirebase();
  if (!api) {
    onChange({ mode: 'guest', cloudEnabled: false, snapshot: localSnapshot() });
    return () => {};
  }
  return api.authModule.onAuthStateChanged(api.auth, async (user) => {
    if (!user) {
      onChange({ mode: 'guest', cloudEnabled: true, snapshot: localSnapshot() });
      return;
    }
    onChange({ mode: 'user', cloudEnabled: true, user, snapshot: await syncWithCloud(user) });
  });
}

export {
  cloudAuthEnabled,
  localSnapshot,
  continueAsGuest,
  signIn,
  signInWithGoogle,
  signOut,
  watchAuth
};
