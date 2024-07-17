// Import firebase
import { initializeApp } from 'firebase/app'
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore'

// SupeDB Firebase setup
const supedbConfig = {
  apiKey: process.env.SUPE_KEY,
  authDomain: 'supe-db.firebaseapp.com',
  projectId: 'supe-db',
  storageBucket: 'supe-db.appspot.com',
  messagingSenderId: '414925832647',
  appId: '1:414925832647:web:04e6b82a8fc2dd48bf99e2',
  measurementId: 'G-FCEP73WM0G',
}
const supedb = getFirestore(initializeApp(supedbConfig, 'supedb'))

// Datacord Firebase setup
const datacordConfig = {
  apiKey: process.env.DATACORD_KEY,
  authDomain: 'datacord-db.firebaseapp.com',
  projectId: 'datacord-db',
  storageBucket: 'datacord-db.appspot.com',
  messagingSenderId: '590361883150',
  appId: '1:590361883150:web:cf62a24d59b3b71173825f',
  measurementId: 'G-X5FM6KYXKM',
}
const datacord = getFirestore(initializeApp(datacordConfig, 'datacord'))

export { supedb, datacord, collection, getDocs, doc, getDoc, setDoc }
