var express = require('express');
var router = express.Router();
var db = require('../models/db');
var config = require('../config.json')
var Authenticate = require('../libs/authenticate');

// Parse JSON in request body
var bodyParser = require('body-parser');
router.use(bodyParser.json());

// Middleware
	// Allow CORS
router.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "DELETE, GET, HEAD, POST, PUT, OPTIONS, TRACE");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, applicationToken");
  next();
});

	// Application Authentication
router.use(function(req, res, next) {
	if(!req.query.applicationToken && !req.headers.applicationToken && !req.headers.applicationtoken) {
		res.status(401).json({ message: "Application token is missing" });
	} else if(req.query.applicationToken == config.applicationToken || req.headers.applicationtoken == config.applicationToken || req.headers.applicationToken == config.applicationToken) {
		next();
	} else {
		res.status(401).json({ message: "Application token is invalid" });
	}
});

	// User Authentication
router.use(function(req, res, next) {
	if(req.originalUrl.indexOf("/authenticate") > -1) { 
		next(); 
	} else if(!req.query.token && !req.headers.token) {
		res.status(401).json({ message: "Authentication token is missing" });
	} else {
		var incomingToken = !!req.query.token ? req.query.token : req.headers.token;
		Authenticate.decodeToken(incomingToken, function(token) {
			if(token) {
				req.curveUser = token;
				next();
			} else {
				res.status(401).json({ message: "Authentication token is invalid" });
			}
		});
	}
});

// Require all route files and map to base route
router.use('/authenticate', require('./authenticate'));
router.use('/users', require('./users'));
router.use('/parents', require('./parents'));
router.use('/clients', require('./clients'));
router.use('/payees', require('./payees'));
router.use('/contracts', require('./contracts'));
router.use('/campaigns', require('./campaigns'));
router.use('/releases', require('./releases'));
router.use('/tracks', require('./tracks'));
router.use('/works', require('./works'));
router.use('/salesAccounts', require('./salesAccounts'));
router.use('/salesFiles', require('./salesFiles'));
router.use('/salesTemplates', require('./salesTemplates'));

// Route Action
router.get('/', function(req, res) {
  res.status(200).json({ message: "Authentication passed" });
});

module.exports = router;