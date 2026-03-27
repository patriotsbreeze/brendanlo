'use client';

import React from 'react';
import styles from './Marquee.module.css';

interface SkillItem {
  name: string;
  color: string;
}

interface MarqueeProps {
  items: SkillItem[];
  direction?: 'left' | 'right';
  title?: string;
}

export const Marquee: React.FC<MarqueeProps> = ({ items, direction = 'left', title }) => {
  // Triple the items to ensure seamless loop
  const displayItems = [...items, ...items, ...items];

  // Helper to get Simple Icons slug from name
  const getSlug = (name: string) => {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/\.js/g, 'dotjs').replace(/\+/g, 'plus');
  };

  return (
    <div className={styles.marqueeSection}>
      {title && <span className={styles.marqueeTitle}>{title}</span>}
      <div className={styles.marqueeContainer}>
        <div className={`${styles.marqueeInner} ${direction === 'right' ? styles.reverse : ''}`}>
          {displayItems.map((item, idx) => {
            const slug = getSlug(item.name);
            return (
              <div key={`${item.name}-${idx}`} className={styles.marqueeItem}>
                <div 
                  className={styles.iconWrapper} 
                  style={{ backgroundColor: `${item.color}15`, color: item.color }}
                >
                  <img 
                    src={`https://cdn.simpleicons.org/${slug}/${item.color.replace('#', '')}`}
                    alt={item.name}
                    className={styles.icon}
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                </div>
                <span className={styles.itemText} style={{ color: item.color }}>{item.name}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
