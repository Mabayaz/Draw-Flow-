// Add Firebase project values here to enable cloud accounts. Guest mode works without them.
export const firebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: ''
};

export const cloudAuthEnabled = Object.values(firebaseConfig).every(Boolean);
