const express = require('express');
const request = require('supertest');
const app = express();


//====================================
//Connect to mongoDB
//====================================
const { MongoClient } = require('mongodb');
let connection;
let db;

beforeAll(async () => {
    connection = await MongoClient.connect("mongodb+srv://test:test@toyproject.kk1zg.mongodb.net/toyproject?retryWrites=true&w=majority", {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
    db = await connection.db("test");
});

afterAll(async () => {
    if (fs.existsSync(__dirname + "/testFiles/download.pdf")) fs.unlinkSync(__dirname + "/testFiles/download.pdf")
    if (fs.existsSync(__dirname + "/testFiles/download.md")) fs.unlinkSync(__dirname + "/testFiles/download.md")
    await connection.close();
});


//====================================
//Connect to mongoDB
//====================================
//====================================
//Routes
//====================================
const router = express.Router();
const PDFDocument = require("pdfkit");
const fs = require("fs");

router.get("/topdf/:fontSize/:paperSize",  (req, res) => {
    fontSize = parseInt(req.params.fontSize);
    paperSize = req.params.paperSize;
    if (fontSize < 10) fontSize = 14;
    if (fontSize > 80) fontSize = 80;
    if (!['A3', 'A4', 'A5', 'A6', 'A7'].includes(paperSize)) paperSize = 'A4';
    db.collection('post').find().toArray(function (error, resp) {

        const doc = new PDFDocument({ size: `${paperSize}` });

        writeStream = fs.createWriteStream("createdFiles/download.pdf")//file will be overwritten
        doc.pipe(writeStream);
        doc.fontSize(fontSize + 10).text("To-do List")
        doc.moveDown();
        for (var i = 0; i < resp.length; i++) {
            doc.fontSize(fontSize + 5).text(resp[i].title)
            doc.fontSize(fontSize - 2).text(resp[i].date);
            doc.fontSize(fontSize + 2).text(resp[i].description);
            doc.moveDown()

        }
        doc.end()
        writeStream.on('finish', function () {
            res.send(200).sendFile(__dirname + "/createdFiles/download.pdf")
        })

    })
})
router.get("/tomd/download", (req, res) => {
    db.collection('post').find().toArray(function (error, resp) {
        var file = fs.createWriteStream(__dirname + "/testFiles/download.md");//file will be overwritten
        file.write("# **To-do List**\r\n\n")
        for (var i = 0; i < resp.length; i++) {
            file.write(`## **${i + 1}. ` + resp[i].title + "**\r\n")
            file.write(resp[i].date + "\r\n")
            file.write(resp[i].description + "\r\n\n")
        }
        file.close()
        file.on('finish', function () {
            res.send(200).download(__dirname + "/testFiles/download.md")
        })
    })
})
router.get("/topdf", (req, res) => {
    db.collection('post').find().toArray(function (error, resp) {

        const doc = new PDFDocument;

        writeStream = fs.createWriteStream("download.pdf")
        doc.pipe(writeStream);
        for (var i = 0; i < resp.length; i++) {
            doc.fontSize(10).text(resp[i].title)
            doc.fontSize(10).text(resp[i].date)
            doc.fontSize(10).text(resp[i].description)
        }
        doc.end()
        writeStream.on('finish', function () {
            res.send(200).download(__dirname + "download.pdf")
        })

    })
})
//====================================
//Routes
//====================================
app.use(express.json());
app.use(router);


describe('Download', () => {

    it('DownloadsPDF', async () => {
        const res = await request(app).get('/topdf');
        expect(res.statusCode).toEqual(200);
        expect(fs.existsSync(__dirname + "/testFiles/download.pdf"))
    });
    it('Downloads a Markdown file', async () => {
        const res = await request(app).get('/tomd/download');
        expect(res.statusCode).toEqual(200);
        expect(fs.existsSync(__dirname + "/testFiles/download.md"))
    })
    it('Downloads a Markdown file', async () => {
        const res = await request(app).get('/topdf/16/A4');
        expect(res.statusCode).toEqual(200);
        expect(fs.existsSync(__dirname + "/testFiles/download.md"))
    })
});




