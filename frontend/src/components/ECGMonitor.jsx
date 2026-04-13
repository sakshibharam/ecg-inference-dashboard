import React, { useEffect, useRef, useState } from 'react';
import '../ECGMonitor.css';

const ECGMonitor = () => {
  const canvasRef = useRef(null);
  // initialize circular buffer of size 900
  const bufferRef = useRef(new Float32Array(900).fill(0));
  const [inference, setInference] = useState({ label: "INITIALIZING", confidence: 0 });

  useEffect(() => {
    const socket = new WebSocket('ws://localhost:8000/ws/ecg');

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      // Update buffer
      const buf = bufferRef.current;

      // Shift everything one spot to the left
      // This "forgets" the oldest sample (index 0)
      buf.set(buf.subarray(1));

      // Add the new sample at the very end
      // This occupies the newly vacated index 899
      buf[buf.length - 1] = data.voltage;

      // Update HUD
      setInference({ label: data.label, confidence: data.confidence });
    };

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const data = bufferRef.current;

      // for debugging
      console.log(bufferRef.current.length);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw Grid lines
      ctx.strokeStyle = '#002200';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }

      // Draw ECG Wave
      ctx.beginPath();
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';

      for (let i = 0; i < data.length; i++) {
        const x = (i / data.length) * canvas.width;
        // Adjust the '10' divisor to scale your .mat values correctly
        const y = (canvas.height / 2) - (data[i] / 10); 
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      requestAnimationFrame(draw);
    };

    const animId = requestAnimationFrame(draw);
    return () => {
      socket.close();
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div className="monitor-container">
      <div className="monitor-card">
        <div className="monitor-header">
          <div>
            <div style={{fontSize: '0.7rem', color: '#666'}}>ECG LIVE FEED (300Hz)</div>
            <div style={{fontSize: '0.9rem'}}>PHYSIONET CHALLENGE 2017</div>
          </div>
          <div style={{textAlign: 'right'}}>
            <div className={`status-label ${inference.label === 'Normal' ? 'status-normal' : 'status-alert'}`}>
              {inference.label}
            </div>
            <div style={{fontSize: '0.7rem', color: '#666'}}>
              CONFIDENCE: {Math.round(inference.confidence * 100)}%
            </div>
          </div>
        </div>
        <canvas ref={canvasRef} width={900} height={400} />
      </div>
    </div>
  );
};

export default ECGMonitor;