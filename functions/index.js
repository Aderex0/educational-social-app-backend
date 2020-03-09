// Firebase //
const functions = require('firebase-functions')
const admin = require('firebase-admin')

var firebaseConfig = {
  apiKey: 'AIzaSyAuX277hjNb6lLCAifqlOwLwDttsQLe6_k',
  authDomain: 'educational-social-app.firebaseapp.com',
  databaseURL: 'https://educational-social-app.firebaseio.com',
  projectId: 'educational-social-app',
  storageBucket: 'educational-social-app.appspot.com',
  messagingSenderId: '341133056213',
  appId: '1:341133056213:web:bdddadd8a1d4141b3aaa5c',
  measurementId: 'G-TNWY2KSML5'
}

const firebase = require('firebase')
firebase.initializeApp(firebaseConfig)

// Express //
const express = require('express')
const app = express()
admin.initializeApp()

app.get('/screams', (request, response) => {
  admin
    .firestore()
    .collection('screams')
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

  admin
    .firestore()
    .collection('screams')
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

  firebase
    .auth()
    .createUserWithEmailAndPassword(newUser.email, newUser.password)
    .then(data => {
      return response
        .status(201)
        .json({ message: `user ${data.user.uid} signed up successfully` })
    })
    .catch(err => {
      console.log(err)
      return response.status(500).json({ error: err.code })
    })
})

exports.api = functions.region('europe-west1').https.onRequest(app)
