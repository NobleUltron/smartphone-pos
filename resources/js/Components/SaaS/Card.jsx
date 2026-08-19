import React from 'react';

export default function Card({ children, className = '', noPadding = false, ...props }) {
    return (
        <div 
            className={`saas-card ${noPadding ? 'p-0 overflow-hidden' : ''} ${className}`}
            {...props}
        >
            {children}
        </div>
    );
}
