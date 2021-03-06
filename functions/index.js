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

const FBAuth = (request, response, next) => {
  let idToken
  if (
    request.headers.authorization &&
    request.headers.authorization.startsWith('Bearer ')
  ) {
    idToken = request.headers.authorization.split('Bearer ')[1]
  } else {
    console.error('No token found')
    return response.status(403).json({ error: 'Unauthorized' })
  }

  admin
    .auth()
    .vertifyIdToken(idToken)
    .then(decodedToken => {
      request.user = decodedToken
      console.log(decodedToken)
      return db
        .collection('user')
        .where('userId', '==', request.user.uid)
        .limit(1)
        .get()
    })
    .then(data => {
      request.user.handle = data.docs[0].data().handle
      return next()
    })
    .catch(err => {
      console.error('Error while vertifying token')
      return response.status(403).json({ err })
    })
}

// Post scream route
app.post('/scream', FBAuth, (request, response) => {
  if (request.body.body.trim() === '') {
    return response.status(400).json({ body: 'Body must not be empty' })
  }

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

// Email validation helper
const isEmail = email => {
  const emailRegEx = /[^@]+@[^\.]+\..+/
  if (email.match(emailRegEx)) {
    return true
  } else {
    return false
  }
}

const isEmpty = string => {
  if (string.trim() === '') {
    return true
  } else {
    return false
  }
}

// Signup route
app.post('/signup', (request, response) => {
  const newUser = {
    email: request.body.email,
    password: request.body.password,
    confirmPassword: request.body.confirmPassword,
    handle: request.body.handle
  }

  // user input fields validations
  let errors = {}
  if (isEmpty(newUser.email)) {
    errors.email = 'Must not be empty'
  } else if (!isEmail(newUser.email)) {
    errors.email = 'Must be a valid email address 1'
  }

  if (isEmpty(newUser.password)) errors.password = 'Must not be empty'
  if (newUser.password !== newUser.confirmPassword)
    errors.confirmPassword = 'Passwords must match'
  if (isEmpty(newUser.handle)) errors.handle = 'Must not be empty'

  if (Object.keys(errors).length > 0) return response.status(400).json(errors)

  // user registration validation
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

app.post('/login', (request, response) => {
  const user = {
    email: request.body.email,
    password: request.body.password
  }

  let errors = {}

  if (isEmpty(user.email)) errors.email = 'Must not be empty'
  if (isEmpty(user.password)) errors.email = 'Must not be empty'

  if (Object.keys(errors).length > 0) return response.status(400).json(errors)

  firebase
    .auth()
    .signInWithEmailAndPassword(user.email, user.password)
    .then(data => {
      return data.user.getIdToken()
    })
    .then(token => {
      return response.json({ token })
    })
    .catch(err => {
      console.error(err)
      if ((err.code = 'auth/wrong-password')) {
        return response
          .status(403)
          .json({ general: 'Wrong credentials, please try again' })
      } else {
        return response.status(500).json({ error: err.code })
      }
    })
})

exports.api = functions.region('europe-west1').https.onRequest(app)
