module.exports = function(RED) {
  'use strict';
  //var io = require('socket.io-client');
  var sockets = {};

  /* sckt config */
    function SocketIOConfig(n) {
      RED.nodes.createNode(this, n);
      this.host = n.host;
      this.port = n.port;
    }
    RED.nodes.registerType('socketio-client-config', SocketIOConfig);

  /* sckt connector*/
    function SocketIOConnector(n){
      RED.nodes.createNode(this, n);
      this.server = RED.nodes.getNode(n.server);
      this.server.namespace = n.namespace;
      this.name = n.name;
      var node = this;
      
      if(sockets[node.id]){ delete sockets[node.id];}
      sockets[node.id] = connect(this.server);
        
      sockets[node.id].on('connect', function(){
        node.send({ payload:{socketId:node.id, status:'connected'} });
        node.status({fill:"green",shape:"dot", text:"connected"});
      });

      sockets[node.id].on('disconnect', function(){
        node.send({payload:{socketId:node.id, status:'disconnected'}});
        node.status({fill:'red',shape:'ring', text:'disconnected'});
      });

      sockets[node.id].on('connect_error', function(err) {
        if (err) {
          node.status({fill:'red',shape:'ring',text:'disconnected'});
          node.send({payload:{socketId:node.id, status:'disconnected'}});
          //node.error(err);
        }
      }); 

      this.on('close', function(done) {
        sockets[node.id].disconnect();
        sockets[node.id].removeAllListeners();
        node.status({});
        done();
      }); 
    }
    RED.nodes.registerType('socketio-connector', SocketIOConnector);

  /* sckt listener*/
    function SocketIOListener(n){
      RED.nodes.createNode(this, n);
      this.name = n.name;
      this.eventName = n.eventname;
      this.socketId = null;

      var node = this;

      node.on('input', function(msg){
        node.socketId = msg.payload.socketId;
        if(msg.payload.status == 'connected'){
          node.status({fill:'green',shape:'dot',text:'listening'});
          if( !sockets[node.socketId].hasListeners(node.eventName) ){
            sockets[node.socketId].on(node.eventName, function(data){
              node.send( {payload:data} );
            });
          }
        }else{
          node.status({fill:'red',shape:'ring',text:'disconnected'});
          if( sockets[node.socketId].hasListeners(node.eventName) ){
            sockets[node.socketId].removeListener(node.eventName, function(){});
          }
        }
      });

      // node.on('close', function(done) {
      //   if( sockets[node.socketId].hasListeners(node.eventName) ){
      //     console.log(sockets[node.socketId].removeAllListeners, 'aaaaa');
      //     sockets[node.socketId].removeListener(node.eventName, function(){
      //   console.log(333333);
      //       node.status({});
      //       console.log(333333);
      //       done();
      //     });
      //   } else{
      //     node.status({});
      //     done();
      //   }
            
      // }); 
    }
    RED.nodes.registerType('socketio-listener', SocketIOListener);

  /* sckt emitter*/
    function SocketIOEmitter(n){
      RED.nodes.createNode(this, n);
      this.name = n.name;
      this.eventName = n.eventname;
      this.socketId = null;

      var node = this;

      node.on('input', function(msg){
        node.socketId = msg.payload.socketId;

        sockets[node.socketId].emit(n.name, msg.message || JSON.parse(n.message || '{}') );

      });
    }
    RED.nodes.registerType('socketio-emitter', SocketIOEmitter);

  function connect(config, force) {
    var uri = config.host;
    var sckt;

    if(config.port != ''){
      uri += ':' +  config.port;
    } 
    if(config.namespace){
      uri += '/' +  config.namespace;
      sckt = require('socket.io-client').connect( uri );
    }else{
      sckt = require('socket.io-client')( uri );
    }
    return sckt;
  }

  function disconnect(config) {
  }


  function socketIoConfig(n) {
    RED.nodes.createNode(this,n);
    // node-specific code goes here
    var node = this;
    this.port = n.port || 80;
    this.sendClient = n.sendClient;
    this.path = n.path || "/socket.io";
    this.bindToNode = n.bindToNode || false;
    
    if(this.bindToNode){
      // node.io = new Server(RED.server);
    } else {
      // node.io = new Server();
      // node.io.serveClient(node.sendClient);
      // node.io.path(node.path);
      // node.io.listen(node.port);
    }
    var bindOn =  this.bindToNode ? "bind to Node-red port" : ("on port " + this.port);
    node.log("Created server " + bindOn);
    
    node.on('close', function() {
      //node.log("Closing server");
      node.io.close();
      //node.log("Closed server");
    });
    
  }
  
  function socketIoIn(n) {
    RED.nodes.createNode(this,n);
    // node-specific code goes here
    var node = this;
    
    this.server.io.on('connection', function(socket){
      msg.socket = socket;
      node.send(msg);
    });
  }
  
  function socketIoOut(n) {
    RED.nodes.createNode(this,n);
    // node-specific code goes here
    var node = this;
    var app = node.context().global.app;

    this.name = n.name;

    node.on('input', function(msg) {
      if (msg.payload.force) {
        app.io.sockets.emit( msg.chanel || 'm', msg.payload);
      } else {
        app.io.sockets.in(msg.payload.field).emit(msg.chanel || 'm', msg.payload);
      }
    });
    
  }
  
  RED.nodes.registerType("socketio-config",socketIoConfig);
  RED.nodes.registerType("socketio-in",socketIoIn);
  RED.nodes.registerType("socketio-out",socketIoOut);
}
