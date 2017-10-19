const http = require('http');
const fs = require('fs');
const socketio = require('socket.io');

const port = process.env.PORT || process.env.NODE_PORT || 3000;

const roomList = {};
let currentRoom = 0;
let currentRoomCount = 0;

const users = {}


// read the client html file into memory
// __dirname in node is the current directory
// (in this case the same folder as the server js file)
const index = fs.readFileSync(`${__dirname}/../client/index.html`);


const onRequest = (request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html' });
  response.write(index);
  response.end();
};

const app = http.createServer(onRequest).listen(port);

console.log(`Listening on 127.0.0.1: ${port}`);

// pass in the http server into socketio and grab the websocket server as io
const io = socketio(app);


const onJoined = (sock) => {
  const socket = sock;
  
  socket.on('join', (data) => {
    //add user to the count
    currentRoomCount++;


    users[data.name] = data.name;
    socket.name = data.name;

    
    socket.join(`room${currentRoom}`);

    //if the room isn't in the roomlist
    if(!roomList[`room${currentRoom}`]){
        console.log(`adding room ${currentRoom} to roomList`);
        roomList[`room${currentRoom}`] = {};
        roomList[`room${currentRoom}`].userList = {};
        socket.room = currentRoom;
    };

    //Add their username to the user list
    roomList[`room${currentRoom}`].userList[currentRoomCount] = data.name;


    // if there are 3 people in the room, start the game
    // and change the name of the room for the next party
    if(currentRoomCount >= 2){
      if(currentRoomCount === 2){
        io.sockets.in(`room${currentRoom}`).emit('startRoom', {room: currentRoom});
        currentRoom++;
      }
      currentRoomCount = 0;
    }
  });

  socket.on('draw', (data) => {
    io.sockets.in(`room${data.room}`).emit('updateCanvas', data);

  });
};

const onMsg = (sock) =>{ 
  const socket = sock;

  socket.on('msgToServer', (data) => {
    io.sockets.in(`room${data.room}`).emit('msg', { name: socket.name, msg: data.msg });
  });
}

const onDisconnect = (sock) => {
  const socket = sock;

  // remove user
  socket.on('disconnect', () => {
    // announcement to everyone in the room
    const response = {
      name: 'Drawbot',
      msg: `${socket.name} has left the room.`,
    };

    socket.broadcast.to(`room${socket.room}`).emit('msg', response);
    console.log(`${socket.name} left`);
    socket.leave(`room${socket.room}`);

    delete users[socket.name];
  });
};


io.sockets.on('connection', (socket) => {
  console.log('Draw app online');
  onJoined(socket);
  onMsg(socket);
  onDisconnect(socket);
});

console.log('Websocket server started');

