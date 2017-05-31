var chai = require('chai');
var expect = chai.expect;
var sinon = require('sinon');
var fs = require('fs');
var XlsxPopulate = require('xlsx-populate');
var XLSX = require('xlsx');
var createXlsx = require('../../libs/createXlsx');
var appRootDir = require('app-root-dir').get();


describe("createXlsx", function() {
	describe("#createInTemplate", function() {
		describe("when passed an array and template", function() {
			var template = appRootDir + "/test/test-data/Release.xlsx";
			var data = [["data"], ["more data"]];
			it("should not return an error", function(done) {
				createXlsx.createInTemplate([data], template, function(err, outputFile) { 
					expect(err).to.eq(null);
					fs.unlink(outputFile, function() {
						done();
					});
				});
			});
			it("should return a string", function(done) {
				createXlsx.createInTemplate([data], template, function(err, outputFile) { 
					expect(outputFile.constructor).to.eq(String);
					fs.unlink(outputFile, function() {
						done();
					});
				});
			});
			it("should create the file at the given location", function(done) {
				createXlsx.createInTemplate([data], template, function(err, outputFile) { 
					expect(fs.existsSync(outputFile)).to.be.true;
					fs.unlink(outputFile, function() {
						done();
					});
				});
			});
			it("should call XlsxPopulate.fromFileAsync with the passed template", function(done) {
				var spy = sinon.spy(XlsxPopulate, "fromFileAsync");
				createXlsx.createInTemplate([data], template, function(err, outputFile) { 
					expect(spy.calledWith(template)).to.be.true;
					fs.unlink(outputFile, function() {
						done();
					});
				});
				after(function() {
					spy.restore();
				});
			});
			it("should add the data to the end of the file", function(done) {
				createXlsx.createInTemplate([data], template, function(err, outputFile) { 
					var workbook = XLSX.readFile(outputFile);
					var sheet = workbook.Sheets[workbook.SheetNames[0]];
					expect(sheet['A3'].v).to.eq(data[0][0]);
					fs.unlink(outputFile, function() {
						done();
					});
				});
			});
		});
		describe("when not passed any data", function() {
			it("should return an error in the callback stating data is required in array format", function(done) {
				createXlsx.createInTemplate(null, "template", function(err, outputFile) { 
					expect(err).to.eq("Data is required to be passed as an array");
					done();
				});
			});
		});
		describe("when not passed data as an array", function() {
			it("should return an error in the callback stating data is required in array format", function(done) {
				createXlsx.createInTemplate("string", "template", function(err, outputFile) { 
					expect(err).to.eq("Data is required to be passed as an array");
					done();
				});
			});
		});
		describe("when not passed a template", function() {
			it("should return an error in the callback error stating a template is required", function(done) {
				createXlsx.createInTemplate([["data"], ["more data"]], null, function(err, outputFile) { 
					expect(err).to.eq("A template is required");
					done();
				});
			});
		});
		describe("when passed a template but it does not exist", function() {
			it("should return an error in the callback stating the template does not exist", function(done)  {
				createXlsx.createInTemplate([["data"], ["more data"]], "non-existant/template.xlsx", function(err, outputFile) { 
					expect(err).to.eq("The passed template does not exist");
					done();
				});
			});
		});
		describe("when not passed an array or a template", function() {
			it("should return an error in the callback stating a data and a template", function(done) {
				createXlsx.createInTemplate(null, null, function(err, outputFile) { 
					expect(err).to.eq("Data and a template are required");
					done();
				});
			});
		});
	});

	describe("#deliverFile", function() {
		// TODO write file delivery tests
	});
});