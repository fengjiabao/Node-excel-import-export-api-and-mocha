var fs = require('fs');
var XlsxPopulate = require('xlsx-populate');
var async = require('async');
var appRootDir = require('app-root-dir').get();
var moment = require('moment');

module.exports = {
  createInTemplate: function(array, template, callback) {
    if(!array && !template) {
      callback("Data and a template are required", null);
    } else if(!array || array instanceof Array !== true) {
      callback("Data is required to be passed as an array", null);
    } else if(!template) {
      callback("A template is required", null);
    } else if(!fs.existsSync(template)) {
      callback("The passed template does not exist", null);
    } else {
      var output = appRootDir + '/tmp/createInTemplate-' + moment().format('X') + '.xlsx';
      XlsxPopulate.fromFileAsync(template)
        .then(function(workbook) {
          for( var i = 0; i < array.length; i++ ) {
            var endRow = array[i].length + 3;
            workbook.sheet(i).range("A3:ZZ" + endRow).value(array[i]);
          }
          workbook.toFileAsync(output).then(function() {
            callback(null, output);
          });
        });
    }
  },
  deliverFile: function(filePath, res) {
    var stat = fs.statSync(filePath);
    res.writeHead(200, {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Length': stat.size
    });
    var readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
    readStream.on('end', function() {
      
      //fs.unlinkSync(filePath);
    });
  }
}
