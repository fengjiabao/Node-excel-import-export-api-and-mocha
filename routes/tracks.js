var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
var parseUrlencoded = bodyParser.urlencoded({ extended: false });
var Page = require('../libs/page');
var Track = require('../models/track');
var appRootDir = require('app-root-dir').get();
var config = require('../config.json');
var createXlsx = require('../libs/createXlsx');
var importXlsx = require('../libs/importXlsx');
var multer  = require('multer');
var upload = multer({ dest: appRootDir + '/tmp/' });

router
	.get('/', function(req, res) {
		if(req.curveUser.clientId) {
			var paginationParams = { page: Page.valueOrDefault(req.query.page, 1), limit: Page.valueOrDefault(req.query.limit, 25), sort: Page.sortOrDefault(req.query.orderBy, req.query.orderDir) }
			Track.paginate(paramsToFilterField(req.query, req.curveUser), paginationParams, function(err, result) {
				if(err) { 
					console.log(err)
					res.status(500).json({ message: "Internal error, please try again" });
				} else {
					res.status(200).json({ tracks: result.docs, meta: { currentPage: paginationParams.page, totalPages: result.pages } });
				}
			});
		} else {
			res.status(403).json({ message: "Forbidden" });
		}
	})

	.get('/export', function(req, res) {
	  if(req.curveUser.clientId) {
	    Track.find(paramsToFilterField(req.query, req.curveUser), function(err, tracks) {
	      if(err) {
	        console.log(err)
	        res.status(500).json({ message: "Internal error, please try again" });
	      } else {
	        Track.convertTracksForXlsx(tracks, function(err, data) {
	        	createXlsx.createInTemplate([data], appRootDir + config.exportTemplates.track, function(err, filePath) {
	        		if(err) {
	        			console.log(err)
	        			res.status(500).json({ message: "Internal error, please try again" });
	        		} else {
	        			createXlsx.deliverFile(filePath, res);
	        		}
	        	});
	        });
	      }
	    });
	  } else {
	    res.status(403).json({ message: "Forbidden" });
	  }
	})

	.get('/:id', function(req, res) {
		if(req.curveUser.clientId) {
			Track.findById(req.params.id, function(err, track) {
				if(!track) {
					res.status(404).json({ message: "Could not find Track with ID " + req.params.id });
				} else if(track.userForbidden(req.curveUser, "read")) {
					res.status(403).json({ message: "Forbidden" });
				} else if(track) {
					res.status(200).json(track);
				} else {
					res.status(500).json({ message: "Internal error, please try again" });
				}
			});
		} else {
			res.status(403).json({ message: "Forbidden" });
		}
	})

	.put('/:id', function(req, res) {
		Track.findById(req.params.id, function(err, foundTrack) {
			if(!foundTrack) {
				res.status(404).json({ message: "Could not find Track with ID " + req.params.id });
			} else if(foundTrack.userForbidden(req.curveUser, "write")) {
				res.status(403).json({ message: "Forbidden" });
			} else if(foundTrack) {
				delete req.body.clientId;
				Track.findByIdAndUpdate(req.params.id, req.body, { new: true }, function(e, track) {
					if(e) {
						console.log(e);
						res.status(500).json({ message: "Internal error, please try again" });
					} else {
						res.status(200).json(track);
					}
				});
			} else {
				console.log(err);
				res.status(500).json({ message: "Internal error, please try again" });
			}
		});
	})

	.delete('/:id', function(req, res) {
		if(req.curveUser.clientId && !req.curveUser.payeeId) {
			Track.findByIdAndRemove(req.params.id, function(e, track) {
				if(!track) {
					res.status(404).json({ message: "Could not find Track with ID " + req.params.id })					
				} else if(track) {
					res.status(200).json(track);
				} else {
					console.log(e);
					res.status(500).json({ message: "Internal error, please try again" });
				}
			});
		} else {
			res.status(403).json({ message: "Forbidden" });
		}
		
	})

	.post('/', parseUrlencoded, function(req, res) {
		if(req.curveUser.clientId && !req.curveUser.payeeId) {
			req.body.clientId = req.curveUser.clientId;
			var track = new Track(req.body);
			track.save(function(err, track) {
				if(err) {
					console.log(err);
					res.status(500).json({ message: "Internal error, please try again" });
				} else {
					res.status(200).json(track);
				}
			});
		} else {
			res.status(403).json({ message: "Forbidden" });
		}
	})

	.post('/import', upload.single('file'), function(req, res) {
	  if(req.curveUser.clientId && req.file) {
	    importXlsx.getDataByTemplate(req.file.path, config.importTemplates.track, 0, function(err, data) {
	      if(err) { 
	        console.error(err);
	        res.status(400).json({ errors: [err] });    
	      } else {
	        Track.importTracks(data, req.curveUser.clientId, function(errors, tracks) {
	          if(errors && errors.length > 0) {
	            res.status(400).json({ errors: errors });    
	          } else {
	            res.status(200).json({ message: "All successfully imported", tracks: tracks });
	          }
	        });
	      }
	    });
	  } else if(req.curveUser.clientId && !req.file) { 
	    res.status(400).json({ errors: ["Requires a file to be uploaded"] });
	  } else {
	  	res.status(403).json({ message: "Forbidden" });
	  }
	});


function paramsToFilterField(inputParams, user) {
	params = {};
	if(user.payeeId && user.contractIds && user.contractIds.length > 0) {
		params = { $and: [{ clientId: user.clientId }, { $or: [{ 'salesReturnsRights.contractId': { $in: user.contractIds } }, { 'costsRights.contractId': { $in: user.contractIds } }] }] };
	} else if(user.clientId) { 
		params = { clientId: user.clientId };
	}
	if(inputParams.text) { params["$text"] = { "$search": inputParams.text } }
	return params;
}

module.exports = router;