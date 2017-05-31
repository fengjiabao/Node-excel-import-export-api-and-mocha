var chai = require('chai');
var expect = chai.expect;
var sinon = require('sinon');
var fs = require('fs');
var XLSX = require('xlsx');
var importXlsx = require('../../libs/importXlsx');
var appRootDir = require('app-root-dir').get();
var rewire = require('rewire');
var importRewire = rewire('../../libs/importXlsx');


describe("mapDataToTemplate", function() {
	var mapDataToTemplate = importRewire.__get__('mapDataToTemplate');
	describe("when passed data and a template as array", function() {
		var data = ['data1', 'data2', 'data3'];
		var template = [{ key: "Key 1" }, { key: "Key 2" }, { key: "Key 3" }];
		it("should return an object", function(done) {
			mapDataToTemplate(data, template, function(err, mappedData) {
				expect(mappedData instanceof Object).to.be.true;
				done();
			});
		});
		it("should not return an error", function(done) {
			mapDataToTemplate(data, template, function(err, mappedData) {
				expect(err).to.eq(null);
				done();
			});
		});
		it("should map each value in the data to it's key in the template", function(done) {
			mapDataToTemplate(data, template, function(err, mappedData) {
				expect(mappedData).to.have.property('Key 1', 'data1');
				expect(mappedData).to.have.property('Key 2', 'data2');
				expect(mappedData).to.have.property('Key 3', 'data3');
				done();
			});
		});
		describe("when type of template element equals Array", function() {
			var data = ['data1 ; more data 1', 'data2', 'data3'];
			var template = [{ key: "Key 1", type: "Array", separator: ";" }, { key: "Key 2", type: "Array" }, { key: "Key 3" }];
			describe("and when a separator is included", function() {
				it("should split the value by the separator value and strip any white space in subsequent values", function(done) {
					mapDataToTemplate(data, template, function(err, mappedData) {
						expect(mappedData['Key 1']).to.eql(['data1', 'more data 1']);
						done();
					});
				});
			});
			describe("and when a separator is not included", function() {
				it("should return the value as the first element is an array", function(done) {
					mapDataToTemplate(data, template, function(err, mappedData) {
						expect(mappedData['Key 2']).to.eql(['data2']);
						done();
					});
				});
			});
		});
	});
	describe("when not passed any data", function() {
		it("should return an error in the callback stating data is required", function(done) {
			mapDataToTemplate(null, ["template"], function(err, mappedData) {
				expect(err).to.eq("Data is required");
				done();
			});
		});
	});
	describe("when passed data is not an array", function() {
		it("should return an error in the callback stating data should be an array", function(done) {
			mapDataToTemplate("Data", ["template"], function(err, mappedData) {
				expect(err).to.eq("Data must be an Array");
				done();
			});
		});
	});
	describe("when not passed a template", function() {
		it("should return an error in the callback stating a template is required", function(done) {
			mapDataToTemplate(["Data"], null, function(err, mappedData) {
				expect(err).to.eq("Template is required");
				done();
			});
		});
	});
	describe("when passed template is not an array", function() {
		it("should return an error in the callback stating the template should be an array", function(done) {
			mapDataToTemplate(["Data"], "Template", function(err, mappedData) {
				expect(err).to.eq("Template must be an Array");
				done();
			});
		});
	});
	describe("when not passed either data or a template", function() {
		it("should return an error in the callback stating it requires data and a template", function(done) {
			mapDataToTemplate(null, null, function(err, mappedData) {
				expect(err).to.eq("Data and a template is required");
				done();
			});
		});
	});
});

describe("importXlsx", function() {
	describe("#getData", function() {
		describe("when passed a file", function() {
			var testFile = appRootDir + "/test/test-data/import-test.xlsx";
			it("should not return an error", function(done) {
				importXlsx.getData(testFile, function(err, outputData) { 
					expect(err).to.eq(null);
					done();
				});
			});
			it("should return an array", function(done) {
				importXlsx.getData(testFile, function(err, outputData) { 
					expect(outputData instanceof Array).to.be.true;
					done();
				});
			});
			it("should call XLSX.readFile with the passed file", function(done) {
				var spy = sinon.spy(XLSX, "readFile");
				importXlsx.getData(testFile, function(err, outputData) { 
					expect(spy.calledWith(testFile)).to.be.true;
					done();
				});
				after(function() {
					spy.restore();
				});
			});
			it("should return a value for each row in the sheet", function(done) {
				importXlsx.getData(testFile, function(err, outputData) { 
					expect(outputData.length).to.eq(5);
					done();
				});
			});
			it("should extract the values from the excel", function(done) {
				importXlsx.getData(testFile, function(err, outputData) { 
					expect(outputData[3][0]).to.eq('more');
					done();
				});
			});
		});
		describe("when not passed a file", function() {
			it("should return an error in the callback stating a file is required", function(done) {
				importXlsx.getData(null, function(err, outputData) { 
					expect(err).to.eq("A file is required");
					done();
				});
			});
		});
		describe("when passed a file that does not exist", function() {
			it("should return an error in the callback stating the file does not exist", function(done) {
				importXlsx.getData("a-non-existant-file.xlsx", function(err, outputData) { 
					expect(err).to.eq("The passed file does not exist");
					done();
				});
			});
		});
	});

	describe("#getDataByTemplate", function() {
		describe("when passed a file that exists and template", function() {
			
		});
		describe("when not passed a file", function() {
			it("should return an error in the callback stating a file is required", function(done) {
				importXlsx.getDataByTemplate(null, [], 0, function(err, outputData) { 
					expect(err).to.eq("A file is required");
					done();
				});
			});
		});
		describe("when passed a file but is doesn't exist", function() {
			it("should return an error in the callback stating the passed file does not exist", function(done) {
				importXlsx.getDataByTemplate("a-non-existant-file.xlsx", [], 0, function(err, outputData) { 
					expect(err).to.eq("The passed file does not exist");
					done();
				});
			});
		});
		describe("when not passed a template", function() {
			it("should return an error in the callback error stating a template is required", function(done) {
				importXlsx.getDataByTemplate(appRootDir + "/test/test-data/Release.xlsx", null, 0, function(err, outputData) { 
					expect(err).to.eq("A template is required");
					done();
				});
			});
		});
		describe("when passed a template but it is not an array", function() {
			it("should return an error in the callback stating a template must be an array", function(done)  {
				importXlsx.getDataByTemplate(appRootDir + "/test/test-data/Release.xlsx", "non-existant/template.xlsx", 0, function(err, outputData) { 
					expect(err).to.eq("The template must be an Array");
					done();
				});
			});
		});
		describe("when not passed a file or a template", function() {
			it("should return an error in the callback stating a file and a template are required", function(done) {
				importXlsx.getDataByTemplate(null, null, 0, function(err, outputData) { 
					expect(err).to.eq("A file and a template are required");
					done();
				});
			});
		});
	});
});