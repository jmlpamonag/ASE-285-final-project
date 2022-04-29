const { response } = require("express")
const supertest = require("supertest")
const { app } = require("./testregister")


test("Register New User", async () => {
    const newUser = {
        firstName: "Jyhdel",
        lastName: "Pamonag",
        email: "pamonagj1@mymail.nku.edu",
        password: "test"
    }

    await supertest(app)
        .post("/api/register")
        .send(newUser)
        .set("Accept", "application/json")
        .expect(200)
})

test("Delete Registered User", async () => {
    const registeredUser = {
        _id: 1
    }

    await supertest(app)
        .post("/api/unregister")
        .send(registeredUser)
        .expect(200)
})

test("Logout User", async () => {
    await supertest(app)
        .post("/api/logout")
        .expect(200)
})