import React from 'react';
import Card from './Card';

export default function DataTable({ headers, children, emptyState = null, isEmpty = false }) {
    return (
        <div className="saas-table-container">
            {isEmpty ? (
                emptyState ? emptyState : (
                    <div className="p-8 text-center" style={{ color: 'var(--text-secondary)' }}>
                        No data available
                    </div>
                )
            ) : (
                <div className="overflow-x-auto">
                    <table className="saas-table w-full whitespace-nowrap">
                        <thead>
                            <tr>
                                {headers.map((header, index) => (
                                    <th key={index} className={typeof header === 'object' ? header.className : ''}>
                                        {typeof header === 'object' ? header.label : header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {children}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
