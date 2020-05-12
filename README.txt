Design decisions:
Decided to make a put request with a user id as a simple way to toggle privacy setting
decided to make a dedicated login screen to have a cleaner look rather than clutter the top bar
renamed the id of each order when shown in the users history, should remain in order received, oldest at top

How to run:
1. run mongodb daemon
2. run database-initializer
3. run npm install command
4. run node server.js