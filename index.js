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
    const borrowedBooksCollection = client.db("eLib").collection("borrowed");

    app.get("/", async (req, res) => {
      res.send("Home route..............");
    });

    app.post("/addbook", async (req, res) => {
      const data = req.body;
      console.log(data);

      const result = await booksCollection.insertOne(data);

      res.send(result.acknowledged);
    });

    app.post("/borrowed", async (req, res) => {
      const borrowData = req.body;
      const { email, id } = borrowData;
      borrowData.borrowedDate = new Date().toISOString().split("T")[0];
      let result = await borrowedBooksCollection.findOne({
        email,
        id,
      });

      if (result) return res.send({ message: "Already in borrow" });

      const currentQuantity = await booksCollection.findOne(
        {
          _id: new ObjectId(id),
        },
        {
          projection: {
            _id: 0,
            quantity: 1,
          },
        }
      );

      if (!currentQuantity.quantity) {
        return res.send({ message: "Not available" });
      }

      await booksCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $inc: {
            quantity: -1,
          },
        }
      );

      result = await borrowedBooksCollection.insertOne(borrowData);

      return res.send({ message: result.acknowledged });
    });

    app.get("/borrowed/:email", async (req, res) => {
      const { email } = req.params;

      console.log(email);

      const borrowedBookList = await borrowedBooksCollection
        .find({ email })
        .toArray();

      console.log(borrowedBookList);

      res.send(borrowedBookList);
    });

    app.get("/book/:id", async (req, res) => {
      const { id } = req.params;
      const data = await booksCollection.findOne({ _id: new ObjectId(id) });
      res.send(data);
    });

    app.get("/books", async (req, res) => {
      const data = await booksCollection.find({}).toArray();
      res.send(data);
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
