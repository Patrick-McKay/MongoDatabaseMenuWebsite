const fs = require('fs');
const mc = require("mongodb").MongoClient;
const express = require('express')
const session = require('express-session')
const MongoDBStore = require('connect-mongodb-session')(session);

const store = new MongoDBStore({
  uri: 'mongodb://localhost:27017/a4',
  collection: 'sessiondata'
});

const app = express()

app.use(session({ secret: 'secret', store: store }))
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({extended: true}));


app.set("view engine", "pug");

//route handlers

//javascript client requests
app.get("/orderform.js", form);
app.get("/client.js", clientSend);
app.get("/users/client.js", clientSend);

//get requests
app.get("/", serverHome);
app.get("/order", order);
app.get("/login", loginPage);
app.get("/logout", logout);
app.get("/register", register);
app.get("/userlist", userList);

app.get("/users/:userID", userPage);
app.get("/orders/:orderID", orderPage);

//post requests
app.post("/login", login);
app.post("/register", addAccount);
app.post("/orders", orderAdd);

//put requests
app.put("/user/:userID", privacyUpdate); //route for updating privacy data




//function that handles the creation of the order summary page
//req has parameter Id that determines what order is displayed
function orderPage(req, res, next){
	id = req.params.orderID;	//get id from the request parameter 
	
	ObjectId = require('mongodb').ObjectId;
	
	db.collection("orders").findOne({_id: new ObjectId(id)}, function(err, result){	//search database for the given id, gives result to call back function
		if(err){
			console.log("There was an error finding id")
			throw err;
		}
		//confirm results exist
		if(result){
			db.collection("users").findOne({username: result.user}, function(err, found){	//search database for the username that appears in the order information, gives the found results to callback function
				if(err){
					console.log("There was an error finding User")
					throw err;
				}
				//confirm the username is found
				if(found){
					//check if either the user who owns the profile is logged in or if the account is not private
					if(req.session.username == result.user || !found.privacy){	//user logged in or not private
						//render page, sending required information to it
						res.render("pages/orderPage", {order: result ,user: req.session.username, status: req.session.loggedin, id: req.session.loc}); //result is the order information, user, status and id are logged in user info
					} else{
						res.status(403).send("You do not have access to this order"); //page is private and user is not logged in
					}
				} else{	//account does not exist -- not even possible, but possible future versions could exist where accounts can be deleted
					res.render("pages/orderPage", {order: result , status: req.session.loggedin});
				}
			})
		} else{	//no id by that name was found in the database
			console.log("there is no id by that name");
		}
	})
}

//function that adds an order to the orders collection in the database and adds its id to the user who ordered it
function orderAdd(req, res, next){
	
	req.body.user = req.session.username;	//add new information to the received order, pin on the username of the current logged in user
	db.collection("orders").insertOne(req.body, function(err, result){	//adds the order information to the orders collection
		if(err){
			console.log("There was an error adding the order to the database")
			throw err;
		}
		//updates the array holding the id's of the orders contained in the user collection at the id of the current logged in user
		db.collection("users").updateOne({_id: req.session.loc}, {$push: {orders: result.insertedId.toString()}}, function(err, result){
			if(err){
				console.log("error updating")
				throw err;
			}
			res.status(200).send(); //respond wtih good status
		});
	})
}

//function processes a put request to update the privacy setting of the current logged in user
function privacyUpdate(req, res, next){

	ObjectId = require('mongodb').ObjectId;
	
	db.collection("users").findOne({_id: new ObjectId(req.params.userID)}, function(err, result){	//searches for the user document in the db matching the given id
		if(err){
			console.log("there was an error finding id")
			throw err;
		}
		//checks if user was found
		if(result){
			if(result.privacy == true){	//checks if the account is private
				
				db.collection("users").updateOne({_id: new ObjectId(req.params.userID)}, {$set: {privacy: false}}, function(err, result){	//updates the boolean for privacy to be false
					if(err){
						console.log("error updating")
						throw err;
					}
					res.status(200).send();	//sends ok response
				});	
			} else{	//acount is not private
				
				db.collection("users").updateOne({_id: new ObjectId(req.params.userID)}, {$set: {privacy: true}}, function(err, result){	//updates the privacy boolean to be true
					if(err){
						console.log("error updating")
						throw err;
					}
					res.status(200).send();	//sends ok response
				});
			}
		} else{
			res.status(404).send();
		}
	})
}

//function that reads and sends client javascript when requested from the server
function clientSend(req, res, next){
	fs.readFile('./client.js', 'utf8', function(err, data){ //reads in client js file
        if(err){
          res.status(404);  //error on read
        } else{
            res.set('Content-Type', 'application/javascript');
            res.status(200).send(data);     //sending file
        }
    })
}

//function that builds the list of users and handles the query search for users
function userList(req, res, next){
	
	if(req.query.name){ //confirms that there is a query to search for
		db.collection("users").find({username : {"$regex": req.query.name}}).toArray(function(err, result){	//finds all matching documents to the query in the users collection
			if(err){
				console.log("There was an error finding the users");
				throw err;
			}
			res.render("pages/userList",{users: result ,status: req.session.loggedin, curUser: req.session.username, id: req.session.loc});	//renders page the results of the query search
		})
	} else{	//no query specified, there for get all users in collection
		db.collection("users").find({}).toArray(function(err, result){
			if(err){
				console.log("There was an error finding the users");
				throw err;
			}
			res.render("pages/userList",{users: result ,status: req.session.loggedin, curUser: req.session.username, id: req.session.loc}); //render page with all users (pug will filter out the private users)
		})
	}
}

//function that handles the building of the users profile pages
function userPage(req, res, next){
	id = req.params.userID; //get specified id parameter
	
	ObjectId = require('mongodb').ObjectId;
	
	db.collection("users").findOne({_id: new ObjectId(id)}, function(err, result){ //search the user collection for the user matching the given id
		if(err){
			console.log("there was an error finding id")
			throw err;
		}
		//checks that there is a user
		if(result){
			username = result.username; //gets username of the returned user
			if(req.session.username == username){ //checks if the returned user and logged in user are the same
				res.render("pages/userPage", {user: result, userLog: true, status: req.session.loggedin, id: req.session.loc}); //renders page as if the user is logged in and owns this profile
			} else{ //user logged in does not match profile
				if(!result.privacy){ //checks if the requested profile page is private
					res.render("pages/userPage", {user: result, userLog: false, status: req.session.loggedin, id: req.session.loc}); //renders page as if it is not private
				} else{ //page is private
					res.status(403).send("You do not have access to this profile"); //send 403 response since this page is not allowed to be accessed
				} 
			}
		} else{	//no user was found, given id is invalid
			console.log("there is no id by that name");
			res.status(404).send("This page does not exist");
		}
	})
}

//function that renders the registration page
function register(req, res, next){
	res.render("pages/register"); //render registration page
}

//function that adds a user to the database and logs the user in to the new account
function addAccount(req, res, next){
	
	let username = req.body.username; //get username from request
	let password = req.body.password; //get password

	db.collection("users").findOne({username: username}, function(err, result){ //searchs users collection to find if there is any current matching usernames
		if(err)throw err;

		if(result){ //if username is found reject the account creation request
			res.status(401).send(); //send rejection
		} else{ //username is not taken
			db.collection("users").insertOne({"username": username, "password": password, "privacy": false}, function(err, result){ //add account information to the users collection
				if(err){
					console.log("there was an error added the account");
					throw err;
				}
				//log the user into the account
				req.session.loggedin = true;
				req.session.username = username;

				db.collection("users").findOne({username: username}, function(err, result){	//search user database for the new user to retreive the id
					if(result){ //if it exists (which it will) set the current session users id
						req.session.loc = result._id; //set id
						res.status(200).send(result._id); //send that id to the client
					}
				})
			})
		}
	})
}

//function that renders the login page
function loginPage(req, res, next){
	res.render("pages/login"); //render page

}

//function that logs out of the current account
function logout(req, res, next){
	if(req.session.loggedin){ //checks if current session is logged in

		req.session.destroy(function(err){ //destrys current session
			if(err){
				console.log("There was an error destroying session");
			}
			res.redirect("/"); //redirects to homepage after logout
		})
	} else{ //acount not logged in
		res.render("pages/404"); //render 404 page, unknown how they got there
	}
}

//function that handles the login of the user
function login(req, res, next){
	//check if current session is already logged in
	if(req.session.loggedin){
		res.status(200).send("Already logged in."); //send status to client
		return; 
	}
	let username = req.body.username; //get username from sent account info
	let password = req.body.password; //get password


	db.collection("users").findOne({username: username}, function(err, result){	//search for given username in the users collection
		if(err){
			console.log("something went wrong looking for user");
			throw err;
		}
		if(result){ //check if user exists
			if(password == result.password){ //check that password matchs the found accounts password
				//log the user in
				req.session.loggedin = true;
				req.session.username = username;
				req.session.loc = result._id;
				res.redirect("/"); //respond by redirecting the user to the home page
				
			} else{ //user got password wrong
				res.status(401).send("Password incorrect"); //send 401 with info about password being incorrect
			}
		} else{ //user was not found
			res.status(401).send("That username does not exist"); //send status to client, inform that username does not exist
			return;
		}
	})
}

//function that handles the rendering of the homepage
function serverHome(req, res, next){
	res.render("pages/webHome", {log: req.session.username, status: req.session.loggedin, id: req.session.loc}); //renders home page with current session statuses 
}

//function that renders the order page
function order(req, res, next){
	if(req.session.loggedin){ //checks if the user is logged in
		res.render("pages/order", {status: req.session.loggedin}); //renders order page with logged in status
		
	} else{ //user is not logged in
		res.render("pages/404"); //render 404 page, user does not have access without being logged in
	}
	
}

//function that sends the orderform javascript client to the user upon request
function form(req, res, next){
	fs.readFile('./public/orderform.js', 'utf8', function(err, data){ //reads in orderform js file
        if(err){
          res.status(404);  //error on read
        } else{
            res.set('Content-Type', 'application/javascript');
            res.status(200).send(data);     //sending file
        }
    })
}


//Connect to database
let db;
mc.connect("mongodb://localhost:27017", function(err, client) {
	if (err) {
		console.log("Error in connecting to database");
		return;
	}
	
	db = client.db("a4"); //set current database to be a4
	app.listen(3000); //start server
	console.log("Server listening on port 3000");
})