const debug = require('debug')('navel:cli');
const exit = require('exeunt');
const ps = require('ps-node');

const args = process.argv.slice(2);

debug('process.argv', args);

const validCommands = ['ask', 'tell'];
let [
    command,
    whom,
    what,
    data = '{}',
] = args;

if (!validCommands.includes(command)) {
    console.error(`${command} is not a valid command`);
    exit(1);
}

if (!whom) {
    console.error('please specify to whom the message is addressed to');
    exit(1);
}

if (!what) {
    console.error(`what are you trying to ${command} ${whom}?`);
    exit(1);
}

if (typeof data === 'string') {
    try {
        data = JSON.parse(data);
    } catch (e) {
        console.error('unable to parse passed in data as json');
        exit(1);
    }
}

debug(`${command}ing ${whom} ${what} with ${JSON.stringify(data)}`);

let [processName, serviceName] = whom.split(':');

debug(`process name: ${processName} and service name: ${serviceName}`);

if (!processName || !serviceName) {
    console.error('cannot figure out who you are trying to talk to');
    exit(1);
}

ps.lookup({command: new RegExp(`^${processName}`)}, (err, results) => {
    debug('pid lookup results', results);

    if (err) {
        console.error('unable to lookup running process', err);
        exit(1);
    }

    if (!results || !results.length) {
        console.error(`could not find a process with name ${processName}`);
        exit(1);
    }

    sendIPCMessage(results[0].pid, command, serviceName, what, data)
});

function sendIPCMessage(pid, method, destination, action, data, callback) {
    const net = require('net');
    const uuidv4 = require('uuidv4');

    const socket = net.connect(`${pid}.ipc`);
    socket.setEncoding('utf8');
    socket.on('connect', () => {
        console.log('socket connected');

        function writeData(ind) {
            const obj = {
                ref: uuidv4(),
                method,
                destination,
                action,
                data,
            };

            socket.write(`${JSON.stringify(obj)}\r\n`);

            if (ind > 5) {
                // socket.end();
            } else {
                setTimeout(writeData.bind(null, ind + 1), 1000);
            }
        }

        writeData(0);
    });

    socket.on('data', (data) => {
        console.log('received data:', JSON.parse(data));
    });

    socket.on('close', (hadError) => {
        console.log('closed!', hadError);

        setTimeout(() => process.exit(), 1000);
        // process.exit();
    });

}
