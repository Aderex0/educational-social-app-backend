// export GOOGLE_APPLICATION_CREDENTIALS="/Users/barborakadlcikova/Desktop/serviceKey.json"

// Express //
const express = require('express')
const app = express()

// Firebase //
const firebase = require('firebase')
const functions = require('firebase-functions')
const admin = require('firebase-admin')

const firebaseConfig = {
  apiKey: 'AIzaSyAuX277hjNb6lLCAifqlOwLwDttsQLe6_k',
  authDomain: 'educational-social-app.firebaseapp.com',
  databaseURL: 'https://educational-social-app.firebaseio.com',
  projectId: 'educational-social-app',
  storageBucket: 'educational-social-app.appspot.com',
  messagingSenderId: '341133056213',
  appId: '1:341133056213:web:bdddadd8a1d4141b3aaa5c',
  measurementId: 'G-TNWY2KSML5'
}

firebase.initializeApp(firebaseConfig)
admin.initializeApp()

const db = admin.firestore()

app.get('/screams', (request, response) => {
  db.collection('screams')
    .orderBy('createdAt', 'desc')
    .get()
    .then(data => {
      let screams = []
      data.forEach(doc => {
        screams.push({
          screamId: doc.id,
          body: doc.data().body,
          userHandle: doc.data().userHandle,
          createdAt: doc.data().createdAt
        })
      })

      return response.json(screams)
    })
    .catch(err => console.error(err))
})

app.post('/scream', (request, response) => {
  const newScream = {
    body: request.body.body,
    userHandle: request.body.userHandle,
    createdAt: new Date().toISOString()
  }

  db.collection('screams')
    .add(newScream)
    .then(doc => {
      response.json({ message: `document ${doc.id} created successfully` })
    })
    .catch(err => {
      response.status(500).json({ error: 'something went wrong' })
      console.error(err)
    })
})

// Signup Route

app.post('/signup', (request, response) => {
  const newUser = {
    email: request.body.email,
    password: request.body.password,
    confirmPassword: request.body.confirmPassword,
    handle: request.body.handle
  }

  db.doc(`/users/${newUser.handle}`)
    .get()
    .then(doc => {
      if (doc.exists) {
        return response
          .status(400)
          .json({ handle: 'this handle is already taken' })
      } else {
        return firebase
          .auth()
          .createUserWithEmailAndPassword(newUser.email, newUser.password)
      }
    })
    .then(data => {
      return data.user.getIdToken()
    })
    .then(token => {
      return response.status(201).json({ token })
    })
    .catch(err => {
      if (err.code === 'auth/email-already-in-use') {
        return response.status(400).json({ email: 'Email is already in use' })
      } else {
        return response.status(500).json({ error: err.code })
      }
    })
})

exports.api = functions.region('europe-west1').https.onRequest(app)
