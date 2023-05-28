import React from 'react';

import './Timer.css';

const styles = {
  red: {
    color: `#E84B4B`,
  },
  yellow: {
    color: `rgba(238, 229, 15, 0.77)`,
  },
  body: {
    height: '72px',
  },
};

const Timer = ({ time, timeRange, timeIsUp }) => {
  return (
    <div style={styles.body}>
      {timeRange === 0 ? (
        <p>No limits Sets</p>
      ) : (
        <h1 style={timeIsUp ? styles.red : styles.yellow}>
          {time}m/{timeRange}m
        </h1>
      )}

      {timeIsUp && <p>Maximun daily time limit reached</p>}
    </div>
  );
};

export default Timer;
