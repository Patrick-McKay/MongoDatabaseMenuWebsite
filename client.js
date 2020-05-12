

//after search button is pressed this function is called, grabs the value in the search bar and changes the query of the url to it
function search(){
    
    name = document.getElementById('search').value;
    location.search = "?name=" + name;

}

//activates when the privacy check is checked/uncheck
//submits a put request to /user/:userID of the logged in user
function updateP(){
    id = document.getElementById('private').value
    req = new XMLHttpRequest();
    req.onreadystatechange = function() {
		if(this.readyState==4 && this.status==200){
			alert("updated");   //privacy setting was succesfully updated
			
		}
	}
	req.open("PUT", 'http://localhost:3000/user/' + id, true);
	req.send(); 
}

//function is called by the sign up button on the registration page
//submits post request with new account info to /register to be processed
function register(){

    let cred = {}; //json object to hold username and password of new account

    //getting username/password from the textboxes and adding to object
	cred.username = document.getElementById('username').value;
    cred.password = document.getElementById('password').value;
    
    //check if boxes were filled
    if(cred.password == ""){
        alert("You need to input a password")
        return;
    }
    if(cred.username == ""){
        alert("You need to input a username")
        return;
    }

    //creating http request to send user info
    req = new XMLHttpRequest();
    req.onreadystatechange = function() {
		if(this.readyState==4 && this.status==200){ //account creation was a success redirecting to profile
            

            re = this.responseText.replace(/["]+/g, '');
            location = "http://localhost:3000/users/" + re
            
            
			
		} else if(this.readyState==4 && this.status==401){  //alerts user that the username they wanted was taken
            alert("Error that name is already taken");

        }
	}
	req.open("POST", 'http://localhost:3000/register', true);
	req.setRequestHeader("Content-Type", "application/json");
	req.send(JSON.stringify(cred)); //send post request with the Json object (turned to a string) containing the user info
}