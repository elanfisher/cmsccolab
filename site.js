/* Purpose:
    * this program allow users to submit an application for a summer camp. 
    * this is a Node.js server that will allow users to submit information 
    * and retrieve that information form a MongoDB database.
*/

/* Project Requirements:
    * Main page with links to forms to submit and review an application (even if they don't work).
    * To start the server we can execute node summerCampServer.js PORT_NUMBER_HERE.
    * Submit application functionality - data provided in the application is correctly stored in the database.
    * Review application functionality - data can be retrieved from the database and displayed.
    * Select by GPA functionality - names and gpas of applicants with a GPA greater than or equal to the specified one are displayed.
    * Removing all applications from the database functionality.
    * HOME link - Selecting the "HOME" link in one of the pages (not the home page) will take us back to the home page.
    * The app must use MongoDB to store and retrieve the application data otherwise you will lose most of the points for the project
    * .env is present in the SummerCamp folder and it has the following constants defined
    *   MONGO_DB_USERNAME = YOUR_USERNAME
        MONGO_DB_PASSWORD = YOUR_PASSWORD
        MONGO_DB_NAME = "CMSC335_DB"
        MONGO_COLLECTION = "campApplicants"
    * You don't have to worry about data validity of missing data in the system forms. You can assume users will provide the expected data.
    * 
*/

// set up express
const http = require('http');
const bodyParser = require("body-parser");
const express = require("express");
const app = express();
const portNumber = process.argv[2] || 3000;

// =================== MongoDb stuff ======================
// set up the database and collection using the constants defined in .env which are MONGO_DB_USERNAME, MONGO_DB_PASSWORD, MONGO_DB_NAME, and MONGO_COLLECTION
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, '.env') })  

const uri = process.env.MONGO_CONNECTION_STRING;

console.log(uri)

// const databaseAndCollection = {db: process.env.MONGO_DB_NAME, collection: process.env.MONGO_COLLECTION};
const databaseAndCollection = {db: "CMSC335_DB", collection:"colab"};

const { MongoClient, ServerApiVersion } = require('mongodb');
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
// ========================================================

// Initilize everything for express
app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended:false}));

let card_id = 0;


// ======================= Express Stuff =================================

async function getMaterial(filter) {
    let msg = ``;

    try {
        await client.connect();
        const cursor = client.db(databaseAndCollection.db)
        .collection(databaseAndCollection.collection)
        .find(filter);
        const result = await cursor.toArray();
        // console.log(result)

        if (result == "") {
            let {name} = filter;
            msg = msg + `<p class="lead">No materials found.</p>`
        } else {
            for(let i = 0; i < result.length; i++) {
                let { _id, cid, name, lab, email, preference, availability, phone, description} = result[i];

                msg = msg + `<div class="col mb-5">
                                <div class="card h-100">
                                    <div class="badge bg-${availability === "Available" ? 'success' : 'danger'} text-white position-absolute" style="top: 0.5rem; right: 0.5rem">${availability}</div>
                                    <div class="card-body p-4">
                                        <div class="text-center">
                                            <h1 class="fw-bolder display-6">${name}</h1>
                                            <p><strong>Lab:</strong> ${lab}</p>
                                            <p><strong>Contact By:</strong> ${preference === "Email" ? `Email: ${email}` : `Phone: ${phone}`}</p>
                                            <p><strong>Description:</strong> ${description}</p>
                                        </div>
                                    </div>
                                    <!-- Product actions-->
                                    <div class="card-footer p-4 pt-0 border-top-0 bg-transparent">
                                        <div class="text-center"><a class="btn btn-secondary mt-auto ${availability === "Available" ? '' : 'disabled'}" href="/reserve?id=${result[i]._id}">View Item</a></div>
                                    </div>
                                </div>
                            </div>`;
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }

    return msg;
}

app.get("/cat", async (request, response) => {
    // fetch a random cat fact from this api
    const url = 'https://meowfacts.herokuapp.com/?count=1';
    const result = await fetch(url);
    const json = await result.json();
    // console.log(json);

    let msg = ``;
    for(let i = 0; i < json.data.length; i++) {
        msg = msg + `<p class="lead">${json.data[i]}</p>`;
    }

    const variables = {
        facts: msg,
    };

    response.render("cats", variables);
});

app.get("/", async (request, response) => { 
    let filter = {};
    let msg = await getMaterial(filter);

    const variables = { 
        materials: msg,
    };

    response.render("index", variables);
});

app.get("/add", (request, response) => { 
    response.render("addmaterials");
});

app.post("/add", async (request, response) => {
    let {name, lab, email, availability, preference, phone, description} = request.body;

    let material = {
        name: name,
        lab: lab,
        email: email,
        preference: preference,
        availability: availability,
        phone: phone,
        description: description,
    };

    try {
        await client.connect();
        const result = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(material);
        // console.log(`material entry created with id ${result.insertedId}`);

    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }

    response.redirect("/add");
});

app.get("/reserve", async (request, response) => { 
    // get the id of the item to reserve from the url
    let id = request.query.id;
    // console.log("reserve: " + id);

    var ObjectId = require('mongodb').ObjectId;    
    var o_id = new ObjectId(id);
    let filter = {_id:o_id};

    let msg = ``;

    try {
        await client.connect();
        const cursor = client.db(databaseAndCollection.db)
        .collection(databaseAndCollection.collection)
        .find(filter);
        const result = await cursor.toArray();

        if (result == "") {
            let {name} = filter;
            msg = msg + `<p class="jumbotron bg-danger">Something went wrong!</p>`
        } else {
            for(let i = 0; i < result.length; i++) {
                let { _id, name, lab, email, preference, availability, phone, description} = result[i];

                msg = msg + `<div class="col-sm-12 text-center">
                                <p><strong>Name: </strong> ${name}</p>
                                <p><strong>Lab: </strong> ${lab}</p>
                                <p><strong>Email: </strong>
                                    <a href="mailto:${email}">${email}</a>
                                </p>
                                <p><strong>Contact Preference: </strong> ${preference}</p>
                                <p><strong>Availability: </strong> ${availability}</p>
                                <p><strong>Phone: </strong> ${phone}</p>
                                <p><strong>Description: </strong> ${description}</p>
                            </div>

                            <div class="col-sm-12 text-center">
                                <a href="/remove?id=${id}" class="btn btn-success">Reserve This Material</a>
                            </div>
                            <br><br>
                            `
                            ;
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }

    const variables = {
        info: msg,
    };

    response.render("itemlisting", variables);
});

app.get("/remove", async (request, response) => { 
    // get the id of the item to reserve from the url
    let id = request.query.id;
    // console.log("reserve: " + id);

    var ObjectId = require('mongodb').ObjectId;    
    var o_id = new ObjectId(id);
    let filter = {_id:o_id};

    let msg = ``;

    try {
        await client.connect();

        const result = await client.db(databaseAndCollection.db)
                   .collection(databaseAndCollection.collection)
                   .deleteOne(filter);
        
        console.log(`Documents deleted ${result.deletedCount}`);

    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }

    const variables = {
        info: msg,
    };

    response.redirect("/");
});

// search for a material
app.post("/search", async (request, response) => {
    let {search} = request.body;

    let filter = {"name": search};

    if (search == "") {
        filter = {};
    }
    
    let msg = await getMaterial(filter);

    const variables = { 
        materials: msg,
    };

    response.render("index", variables);
});

// remove an item
app.post("/remove", async (request, response) => {

    // get the name of the item to remove
    let {remove} = request.body;

    console.log("remove: " + remove);

    response.render("index", variables);
});

app.listen(portNumber);
console.log(`To access server: http://localhost:${portNumber}`);