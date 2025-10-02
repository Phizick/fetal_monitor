import React from 'react';
import styles from './AnimatedLogo.module.scss';

const AnimatedLogo: React.FC = () => {
  const letters = ['И', 'т', 'э', 'л', 'м', 'а'];

  return (
    <div className={styles.container}>
      <div className={styles.logo}>
        {letters.map((letter, index) => (
          <span
            key={index}
            className={styles.letter}
            style={{
              animationDelay: `${index * 0.1}s`,
            }}
          >
            {letter}
          </span>
        ))}
      </div>
    </div>
  );
};

export default AnimatedLogo;
