const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = 5000;
const uri = process.env.DB;

app.use(cors());
// app.use(
//   cors({
//     origin: ["http://localhost:5173"],
//     credentials: true,
//   })
// );
app.use(express.json());
app.use(cookieParser());

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const verifyToken = (req, res, next) => {
  const token = req.cookies.token;
  console.log("token =============>> ", token);
  if (!token) return res.status(401).send({ message: "unexpected access" });
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) return res.status(401).send({ message: "unexpected access" });
    req.user = decoded;
    next();
  });
  next();
};

const run = async () => {
  try {
    await client.connect();

    const booksCollection = client.db("eLib").collection("books");
    const borrowedBooksCollection = client.db("eLib").collection("borrowed");

    app.get("/", async (req, res) => {
      res.send("Home route..............");
    });

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });

      res.send({ success: true, token });
    });
    app.post("/jwt/logout", async (req, res) => {
      const user = req.body;
      console.log(user);
      res.send({ success: true });
    });

    app.delete("/returnbook/:email/:id", async (req, res) => {
      const { email, id } = req.params;
      let result = await booksCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $inc: {
            quantity: 1,
          },
        }
      );
      result = await borrowedBooksCollection.deleteOne({ id, email });
      res.send({ message: result.acknowledged });
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
      if (borrowData.borrowedDate >= borrowData.returnDate) {
        return res.send({ message: `Can't select this return date` });
      }
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

    app.get("/borrowed/:email", verifyToken, async (req, res) => {
      const { email } = req.params;

      if (req.user.email != email)
        return res.send({ message: "invalid credentials" });

      const borrowedBookList = await borrowedBooksCollection
        .find({ email })
        .toArray();

      res.send(borrowedBookList);
    });

    app.get("/borrowed/allbooks/:email", async (req, res) => {
      const { email } = req.params;
      console.log(email);
      const result = await borrowedBooksCollection.find({ email }).toArray();

      const borrowBookListPromise = result.map(async (item) => {
        const abc = await booksCollection.findOne({
          _id: new ObjectId(item.id),
        });
        return abc;
      });

      const books = await Promise.all(borrowBookListPromise);

      res.send(books);
    });
    app.get("/borrowed/books/:email", async (req, res) => {
      const { email } = req.params;
      const result = await borrowedBooksCollection.find({ email }).toArray();

      res.send(result);
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

    app.patch("/updatebook", async (req, res) => {
      const data = req.body;
      const { id } = data;

      const result = await booksCollection.updateOne(
        {
          _id: new ObjectId(id),
        },
        {
          $set: {
            ...data,
          },
        }
      );

      res.send(result.acknowledged);
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
