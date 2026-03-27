"use client";

import React from 'react';
import { FaGithub, FaLinkedin, FaInstagram, FaEnvelope } from 'react-icons/fa';
import { resumeData } from '@/data/resumeData';

export const SocialLinks: React.FC = () => {
  const socials = [
    { icon: <FaGithub size={20} />, href: resumeData.socials.github, label: 'GitHub' },
    { icon: <FaLinkedin size={20} />, href: resumeData.socials.linkedin, label: 'LinkedIn' },
    { icon: <FaInstagram size={20} />, href: resumeData.socials.instagram, label: 'Instagram' },
    { icon: <FaEnvelope size={20} />, href: `mailto:${resumeData.email}`, label: 'Email' },
  ];

  return (
    <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '32px' }}>
      {socials.map((social) => (
        <a
          key={social.label}
          href={social.href}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            border: '1px solid var(--border)',
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            background: 'white',
            color: 'var(--foreground)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.borderColor = 'var(--foreground)';
            e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.boxShadow = 'none';
          }}
          aria-label={social.label}
        >
          {social.icon}
        </a>
      ))}
    </div>
  );
};

