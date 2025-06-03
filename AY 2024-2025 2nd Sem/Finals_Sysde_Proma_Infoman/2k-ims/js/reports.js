// Reports functionality
document.addEventListener("DOMContentLoaded", () => {
  const reportTypeSelect = document.getElementById("reportType")
  const dateRangeSelect = document.getElementById("dateRange")
  const customDateRange = document.getElementById("customDateRange")
  const generateReportBtn = document.getElementById("generateReport")
  const reportTypeCards = document.querySelectorAll(".report-type-card")
  const reportPreview = document.getElementById("reportPreview")

  // Handle date range selection
  dateRangeSelect.addEventListener("change", function () {
    if (this.value === "custom") {
      customDateRange.style.display = "block"
    } else {
      customDateRange.style.display = "none"
    }
  })

  // Handle report type card selection
  reportTypeCards.forEach((card) => {
    card.addEventListener("click", function () {
      const reportType = this.dataset.type
      reportTypeSelect.value = reportType

      // Update visual selection
      reportTypeCards.forEach((c) => c.classList.remove("selected"))
      this.classList.add("selected")
    })
  })

  // Handle report type select change
  reportTypeSelect.addEventListener("change", function () {
    const selectedType = this.value

    // Update visual selection
    reportTypeCards.forEach((card) => {
      card.classList.remove("selected")
      if (card.dataset.type === selectedType) {
        card.classList.add("selected")
      }
    })
  })

  // Generate report
  generateReportBtn.addEventListener("click", () => {
    const reportType = reportTypeSelect.value
    const dateRange = dateRangeSelect.value

    if (!reportType) {
      alert("Please select a report type")
      return
    }

    // Add activity
    if (typeof addActivity === "function") {
      addActivity(`Generated ${getReportTypeName(reportType)} report`)
    } else {
      console.warn("addActivity function is not defined.")
    }

    // Show loading state
    reportPreview.innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <h3>Generating Report...</h3>
                <p>Please wait while we compile your ${getReportTypeName(reportType)} report</p>
            </div>
        `

    // Simulate report generation
    setTimeout(() => {
      showReportPreview(reportType, dateRange)
    }, 2000)
  })
})

function getReportTypeName(type) {
  const names = {
    "inventory-summary": "Inventory Summary",
    "low-stock": "Low Stock",
    "stock-movement": "Stock Movement",
    "product-performance": "Product Performance",
  }
  return names[type] || type
}

function showReportPreview(reportType, dateRange) {
  const reportPreview = document.getElementById("reportPreview")
  const reportName = getReportTypeName(reportType)

  reportPreview.innerHTML = `
        <div class="report-content">
            <div class="report-header">
                <h3>${reportName}</h3>
                <p>Generated on ${new Date().toLocaleDateString()}</p>
                <p>Date Range: ${getDateRangeName(dateRange)}</p>
            </div>
            <div class="report-body">
                <div class="empty-data">
                    <svg class="icon large" viewBox="0 0 24 24">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14,2 14,8 20,8"></polyline>
                    </svg>
                    <h4>No Data Available</h4>
                    <p>Connect your database to populate this report with real inventory data.</p>
                </div>
            </div>
        </div>
    `
}

function getDateRangeName(range) {
  const names = {
    week: "Last Week",
    month: "Last Month",
    quarter: "Last Quarter",
    year: "Last Year",
    custom: "Custom Range",
  }
  return names[range] || range
}

function exportReport(format) {
  const reportType = document.getElementById("reportType").value

  if (!reportType) {
    alert("Please generate a report first")
    return
  }

  if (typeof addActivity === "function") {
    addActivity(`Exported ${getReportTypeName(reportType)} report as ${format.toUpperCase()}`)
  } else {
    console.warn("addActivity function is not defined.")
  }
  alert(`Exporting report as ${format.toUpperCase()}...`)
}
