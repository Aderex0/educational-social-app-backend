const functions = require('firebase-functions')
const admin = require('firebase-admin')

admin.initializeApp()

const express = require('express')
const app = express()

app.get('/screams', (request, response) => {
  admin
    .firestore()
    .collection('screams')
    .get()
    .then(data => {
      let screams = []
      data.forEach(doc => {
        screams.push(doc.data())
      })

      return response.json(screams)
    })
    .catch(err => console.error(err))
})

exports.createScream = functions.https.onRequest((request, response) => {
  if (request.method !== 'POST') {
    return response.status(400).json({ error: 'Method not allowed' })
  }
  const newScream = {
    body: request.body.body,
    userHandle: request.body.userHandle,
    createdAt: admin.firestore.Timestamp.fromDate(new Date())
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

exports.api = functions.https.onRequest(app)
