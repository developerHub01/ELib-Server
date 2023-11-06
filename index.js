const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = 5000;
const uri = process.env.DB;

app.use(cors());
app.use(express.json());

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const run = async () => {
  try {
    await client.connect();

    const booksCollection = client.db("eLib").collection("books");

    app.get("/", async (req, res) => {
      res.send("Home route..............");
    });

    app.post("/addbook", async (req, res) => {
      const data = req.body;
      console.log(data);

      const result = await booksCollection.insertOne(data);

      res.send(result.acknowledged);
    });

    app.get("/books/:category", async (req, res) => {
      const { category } = req.params;
      const data = await booksCollection.find({ category }).toArray();
      res.send(data);
    });

    

    app.get("/books/details/:id", async (req, res) => {
      const { id } = req.params;
      const data = await booksCollection.findOne({ _id: new ObjectId(id) });
      res.send(data);
    });

    app.listen(port, () => {
      console.log(`Server is running at http://localhost:${port}`);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // await client.close();
  }
};
run().catch(console.dir);
