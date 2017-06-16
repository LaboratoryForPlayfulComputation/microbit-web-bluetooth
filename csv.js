let MBIT_UART_SERVICE = '6E400001-B5A3-F393-E0A9-E50E24DCCA9E'.toLowerCase(); //to send TO the microbit
let MBIT_UART_RX_CHARACTERISTIC = '6E400003-B5A3-F393-E0A9-E50E24DCCA9E'.toLowerCase(); //to send TO the microbit
let MBIT_UART_TX_CHARACTERISTIC = '6E400002-B5A3-F393-E0A9-E50E24DCCA9E'.toLowerCase(); //to receive data FROM the microbit
let connectButton = document.getElementById("connectButton");
let saveButton = document.getElementById("saveButton");
let logRegion = document.getElementById("log");
let logCount = 0;
let storedData = [];
let keys = [];
function appendToLog(moreText) {
    logCount += 1;
    logRegion.innerHTML += `${logCount}:  ${moreText}  <br>`;
}
let ourMicrobitUART;
let bluetoothSearchOptions = {
    filters: [{
            namePrefix: "BBC micro:bit",
        }],
    optionalServices: [MBIT_UART_SERVICE]
};
class MicroBitUART {
    constructor(rxCharacteristic, txCharacteristic) {
        this.messageSubscribers = [];
        this.rxCharacteristic = rxCharacteristic;
        this.txCharacteristic = txCharacteristic;
        this.decoder = new TextDecoder();
        this.txCharacteristic.startNotifications().then(characteristic => {
            characteristic.addEventListener('characteristicvaluechanged', ev => {
                let value = (event.target).value;
                let valueAsString = new TextDecoder().decode(value);
                this.handleNewMessage(valueAsString);
            });
        });
    }
    subscribeToMessages(receiver) {
        this.messageSubscribers.push(receiver);
    }
    handleNewMessage(message) {
        this.messageSubscribers.forEach(subscriber => {
            subscriber(message);
        });
    }
    send(key, value) {
        let kvstring = `${key}^${value}#`;
        let encoder = new TextEncoder('utf-8');
        let encoded = encoder.encode(kvstring);
        this.rxCharacteristic.writeValue(encoded);
        appendToLog("Sent >>>> " + kvstring);
    }
}
function connectClicked(e) {
    navigator.bluetooth.requestDevice(bluetoothSearchOptions).then(device => {
        appendToLog(`Found:  ${device.name}`);
        return device.gatt.connect();
    }).then(server => {
        appendToLog("...connected!");
        return server.getPrimaryService(MBIT_UART_SERVICE);
    }).then(service => {
        return Promise.all([service.getCharacteristic(MBIT_UART_RX_CHARACTERISTIC),
            service.getCharacteristic(MBIT_UART_TX_CHARACTERISTIC)]);
    }).then(rxandtx => {
        let rx;
        let tx;
        [rx, tx] = rxandtx;
        ourMicrobitUART = new MicroBitUART(rx, tx);
        appendToLog("Made a UART!!");
        startReadingFromUART(ourMicrobitUART);
    }).catch(error => {
        console.log(error);
    });
}
function startReadingFromUART(mbit) {
    mbit.subscribeToMessages((s) => { appendToLog("Read <<<< " + s); });
    mbit.subscribeToMessages(storeDataPoint);
}
function storeDataPoint(message) {
    let kv = splitKeyValue(message);
    let key = kv.key;
    let value = kv.value;
    if (keys.indexOf(key) < 0) {
        keys.push(key);
    }
    storedData.push(kv);
}
function generateCSV() {
    let delimiter = ",";
    let output = keys.join(delimiter) + "\n";
    for (let dataPoint of storedData) {
        let dataRow = [];
        for (let key of keys) {
            if (dataPoint.key == key) {
                dataRow.push(dataPoint.value);
            }
            else {
                dataRow.push("");
            }
        }
        output += dataRow.join(delimiter) + "\n";
    }
    return output;
}
function saveClicked(e) {
    var a = document.createElement('a');
    let mimeType = 'text/csv;encoding:utf-8';
    let theContent = generateCSV();
    let fileName = "microbit.csv";
    if (navigator.msSaveBlob) {
        navigator.msSaveBlob(new Blob([theContent], {
            type: mimeType
        }), fileName);
    }
    else if (URL && 'download' in a) {
        a.href = URL.createObjectURL(new Blob([theContent], {
            type: mimeType
        }));
        a.setAttribute('download', fileName);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
    else {
        location.href = 'data:application/octet-stream,' + encodeURIComponent(theContent); // only this mime type is supported
    }
}
function splitKeyValue(message) {
    let [key, value] = message.trim().split(":");
    return { key: key, value: value };
}
connectButton.onclick = connectClicked;
saveButton.onclick = saveClicked;
