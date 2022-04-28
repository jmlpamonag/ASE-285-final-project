const index = require("../index");

const request = require("supertest");
const express = require("express");
const app = express();

app.use(express.urlencoded({ extended: false }));
app.use("/", index);

test("index route works", done => {
  request(app)
    .get("/write")
    .expect({ groupname: "frodo" })
    .expect(200, done);
});

test("testing route works", done => {
  request(app)
    .post("/add")
    .expect({title : "a", date : "now", groupname : "frodo"})
    .expect(200, done);
});

test("testing route works", done => {
    request(app)
      .get("/list/:groupname")
      .expect({groupname : "frodo"})
      .expect(200, done);
  });

