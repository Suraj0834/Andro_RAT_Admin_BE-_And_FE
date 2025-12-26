# Andro_RAT_Admin_BE-_And_FE

## Overview
This repository contains the Admin Dashboard for the AndroRAT (Android Remote Administration Tool) system. It consists of a robust Node.js backend and a lightweight, responsive HTML/JS frontend. The system allows for real-time monitoring and control of connected Android devices via Socket.IO.

## Features

### Backend (Node.js)
- **Real-time Communication:** Uses `socket.io` (v2.5.0) for low-latency, bidirectional communication with Android clients.
- **REST API:** Express.js server handling HTTP requests and serving static assets.
- **File Management:** Automatically handles file uploads (photos, audio, screenshots) from devices and stores them in structured directories.
- **Command Execution:** Sends commands to devices to trigger actions like taking photos, recording audio, or getting location.

### Frontend (HTML/JS)
- **Dashboard Interface:** A clean, web-based dashboard to view connected devices.
- **Device Control:** Dedicated control panel for each device to execute commands.
- **Live Logs:** Real-time display of logs and responses from the device.
- **Media Viewer:** Built-in viewers for images and audio files retrieved from devices.
- **Map Integration:** Visualizes device location on a map.

## Project Structure

```
modern-dashboard/
├── backend/                # Node.js Server
│   ├── server.js           # Main server entry point
│   ├── package.json        # Backend dependencies
│   └── received_data/      # Storage for uploaded files
│       ├── audio/
│       ├── files/
│       ├── photos/
│       └── screenshots/
├── public/                 # Frontend Assets
│   ├── dashboard.html      # Main dashboard view
│   ├── device.html         # Individual device control view
│   ├── login.html          # Authentication page
│   ├── css/                # Stylesheets
│   └── js/                 # Client-side logic
└── start.sh                # Startup script
```

## Prerequisites
- **Node.js:** v14 or higher
- **NPM:** Installed with Node.js

## Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Suraj0834/Andro_RAT_Admin_BE-_And_FE.git
    cd Andro_RAT_Admin_BE-_And_FE
    ```

2.  **Install Dependencies:**
    Navigate to the backend directory and install the required packages.
    ```bash
    cd backend
    npm install
    ```

3.  **Start the Server:**
    You can use the provided start script or run it manually.
    
    **Using the script:**
    ```bash
    ./start.sh
    ```
    
    **Manual Start:**
    ```bash
    cd backend
    npm start
    ```

4.  **Access the Dashboard:**
    Open your web browser and navigate to:
    `http://localhost:3001`

## Usage

1.  **Login:** Use the configured admin credentials to log in.
2.  **Connect Devices:** Ensure your Android client app is configured to point to this server's IP address and port (3001).
3.  **Monitor:** Connected devices will appear on the main dashboard.
4.  **Control:** Click on a device to open the control panel and send commands.

## API Endpoints & Socket Events

### Socket Events (Server -> Client)
- `x0000ca`: Check Audio
- `x0000cm`: Check Camera
- `x0000fm`: File Manager
- `x0000gps`: Get Location
- `x0000sm`: Send SMS
- `x0000cl`: Call Logs
- `x0000cn`: Contacts

### Socket Events (Client -> Server)
- `join`: Device registration
- `online`: Heartbeat
- `x0000ca`: Audio data received
- `x0000cm`: Camera image received
- `x0000gps`: Location data received

## Security Note
This tool is intended for educational purposes and authorized security testing only. Misuse of this software to monitor devices without consent is illegal.

## License
[MIT License](LICENSE)
