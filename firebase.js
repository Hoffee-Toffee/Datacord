// Import firebase
console.log('Importing firebase.js...');
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, doc, getDoc, setDoc } = require("firebase/firestore");

// SupeDB Firebase setup
const supedbConfig = {
  apiKey: process.env.SUPE_KEY,
  authDomain: "supe-db.firebaseapp.com",
  projectId: "supe-db",
  storageBucket: "supe-db.appspot.com",
  messagingSenderId: "414925832647",
  appId: "1:414925832647:web:04e6b82a8fc2dd48bf99e2",
  measurementId: "G-FCEP73WM0G",
};
const supedb = getFirestore(initializeApp(supedbConfig, "supedb"));

// Datacord Firebase setup
const datacordConfig = {
  apiKey: process.env.DATACORD_KEY,
  authDomain: "datacord-c462a.firebaseapp.com",
  projectId: "datacord-c462a",
  storageBucket: "datacord-c462a.appspot.com",
  messagingSenderId: "432090619409",
  appId: "1:432090619409:web:4626b9a132ab5c4cc61bb0",
  measurementId: "G-4N3BH0J3GD",
};
const datacord = getFirestore(initializeApp(datacordConfig, "datacord"));

// Export the variables
module.exports = {
    supedb: supedb,
    datacord: datacord,
    collection: collection,
    getDocs: getDocs,
    doc: doc,
    getDoc: getDoc,
    setDoc: setDoc
}