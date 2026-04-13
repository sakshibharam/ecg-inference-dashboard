import asyncio
import scipy.io
from collections import deque
import numpy as np
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import time

# For reading from Arduino via Serial data
# import serial

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.websocket("/ws/ecg")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    # --- CIRCULAR BUFFER PLACEMENT ---
    # We initialize it here so it lives as long as the connection is open.
    # We pre-fill with 0s to maintain a "Fixed Dimension" of 9000.
    inference_buffer = deque([0.0] * 9000, maxlen=9000)
    
    # Load a .mat file for simulation purposes
    # Replace this file-loading code with a Serial connection later on
    # The 'val' key contains the raw signal 
    data = scipy.io.loadmat('data/A00001.mat')
    signal = data['val'][0] 

    # for testing toggles
    # start_time = time.time()

    # for value in signal:
    #     # Toggle label every 5 seconds for testing
    #     current_elapsed = time.time() - start_time
    #     mock_label = "Arrhythmia" if (int(current_elapsed) % 10 > 5) else "Normal"
        
    #     await websocket.send_json({
    #         "voltage": int(value),
    #         "label": mock_label,
    #         "confidence": 0.85 if mock_label == "Arrhythmia" else 0.99
    #     })
    #     await asyncio.sleep(1/300)
    
    try:
        # Loop through the signal and "Emit" to the UI
        for point in signal:
            # --- UPDATE THE BUFFER ---
            # Add the newest point; deque automatically deallocates the oldest
            inference_buffer.append(point)

            # Send the single point to React for the 900-sample live graph
            await websocket.send_json({
                "voltage": int(point),
                "label": "Normal",  # Mock classification for now
                "confidence": 0.98
            })

            # -- INFERENCE ---
            # Run inference here(maybe every 300 samples aka once per second).
            # This for loop should be changed to continuous while loop for real-time serial data

            # Simulate 300Hz (1 second / 300 samples)
            # Later on, this should be removed because of Arduino's clock
            await asyncio.sleep(1/300) 
            
    except Exception as e:
        print(f"Connection closed or error: {e}")