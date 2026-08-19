import React, { useEffect } from 'react';
import { Head } from '@inertiajs/react';
import LabelCard from '@/Components/SaaS/LabelCard';

export default function PrintLabel({ labelData, qty }) {
    useEffect(() => {
        const timer = setTimeout(() => {
            window.print();
        }, 800);
        return () => clearTimeout(timer);
    }, []);

    const labels = Array.from({ length: qty });

    return (
        <>
            <Head title={`Print Label - ${labelData.title}`} />
            
            <style>
                {`
                    body {
                        background: #f1f5f9;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        padding: 20px;
                        gap: 20px;
                        margin: 0;
                    }
                `}
            </style>

            {labels.map((_, index) => (
                <LabelCard key={index} labelData={labelData} />
            ))}
        </>
    );
}
