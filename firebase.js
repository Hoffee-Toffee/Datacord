// Import firebase
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
  authDomain: "datacord-db.firebaseapp.com",
  projectId: "datacord-db",
  storageBucket: "datacord-db.appspot.com",
  messagingSenderId: "590361883150",
  appId: "1:590361883150:web:cf62a24d59b3b71173825f",
  measurementId: "G-X5FM6KYXKM"
};
const datacord = getFirestore(initializeApp(datacordConfig, "datacord"));

// Export the variables
// module.exports = {
//     supedb: supedb,
//     datacord: datacord,
//     collection: collection,
//     getDocs: getDocs,
//     doc: doc,
//     getDoc: getDoc,
//     setDoc: setDoc
// }

function notify (message) {
  const Discord = require("discord.js");
  const webhook = new Discord.WebhookClient({
      id: process.env.TEST_ID,
      token: process.env.TEST_TOKEN
  })

  webhook.send(message).catch(err => { console.log(err) } );
}

// Notify whenever any of those variables are used
module.exports = new Proxy(
  {
    supedb: supedb,
    datacord: datacord,
    collection: collection,
    getDocs: getDocs,
    doc: doc,
    getDoc: getDoc,
    setDoc: setDoc
  },
  {
    get: function (target, name) {
      notify(`'${name}' accessed at ${new Date().toLocaleString()}`);
      return target[name];
    },
  }
);