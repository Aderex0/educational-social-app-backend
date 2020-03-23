// export GOOGLE_APPLICATION_CREDENTIALS="/Users/barborakadlcikova/Desktop/serviceKey.json"

// Express //
const express = require('express')
const app = express()

// Firebase //
const firebase = require('firebase')
const functions = require('firebase-functions')
const admin = require('firebase-admin')

firebase.initializeApp(firebaseConfig)
admin.initializeApp()

const db = admin.firestore()

// Get screams route
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

// Post screams route
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

// Signup route
app.post('/signup', (request, response) => {
  const newUser = {
    email: request.body.email,
    password: request.body.password,
    confirmPassword: request.body.confirmPassword,
    handle: request.body.handle
  }
  let token, userId
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
      userId = data.user.uid
      return data.user.getIdToken()
    })
    .then(idToken => {
      token = idToken
      const userCredentials = {
        handle: newUser.handle,
        email: newUser.email,
        createdAt: new Date().toISOString(),
        userId
      }

      db.doc(`/users/${newUser.handle}`).set(userCredentials)
    })
    .then(() => {
      return response.status(201).json({ token })
    })
    .catch(err => {
      console.error(err)
      if (err.code === 'auth/email-already-in-use') {
        return response.status(400).json({ email: 'Email is already in use' })
      } else {
        return response.status(500).json({ error: err.code })
      }
    })
})

exports.api = functions.region('europe-west1').https.onRequest(app)
