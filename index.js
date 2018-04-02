var gps = require("gps-tracking");
//if (process.env.NODE_ENV !== 'production')

//require('dotenv').config({ path: ".env."+process.argv[2]});
//Dotenv.load(".env.#{ARGV[0]}"||".env.development")

require('dotenv').config({path: ".env."+process.argv[2]});

//}
// Load the AWS SDK for Node.js
var AWS = require('aws-sdk');
// Set the region
AWS.config.update({region: 'us-east-1'});

// Create an SQS service object
var sqs = new AWS.SQS();

var options = {
    'debug'                 : false, //We don't want to debug info automatically. We are going to log everything manually so you can check what happens everywhere
    'port'                  : process.env.PORT2,
    'device_adapter'        : "TK103"
}

var server = gps.server(options,function(device,connection){

    device.on("connected",function(data){

        console.log("I'm a new device connected");
        return data;

    });

    device.on("login_request",function(device_id,msg_parts){

        console.log('Hey! I want to start transmiting my position. Please accept me. My name is '+device_id);

        this.login_authorized(true);

        console.log("Ok, "+device_id+", you're accepted!");

    });


    device.on("ping",function(data){
        //this = device
        console.log("I'm here: "+data.latitude+", "+data.longitude+" ("+this.getUID()+")");

 		console.log(JSON.stringify(data));
		var params = {
		 MessageBody: JSON.stringify(data),
		 QueueUrl: process.env.SQS_QUEUE
		};

		sqs.sendMessage(params, function(err, data) {
		  if (err) {
			console.log("Error", err);
		  } else {
			console.log("Success", data.MessageId);
		  }
		});
        return data;

    });

   device.on("alarm",function(alarm_code,alarm_data,msg_data){
        console.log("Help! Something happend: "+alarm_code+" ("+alarm_data.msg+")");
    });

    //Also, you can listen on the native connection object
    connection.on('data',function(data){
        //echo raw data package
        //console.log(data.toString());
    })

});



var options = {
    'debug'                 : false, //We don't want to debug info automatically. We are going to log everything manually so you can check what happens everywhere
    'port'                  : process.env.PORT1,
    'device_adapter'        : "GT06"
}

var server = gps.server(options,function(device,connection){

    device.on("connected",function(data){

        console.log("I'm a new device connected");
        return data;

    });

    device.on("login_request",function(device_id,msg_parts){

        console.log('Hey! I want to start transmiting my position. Please accept me. My name is '+device_id);

        this.login_authorized(true);

        console.log("Ok, "+device_id+", you're accepted!");

    });


    device.on("ping",function(data){
        //this = device
        console.log("I'm here: "+data.latitude+", "+data.longitude+" ("+this.getUID()+")");
		data.imei_no = this.getUID();
		console.log(JSON.stringify(data));
		var params = {
		 MessageBody: JSON.stringify(data),
		 QueueUrl: process.env.SQS_QUEUE
		};

		sqs.sendMessage(params, function(err, data) {
		  if (err) {
			console.log("Error", err);
		  } else {
			console.log("Success", data.MessageId);
		  }
		});
        return data;

    });

   device.on("alarm",function(alarm_code,alarm_data,msg_data){
        console.log("Help! Something happend: "+alarm_code+" ("+alarm_data.msg+")");
    });

    device.on("other",function(msg_data){
         console.log("Received from device: "+msg_data.data);
    });

    //Also, you can listen on the native connection object
    connection.on('data',function(data){
        // echo raw data package
       // console.log(data.toString());
    })

});

net = require('net');

net.createServer(function (connection) {
   console.log('client connected');

   connection.on('data', function (data) {
     console.log("Data received: "+data.toString());
     var arr = data.toString().split(',');
     server.set_fuel(arr[0],arr[1]);

   });

   connection.on('end', function () {
     console.log('client disconnected');
   });

}).listen(8090);
