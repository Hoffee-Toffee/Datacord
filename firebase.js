// Import firebase for firestore
import firebase from "firebase/app";

// Firebase configurations (for the bot database and the supes database)
const supeConfig = {
    apiKey: process.env.SUPE_API_KEY,
    authDomain: "supe-db.firebaseapp.com",
    projectId: "supe-db",
    storageBucket: "supe-db.appspot.com",
    messagingSenderId: "414925832647",
    appId: "1:414925832647:web:04e6b82a8fc2dd48bf99e2",
    measurementId: "G-FCEP73WM0G"
};

const botConfig = {
    apiKey: process.env.BOT_API_KEY,
    authDomain: "datacord-c462a.firebaseapp.com",
    projectId: "datacord-c462a",
    storageBucket: "datacord-c462a.appspot.com",
    messagingSenderId: "432090619409",
    appId: "1:432090619409:web:4626b9a132ab5c4cc61bb0",
    measurementId: "G-4N3BH0J3GD"
};

// Initialize Firebase apps
const supeApp = firebase.initializeApp(supeConfig, "supeApp");
const botApp = firebase.initializeApp(botConfig, "botApp");

// Get each firestore collection
const supeDB = supeApp.firestore();
const botDB = botApp.firestore();

// Export the database variables
export { supeDB, botDB };