const supertest = require("supertest")
const { app } = require("./todotest")

test("Error Function", async () => {
    const entry = {
        id : 3,
        val : false
    }

    await supertest(app)
        .put("/todo")
        .send(entry)
        .set("Accept", "application/json")
        .expect(200)
})