var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
var parseUrlencoded = bodyParser.urlencoded({ extended: false });
var Page = require('../libs/page');
var Campaign = require('../models/campaign');
var appRootDir = require('app-root-dir').get();
var config = require('../config.json');
var createXlsx = require('../libs/createXlsx');
var importXlsx = require('../libs/importXlsx');
var fs = require('fs');
var multer  = require('multer');
var upload = multer({ dest: appRootDir + '/tmp/' });


router
  .get('/', function(req, res) {
    if(req.curveUser.clientId) {
      var paginationParams = { page: Page.valueOrDefault(req.query.page, 1), limit: Page.valueOrDefault(req.query.limit, 25), sort: Page.sortOrDefault(req.query.orderBy, req.query.orderDir) }
      Campaign.paginate(paramsToFilterField(req.query, req.curveUser), paginationParams, function(err, result) {
        if(err) {
          console.log(err)
          res.status(500).json({ message: "Internal error, please try again" });
        } else {
          res.status(200).json({ campaigns: result.docs, meta: { currentPage: paginationParams.page, totalPages: result.pages } });
        }
      });
    } else {
      res.status(403).json({ message: "Forbidden" });
    }
  })

.get('/export', function(req, res) {
  if(req.curveUser.clientId) {
    Campaign.find(paramsToFilterField(req.query, req.curveUser), function(err, campaigns) {
      if(err) {
        console.log(err)
        res.status(500).json({ message: "Internal error, please try again" });
      } else {
        Campaign.multipleCampaignsForXlsx(campaigns, function(err, data) {
        	createXlsx.createInTemplate([ data ], appRootDir + config.exportTemplates.campaign, function(err, filePath) {
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
    Campaign.findById(req.params.id, function(err, campaign) {
      if(!campaign) {
        res.status(404).json({ message: "Could not find Campaign with ID " + req.params.id });
      } else if(campaign.userForbidden(req.curveUser, "read")) {
        res.status(403).json({ message: "Forbidden" });
      } else if(campaign) {
        res.status(200).json(campaign);
      } else {
        res.status(500).json({ message: "Internal error, please try again" });
      }
    });
  } else {
    res.status(403).json({ message: "Forbidden" });
  }
})

.put('/:id', function(req, res) {
  Campaign.findById(req.params.id, function(err, foundCampaign) {
    if(!foundCampaign) {
      res.status(404).json({ message: "Could not find Campaign with ID " + req.params.id });
    } else if(foundCampaign.userForbidden(req.curveUser, "write")) {
      res.status(403).json({ message: "Forbidden" });
    } else if(foundCampaign) {
      delete req.body.clientId;
      Campaign.findByIdAndUpdate(req.params.id, req.body, { new: true }, function(e, campaign) {
        if(e) {
          console.log(e);
          res.status(500).json({ message: "Internal error, please try again" });
        } else {
          res.status(200).json(campaign);
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
    Campaign.findByIdAndRemove(req.params.id, function(e, campaign) {
      if(!campaign) {
        res.status(404).json({ message: "Could not find Campaign with ID " + req.params.id })
      } else if(campaign) {
        res.status(200).json(campaign);
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
    var campaign = new Campaign(req.body);
    campaign.save(function(err, campaign) {
      if(err) {
        res.status(500).json({ message: "Internal error, please try again" });
      } else {
        res.status(200).json(campaign);
      }
    });
  } else {
    res.status(403).json({ message: "Forbidden" });
  }
})

.post('/import', upload.single('file'), function(req, res) {
  if(req.curveUser.clientId && req.file) {
    importXlsx.getDataByTemplate(req.file.path, config.importTemplates.campaign, 0, function(err, data) {
      if(err) { 
        console.error(err);
        res.status(400).json({ errors: [err] });    
      } else {
        Campaign.importCampaigns(data, req.curveUser.clientId, function(errors, campaigns) {
          if(errors && errors.length > 0) {
            res.status(400).json({ errors: errors });    
          } else {
            res.status(200).json({ message: "All successfully imported", campaigns: campaigns });
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
  if(user.clientId) { params.clientId = user.clientId; }
  if(user.contractIds) { params.contractId = { $in: user.contractIds }; }
  if(inputParams.text) { params["$text"] = { "$search": inputParams.text } }
  return params;
}

module.exports = router;
