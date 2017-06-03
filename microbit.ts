//// COPY AND PASTE THIS CODE INTO THE PXT WEB EDITOR ////
namespace blockytalkybluetooth {
    let delimiter = "^";
    let terminator = "#";
    let handlers: LinkedKeyHandlerList = null;

    class LinkedKeyHandlerList {
        key: string;
        callback: (value: string) => void;
        next: LinkedKeyHandlerList
    }

    export function onMessageReceived(key: string, callback: (value: string) => void) {
        //two cases to handle here: 
        //1) we don't have any handlers yet, 
        //2) we are creating the first, or nth, handler for this key. we will allow multiple callbacks for the same key.
        //we can handle both of these scenarios by just pushing new elements to the start of the handlers list
        let newHandler = new LinkedKeyHandlerList()
        newHandler.callback = callback;
        newHandler.key = key;
        newHandler.next = handlers;
        handlers = newHandler;
    }

    export function sendKeyValue(key: string, value: string) {
        bluetooth.uartWriteString(key + delimiter + value + terminator)
    }

    let firstOccurenceOfCharacterInString = (charToFind: string, input: string) => {
        for (let index = 0; index < input.length; index++) {
            if (input.charAt(index) == charToFind) {
                return index
            }
        }
        return - 1
    }

    let extractKey = (input: string) => {
        let endOfKey = firstOccurenceOfCharacterInString(delimiter, input)
        if (endOfKey == -1) {
            return "MISSING DELIMITER"
        } else {
            return input.substr(0, endOfKey)
        }
    }

    let extractValue = (input: string) => {
        let endOfKey2 = firstOccurenceOfCharacterInString(delimiter, input)
        if (endOfKey2 == -1) {
            return "MISSING DELIMITER"
        } else {
            return input.substr(endOfKey2 + 1)
        }
    }

    export function handleIncomingUARTData() {
        let latestMessage = bluetooth.uartReadUntil(terminator)

        //DEBUG LINE vvvvvvv
        //basic.showString(latestMessage)
        //DEBUG LINE ^^^^^^^

        let key = extractKey(latestMessage)
        let value = extractValue(latestMessage)

        let handlerToExamine = handlers;

        if (handlerToExamine == null) { //empty handler list
            basic.showString("nohandler")
        }

        while (handlerToExamine != null) {
            if (handlerToExamine.key == key) {
                handlerToExamine.callback(value)
            }
            handlerToExamine = handlerToExamine.next
        }
    }
    bluetooth.startUartService();
}

bluetooth.onBluetoothConnected(() => {
    basic.showLeds(`
        . . . . .
        . . # # .
        . # . . .
        . # . . .
        . . # # .
        `)
})
bluetooth.onBluetoothDisconnected(() => {
    basic.showLeds(`
        . . . # .
        . . # # .
        . # . # .
        . # . # .
        . . # # .
        `)
})

input.onButtonPressed(Button.A, () => {
    blockytalkybluetooth.sendKeyValue("button", "a")
})

input.onButtonPressed(Button.B, () => {
    for (let i = 0; i < 10; i++) {
        blockytalkybluetooth.sendKeyValue("button-loop", "b")
        basic.pause(40);
    }
})

let counter = 0;
blockytalkybluetooth.onMessageReceived("hello", (value: string) => {
    counter = counter + 1;
    if ((counter % 10) == 0) {
        basic.showNumber(counter);
    }
});

basic.forever(() => {
    blockytalkybluetooth.handleIncomingUARTData()
})