import React, { useRef, useEffect, useState } from 'react';

const TimePicker = ({ hours, minutes, onTimeChange }) => {
  const hoursRef = useRef(null);
  const minutesRef = useRef(null);
  const [currentHour, setCurrentHour] = useState(hours);
  const [currentMinute, setCurrentMinute] = useState(minutes);
  
  const hourOptions = Array.from({ length: 24 }, (_, i) => i);
  const minuteOptions = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  
  const ITEM_HEIGHT = 40;
  const VISIBLE_ITEMS = 5;
  const CONTAINER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

  useEffect(() => {
    setTimeout(() => {
      scrollToValue(hoursRef, hours, hourOptions);
      scrollToValue(minutesRef, minutes, minuteOptions);
    }, 100);
  }, []);

  const scrollToValue = (ref, value, options) => {
    if (!ref.current) return;
    const index = options.indexOf(value);
    ref.current.scrollTop = index * ITEM_HEIGHT;
  };

  const handleScroll = (ref, options, type) => {
    if (!ref.current) return;
    
    const scrollTop = ref.current.scrollTop;
    const index = Math.round(scrollTop / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(index, options.length - 1));
    const value = options[clampedIndex];
    
    if (type === 'hours') {
      setCurrentHour(value);
    } else {
      setCurrentMinute(value);
    }
    
    clearTimeout(ref.current.timeout);
    ref.current.timeout = setTimeout(() => {
      ref.current.scrollTop = clampedIndex * ITEM_HEIGHT;
      if (type === 'hours') {
        onTimeChange(value, minutes);
      } else {
        onTimeChange(hours, value);
      }
    }, 150);
  };

  const renderWheel = (ref, options, currentValue, displayValue, type, label) => {
    return (
      <div className="flex flex-col items-center gap-2">
        {/* Label above wheel */}
        <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          {label}
        </div>
        
        {/* Wheel */}
        <div className="relative w-20">
          <div
            ref={ref}
            className="overflow-y-scroll hide-scrollbar"
            style={{ 
              height: `${CONTAINER_HEIGHT}px`, 
              paddingTop: `${ITEM_HEIGHT * 2}px`, 
              paddingBottom: `${ITEM_HEIGHT * 2}px` 
            }}
            onScroll={() => handleScroll(ref, options, type)}
          >
            {options.map((value) => {
              const isCenter = value === displayValue;
              return (
                <div
                  key={value}
                  className="flex items-center justify-center font-normal transition-all duration-100 cursor-pointer"
                  style={{
                    height: `${ITEM_HEIGHT}px`,
                    fontSize: '24px',
                    color: isCenter ? '#000000' : '#CCCCCC',
                    fontWeight: isCenter ? '600' : '400',
                  }}
                  onClick={() => {
                    scrollToValue(ref, value, options);
                    if (type === 'hours') {
                      setCurrentHour(value);
                      onTimeChange(value, minutes);
                    } else {
                      setCurrentMinute(value);
                      onTimeChange(hours, value);
                    }
                  }}
                >
                  {value.toString().padStart(2, '0')}
                </div>
              );
            })}
          </div>
          
          {/* Selection lines */}
          <div 
            className="absolute left-0 right-0 pointer-events-none"
            style={{
              top: `${ITEM_HEIGHT * 2}px`,
              height: `${ITEM_HEIGHT}px`,
            }}
          >
            <div className="absolute top-0 left-0 right-0 h-px bg-gray-400"></div>
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gray-400"></div>
          </div>
          
          {/* Fade masks */}
          <div 
            className="absolute top-0 left-0 right-0 pointer-events-none rounded-t-2xl"
            style={{
              height: `${ITEM_HEIGHT * 2}px`,
              background: 'linear-gradient(to bottom, #F5F5F7 0%, #F5F5F7 50%, transparent 100%)'
            }}
          ></div>
          <div 
            className="absolute bottom-0 left-0 right-0 pointer-events-none rounded-b-2xl"
            style={{
              height: `${ITEM_HEIGHT * 2}px`,
              background: 'linear-gradient(to top, #F5F5F7 0%, #F5F5F7 50%, transparent 100%)'
            }}
          ></div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* iOS-style rounded picker container */}
      <div 
        className="flex items-center justify-center gap-6 rounded-3xl shadow-lg"
        style={{ 
          backgroundColor: '#F5F5F7',
          padding: '20px 32px 20px 32px'
        }}
      >
        {renderWheel(hoursRef, hourOptions, hours, currentHour, 'hours', 'Hours')}
        
        <div className="text-3xl font-normal text-gray-400" style={{ marginTop: '28px' }}>:</div>
        
        {renderWheel(minutesRef, minuteOptions, minutes, currentMinute, 'minutes', 'Minutes')}
      </div>
    </div>
  );
};

export default TimePicker;
