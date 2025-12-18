import React, { useState, useEffect } from 'react'
import api from '../services/api'
import { ArrowLeft, Printer, Clock, Package, Scale, CheckCircle, AlertCircle, Calendar, FileText, List, RotateCcw, X, Send } from 'lucide-react'
import { useAlert } from '../utils/alertModal'

const HistoryDetail = ({ moNumber, onBack, currentUser }) => {
  const { alert } = useAlert()
  const navigate = (path) => {
    if (onBack) {
      onBack()
    } else {
      window.location.hash = path
    }
  }
  const [historyDetail, setHistoryDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeView, setActiveView] = useState('history') // 'history' or 'summary'
  const [showReactivateModal, setShowReactivateModal] = useState(false)
  const [reactivateNote, setReactivateNote] = useState('')
  const [isReactivating, setIsReactivating] = useState(false)
  const [printingSessions, setPrintingSessions] = useState(new Set()) // Track which sessions are being printed
  const [sendingData, setSendingData] = useState(false) // Track if data is being sent
  
  // Check if user is QC
  const isQC = currentUser && (currentUser.role === 'QC' || currentUser.role === 'qc')

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true)
        const resp = await fetch(`/api/history/${encodeURIComponent(moNumber)}`)
        const data = await resp.json()
        
        if (data.success) {
          setHistoryDetail(data.data)
        } else {
          setError(data.error || 'Failed to load history detail')
        }
      } catch (e) {
        console.error('Error fetching history detail:', e)
        setError('Failed to load history detail')
      } finally {
        setLoading(false)
      }
    }
    
    if (moNumber) {
      fetchDetail()
    }
  }, [moNumber])

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
    // Create a print window with the report summary table
    const printWindow = window.open('', '_blank')
    
    if (!printWindow) {
      alert.error('Pop-up blocker mencegah pembukaan jendela print. Tolong izinkan pop-up untuk halaman ini.', 'Print Gagal')
      return
    }

    // Get summary totals
    const summaryTotals = ingredients && ingredients.length > 0
      ? ingredients.reduce((acc, ingredient) => {
          const baseWeight = parseFloat(ingredient.target_mass || 0) || 0
          const scaledWeight = parseFloat(ingredient.target_mass || 0) || 0
          const actualWeight = parseFloat(ingredient.current_accumulated_mass || 0) || 0
          acc.base += baseWeight
          acc.scaled += scaledWeight
          acc.actual += actualWeight
          return acc
        }, { base: 0, scaled: 0, actual: 0 })
      : null

    const totalResolution = summaryTotals ? summaryTotals.actual - summaryTotals.scaled : 0

    // Build table rows - create separate row for each exp date with separate weights
    const tableRows = ingredients && ingredients.length > 0
      ? ingredients.flatMap((ingredient, idx) => {
          const scaledWeight = parseFloat(ingredient.target_mass || 0)
          const minWeight = ingredient.tolerance_min !== null && ingredient.tolerance_min !== undefined
            ? parseFloat(ingredient.tolerance_min || 0)
            : null;
          const maxWeight = ingredient.tolerance_max !== null && ingredient.tolerance_max !== undefined
            ? parseFloat(ingredient.tolerance_max || 0)
            : null;
          
          // Get exp dates with weights - if empty, use array with single '-' for one row
          let expDatesData = [];
          if (ingredient.exp_dates && ingredient.exp_dates.length > 0) {
            // exp_dates is now array of objects: {exp_date, actual_weight}
            expDatesData = ingredient.exp_dates;
          } else {
            // Fallback: use total accumulated mass
            const totalMass = parseFloat(ingredient.current_accumulated_mass || 0);
            expDatesData = [{
              exp_date: '-',
              actual_weight: totalMass
            }];
          }
          
          // Calculate total weight from all exp dates
          const totalWeight = expDatesData.reduce((sum, expData) => {
            const weight = typeof expData === 'object' && expData.actual_weight !== undefined
              ? parseFloat(expData.actual_weight || 0)
              : 0;
            return sum + weight;
          }, 0);
          
          // Calculate resolution: total weight - scaled weight
          const resolution = totalWeight - scaledWeight;
          
          // Create one row per exp date
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

    // Build total row
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

    // Create print HTML
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
    
    // Wait for content to load, then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print()
        // Close window after printing (optional)
        // printWindow.close()
      }, 250)
    }
  }

  // Get active label template from localStorage
  const getActiveLabelTemplate = () => {
    try {
      const savedConfig = localStorage.getItem('printerConfig')
      if (savedConfig) {
        const config = JSON.parse(savedConfig)
        const templates = config.labelTemplates || []
        const activeTemplateId = config.activeLabelTemplateId
        return templates.find(t => t.id === activeTemplateId) || templates[0] || null
      }
    } catch (e) {
      console.warn('Failed to load printer config:', e)
    }
    return null
  }

  // Print weighing receipt for a specific session
  const handlePrintSession = async (session, ingredient, workOrder) => {
    const sessionKey = `${ingredient.ingredient_id}-${session.session_id}`
    
    // Check if already printing
    if (printingSessions.has(sessionKey)) {
      return
    }

    try {
      setPrintingSessions(prev => new Set(prev).add(sessionKey))
      
      // Get printer config from localStorage
      const savedConfig = localStorage.getItem('printerConfig')
      let printerConfig = {
        printMethod: 'windows-raw',
        printerPort: 'Xprinter XP-420B',
        printerIP: '192.168.1.100',
        networkPort: 9100,
        comPort: 'COM1',
        baudRate: 9600
      }
      
      if (savedConfig) {
        try {
          const config = JSON.parse(savedConfig)
          printerConfig = {
            printMethod: config.printMethod || printerConfig.printMethod,
            printerPort: config.printerPort || printerConfig.printerPort,
            printerIP: config.printerIP || printerConfig.printerIP,
            networkPort: config.networkPort || printerConfig.networkPort,
            comPort: config.comPort || printerConfig.comPort,
            baudRate: config.baudRate || printerConfig.baudRate
          }
        } catch (e) {
          console.warn('Failed to parse printer config:', e)
        }
      }

      // Get active label template
      const activeTemplate = getActiveLabelTemplate()
      const labelWidth = activeTemplate?.width || 72
      const labelHeight = activeTemplate?.height || 100
      const labelDPI = activeTemplate?.dpi || 203
      const layoutConfig = activeTemplate?.layout || {}

      // Get session time (use session_completed_at if available, otherwise session_started_at)
      const sessionTime = session.session_completed_at || session.session_started_at || null
      
      // Prepare print data for this session
      const printData = {
        skuName: workOrder.formulation_name || workOrder.work_order || 'N/A',
        ingredientName: ingredient.ingredient_name || 'N/A',
        currentWeight: session.actual_mass || 0,
        sessionNumber: session.session_number || 1,
        operatorName: currentUser?.name || currentUser?.username || workOrder.operator_name || 'Operator',
        moNumber: workOrder.work_order || null,
        expDate: ingredient.exp_date || null,
        sessionTime: sessionTime // Pass session time to use in print instead of current time
      }

      // Step 1: Generate ZPL receipt data
      const receiptRequestData = {
        ...printData,
        labelWidth,
        labelHeight,
        labelDPI,
        layout: layoutConfig,
        skipPrintHistory: true // Skip saving to print_history for individual prints
      }

      alert.info('Mengirim data cetak ke printer...', 'Sedang Mencetak')

      const receiptResponse = await fetch('http://localhost:3001/api/print/weighing-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(receiptRequestData),
      })

      const receiptResult = await receiptResponse.json()

      if (!receiptResult.success) {
        throw new Error(receiptResult.error || 'Failed to generate receipt')
      }

      // Step 2: Send ZPL to printer
      const printRequestBody = {
        receiptBase64: receiptResult.receiptBase64,
        receipt: receiptResult.receipt,
        printMethod: printerConfig.printMethod,
        async: true
      }

      // Add method-specific parameters
      switch (printerConfig.printMethod) {
        case 'network-tcp':
          printRequestBody.printerIP = printerConfig.printerIP
          printRequestBody.networkPort = printerConfig.networkPort || 9100
          break
        case 'serial-com':
          printRequestBody.comPort = printerConfig.comPort
          printRequestBody.baudRate = printerConfig.baudRate || 9600
          break
        case 'windows-raw':
        default:
          printRequestBody.printerPort = printerConfig.printerPort || 'Xprinter XP-420B'
          break
      }

      const printResponse = await fetch('http://localhost:3001/api/print/send-to-xp420', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(printRequestBody),
      })

      const printResult = await printResponse.json()

      if (printResult.success) {
        alert.success('Print berhasil dikirim ke printer.', 'Print Selesai')
      } else {
        throw new Error(printResult.error || 'Failed to send print job')
      }
    } catch (error) {
      console.error('Error printing session receipt:', error)
      alert.error('Gagal mencetak receipt: ' + error.message, 'Print Gagal')
    } finally {
      setPrintingSessions(prev => {
        const newSet = new Set(prev)
        newSet.delete(sessionKey)
        return newSet
      })
    }
  }

  const handleReactivateClick = () => {
    setReactivateNote('')
    setShowReactivateModal(true)
  }

  const handleReactivateSubmit = async () => {
    if (!reactivateNote.trim()) {
      alert('Note harus diisi!')
      return
    }

    setIsReactivating(true)
    try {
      const response = await fetch(`/api/work-orders/${encodeURIComponent(moNumber)}/reactivate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          note: reactivateNote.trim(),
          qcUserId: currentUser?.id || null
        }),
      })

      const result = await response.json()

      if (result.success) {
        alert('MO berhasil diaktifkan kembali!')
        setShowReactivateModal(false)
        setReactivateNote('')
        // Refresh history detail
        const resp = await fetch(`/api/history/${encodeURIComponent(moNumber)}`)
        const data = await resp.json()
        if (data.success) {
          setHistoryDetail(data.data)
        }
      } else {
        alert('Error: ' + (result.error || 'Gagal mengaktifkan kembali MO'))
      }
    } catch (error) {
      console.error('Error reactivating MO:', error)
      alert('Error: ' + error.message)
    } finally {
      setIsReactivating(false)
    }
  }

  const handleSendData = async () => {
    if (!historyDetail || !historyDetail.workOrder) {
      alert.error('Data history tidak tersedia', 'Error')
      return
    }
    
    setSendingData(true)
    
    try {
      // Load API reporting config from localStorage
      const apiReportingConfig = localStorage.getItem('apiReportingConfig')
      if (!apiReportingConfig) {
        throw new Error('Konfigurasi API Reporting belum diatur. Silakan atur di Settings > API Reporting')
      }
      
      const config = JSON.parse(apiReportingConfig)
      if (!config.apiReportingEnabled) {
        throw new Error('API Reporting belum diaktifkan. Silakan aktifkan di Settings > API Reporting')
      }
      
      // Send data to external API via server endpoint
      const sendResponse = await fetch('/api/weighing/send-to-external', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workOrder: historyDetail.workOrder,
          apiConfig: config
        }),
      })
      
      const sendResult = await sendResponse.json()
      
      if (sendResult.success) {
        alert.success(`Data penimbangan untuk MO ${historyDetail.workOrder.work_order} berhasil dikirim ke API eksternal!\n\nURL: ${sendResult.url || 'N/A'}`, 'Berhasil Dikirim')
      } else {
        throw new Error(sendResult.error || 'Failed to send data to external API')
      }
    } catch (error) {
      console.error('Error sending data:', error)
      alert.error(`Gagal mengirim data: ${error.message}`, 'Error')
    } finally {
      setSendingData(false)
    }
  }

  if (loading) {
    return (
      <div className="history-detail-page" style={{ padding: '20px' }}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div>Loading...</div>
        </div>
      </div>
    )
  }

  if (error || !historyDetail) {
    return (
      <div className="history-detail-page" style={{ padding: '20px' }}>
        <button 
          onClick={() => navigate('/history')}
          style={{ 
            marginBottom: '20px',
            padding: '8px 16px',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            backgroundColor: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <ArrowLeft size={16} />
          Kembali
        </button>
        <div style={{ textAlign: 'center', padding: '40px', color: '#ef4444' }}>
          {error || 'History detail not found'}
        </div>
      </div>
    )
  }

  const { workOrder, ingredients } = historyDetail

  const summaryTotals = ingredients && ingredients.length > 0
    ? ingredients.reduce((acc, ingredient) => {
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
        acc.scaled += scaledWeight
        acc.actual += totalWeight
        return acc
      }, { scaled: 0, actual: 0 })
    : null

  const totalResolution = summaryTotals ? summaryTotals.actual - summaryTotals.scaled : 0

  return (
    <div className="history-detail-page" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header with Back and Print buttons */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: '2px solid #e5e7eb'
      }}>
        <button 
          onClick={() => navigate('/history')}
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
        <div style={{ display: 'flex', gap: '8px' }}>
          {/* QC Reactivate Button - Only show for cancelled MOs when user is QC */}
          {isQC && (historyDetail?.workOrder?.status === 'cancelled' || historyDetail?.workOrder?.status === 'reject') && (
            <button 
              onClick={handleReactivateClick}
              style={{ 
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid #10b981',
                backgroundColor: '#10b981',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              <RotateCcw size={16} />
              Aktifkan Kembali
            </button>
          )}
          <button 
            onClick={handleSendData}
            disabled={sendingData}
            style={{ 
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #8b5cf6',
              backgroundColor: sendingData ? '#9ca3af' : '#8b5cf6',
              color: '#fff',
              cursor: sendingData ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: '500',
              opacity: sendingData ? 0.6 : 1
            }}
            title="Kirim data penimbangan ke website"
          >
            <Send size={16} />
            {sendingData ? 'Mengirim...' : 'Kirim Data'}
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
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .history-detail-page {
            padding: 0 !important;
          }
          .print-page-break {
            page-break-after: always;
          }
        }
      `}</style>

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

        {/* Reject Reason Display */}
        {historyDetail.workOrder?.status === 'reject' && historyDetail.reject_reason && (
          <div style={{
            marginTop: '16px',
            padding: '16px',
            backgroundColor: '#fee2e2',
            border: '1px solid #fca5a5',
            borderRadius: '8px',
            borderLeft: '4px solid #dc2626'
          }}>
            <div style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#991b1b',
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={18} />
              <span>Alasan Penolakan:</span>
            </div>
            <div style={{
              fontSize: '13px',
              color: '#7f1d1d',
              lineHeight: '1.8'
            }}>
              <div><strong>Bahan:</strong> {historyDetail.reject_reason.ingredient_name || 'Unknown'} ({historyDetail.reject_reason.ingredient_code || '-'})</div>
              <div><strong>Target:</strong> {(historyDetail.reject_reason.target_mass || 0).toFixed(2)} g</div>
              <div><strong>Berat Aktual:</strong> <span style={{ color: '#dc2626', fontWeight: '600', fontSize: '14px' }}>{(historyDetail.reject_reason.actual_mass || 0).toFixed(2)} g</span></div>
              <div><strong>Batas Maksimal:</strong> {(historyDetail.reject_reason.tolerance_max || 0).toFixed(2)} g</div>
              <div style={{ 
                marginTop: '8px',
                padding: '6px 12px',
                backgroundColor: '#dc2626',
                color: '#fff',
                borderRadius: '6px',
                display: 'inline-block',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                Melebihi: +{(historyDetail.reject_reason.excess_amount || 0).toFixed(2)} g
              </div>
              {historyDetail.reject_reason.violation_count > 1 && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#991b1b' }}>
                  ({historyDetail.reject_reason.violation_count} bahan melebihi toleransi)
                </div>
              )}
            </div>
          </div>
        )}

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
          onClick={() => setActiveView('history')}
          style={{
            padding: '12px 24px',
            border: 'none',
            borderBottom: activeView === 'history' ? '3px solid #3b82f6' : '3px solid transparent',
            backgroundColor: '#ffffff',
            color: activeView === 'history' ? '#3b82f6' : '#6b7280',
            fontWeight: activeView === 'history' ? '600' : '400',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          <List size={18} />
          History Penimbangan
        </button>
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

      {/* History View */}
      {activeView === 'history' && (
      <div style={{ 
        marginBottom: '24px',
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', marginBottom: '16px' }}>
          Laporan Hasil Penimbangan
        </h2>

        {ingredients.map((ingredient, idx) => (
          <div 
            key={ingredient.ingredient_id}
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '24px',
              marginBottom: '16px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}
          >
            {/* Ingredient Header */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '20px',
              paddingBottom: '12px',
              borderBottom: '2px solid #f3f4f6'
            }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
                  {ingredient.ingredient_name}
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                  Code: {ingredient.ingredient_code}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Target</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
                  {ingredient.target_mass.toFixed(1)} g
                </div>
              </div>
            </div>

            {/* Current Status */}
            <div style={{
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Hasil Akhir</div>
                <div style={{ fontSize: '18px', fontWeight: '600', color: '#059669' }}>
                  {ingredient.current_accumulated_mass.toFixed(1)} g
                </div>
              </div>
              <div>
                <div style={{
                  padding: '4px 12px',
                  borderRadius: '6px',
                  backgroundColor: ingredient.current_status === 'completed' ? '#10b981' : 
                                  ingredient.current_status === 'weighing' ? '#f59e0b' : '#9ca3af',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  {ingredient.current_status === 'completed' ? 'Selesai' : 
                   ingredient.current_status === 'weighing' ? 'Sedang Ditimbang' : 'Pending'}
                </div>
              </div>
            </div>

            {/* Weighing Sessions */}
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937', marginBottom: '12px' }}>
                Sesi Penimbangan ({ingredient.sessions.length} sesi)
              </div>
              
              <div style={{ display: 'grid', gap: '12px' }}>
                {ingredient.sessions.map((session, sessionIdx) => (
                  <div 
                    key={session.session_id}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '16px',
                      backgroundColor: '#f9fafb'
                    }}
                  >
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'flex-start',
                      marginBottom: '12px'
                    }}>
                      <div>
                        <div style={{ 
                          fontSize: '14px', 
                          fontWeight: '600', 
                          color: '#1f2937',
                          marginBottom: '4px'
                        }}>
                          Sesi #{session.session_number}
                        </div>
                        <div style={{ 
                          fontSize: '12px', 
                          color: '#6b7280',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginTop: '4px'
                        }}>
                          <Clock size={12} />
                          {formatDate(session.session_completed_at || session.session_started_at)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          backgroundColor: session.status === 'completed' ? '#10b981' : '#f59e0b',
                          color: '#fff',
                          fontSize: '11px',
                          fontWeight: '500'
                        }}>
                          {session.status === 'completed' ? 'Selesai' : 'Ditimbang'}
                        </div>
                        <button
                          onClick={() => handlePrintSession(session, ingredient, workOrder)}
                          disabled={printingSessions.has(`${ingredient.ingredient_id}-${session.session_id}`)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: '1px solid #3b82f6',
                            backgroundColor: printingSessions.has(`${ingredient.ingredient_id}-${session.session_id}`) ? '#9ca3af' : '#3b82f6',
                            color: '#fff',
                            cursor: printingSessions.has(`${ingredient.ingredient_id}-${session.session_id}`) ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '12px',
                            fontWeight: '500',
                            opacity: printingSessions.has(`${ingredient.ingredient_id}-${session.session_id}`) ? 0.6 : 1,
                            transition: 'all 0.2s'
                          }}
                          title="Cetak label untuk sesi ini"
                        >
                          <Printer size={14} />
                          {printingSessions.has(`${ingredient.ingredient_id}-${session.session_id}`) ? 'Mencetak...' : 'Print'}
                        </button>
                      </div>
                    </div>

                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
                      gap: '12px',
                      marginTop: '12px'
                    }}>
                      <div>
                        <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>Berat Sesi</div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
                          {session.actual_mass.toFixed(1)} g
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>Akumulasi</div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#059669' }}>
                          {session.accumulated_mass.toFixed(1)} g
                        </div>
                      </div>
                      {session.tolerance_min > 0 && session.tolerance_max > 0 && (
                        <div>
                          <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>Toleransi</div>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
                            {session.tolerance_min.toFixed(1)} - {session.tolerance_max.toFixed(1)} g
                          </div>
                        </div>
                      )}
                    </div>

                    {session.notes && (
                      <div style={{ 
                        marginTop: '12px',
                        padding: '8px',
                        backgroundColor: '#fff',
                        borderRadius: '4px',
                        fontSize: '12px',
                        color: '#6b7280'
                      }}>
                        <strong>Catatan:</strong> {session.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      )}

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
                  // Display ingredients in import order (no sorting - preserve original order from backend)
                  // Create separate row for each exp date if multiple exist
                  ingredients.flatMap((ingredient, idx) => {
                    const scaledWeight = parseFloat(ingredient.target_mass || 0) // Scaled weight is same as base/target
                    const minWeight = ingredient.tolerance_min !== null && ingredient.tolerance_min !== undefined
                      ? parseFloat(ingredient.tolerance_min || 0)
                      : null;
                    const maxWeight = ingredient.tolerance_max !== null && ingredient.tolerance_max !== undefined
                      ? parseFloat(ingredient.tolerance_max || 0)
                      : null;
                    
                    // Get exp dates with weights - if empty, use array with single '-' for one row
                    let expDatesData = [];
                    if (ingredient.exp_dates && ingredient.exp_dates.length > 0) {
                      // exp_dates is now array of objects: {exp_date, actual_weight}
                      expDatesData = ingredient.exp_dates;
                    } else {
                      // Fallback: use total accumulated mass
                      const totalMass = parseFloat(ingredient.current_accumulated_mass || 0);
                      expDatesData = [{
                        exp_date: '-',
                        actual_weight: totalMass
                      }];
                    }
                    
                    // Calculate total weight from all exp dates
                    const totalWeight = expDatesData.reduce((sum, expData) => {
                      const weight = typeof expData === 'object' && expData.actual_weight !== undefined
                        ? parseFloat(expData.actual_weight || 0)
                        : 0;
                      return sum + weight;
                    }, 0);
                    
                    // Calculate resolution: total weight - scaled weight
                    const resolution = totalWeight - scaledWeight;
                    
                    // Create one row per exp date
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

      {/* Print Footer */}
      <div style={{ 
        marginTop: '40px',
        paddingTop: '20px',
        borderTop: '1px solid #e5e7eb',
        fontSize: '12px',
        color: '#9ca3af',
        textAlign: 'center'
      }}>
        <div>Laporan ini dicetak pada: {new Date().toLocaleString('id-ID')}</div>
        <div style={{ marginTop: '4px' }}>Work Order: {workOrder.work_order}</div>
      </div>

      {/* Reactivate Modal for QC */}
      {showReactivateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h2 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#1f2937',
                margin: 0
              }}>
                Aktifkan Kembali MO
              </h2>
              <button
                onClick={() => {
                  setShowReactivateModal(false)
                  setReactivateNote('')
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#6b7280'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{
                fontSize: '14px',
                color: '#6b7280',
                marginBottom: '8px'
              }}>
                Work Order: <strong>{workOrder.work_order}</strong>
              </div>
              <div style={{
                fontSize: '14px',
                color: '#6b7280',
                marginBottom: '16px'
              }}>
                Formula: {workOrder.formulation_name}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Catatan (Note) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                value={reactivateNote}
                onChange={(e) => setReactivateNote(e.target.value)}
                placeholder="Masukkan alasan atau catatan untuk mengaktifkan kembali MO ini..."
                style={{
                  width: '100%',
                  minHeight: '120px',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
                disabled={isReactivating}
              />
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px'
            }}>
              <button
                onClick={() => {
                  setShowReactivateModal(false)
                  setReactivateNote('')
                }}
                disabled={isReactivating}
                style={{
                  padding: '10px 20px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  backgroundColor: '#fff',
                  color: '#374151',
                  cursor: isReactivating ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  opacity: isReactivating ? 0.5 : 1
                }}
              >
                Batal
              </button>
              <button
                onClick={handleReactivateSubmit}
                disabled={isReactivating || !reactivateNote.trim()}
                style={{
                  padding: '10px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: isReactivating || !reactivateNote.trim() ? '#9ca3af' : '#10b981',
                  color: '#fff',
                  cursor: isReactivating || !reactivateNote.trim() ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {isReactivating ? (
                  <>
                    <div className="loading-spinner" style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid #fff',
                      borderTop: '2px solid transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    Memproses...
                  </>
                ) : (
                  <>
                    <RotateCcw size={16} />
                    Aktifkan Kembali
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default HistoryDetail

