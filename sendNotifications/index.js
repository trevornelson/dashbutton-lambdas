'use strict';

const AWS = require('aws-sdk');
const TWILIO_SID = process.env.TWILIO_SID;
const AUTH_TOKEN = process.env.AUTH_TOKEN;
const TO_NUMBER = process.env.TO_NUMBER;
const FROM_NUMBER = process.env.FROM_NUMBER;
const MESSAGE = process.env.MESSAGE;
var twilio = require('twilio')(TWILIO_SID, AUTH_TOKEN);

function sendNotification(event, callback) {
  twilio.sendMessage({
    to: TO_NUMBER,
    from: FROM_NUMBER,
    body: MESSAGE
  });

  callback(null, event);
}



exports.handler = (event, context, callback) => {
  const done = (err, res) => callback(null, {
    statusCode: '200',
    body: JSON.stringify(res),
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });

  sendNotification(event, done);
};

sendNotification();
