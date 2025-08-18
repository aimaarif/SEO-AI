// src/components/debug/TimestampDebugger.tsx
import React, { useState, useEffect } from 'react';

function TimestampDebugger() {
  const [testTimestamp] = useState(new Date().toISOString());
  const [currentTime, setCurrentTime] = useState(new Date().toISOString());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date().toISOString());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const formatTimestamp = (timestamp: string) => {
    try {
      if (!timestamp || typeof timestamp !== 'string') {
        console.warn('Invalid timestamp received:', timestamp);
        return 'Unknown time';
      }

      const date = new Date(timestamp);
      
      if (isNaN(date.getTime())) {
        console.warn('Invalid timestamp received:', timestamp);
        return 'Unknown time';
      }
      
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      
      console.log('Debug info:', {
        timestamp,
        parsed: date.toISOString(),
        now: now.toISOString(),
        diffInMinutes,
        rawDiff: now.getTime() - date.getTime()
      });
      
      if (diffInMinutes < 1) {
        return "Just now";
      } else if (diffInMinutes < 60) {
        return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
      } else if (diffInMinutes < 1440) {
        const hours = Math.floor(diffInMinutes / 60);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
      } else {
        const days = Math.floor(diffInMinutes / 1440);
        return `${days} day${days > 1 ? 's' : ''} ago`;
      }
    } catch (error) {
      console.error('Error formatting timestamp:', error, 'Timestamp:', timestamp);
      return 'Unknown time';
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-md mx-auto border-2 border-yellow-300">
      <h2 className="text-xl font-bold mb-4 text-yellow-800">🐛 Timestamp Debug</h2>
      
      <div className="space-y-3 text-sm">
        <div>
          <strong>Test timestamp:</strong><br />
          <code className="text-xs bg-gray-100 p-1 rounded block mt-1 break-all">{testTimestamp}</code>
        </div>
        
        <div>
          <strong>Current time:</strong><br />
          <code className="text-xs bg-gray-100 p-1 rounded block mt-1 break-all">{currentTime}</code>
        </div>
        
        <div>
          <strong>Formatted:</strong><br />
          <span className="text-blue-600 font-semibold">{formatTimestamp(testTimestamp)}</span>
        </div>
        
        <div>
          <strong>Time difference (ms):</strong><br />
          <span className="font-mono text-green-600">
            {new Date().getTime() - new Date(testTimestamp).getTime()}
          </span>
        </div>
        
        <div>
          <strong>Timezone offset:</strong><br />
          <span className="font-mono text-purple-600">
            {new Date().getTimezoneOffset()} minutes
          </span>
        </div>
      </div>
      
      <button 
        onClick={() => window.location.reload()}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 w-full"
      >
        Refresh Test
      </button>
    </div>
  );
}

export default TimestampDebugger;