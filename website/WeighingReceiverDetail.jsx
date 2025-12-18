import React, { useState, useEffect } from 'react'
import { ArrowLeft, Printer, Calendar, Package, FileText, List } from 'lucide-react'

const WeighingReceiverDetail = ({ dataId, onBack }) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState('summary') // 'history' or 'summary'

  useEffect(() => {
    fetchData()
  }, [dataId])

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/weighing-receiver/${dataId}`)
      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
      } else {
        console.error('Failed to fetch data:', result.error)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return '-'
      return date.toLocaleString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    } catch (e) {
      return '-'
    }
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    
    if (!printWindow) {
      alert('Pop-up blocker mencegah pembukaan jendela print. Tolong izinkan pop-up untuk halaman ini.')
      return
    }

    const { workOrder, ingredients } = data

    // Get summary totals
    const summaryTotals = ingredients && ingredients.length > 0
      ? ingredients.reduce((acc, ingredient) => {
          const baseWeight = parseFloat(ingredient.target_mass || 0) || 0
          const scaledWeight = parseFloat(ingredient.target_mass || 0) || 0
          
          // Calculate total weight from all exp dates
          let totalWeight = 0;
          if (ingredient.exp_dates && ingredient.exp_dates.length > 0) {
            totalWeight = ingredient.exp_dates.reduce((sum, expData) => {
              const weight = typeof expData === 'object' && expData.actual_weight !== undefined
                ? parseFloat(expData.actual_weight || 0)
                : 0;
              return sum + weight;
            }, 0);
          } else {
            totalWeight = parseFloat(ingredient.current_accumulated_mass || 0) || 0;
          }
          
          acc.base += baseWeight
          acc.scaled += scaledWeight
          acc.actual += totalWeight
          return acc
        }, { base: 0, scaled: 0, actual: 0 })
      : null

    const totalResolution = summaryTotals ? summaryTotals.actual - summaryTotals.scaled : 0

    // Build table rows
    const tableRows = ingredients && ingredients.length > 0
      ? ingredients.flatMap((ingredient, idx) => {
          const scaledWeight = parseFloat(ingredient.target_mass || 0)
          const minWeight = ingredient.tolerance_min !== null && ingredient.tolerance_min !== undefined
            ? parseFloat(ingredient.tolerance_min || 0)
            : null;
          const maxWeight = ingredient.tolerance_max !== null && ingredient.tolerance_max !== undefined
            ? parseFloat(ingredient.tolerance_max || 0)
            : null;
          
          let expDatesData = [];
          if (ingredient.exp_dates && ingredient.exp_dates.length > 0) {
            expDatesData = ingredient.exp_dates;
          } else {
            const totalMass = parseFloat(ingredient.current_accumulated_mass || 0);
            expDatesData = [{
              exp_date: '-',
              actual_weight: totalMass
            }];
          }
          
          const totalWeight = expDatesData.reduce((sum, expData) => {
            const weight = typeof expData === 'object' && expData.actual_weight !== undefined
              ? parseFloat(expData.actual_weight || 0)
              : 0;
            return sum + weight;
          }, 0);
          
          const resolution = totalWeight - scaledWeight;
          
          return expDatesData.map((expData, expIdx) => {
            const expDate = typeof expData === 'string' ? expData : expData.exp_date;
            const actualWeight = typeof expData === 'object' && expData.actual_weight !== undefined
              ? parseFloat(expData.actual_weight || 0)
              : (expIdx === 0 ? parseFloat(ingredient.current_accumulated_mass || 0) : 0);
            
            return `
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${expIdx === 0 ? (ingredient.ingredient_name || '-') : ''}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">${expIdx === 0 ? (ingredient.ingredient_code || '-') : ''}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: left;">${expDate}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #6b7280;">${expIdx === 0 ? (minWeight !== null ? minWeight.toFixed(2) : '-') : ''}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${expIdx === 0 ? scaledWeight.toFixed(2) : ''}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #6b7280;">${expIdx === 0 ? (maxWeight !== null ? maxWeight.toFixed(2) : '-') : ''}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #059669; font-weight: 600;">${actualWeight > 0 ? actualWeight.toFixed(2) : ''}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #059669; font-weight: 600;">${expIdx === 0 ? totalWeight.toFixed(2) : ''}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; color: ${resolution >= 0 ? '#059669' : '#dc2626'}; font-weight: 600;">${expIdx === 0 ? (resolution >= 0 ? '+' : '') + resolution.toFixed(2) : ''}</td>
              </tr>
            `;
          });
        }).join('')
      : '<tr><td colspan="9" style="padding: 20px; text-align: center; color: #9ca3af;">Tidak ada data ingredients</td></tr>'

    const totalRow = summaryTotals ? `
      <tr style="background-color: #f9fafb; border-top: 2px solid #d1d5db;">
        <td colspan="2" style="padding: 12px; font-weight: 700; color: #1f2937;">Total</td>
        <td style="padding: 12px; text-align: left; font-weight: 700; color: #1f2937;"></td>
        <td style="padding: 12px; text-align: right; font-weight: 700; color: #1f2937;"></td>
        <td style="padding: 12px; text-align: right; font-weight: 700; color: #1f2937;">${summaryTotals.scaled.toFixed(2)}</td>
        <td style="padding: 12px; text-align: right; font-weight: 700; color: #1f2937;"></td>
        <td style="padding: 12px; text-align: right; font-weight: 700; color: #059669;">${summaryTotals.actual.toFixed(2)}</td>
        <td style="padding: 12px; text-align: right; font-weight: 700; color: #059669;">${summaryTotals.actual.toFixed(2)}</td>
        <td style="padding: 12px; text-align: right; font-weight: 700; color: ${totalResolution >= 0 ? '#059669' : '#dc2626'};">
          ${totalResolution >= 0 ? '+' : ''}${totalResolution.toFixed(2)}
        </td>
      </tr>
    ` : ''

    const printHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Report Summary Penimbangan - ${workOrder.work_order}</title>
          <style>
            @page {
              size: A4;
              margin: 15mm 10mm;
            }
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              font-size: 11pt;
              color: #1f2937;
              line-height: 1.4;
            }
            
            .print-header {
              margin-bottom: 20px;
              padding-bottom: 15px;
              border-bottom: 2px solid #1f2937;
            }
            
            .print-title {
              font-size: 18pt;
              font-weight: bold;
              color: #1f2937;
              margin-bottom: 10px;
            }
            
            .print-info {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 20px;
              margin-top: 15px;
              padding: 12px;
              background-color: #f9fafb;
              border-radius: 6px;
              border: 1px solid #e5e7eb;
            }
            
            .print-info-item {
              font-size: 10pt;
            }
            
            .print-info-label {
              font-size: 9pt;
              color: #6b7280;
              margin-bottom: 4px;
              font-weight: 500;
            }
            
            .print-info-value {
              font-size: 12pt;
              font-weight: 600;
              color: #1f2937;
            }
            
            .print-table-wrapper {
              margin-top: 20px;
              overflow: visible;
            }
            
            .print-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 10pt;
              page-break-inside: auto;
            }
            
            .print-table thead {
              background-color: #f3f4f6;
            }
            
            .print-table thead th {
              padding: 10px 8px;
              text-align: left;
              font-weight: 600;
              color: #1f2937;
              border-bottom: 2px solid #d1d5db;
              font-size: 10pt;
            }
            
            .print-table thead th:last-child,
            .print-table tbody td:last-child,
            .print-table tfoot td:last-child {
              text-align: right;
            }
            
            .print-table tbody td {
              padding: 8px;
              border-bottom: 1px solid #f3f4f6;
              color: #1f2937;
            }
            
            .print-table tbody tr:nth-child(even) {
              background-color: #fafafa;
            }
            
            .print-table tfoot td {
              padding: 12px 8px;
              font-weight: 700;
              border-top: 2px solid #d1d5db;
            }
            
            .print-footer {
              margin-top: 30px;
              padding-top: 15px;
              border-top: 1px solid #e5e7eb;
              font-size: 9pt;
              color: #9ca3af;
              text-align: center;
            }
            
            @media print {
              body {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
              }
              
              .print-table {
                page-break-inside: avoid;
              }
              
              .print-table tbody tr {
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-header">
            <div class="print-title">Report Summary Penimbangan</div>
            <div class="print-info">
              <div class="print-info-item">
                <div class="print-info-label">Nomor MO</div>
                <div class="print-info-value">${workOrder.work_order}</div>
              </div>
              <div class="print-info-item">
                <div class="print-info-label">Nama SKU</div>
                <div class="print-info-value">${workOrder.sku || '-'}</div>
              </div>
              <div class="print-info-item">
                <div class="print-info-label">QTY</div>
                <div class="print-info-value">${parseFloat(workOrder.planned_quantity || 0).toFixed(1)} g</div>
              </div>
            </div>
            <div style="margin-top: 10px; font-size: 9pt; color: #6b7280;">
              <div><strong>Formula:</strong> ${workOrder.formulation_name || '-'}</div>
              <div style="margin-top: 4px;"><strong>Tanggal Produksi:</strong> ${formatDate(workOrder.production_date)}</div>
              ${workOrder.operator_name ? `<div style="margin-top: 4px;"><strong>Operator:</strong> ${workOrder.operator_name}</div>` : ''}
              ${workOrder.end_time ? `<div style="margin-top: 4px;"><strong>Tanggal Selesai:</strong> ${formatDate(workOrder.end_time)}</div>` : ''}
            </div>
          </div>
          
          <div class="print-table-wrapper">
            <table class="print-table">
              <thead>
                <tr>
                  <th>Nama Ingredients</th>
                  <th>Kode Ingredients</th>
                  <th>Exp Date</th>
                  <th>Min Weight (g)</th>
                  <th>Scaled Weight (g)</th>
                  <th>Max Weight (g)</th>
                  <th>Actual Weight (g)</th>
                  <th>Total Weight (g)</th>
                  <th>Resolution (g)</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
              <tfoot>
                ${totalRow}
              </tfoot>
            </table>
          </div>
          
          <div class="print-footer">
            <div>Laporan ini dicetak pada: ${new Date().toLocaleString('id-ID')}</div>
            <div style="margin-top: 4px;">Work Order: ${workOrder.work_order}</div>
          </div>
        </body>
      </html>
    `

    printWindow.document.write(printHTML)
    printWindow.document.close()
    
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print()
      }, 250)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div>Memuat data...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ color: '#ef4444' }}>Data tidak ditemukan</div>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              marginTop: '20px',
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              backgroundColor: '#fff',
              cursor: 'pointer'
            }}
          >
            Kembali
          </button>
        )}
      </div>
    )
  }

  const { workOrder, ingredients } = data

  const summaryTotals = ingredients && ingredients.length > 0
    ? ingredients.reduce((acc, ingredient) => {
        const scaledWeight = parseFloat(ingredient.target_mass || 0) || 0
        let totalWeight = 0;
        if (ingredient.exp_dates && ingredient.exp_dates.length > 0) {
          totalWeight = ingredient.exp_dates.reduce((sum, expData) => {
            const weight = typeof expData === 'object' && expData.actual_weight !== undefined
              ? parseFloat(expData.actual_weight || 0)
              : 0;
            return sum + weight;
          }, 0);
        } else {
          totalWeight = parseFloat(ingredient.current_accumulated_mass || 0) || 0;
        }
        acc.scaled += scaledWeight
        acc.actual += totalWeight
        return acc
      }, { scaled: 0, actual: 0 })
    : null

  const totalResolution = summaryTotals ? summaryTotals.actual - summaryTotals.scaled : 0

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: '2px solid #e5e7eb'
      }}>
        <button 
          onClick={onBack}
          style={{ 
            padding: '8px 16px',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            backgroundColor: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px'
          }}
        >
          <ArrowLeft size={16} />
          Kembali
        </button>
        <button 
          onClick={handlePrint}
          style={{ 
            padding: '8px 16px',
            borderRadius: '6px',
            border: '1px solid #3b82f6',
            backgroundColor: '#3b82f6',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px'
          }}
        >
          <Printer size={16} />
          Print
        </button>
      </div>

      {/* Work Order Header */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}>
              {workOrder.work_order}
            </h1>
            <div style={{ fontSize: '18px', color: '#6b7280', marginBottom: '4px' }}>
              {workOrder.formulation_name}
            </div>
            <div style={{ fontSize: '14px', color: '#9ca3af' }}>
              SKU: {workOrder.sku}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ 
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: workOrder.status === 'completed' ? '#10b981' : 
                              workOrder.status === 'reject' ? '#c0392b' :
                              workOrder.status === 'in_progress' ? '#f59e0b' : '#95a5a6',
              color: '#fff',
              fontSize: '12px',
              fontWeight: '600',
              display: 'inline-block'
            }}>
              {workOrder.status === 'completed' ? 'Selesai' : 
               workOrder.status === 'reject' ? 'Ditolak' :
               workOrder.status === 'in_progress' ? 'Sedang Berjalan' : 'Pending'}
            </div>
          </div>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '16px',
          marginTop: '16px',
          paddingTop: '16px',
          borderTop: '1px solid #e5e7eb'
        }}>
          <div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Tanggal Produksi</div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={14} />
              {formatDate(workOrder.production_date)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Planned Quantity</div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
              {parseFloat(workOrder.planned_quantity || 0).toFixed(1)} g
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Operator</div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
              {workOrder.operator_name || 'Unknown'}
            </div>
          </div>
          {workOrder.end_time && (
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Tanggal Selesai</div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
                {formatDate(workOrder.end_time)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        borderBottom: '2px solid #e5e7eb',
        paddingBottom: '0'
      }}>
        <button
          onClick={() => setActiveView('summary')}
          style={{
            padding: '12px 24px',
            border: 'none',
            borderBottom: activeView === 'summary' ? '3px solid #3b82f6' : '3px solid transparent',
            backgroundColor: '#ffffff',
            color: activeView === 'summary' ? '#3b82f6' : '#6b7280',
            fontWeight: activeView === 'summary' ? '600' : '400',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          <FileText size={18} />
          Report Summary
        </button>
      </div>

      {/* Report Summary View */}
      {activeView === 'summary' && (
        <div style={{ 
          marginBottom: '24px',
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', marginBottom: '16px' }}>
            Report Summary Penimbangan
          </h2>
          
          <div style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            overflowX: 'auto'
          }}>
            {/* Table Header with MO, SKU, QTY */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '16px',
              padding: '16px',
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
              marginBottom: '24px',
              border: '1px solid #e5e7eb'
            }}>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', fontWeight: '500' }}>Nomor MO</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
                  {workOrder.work_order}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', fontWeight: '500' }}>Nama SKU</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
                  {workOrder.sku || '-'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', fontWeight: '500' }}>QTY</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
                  {parseFloat(workOrder.planned_quantity || 0).toFixed(1)} g
                </div>
              </div>
            </div>

            {/* Ingredients Table */}
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '14px'
            }}>
              <thead>
                <tr style={{
                  backgroundColor: '#f3f4f6',
                  borderBottom: '2px solid #e5e7eb'
                }}>
                  <th style={{
                    padding: '12px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#1f2937',
                    borderBottom: '2px solid #d1d5db'
                  }}>Nama Ingredients</th>
                  <th style={{
                    padding: '12px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#1f2937',
                    borderBottom: '2px solid #d1d5db'
                  }}>Kode Ingredients</th>
                  <th style={{
                    padding: '12px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#1f2937',
                    borderBottom: '2px solid #d1d5db'
                  }}>Exp Date</th>
                  <th style={{
                    padding: '12px',
                    textAlign: 'right',
                    fontWeight: '600',
                    color: '#1f2937',
                    borderBottom: '2px solid #d1d5db'
                  }}>Min Weight (g)</th>
                  <th style={{
                    padding: '12px',
                    textAlign: 'right',
                    fontWeight: '600',
                    color: '#1f2937',
                    borderBottom: '2px solid #d1d5db'
                  }}>Scaled Weight (g)</th>
                  <th style={{
                    padding: '12px',
                    textAlign: 'right',
                    fontWeight: '600',
                    color: '#1f2937',
                    borderBottom: '2px solid #d1d5db'
                  }}>Max Weight (g)</th>
                  <th style={{
                    padding: '12px',
                    textAlign: 'right',
                    fontWeight: '600',
                    color: '#1f2937',
                    borderBottom: '2px solid #d1d5db'
                  }}>Actual Weight (g)</th>
                  <th style={{
                    padding: '12px',
                    textAlign: 'right',
                    fontWeight: '600',
                    color: '#1f2937',
                    borderBottom: '2px solid #d1d5db'
                  }}>Total Weight (g)</th>
                  <th style={{
                    padding: '12px',
                    textAlign: 'right',
                    fontWeight: '600',
                    color: '#1f2937',
                    borderBottom: '2px solid #d1d5db'
                  }}>Resolution (g)</th>
                </tr>
              </thead>
              <tbody>
                {ingredients && ingredients.length > 0 ? (
                  ingredients.flatMap((ingredient, idx) => {
                    const scaledWeight = parseFloat(ingredient.target_mass || 0)
                    const minWeight = ingredient.tolerance_min !== null && ingredient.tolerance_min !== undefined
                      ? parseFloat(ingredient.tolerance_min || 0)
                      : null;
                    const maxWeight = ingredient.tolerance_max !== null && ingredient.tolerance_max !== undefined
                      ? parseFloat(ingredient.tolerance_max || 0)
                      : null;
                    
                    let expDatesData = [];
                    if (ingredient.exp_dates && ingredient.exp_dates.length > 0) {
                      expDatesData = ingredient.exp_dates;
                    } else {
                      const totalMass = parseFloat(ingredient.current_accumulated_mass || 0);
                      expDatesData = [{
                        exp_date: '-',
                        actual_weight: totalMass
                      }];
                    }
                    
                    const totalWeight = expDatesData.reduce((sum, expData) => {
                      const weight = typeof expData === 'object' && expData.actual_weight !== undefined
                        ? parseFloat(expData.actual_weight || 0)
                        : 0;
                      return sum + weight;
                    }, 0);
                    
                    const resolution = totalWeight - scaledWeight;
                    
                    return expDatesData.map((expData, expIdx) => {
                      const expDate = typeof expData === 'string' ? expData : expData.exp_date;
                      const actualWeight = typeof expData === 'object' && expData.actual_weight !== undefined
                        ? parseFloat(expData.actual_weight || 0)
                        : (expIdx === 0 ? parseFloat(ingredient.current_accumulated_mass || 0) : 0);
                      
                      return (
                        <tr 
                          key={`${ingredient.ingredient_id || idx}-${expIdx}`}
                          style={{
                            borderBottom: '1px solid #f3f4f6',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f9fafb'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent'
                          }}
                        >
                          <td style={{ padding: '12px', color: '#1f2937' }}>
                            {expIdx === 0 ? (ingredient.ingredient_name || '-') : ''}
                          </td>
                          <td style={{ padding: '12px', color: '#6b7280' }}>
                            {expIdx === 0 ? (ingredient.ingredient_code || '-') : ''}
                          </td>
                          <td style={{ 
                            padding: '12px', 
                            textAlign: 'left',
                            color: '#1f2937',
                            fontSize: '13px'
                          }}>
                            {expDate}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', color: '#6b7280' }}>
                            {expIdx === 0 ? (minWeight !== null ? minWeight.toFixed(2) : '-') : ''}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', color: '#1f2937' }}>
                            {expIdx === 0 ? scaledWeight.toFixed(2) : ''}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', color: '#6b7280' }}>
                            {expIdx === 0 ? (maxWeight !== null ? maxWeight.toFixed(2) : '-') : ''}
                          </td>
                          <td style={{ 
                            padding: '12px', 
                            textAlign: 'right', 
                            color: '#059669',
                            fontWeight: '600'
                          }}>
                            {actualWeight > 0 ? actualWeight.toFixed(2) : ''}
                          </td>
                          <td style={{ 
                            padding: '12px', 
                            textAlign: 'right', 
                            color: '#059669',
                            fontWeight: '600'
                          }}>
                            {expIdx === 0 ? totalWeight.toFixed(2) : ''}
                          </td>
                          <td style={{ 
                            padding: '12px', 
                            textAlign: 'right',
                            color: resolution >= 0 ? '#059669' : '#dc2626',
                            fontWeight: '600'
                          }}>
                            {expIdx === 0 ? (resolution >= 0 ? '+' : '') + resolution.toFixed(2) : ''}
                          </td>
                        </tr>
                      );
                    });
                  })
                ) : (
                  <tr>
                    <td colSpan="9" style={{
                      padding: '32px',
                      textAlign: 'center',
                      color: '#9ca3af',
                      fontSize: '14px',
                      fontStyle: 'italic'
                    }}>
                      Tidak ada data ingredients
                    </td>
                  </tr>
                )}
                {summaryTotals && (
                  <tr style={{ backgroundColor: '#f9fafb', borderTop: '2px solid #d1d5db' }}>
                    <td colSpan="2" style={{ padding: '14px', fontWeight: '700', color: '#1f2937' }}>Total</td>
                    <td style={{ padding: '14px', textAlign: 'left', fontWeight: '700', color: '#1f2937' }}></td>
                    <td style={{ padding: '14px', textAlign: 'right', fontWeight: '700', color: '#1f2937' }}></td>
                    <td style={{ padding: '14px', textAlign: 'right', fontWeight: '700', color: '#1f2937' }}>
                      {summaryTotals.scaled.toFixed(2)}
                    </td>
                    <td style={{ padding: '14px', textAlign: 'right', fontWeight: '700', color: '#1f2937' }}></td>
                    <td style={{ padding: '14px', textAlign: 'right', fontWeight: '700', color: '#059669' }}>
                      {summaryTotals.actual.toFixed(2)}
                    </td>
                    <td style={{ padding: '14px', textAlign: 'right', fontWeight: '700', color: '#059669' }}>
                      {summaryTotals.actual.toFixed(2)}
                    </td>
                    <td style={{ padding: '14px', textAlign: 'right', fontWeight: '700', color: totalResolution >= 0 ? '#059669' : '#dc2626' }}>
                      {totalResolution >= 0 ? '+' : ''}{totalResolution.toFixed(2)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default WeighingReceiverDetail
