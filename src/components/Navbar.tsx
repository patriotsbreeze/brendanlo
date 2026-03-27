"use client";

import React, { useState, useEffect } from 'react';
import { resumeData } from '@/data/resumeData';

export const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      style={{
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        height: '54px',
        borderRadius: '100px',
        background: isScrolled ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.4)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(0, 0, 0, 0.08)',
        boxShadow: isScrolled ? '0 10px 30px rgba(0, 0, 0, 0.05)' : 'none',
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        width: 'max-content',
        minWidth: '320px',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', gap: '24px' }}>
        <a href="#about" style={{ fontSize: '0.9rem', fontWeight: 500, opacity: 0.8 }}>About</a>
        <a href="#projects" style={{ fontSize: '0.9rem', fontWeight: 500, opacity: 0.8 }}>Projects</a>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <a 
          href={`mailto:${resumeData.email}`} 
          style={{ fontSize: '0.85rem', color: 'var(--foreground-muted)', fontWeight: 400 }}
        >
          {resumeData.email}
        </a>
        <a 
          href={resumeData.socials.github}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            background: 'var(--foreground)',
            color: 'white',
            padding: '6px 14px',
            borderRadius: '100px',
            fontSize: '0.85rem',
            fontWeight: 600,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.filter = 'brightness(1.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.filter = 'none';
          }}
        >
          GitHub
        </a>
      </div>
    </nav>
  );
};
