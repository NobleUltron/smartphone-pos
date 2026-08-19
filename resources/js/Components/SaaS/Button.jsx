import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Button({ 
    children, 
    variant = 'primary', 
    isLoading = false, 
    disabled = false, 
    className = '', 
    icon: Icon = null,
    ...props 
}) {
    const baseClass = 'saas-btn';
    let variantClass = '';

    switch (variant) {
        case 'primary':
            variantClass = 'saas-btn-primary';
            break;
        case 'success':
        case 'emerald':
            variantClass = 'saas-btn-success';
            break;
        case 'secondary':
        case 'outline':
            variantClass = 'saas-btn-secondary';
            break;
        case 'light':
            variantClass = 'saas-btn-light';
            break;
        case 'danger':
            variantClass = 'saas-btn-danger';
            break;
        case 'glass':
            variantClass = 'saas-btn-glass';
            break;
        default:
            variantClass = 'saas-btn-primary';
    }

    return (
        <button 
            className={`${baseClass} ${variantClass} ${className}`}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading ? (
                <Loader2 size={16} className="spin-anim" />
            ) : Icon ? (
                <Icon size={16} />
            ) : null}
            {children}
        </button>
    );
}
