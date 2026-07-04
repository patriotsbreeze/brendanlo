"use client";

import React, { useRef } from 'react';
import { FaGithub, FaLinkedin, FaInstagram, FaEnvelope } from 'react-icons/fa';
import { resumeData } from '@/data/resumeData';

const MagneticSocial: React.FC<{
  href: string;
  label: string;
  children: React.ReactNode;
}> = ({ href, label, children }) => {
  const ref = useRef<HTMLAnchorElement>(null);

  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2);
    const y = e.clientY - (r.top + r.height / 2);
    el.style.transform = `translate(${x * 0.35}px, ${y * 0.35}px) scale(1.12)`;
    el.style.borderColor = 'var(--foreground)';
    el.style.boxShadow = '0 12px 24px rgba(0,0,0,0.08)';
  };

  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = 'translate(0,0) scale(1)';
    el.style.borderColor = 'var(--border)';
    el.style.boxShadow = 'none';
  };

  return (
    <a
      ref={ref}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        border: '1px solid var(--border)',
        transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.25s ease, box-shadow 0.25s ease',
        background: 'rgba(255,255,255,0.8)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        color: 'var(--foreground)',
      }}
    >
      {children}
    </a>
  );
};

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
        <MagneticSocial key={social.label} href={social.href} label={social.label}>
          {social.icon}
        </MagneticSocial>
      ))}
    </div>
  );
};
