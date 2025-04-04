// demo.js  
const express = require('express');  
const http = require('http');  
const WebSocket = require('ws');  
const path = require('path');  
const os = require('os');  
const pty = require('node-pty');  
const fs = require('fs');  
  
const app = express();  
const port = 3000;  
  
// Serve static files from the 'public' directory (for xterm.js assets if needed)  
app.use('/static', express.static(path.join(__dirname, 'public')));  
  
// HTML content with xterm.js integrated for interactive terminal  
const htmlContent = `  
<!DOCTYPE html>  
<html lang="en">  
<head>  
    <meta charset="UTF-8">  
    <title>Interactive Web Terminal</title>  
    <!-- xterm.js CSS -->  
    <link rel="stylesheet" href="https://unpkg.com/xterm/css/xterm.css" />  
    <style>  
        /* Reset and basic styles */  
        * {  
            box-sizing: border-box;  
            margin: 0;  
            padding: 0;  
        }  
  
        body {  
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;  
            background: #1e1e1e;  
            color: #ffffff;  
            height: 100vh;  
            display: flex;  
            justify-content: center;  
            align-items: center;  
            overflow: hidden;  
        }  
  
        /* Open Terminal Button */  
        #openTerminalBtn {  
            padding: 15px 30px;  
            font-size: 18px;  
            background-color: #007acc;  
            border: none;  
            border-radius: 5px;  
            cursor: pointer;  
            transition: background-color 0.3s ease, transform 0.3s ease;  
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);  
        }  
  
        #openTerminalBtn:hover {  
            background-color: #005f99;  
            transform: translateY(-2px);  
        }  
  
        /* Modal Background */  
        #terminalDialog {  
            display: none; /* Hidden by default */  
            position: fixed;  
            z-index: 1000;  
            left: 0;  
            top: 0;  
            width: 100%;  
            height: 100%;  
            overflow: hidden;  
            background-color: rgba(0,0,0,0.7);  
            animation: fadeIn 0.5s forwards;  
        }  
  
        /* Modal Content */  
        .modal-content {  
            background-color: #000;  
            color: #00FF00;  
            font-family: monospace;  
            margin: 5% auto;  
            padding: 0;  
            border: 2px solid #007acc;  
            width: 80%;  
            max-width: 1000px;  
            height: 80%;  
            border-radius: 10px;  
            position: relative;  
            animation: slideIn 0.5s forwards;  
            display: flex;  
            flex-direction: column;  
            overflow: hidden;  
        }  
  
        /* Close Button */  
        .close-button {  
            color: #aaa;  
            position: absolute;  
            top: 15px;  
            right: 20px;  
            font-size: 28px;  
            font-weight: bold;  
            transition: color 0.3s ease, transform 0.3s ease;  
            cursor: pointer;  
            z-index: 1;  
        }  
  
        .close-button:hover,  
        .close-button:focus {  
            color: #fff;  
            transform: scale(1.2);  
        }  
  
        /* Terminal Container */  
        #terminal {  
            flex: 1;  
            padding: 10px;  
        }  
  
        /* Animations */  
        @keyframes fadeIn {  
            from { opacity: 0; }  
            to { opacity: 1; }  
        }  
  
        @keyframes slideIn {  
            from { transform: translateY(-50px); opacity: 0; }  
            to { transform: translateY(0); opacity: 1; }  
        }  
  
        /* Responsive Design */  
        @media (max-width: 600px) {  
            .modal-content {  
                width: 95%;  
                height: 90%;  
                padding: 15px;  
            }  
  
            #openTerminalBtn {  
                padding: 10px 20px;  
                font-size: 16px;  
            }  
        }  
    </style>  
</head>  
<body>  
    <button id="openTerminalBtn">Open Terminal</button>  
  
    <div id="terminalDialog">  
        <div class="modal-content">  
            <span class="close-button">&times;</span>  
            <div id="terminal"></div>  
        </div>  
    </div>  
  
    <!-- xterm.js Scripts -->  
    <script src="https://unpkg.com/xterm/lib/xterm.js"></script>  
    <script src="https://unpkg.com/xterm-addon-fit/lib/xterm-addon-fit.js"></script>  
    <script>  
        const openTerminalBtn = document.getElementById('openTerminalBtn');  
        const terminalDialog = document.getElementById('terminalDialog');  
        const closeButton = document.querySelector('.close-button');  
        const terminalContainer = document.getElementById('terminal');  
  
        let socket;  
        let term;  
        let fitAddon;  
  
        // Function to initialize the terminal and WebSocket  
        function initializeTerminal() {  
            // Initialize xterm.js  
            term = new Terminal({  
                cursorBlink: true,  
                rows: 30,  
                cols: 100,  
                theme: {  
                    background: '#000000',  
                    foreground: '#00FF00',  
                    cursor: '#00FF00'  
                }  
            });  
            fitAddon = new FitAddon.FitAddon();  
            term.loadAddon(fitAddon);  
            term.open(terminalContainer);  
            fitAddon.fit();  
  
            // Initialize WebSocket connection  
            socket = new WebSocket('ws://' + window.location.hostname + ':' + ${port});  
  
            socket.onopen = () => {  
                term.write('\\r\\n*** Connected to the server ***\\r\\n');  
            };  
  
            socket.onmessage = (event) => {  
                const data = event.data;  
                term.write(data);  
            };  
  
            socket.onclose = () => {  
                term.write('\\r\\n*** Disconnected from the server ***\\r\\n');  
                console.log('WebSocket connection closed');  
            };  
  
            socket.onerror = (error) => {  
                console.error('WebSocket error:', error);  
            };  
  
            // Handle terminal input  
            term.onData(data => {  
                socket.send(data);  
            });  
  
            // Handle window resize  
            window.addEventListener('resize', () => {  
                fitAddon.fit();  
                socket.send(JSON.stringify({ action: 'resize', cols: term.cols, rows: term.rows }));  
            });  
        }  
  
        // Open Terminal Button Click Event  
        openTerminalBtn.addEventListener('click', () => {  
            terminalDialog.style.display = 'block';  
            if (!term) {  
                initializeTerminal();  
            } else {  
                fitAddon.fit();  
            }  
        });  
  
        // Close Button Click Event  
        closeButton.addEventListener('click', () => {  
            terminalDialog.style.display = 'none';  
            if (socket && socket.readyState === WebSocket.OPEN) {  
                socket.close();  
            }  
            if (term) {  
                term.dispose();  
                term = null;  
            }  
        });  
  
        // Click Outside Modal to Close  
        window.addEventListener('click', (event) => {  
            if (event.target === terminalDialog) {  
                terminalDialog.style.display = 'none';  
                if (socket && socket.readyState === WebSocket.OPEN) {  
                    socket.close();  
                }  
                if (term) {  
                    term.dispose();  
                    term = null;  
                }  
            }  
        });  
    </script>  
</body>  
</html>  
`;  
  
// Route to serve the HTML content  
app.get('/', (req, res) => {  
    res.send(htmlContent);  
});  
  
// Create HTTP server  
const server = http.createServer(app);  
  
// Initialize WebSocket server instance  
const wss = new WebSocket.Server({ server });  
  
// Handle WebSocket connections  
wss.on('connection', ws => {  
    console.log('Client connected');  
  
    // Determine the shell based on the operating system  
    let shell;  
    if (os.platform() === 'win32') {  
        shell = 'cmd.exe';  
    } else {  
        shell = '/bin/bash';  
        // Fallback to /bin/sh if /bin/bash does not exist  
        if (!fs.existsSync(shell)) {  
            shell = '/bin/sh';  
            if (!fs.existsSync(shell)) {  
                ws.send('Error: No suitable shell found on the server.\r\n');  
                ws.close();  
                return;  
            }  
        }  
    }  
  
    // Create a new pty using node-pty  
    const ptyProcess = pty.spawn(shell, [], {  
        name: 'xterm-color',  
        cols: 80,  
        rows: 30,  
        cwd: process.cwd(),  
        env: process.env  
    });  
  
    // Pipe data from pty to WebSocket  
    ptyProcess.on('data', data => {  
        ws.send(data);  
    });  
  
    // Pipe data from WebSocket to pty  
    ws.on('message', message => {  
        try {  
            if (typeof message === 'string') {  
                // Handle JSON messages (like resize)  
                try {  
                    const json = JSON.parse(message);  
                    if (json.action === 'resize') {  
                        ptyProcess.resize(json.cols, json.rows);  
                        return;  
                    }  
                } catch (err) {  
                    // Not a JSON message, send it to the shell  
                }  
                ptyProcess.write(message);  
            } else if (message instanceof Buffer) {  
                ptyProcess.write(message.toString());  
            }  
        } catch (err) {  
            console.error('Failed to handle message:', err);  
        }  
    });  
  
    ws.on('close', () => {  
        console.log('Client disconnected');  
        ptyProcess.kill();  
    });  
  
    ws.on('error', (err) => {  
        console.error('WebSocket error:', err);  
        ptyProcess.kill();  
    });  
});  
  
// Start the server  
server.listen(port, () => {  
    console.log(`Server listening on http://localhost:${port}`);  
});  
