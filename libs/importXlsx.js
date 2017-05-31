var fs = require('fs');
var XLSX = require('xlsx');
var async = require('async');
var appRootDir = require('app-root-dir').get();
var moment = require('moment');
var multer = require('multer');
var appRootDir = require('app-root-dir').get();

var getData = function(file, sheetIndex, callback) {
  if(!file) {
    callback("A file is required", null);
  } else if(!fs.existsSync(file)) {
    callback("The passed file does not exist", null);
  } else {
    try {
      var workbook = XLSX.readFile(file);
      var sheet = workbook.Sheets[workbook.SheetNames[sheetIndex]];
      var rows = XLSX.utils.sheet_to_csv(sheet, { FS: "|&" }).split('\n');
      var outputArray = [];
      async.eachSeries(rows, function(row, cb) {
        outputArray.push(row.split('|&'));
        cb();
      }, function(err) {
        callback(err, outputArray);
      });
    } catch(err) {
      console.error(err);
      callback("Error opening file, the file format should be xlsx", null);
    }
  }
}

var mapDataToTemplate = function(data, template, callback) {
  // Expects data to be array of values, and template in the format of [{ key: 'Some Key', type: 'Array', separator: ';' }]
  if(!data && !template) {
    callback("Data and a template is required", null);
  } else if(!data) {
    callback("Data is required", null);
  } else if(data instanceof Array !== true) {
    callback("Data must be an Array", null);
  } else if(!template) {
    callback("Template is required", null);
  } else if(template instanceof Array !== true) {
    callback("Template must be an Array", null);
  } else {
    var mappedData = {};
    async.forEachOf(data, function(value, index, cb) {
      var templateObject = template[index];
      if(templateObject.type == "Array" && templateObject.separator) {
        // Splits value by the separator, and trims and white space from subsequent values
        mappedData[templateObject.key] = value.split(templateObject.separator).map(Function.prototype.call, String.prototype.trim);
      } else if(templateObject.type == "Array") {
        // Forces value into array
        mappedData[templateObject.key] = [value];
      } else {
        mappedData[templateObject.key] = value;
      }
      cb();
    }, function(err) {
      if(err) {
        callback(err, null);
      } else {
        callback(null, mappedData);
      }
    });
  }
}

module.exports = {
  getDataByTemplate: function(file, template, sheetIndex, callback) {
    if(!file && !template) {
      callback("A file and a template are required", null);
    } else if(!file) {
      callback("A file is required", null);
    } else if(!fs.existsSync(file)) {
      callback("The passed file does not exist", null);
    } else if(!template) {
      callback("A template is required", null);
    } else if(template instanceof Array !== true) {
      callback("The template must be an Array", null);
    } else {
      getData(file, sheetIndex, function(err, data) {
        if(err) {
          callback(err, null);
        } else {
          var mappedData = [];
          data.splice(0, 2);
          async.eachSeries(data, function(row, cb) {
            mapDataToTemplate(row, template, function(err, newData) {
              mappedData.push(newData);
              cb();
            });
          }, function(err) {
            if(err) {
              callback(err, null);
            } else {
              callback(null, mappedData);
            }
          });
        }
      });
    }
  },
  getData: getData
}
