import React from 'react';

export default function Badge({ children, variant = 'neutral', className = '' }) {
    let variantClass = 'saas-badge-neutral';
    
    switch (variant) {
        case 'success': variantClass = 'saas-badge-success'; break;
        case 'warning': variantClass = 'saas-badge-warning'; break;
        case 'danger': variantClass = 'saas-badge-danger'; break;
        case 'info': variantClass = 'saas-badge-info'; break;
        default: variantClass = 'saas-badge-neutral';
    }

    return (
        <span className={`saas-badge ${variantClass} ${className}`}>
            {children}
        </span>
    );
}
