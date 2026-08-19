import React from 'react';
import Barcode from 'react-barcode';

export default function LabelCard({ labelData }) {
    return (
        <div className="label-card">
            <style>
                {`
                    .label-card {
                        width: 100mm;
                        height: 60mm;
                        background: white;
                        box-sizing: border-box;
                        display: flex;
                        flex-direction: column;
                        padding: 18px;
                        overflow: hidden;
                        border: 1px solid #e2e8f0;
                        border-radius: 12px;
                        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                        position: relative;
                        font-family: 'Inter', system-ui, -apple-system, sans-serif;
                    }

                    @media print {
                        .label-card {
                            border: none !important;
                            border-radius: 0 !important;
                            box-shadow: none !important;
                            margin: 0 !important;
                            page-break-after: always;
                            width: 100mm !important;
                            height: 60mm !important;
                            transform: scale(0.98);
                        }
                    }
                    
                    .label-top-row {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        width: 100%;
                    }

                    .label-badge {
                        background: #2563eb;
                        color: white;
                        padding: 3px 10px;
                        border-radius: 999px;
                        font-size: 9px;
                        font-weight: 800;
                        letter-spacing: 0.5px;
                        text-transform: uppercase;
                    }

                    .label-store-brand {
                        text-align: right;
                        line-height: 1.1;
                    }

                    .label-store-brand-top {
                        font-size: 10px;
                        font-weight: 900;
                        color: #0f172a;
                        letter-spacing: 0.5px;
                    }

                    .label-store-brand-bottom {
                        font-size: 8px;
                        font-weight: 800;
                        color: #2563eb;
                        letter-spacing: 1px;
                    }

                    .label-title {
                        font-size: 22px;
                        font-weight: 800;
                        color: #0f172a;
                        margin-top: 10px;
                        margin-bottom: 2px;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        letter-spacing: -0.5px;
                    }

                    .label-specs {
                        font-size: 11px;
                        color: #64748b;
                        font-weight: 600;
                    }

                    .label-divider {
                        height: 1px;
                        background: #e2e8f0;
                        width: 100%;
                        margin: 12px 0;
                    }

                    .label-bottom-row {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-end;
                        width: 100%;
                        flex: 1;
                    }

                    .label-barcode-section {
                        display: flex;
                        flex-direction: column;
                        max-width: 60%;
                    }

                    .label-barcode-section svg {
                        max-width: 100%;
                        height: auto;
                    }

                    .label-barcode-label {
                        font-size: 8px;
                        font-weight: 800;
                        color: #2563eb;
                        letter-spacing: 0.5px;
                        margin-bottom: 6px;
                    }

                    .label-price-box {
                        background: #0f172a;
                        border-radius: 8px;
                        padding: 8px 12px;
                        color: white;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        min-width: 35%;
                    }

                    .label-price-label {
                        font-size: 7px;
                        font-weight: 800;
                        color: #93c5fd;
                        letter-spacing: 0.5px;
                        margin-bottom: 3px;
                    }

                    .label-price-value {
                        font-size: 14px;
                        font-weight: 800;
                        display: flex;
                        align-items: baseline;
                        gap: 4px;
                    }

                    .label-currency {
                        border-bottom: 2px solid #2563eb;
                        padding-bottom: 1px;
                    }
                `}
            </style>

            <div className="label-top-row">
                <div className="label-badge">
                    {labelData.condition === 'Brand New' ? 'BRAND NEW' : 
                     labelData.condition === 'Refurbished' ? 'REFURBISHED' : 'PREMIUM USED'}
                </div>
                <div className="label-store-brand">
                    <div className="label-store-brand-top">SMARTPOS</div>
                    <div className="label-store-brand-bottom">KAMPALA</div>
                </div>
            </div>

            <div className="label-title">{labelData.title}</div>
            <div className="label-specs">{labelData.subtitle} {labelData.condition !== 'Brand New' && labelData.condition !== 'Refurbished' ? `• ${labelData.condition}` : ''}</div>

            <div className="label-divider"></div>

            <div className="label-bottom-row">
                <div className="label-barcode-section">
                    <div className="label-barcode-label">{labelData.barcode.startsWith('PROD-') ? 'SKU' : 'IMEI'}</div>
                    <div style={{ marginLeft: '-10px', maxWidth: '100%' }}>
                        <Barcode 
                            value={labelData.barcode} 
                            width={1.2} 
                            height={32} 
                            fontSize={11}
                            fontOptions="bold"
                            font="Inter"
                            marginTop={0}
                            marginBottom={6}
                            marginLeft={0}
                            marginRight={0}
                            displayValue={true} 
                            background="transparent"
                        />
                    </div>
                </div>
                <div className="label-price-box">
                    <div className="label-price-label">ASKING PRICE</div>
                    <div className="label-price-value">
                        <span className="label-currency">UGX</span>
                        <span>{Number(labelData.price).toLocaleString()}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
