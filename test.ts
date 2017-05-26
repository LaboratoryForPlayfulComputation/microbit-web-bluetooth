let MBIT_UART_SERVICE  = '6E400001-B5A3-F393-E0A9-E50E24DCCA9E'.toLowerCase(); //to send TO the microbit
let MBIT_UART_RX_CHARACTERISTIC = '6E400003-B5A3-F393-E0A9-E50E24DCCA9E'.toLowerCase(); //to send TO the microbit
let MBIT_UART_TX_CHARACTERISTIC = '6E400002-B5A3-F393-E0A9-E50E24DCCA9E'.toLowerCase(); //to receive data FROM the microbit

let connectButton = document.getElementById("connectButton");
let logRegion = document.getElementById("log");

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



}

function appendToLog(moreText:string){
    logRegion.innerHTML += moreText + "<br>";
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
    mbit.subscribeToMessages(appendToLog);
}

connectButton.onclick = connectClicked;


