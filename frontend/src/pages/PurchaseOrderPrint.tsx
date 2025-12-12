import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../utils/api'
import { Spin, message, Button } from 'antd'
import { PrinterOutlined } from '@ant-design/icons'

const PurchaseOrderPrint = () => {
    const { id } = useParams<{ id: string }>()
    const [po, setPo] = useState<any>(null)
    const [company, setCompany] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchPO()
    }, [id])

    useEffect(() => {
        if (po && !loading) {
            // Auto print when data is ready
            setTimeout(() => {
                window.print()
            }, 500)
        }
    }, [po, loading])

    const fetchPO = async () => {
        try {
            const response = await api.get(`/purchase-orders/${id}`)
            const poData = response.data
            setPo(poData)

            if (poData.locationId) {
                // Fetch location to get company info
                try {
                    const locResponse = await api.get(`/locations/${poData.locationId}`)
                    const location = locResponse.data

                    if (location.company) {
                        // Check if company is populated or just an ID
                        if (typeof location.company === 'object') {
                            setCompany(location.company)
                        } else {
                            const compResponse = await api.get(`/companies/${location.company}`)
                            setCompany(compResponse.data)
                        }
                    }
                } catch (err) {
                    console.error('Failed to fetch location/company info', err)
                }
            }
        } catch (error) {
            message.error('주문 정보를 불러오는데 실패했습니다.')
        } finally {
            setLoading(false)
        }
    }

    const handlePrint = () => {
        window.print()
    }

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}><Spin size="large" /></div>
    if (!po) return <div>주문을 찾을 수 없습니다.</div>

    // Calculate totals
    const subtotal = po.items.reduce((sum: number, item: any) => sum + (item.total || 0), 0)
    const tax = po.tax || 0
    const shipping = po.shippingCost || 0
    const discount = po.discount || 0
    const grandTotal = subtotal + tax + shipping - discount

    return (
        <div className="print-page">
            <style>
                {`
          @media print {
            body { 
              background-color: white; 
              -webkit-print-color-adjust: exact; 
              margin: 0;
            }
            .no-print { display: none !important; }
            .print-page { 
              padding: 0 !important; 
              margin: 0 !important; 
              width: 100% !important; 
              box-shadow: none !important;
              min-height: auto !important; /* Critical fix */
              height: auto !important;
            }
            @page { 
              size: A4; 
              margin: 10mm; 
            }
          }
          
          .print-page {
            width: 100%;
            max-width: none;
            /* min-height: 297mm;  <-- Removed to prevent forcing 2nd page */
            margin: 0 auto;
            padding: 15mm;
            background: white;
            box-shadow: none;
            font-family: 'Times New Roman', serif;
            color: #333;
            box-sizing: border-box;
          }

          .header {
            display: flex;
            justify-content: space-between;
            border-bottom: 2px solid #333;
            padding-bottom: 10px; /* Condensed */
            margin-bottom: 20px; /* Condensed */
          }
          
          .company-branding h1 {
            font-size: 24px; /* Slightly smaller */
            margin: 0;
            color: #1a1a1a;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          
          .company-branding p {
            margin: 3px 0 0; /* Tighter */
            font-size: 11px; /* Smaller */
            color: #555;
          }

          .po-details {
            text-align: right;
          }
          
          .po-details h2 {
            font-size: 20px; /* Smaller */
            margin: 0 0 5px;
            color: #1890ff;
          }
          
          .po-meta table {
            float: right;
            border-collapse: collapse;
          }
          
          .po-meta td {
            padding: 3px 6px; /* Tighter */
            border: 1px solid #ddd;
            font-size: 11px; /* Smaller */
          }
          
          .po-meta td.label {
            background: #f9f9f9;
            font-weight: bold;
          }

          .addresses {
            display: flex;
            justify-content: space-between;
            margin-bottom: 25px; /* Condensed */
            gap: 20px;
          }
          
          .address-box {
            flex: 1;
            border: 1px solid #ddd;
            padding: 10px; /* Condensed */
            border-radius: 4px;
          }
          
          .address-box h3 {
            margin: 0 0 8px;
            font-size: 13px; /* Smaller */
            background: #f5f5f5;
            padding: 4px 8px;
            border-bottom: 1px solid #ddd;
            text-transform: uppercase;
          }
          
          .address-content p {
            margin: 2px 0; /* Tighter */
            font-size: 11px; /* Smaller */
          }

          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px; /* Condensed */
          }
          
          .items-table th {
            background: #f0f0f0;
            border: 1px solid #333;
            padding: 6px; /* Tighter */
            text-align: left;
            font-weight: bold;
            font-size: 11px; /* Smaller */
          }
          
          .items-table td {
            border: 1px solid #ddd;
            padding: 6px; /* Tighter */
            font-size: 11px; /* Smaller */
            vertical-align: top;
          }
          
          .text-right { text-align: right; }
          .text-center { text-align: center; }

          .totals-section {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 30px; /* Condensed */
          }
          
          .totals-table {
            width: 250px; /* Slightly narrower */
            border-collapse: collapse;
          }
          
          .totals-table td {
            padding: 5px; /* Tighter */
            border-bottom: 1px solid #eee;
            font-size: 11px; /* Smaller */
          }
          
          .totals-table tr.grand-total td {
            border-top: 2px solid #333;
            border-bottom: 2px solid #333;
            font-weight: bold;
            font-size: 14px; /* Smaller */
            padding: 10px 5px;
          }

          .footer {
            margin-top: auto;
            border-top: 1px solid #ddd;
            padding-top: 15px; /* Condensed */
          }
          
          .signatures {
            display: flex;
            justify-content: space-between;
            margin-top: 40px; /* Condensed */
          }
          
          .signature-box {
            width: 40%;
            border-top: 1px solid #333;
            text-align: center;
            padding-top: 8px;
            font-size: 11px; /* Smaller */
          }
          
          .terms {
            margin-top: 20px;
            font-size: 10px; /* Smaller */
            color: #666;
            text-align: center;
          }
        `}
            </style>

            <div className="no-print" style={{ position: 'fixed', top: 20, right: 20, zIndex: 1000 }}>
                <Button type="primary" size="large" icon={<PrinterOutlined />} onClick={handlePrint}>
                    Print / Save as PDF
                </Button>
            </div>

            <div className="header">
                <div className="company-branding">
                    <h1>{company?.name || 'MY COMPANY'}</h1>
                    <p>{company ? (
                        <>
                            {company.address && <span>{company.address}</span>}
                            {company.city && <span>, {company.city}</span>}
                            {company.state && <span>, {company.state}</span>}
                            {company.zipCode && <span> {company.zipCode}</span>}
                        </>
                    ) : 'Company Address'}</p>
                    <p>
                        {company?.phone && <span>Phone: {company.phone}</span>}
                        {company?.phone && company?.email && <span> | </span>}
                        {company?.email && <span>Email: {company.email}</span>}
                    </p>
                </div>
                <div className="po-details">
                    <h2>PURCHASE ORDER</h2>
                    <div className="po-meta">
                        <table>
                            <tbody>
                                <tr>
                                    <td className="label">PO #</td>
                                    <td>{po.poNumber}</td>
                                </tr>
                                <tr>
                                    <td className="label">Date</td>
                                    <td>{new Date(po.orderDate).toLocaleDateString()}</td>
                                </tr>
                                {po.paymentTerms && (
                                    <tr>
                                        <td className="label">Terms</td>
                                        <td>{po.paymentTerms}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="addresses">
                <div className="address-box">
                    <h3>Vendor</h3>
                    <div className="address-content">
                        <p style={{ fontWeight: 'bold' }}>{po.supplier?.name}</p>
                        <p>{po.supplier?.address || 'Address not listed'}</p>
                        <p>{po.supplier?.city} {po.supplier?.state} {po.supplier?.zipCode}</p>
                        {(po.supplier?.email || po.supplier?.phone) && (
                            <p style={{ marginTop: 8 }}>
                                {po.supplier?.email && <span>{po.supplier.email}<br /></span>}
                                {po.supplier?.phone && <span>{po.supplier.phone}</span>}
                            </p>
                        )}
                    </div>
                </div>
                <div className="address-box">
                    <h3>Ship To</h3>
                    <div className="address-content">
                        {po.shippingAddress ? (
                            <>
                                <p style={{ fontWeight: 'bold' }}>{po.shippingAddress.name || po.locationData?.name}</p>
                                <p>{po.shippingAddress.street}</p>
                                <p>{po.shippingAddress.city}, {po.shippingAddress.state} {po.shippingAddress.zipCode}</p>
                                <p>{po.shippingAddress.country}</p>
                            </>
                        ) : (
                            <>
                                <p style={{ fontWeight: 'bold' }}>{po.locationData?.name || 'Main Warehouse'}</p>
                                <p>{po.locationData?.code}</p>
                                <p>Please deliver to receiving dock.</p>
                            </>
                        )}
                        <p style={{ marginTop: 8, fontStyle: 'italic' }}>
                            Attn: {po.purchaseRequestData?.requestedByUser?.username || 'Receiving Dept'}
                        </p>
                    </div>
                </div>
            </div>

            <table className="items-table">
                <thead>
                    <tr>
                        <th style={{ width: '5%' }} className="text-center">#</th>
                        <th style={{ width: '45%' }}>Item & Description</th>
                        <th style={{ width: '15%' }} className="text-right">Qty</th>
                        <th style={{ width: '15%' }} className="text-right">Unit Price</th>
                        <th style={{ width: '20%' }} className="text-right">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {po.items.map((item: any, index: number) => (
                        <tr key={index}>
                            <td className="text-center">{index + 1}</td>
                            <td>
                                <div style={{ fontWeight: 'bold' }}>{item.product?.name || item.description}</div>
                                {item.spec && <div style={{ fontSize: '12px', color: '#666' }}>{item.spec}</div>}
                            </td>
                            <td className="text-right">{item.quantity}</td>
                            <td className="text-right">${item.unitPrice?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td className="text-right">${item.total?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="totals-section">
                <table className="totals-table">
                    <tbody>
                        <tr>
                            <td>Subtotal</td>
                            <td className="text-right">${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
                        {tax > 0 && (
                            <tr>
                                <td>Tax</td>
                                <td className="text-right">${tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            </tr>
                        )}
                        {shipping > 0 && (
                            <tr>
                                <td>Shipping</td>
                                <td className="text-right">${shipping.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            </tr>
                        )}
                        {discount > 0 && (
                            <tr>
                                <td>Discount</td>
                                <td className="text-right">-${discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            </tr>
                        )}
                        <tr className="grand-total">
                            <td>TOTAL</td>
                            <td className="text-right">${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="footer">
                {po.notes && (
                    <div style={{ marginBottom: 40, background: '#f9f9f9', padding: 15, borderRadius: 4 }}>
                        <strong>Notes / Special Instructions:</strong>
                        <p style={{ margin: '5px 0 0', whiteSpace: 'pre-wrap' }}>{po.notes}</p>
                    </div>
                )}

                <div className="signatures">
                    <div className="signature-box">
                        Authorized Signature
                    </div>
                    <div className="signature-box">
                        Date
                    </div>
                </div>

                <div className="terms">
                    <p>Please verify all items upon receipt. Notify us within 3 days regarding any discrepancies.</p>
                    <p>Thank you for your business!</p>
                </div>
            </div>
        </div>
    )
}

export default PurchaseOrderPrint
