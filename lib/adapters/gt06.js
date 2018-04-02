/* Original code: https://github.com/cnberg/gps-tracking-nodejs/blob/master/lib/adapters/gt06.js */
f = require('../functions');

exports.protocol = 'GT06';
exports.model_name = 'GT06';
exports.compatible_hardware = ['GT06/supplier'];

var adapter = function (device) {
  if (!(this instanceof adapter)) {
    return new adapter(device);
  }

  this.format = {'start': '(', 'end': ')', 'separator': ''};
  this.device = device;
  this.__count = 1;

  /*******************************************
   PARSE THE INCOMING STRING FROM THE DECIVE
   You must return an object with a least: device_id, cmd and type.
   return device_id: The device_id
   return cmd: command from the device.
   return type: login_request, ping, etc.
   *******************************************/
  this.parse_data = function (data) {
    data = this.bufferToHexString(data);
    var parts = {
      'start': data.substr(0, 4)
    };

    if (parts['start'] == '7878') {
      parts['length'] = parseInt(data.substr(4, 2), 16);
      parts['finish'] = data.substr(6 + parts['length'] * 2, 4);

      parts['protocal_id'] = data.substr(6, 2);

      if (parts['finish'] != '0d0a') {
        throw 'finish code incorrect!';
      }

      if (parts['protocal_id'] == '01') {
        parts['device_id'] = data.substr(8, 16);
        parts.cmd = 'login_request';
        parts.action = 'login_request';
      } else if (parts['protocal_id'] == '12') {
        parts['device_id'] = '';
        parts['data'] = data.substr(8, parts['length'] * 2);
        parts.cmd = 'ping';
        parts.action = 'ping';
      } else if (parts['protocal_id'] == '13') {
        parts['device_id'] = '';
        parts.cmd = 'heartbeat';
        parts.action = 'heartbeat';
      } else if (parts['protocal_id'] == '15') {
        parts['device_id'] = '';
        parts['data'] = data.substr(8, parts['length'] * 2);
        parts.cmd = 'cmd_result';
        parts.action = 'other';
      } else if (parts['protocal_id'] == '16' || parts['protocal_id'] == '18') {
        parts['device_id'] = '';
        parts['data'] = data.substr(8, parts['length'] * 2);
        parts.cmd = 'alarm';
        parts.action = 'alarm';
      } else {
        parts['device_id'] = '';
        parts.cmd = 'noop';
        parts.action = 'noop';
      }
    } else {
      parts['device_id'] = '';
      parts.cmd = 'noop';
      parts.action = 'noop';
    }
    return parts;
  };
  this.bufferToHexString = function (buffer) {
    var str = '';
    for (var i = 0; i < buffer.length; i++) {
      if (buffer[i] < 16) {
        str += '0';
      }
      str += buffer[i].toString(16);
    }
    return str;
  };
  this.authorize = function () {
    //this.device.send("\u0078\u0078\u0005\u0001\u0000\u0001\u00d9\u00dc\u000d\u000a");
    //return ;
    var length = '05';
    var protocal_id = '01';
    var serial = f.str_pad(this.__count, 4, 0);

    var str = length + protocal_id + serial;

    this.__count++;

//    var crc = require('crc16-itu');
  //  var crcResult = f.str_pad(crc.crc16(str).toString(16), 4, '0');

    //var buff = new Buffer('7878' + str + crcResult + '0d0a', 'hex');
    var buff = new Buffer('787805010001D9DC0D0A', 'hex');
    //发送原始数据
    this.device.send(buff);
  };
  this.zeroPad = function (nNum, nPad) {
    return ('' + (Math.pow(10, nPad) + nNum)).slice(1);
  };
  this.synchronous_clock = function (msg_parts) {

  };
  this.receive_heartbeat = function (msg_parts) {
    var buff = new Buffer('787805130001D9SC0D0A', 'hex');
    this.device.send(buff);
  };
  this.run_other = function (cmd, msg_parts) {
  };

  this.request_login_to_device = function () {
    //@TODO: Implement this.
  };

  this.receive_alarm = function (msg_parts) {
    var str = msg_parts.data;

    var data = {
      'datetime': this.hex_to_date(str.substr(0, 12)),
      'satellite_raw': str.substr(12, 2),
      'latitude': this.dex_to_degrees(str.substr(14, 8)),
      'longitude': this.dex_to_degrees(str.substr(22, 8)),
      'speed': parseInt(str.substr(30, 2), 16),
      'orientation': this.course_status(str.substr(32, 4)),
      'lbs': this.lbs_info(str.substr(38, 16)),
      'device_info': f.str_pad(parseInt(str.substr(54, 2),16).toString(2), 8, 0),
      'power': this.voltage_level(str.substr(56, 2)),
      'gsm': this.gsm_signal_level(str.substr(58, 2)),
      'alert': str.substr(60, 4),
    };

    data['power_status'] = parseInt(data['device_info'][0]);
    data['gps_status'] = parseInt(data['device_info'][1]);
    data['alarm_status'] = this.alarm_status(data['device_info'].substr(2,3));
    data['charge_status'] = parseInt(data['device_info'][5]);
    data['acc_status'] = parseInt(data['device_info'][6]);
    data['defence_status'] = parseInt(data['device_info'][7]);

    res = {
      date_time: data.datetime,
      latitude: data.latitude,
      longitude: data.longitude,
      speed: data.speed,
      orientation: data.orientation,
      lbs: data.lbs,
      power_status: data['power_status'],
      gps_status: data['gps_status'],
      alarm_status: data['alarm_status'],
      charge_status: data['charge_status'],
      acc_status: data['acc_status'],
      defence_status: data['defence_status'],
      power: data.power,
      gsm: data.gsm
    };
    return res;
  };

  this.dex_to_degrees = function (dex) {
    return parseInt(dex, 16) / 1800000;
  };

  this.get_ping_data = function (msg_parts) {
    var str = msg_parts.data;

    var data = {
      'datetime': this.hex_to_date(str.substr(0, 12)),
      'satellite_raw': str.substr(12, 2),
      'latitude': this.dex_to_degrees(str.substr(14, 8)),
      'longitude': this.dex_to_degrees(str.substr(22, 8)),
      'speed': parseInt(str.substr(30, 2), 16),
      'orientation': this.course_status(str.substr(32, 4)),
      'lbs': this.lbs_info(str.substr(36, 16)),
    };

    res = {
      date_time: data.datetime,
      latitude: data.latitude,
      longitude: data.longitude,
      speed: data.speed,
      orientation: data.orientation,
      lbs: data.lbs
    };
    return res;
  };

  this.hex_to_date = function (data) {
    var datetime = "20"+parseInt(data.substr(0,2), 16)+"/"+parseInt(data.substr(2,2), 16)+"/"+parseInt(data.substr(4,2), 16);
		datetime += " "+parseInt(data.substr(6,2), 16)+":"+parseInt(data.substr(8,2), 16)+":"+parseInt(data.substr(10,2), 16);
	  var d = new Date(datetime);
	  return d;
  };

  this.course_status = function (data){
    var bin = f.hex_to_bin(data);
    var pos = parseInt(bin.substr(2,1)) ? 'DGPS' : 'RTK'; // Differential GPS & Real-Time Kinematic
    var tracking = parseInt(bin.substr(3,1)) ? 'ON' : 'OFF';
    var longitude = parseInt(bin.substr(4,1)) ? 'W' : 'E';
    var latitude = parseInt(bin.substr(5,1)) ? 'N' : 'S';
    return {
      pos: pos,
      tracking: tracking,
      longitude: longitude,
      latitude: latitude,
      course: parseInt(bin.substr(6,10),2)
    }
  };

  this.lbs_info = function (data) {
    var mcc = parseInt(data.substr(0,4),16); // Mobile Country Code
    var mnc = parseInt(data.substr(4,2),16); // Mobile Network Code
    var lac = data.substr(6,4); // Location Area Code
    var cell_id = data.substr(10,6); // Cell Tower ID
    return {
      mcc: mcc,
      mnc: mnc,
      lac: lac,
      cell_id: cell_id
    };
  };

  this.alarm_status = function (data) {
    data = parseInt(data,2);
    var status;
    switch(data) {
    case 0:
      status = 'Normal'
      break;
    case 1:
        status = 'Shock'
        break;
    case 2:
        status = 'Power Cut'
        break;
    case 3:
        status = 'Low Battery'
        break;
    case 4:
        status = 'SOS'
        break;
    }
    return status;
  };


  this.voltage_level = function (data) {
    data = parseInt(data,16);
    var status;
    switch(data) {
    case 0:
      status = 'No Power'
      break;
    case 1:
        status = 'Extremely Low Battery'
        break;
    case 2:
        status = 'Very Low Battery'
        break;
    case 3:
        status = 'Low Battery'
        break;
    case 4:
        status = 'Medium'
        break;
    case 5:
        status = 'High'
        break;
    case 6:
        status = 'Very High'
        break;
    }
    return {level: data, status: status};
  };

  this.gsm_signal_level = function (data) {
    data = parseInt(data,16);
    var status;
    switch(data) {
    case 0:
      status = 'No signal;'
      break;
    case 1:
        status = 'Extremely Weak'
        break;
    case 2:
        status = 'Very Weak'
        break;
    case 3:
        status = 'Good Signal'
        break;
    case 4:
        status = 'Strong Signal'
        break;
    }
    return {level: data, status: status};
  };

  this.send_command = function (cmd) {

   var len = f.str_pad( (8+(cmd.length/2)+4).toString(16), 2, '0');
   var protocol_id = '80';
   var cmd_len = f.str_pad( (6+(cmd.length/2)).toString(16), 2, '0');
   var server_flag = '0001A958';
   var info_serial = '0001';

   var str = len + protocol_id + cmd_len + server_flag + cmd + info_serial;

   var crc16 = require('crc16-itu');

   var crcResult = f.str_pad(crc16(str, 'hex').toString(16), 4, '0');

   var buff = new Buffer('7878'+ str + crcResult + '0D0A','hex');
   this.device.send(buff);

 };

 this.cut_fuel = function() {
  // #6666#CF#
  // 23 36 36 36 36 23 43 46 23
  this.send_command('233636363623434623');
 };

 this.open_fuel = function() {
  // #6666#OF#
  // 23 36 36 36 36 23 4F 46 23
  this.send_command('2336363636234F4623');
 };

 this.set_over_speed_alarm  = function(speed){
  //  #6666#SOSA#<speed>#
  // 23 36 36 36 36 23 53 4F 53 41 23 speed 23
  speed = Buffer.from(speed, 'utf8').toString('hex');
  this.send_command("233636363623534F534123"+speed+"23");
 };


  /* SET REFRESH TIME */
  this.set_refresh_time = function (interval, duration) {
  };
};
exports.adapter = adapter;
// 
// console.log(new adapter().get_ping_data({data: '120402072428c702e15ba508223f960014340194005a7a00018e115b53b7'}));
// console.log(new adapter().receive_alarm({data: '0B0B0F0E241DCF027AC8870C4657E60014020901CC00287D001F726506040101003656A4'}));
