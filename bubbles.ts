let MBIT_UART_SERVICE  = '6E400001-B5A3-F393-E0A9-E50E24DCCA9E'.toLowerCase(); //to send TO the microbit
let MBIT_UART_RX_CHARACTERISTIC = '6E400003-B5A3-F393-E0A9-E50E24DCCA9E'.toLowerCase(); //to send TO the microbit
let MBIT_UART_TX_CHARACTERISTIC = '6E400002-B5A3-F393-E0A9-E50E24DCCA9E'.toLowerCase(); //to receive data FROM the microbit

let connectButton = document.getElementById("connectButton");
let saveButton = document.getElementById("saveButton");

let logRegion = document.getElementById("log_region");
let logCount = 0;

var new_bubble_x_position = 0, new_bubble_y_position = 0, new_bubble_diameter = 1; 


function appendToLog(moreText:string){
    logCount += 1;
    logRegion.innerHTML += `${logCount}:  ${moreText}  <br>`;
}

let ourMicrobitUART:MicroBitUART;


let bluetoothSearchOptions:RequestDeviceOptions = {
    filters: [{ 
        namePrefix: "BBC micro:bit",
    }],
    optionalServices: [MBIT_UART_SERVICE]
};

interface MessageSubscriber{
    (message:string):void;
}

class MicroBitUART{
    rxCharacteristic:BluetoothRemoteGATTCharacteristic;
    txCharacteristic:BluetoothRemoteGATTCharacteristic;

    private messageSubscribers:Array<MessageSubscriber> = []; 
    private decoder: TextEncoding.TextDecoder;

    constructor(rxCharacteristic:BluetoothRemoteGATTCharacteristic, txCharacteristic:BluetoothRemoteGATTCharacteristic){
        this.rxCharacteristic = rxCharacteristic;
        this.txCharacteristic = txCharacteristic;

        this.decoder = new TextDecoder();

        this.txCharacteristic.startNotifications().then(characteristic =>{
            characteristic.addEventListener('characteristicvaluechanged', ev => {
                let value:ArrayBufferView = (<any>(event.target)).value;
                let valueAsString:string = new TextDecoder().decode(value);
                this.handleNewMessage(valueAsString);
            } );
        });
    }

    subscribeToMessages(receiver:MessageSubscriber):void{
        this.messageSubscribers.push(receiver);
    }

    private handleNewMessage(message:string):void{
        this.messageSubscribers.forEach(subscriber => {
            subscriber(message);
        })
    }

    public send(key:String, value:String){
        let kvstring = `${key}^${value}#`;
        let encoder = new TextEncoder('utf-8');
        let encoded = encoder.encode(kvstring);
        this.rxCharacteristic.writeValue(encoded);
        appendToLog("Sent >>>> " + kvstring);

    }



}

function connectClicked(e:MouseEvent){
    navigator.bluetooth.requestDevice(bluetoothSearchOptions).then(device => {
        appendToLog(`Found:  ${device.name}`);
        return device.gatt.connect();
    }).then(server => {
        appendToLog("...connected!");
        return server.getPrimaryService(MBIT_UART_SERVICE);
    }).then(service => {
        return Promise.all([service.getCharacteristic(MBIT_UART_RX_CHARACTERISTIC), 
                                service.getCharacteristic(MBIT_UART_TX_CHARACTERISTIC)])
    }).then(rxandtx => {
        let rx:BluetoothRemoteGATTCharacteristic;
        let tx:BluetoothRemoteGATTCharacteristic;
        [rx, tx] = rxandtx;
        ourMicrobitUART = new MicroBitUART(rx, tx);
        appendToLog("Made a UART!!");
        startReadingFromUART(ourMicrobitUART);
    }).catch(error => {
        console.log(error); 
    });
}

function startReadingFromUART(mbit:MicroBitUART){
    mbit.subscribeToMessages( (s:string) => {appendToLog("Read <<<< " + s)});
    mbit.subscribeToMessages(storeDataPoint);
}


interface KeyAndValue{
    key: String,
    value: String|Number
}

function storeDataPoint(message:String){
    let kv = splitKeyValue(message);
    let key = kv.key
    let value = kv.value

    if (key == "x_accel"){
        console.log("x_accel="+value);
        new_bubble_x_position = parseInt(<any> value);
    }else if (key == "y_accel"){
        new_bubble_y_position = parseInt(<any> value);
    }else if (key == "st_accel"){
        new_bubble_diameter = parseInt(<any> value);
    }else{
        console.log("got a key we weren't looking for: "+ key);
    }

}


function splitKeyValue(message:String):KeyAndValue{
    let [key,value] = message.trim().split(":");
    return {key: key, value: value}
}

connectButton.onclick = connectClicked;

///stuff from ben's old p5 sketch below this point
var sceneWidth = 800, sceneHeight = 600;
var backgroundColor;
var tears; 
var leftEyePosition, rightEyePosition;



function setup() {
  tears = Array();
  var canvas = createCanvas(sceneWidth, sceneHeight);
  canvas.parent('sketch-holder');

  backgroundColor = color(255, 255, 255);
}

function draw() {
  background(backgroundColor);
  tears.push(createNewTear());
  drawTears();
  moveTearsDown();
  destroyOffScreenTears();
  showTearCounter(); //for debugging
}



function drawTears(){
  for (var index = 0; index < tears.length; index++){
    drawTear(tears[index]);
  }
}

function drawTear(tear){
  stroke(tear.color);
  ellipse(400 + tear.x/10, 300 + tear.y/10, tear.diameter/10, tear.diameter/10);
}

function moveTearsDown(){
  for (var index = 0; index < tears.length; index++){
    tears[index].y += 10;
  }
}

function destroyOffScreenTears(){
  var newTears = Array();
  for (var index = 0; index < tears.length; index++){
    if (tears[index].y < sceneHeight){
      newTears.push(tears[index]);
    }
  }
  tears = newTears;
}

function showTearCounter(){
  stroke(color(255,0,0));
  textSize(16);
  text(tears.length, 10, 30);
}


function createNewTear() {
  var theTear = {};
  theTear.x = new_bubble_x_position;
  theTear.y = new_bubble_x_position;
  theTear.diameter = new_bubble_diameter;
  theTear.color = color(random(255), random(0), random(255));

  return theTear;
}







