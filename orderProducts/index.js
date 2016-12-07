'use strict';

const AWS = require('aws-sdk');
const https = require('https');
const successWebhook = process.env.SUCCESS;
const failureWebhook = process.env.FAILURE;
const dash_id = process.env.DASH_ID;
const maxPrice = process.env.MAX_PRICE;
const zincKey = process.env.ZINC;
const encryptionKey = process.env.SECRET;

var firebase = require('firebase-admin');
var serviceAccount = require('./dashbutton-3b778-firebase-adminsdk-93q92-c4a50ea88f.json');
firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: "https://dashbutton-3b778.firebaseio.com"
});

const zincAuth = 'Basic ' + new Buffer(zincKey + ':').toString('base64');

var encryptor = require('simple-encryptor')(encryptionKey);

function decryptData(data) {
  Object.keys(data).map((key, index) => {
    data[key] = encryptor.decrypt(data[key]);
  });
  
  return data;
}

function fetchData() {
  var btns = firebase.database().ref('buttons');
  return btns.orderByChild('id').equalTo(dash_id).once('child_added');
}

function fetchProducts(orders, eventType) {
  var order = null;
  switch(eventType) {
    case 'SINGLE':
      order = orders.single;
      break;
    case 'DOUBLE':
      order = Object.values(orders.double);
      break;
    case 'LONG':
      order = Object.values(orders.long);
      break;
  }

  var products = [];
  for(var key in order) {
    if(order.hasOwnProperty(key)) {
      products.push({
        product_id: order[key].product_id,
        quantity: order[key].product_quantity,
        variants: []
      });
    }
  }

  return products;
}

const callback = (response) => {
  var str = '';

  response.on('data', (chunk) => {
    str += chunk;
  });

  response.on('end', () => {
    console.log(str);
  });
}

const reqCallback = (response) => {
  var str = '';

  response.on('data', (chunk) => {
    str += chunk;
  });

  response.on('end', function() {
    setTimeout(function() {
      var response = JSON.parse(str);
      var request_id = response['request_id'];
      console.log(request_id);
      process.exit();
    });
  }, 1);
}

exports.handler = (event, context, callback) => {
  const eventType = event.clickType;

  fetchData().then((snapshot) => {
    firebase.database().ref('buttons').off();
    var btn = snapshot.val();
    var address = btn.address;
    var billing = decryptData(btn.billing);
    var credentials = decryptData(btn.amazoncreds);

    var data = {
      'retailer': 'amazon',
      'products': fetchProducts(btn.orders, eventType),
      'max_price': maxPrice,
      'shipping_address': {
        'first_name': address.first_name,
        'last_name': address.last_name,
        'address_line1': address.line_1,
        'address_line2': address.line_2,
        'zip_code': address.zip,
        'city': address.city,
        'state': address.state,
        'country': address.country,
        'phone_number': address.phone
      },
      'shipping_method': 'cheapest',
      'billing_address': {
        'first_name': address.first_name,
        'last_name': address.last_name,
        'address_line1': address.line_1,
        'address_line2': address.line_2,
        'zip_code': address.zip,
        'city': address.city,
        'state': address.state,
        'country': address.country,
        'phone_number': address.phone
      },
      'payment_method': {
        'name_on_card': billing.name,
        'number': billing.numb,
        'security_code': billing.cvv,
        'expiration_month': billing.month,
        'expiration_year': billing.year,
        'use_gift': false
      },
      'retailer_credentials': {
        'email': credentials.email,
        'password': credentials.password
      },
      'webhooks': {
        'order_placed': successWebhook,
        'order_failed': failureWebhook
      }
    };

    data = JSON.stringify(data);

    var options = {
      host: 'api.zinc.io',
      path: '/v1/orders',
      method: 'POST',
      headers: {
        'Authorization': zincAuth,
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': data.length
      }
    };

    var req = https.request(options, reqCallback);
    req.write(data);
    req.end();
  });
};
