'use strict';

const AWS = require('aws-sdk');
const key = process.env.SECRET;
var encryptor = require('simple-encryptor')(key);

function encryptData(event, callback) {
  var params = JSON.parse(event.body);

  Object.keys(params).map((key, index) => {
    params[key] = encryptor.encrypt(params[key]);
  });

  callback(null, params);
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

  encryptData(event, done);
};
