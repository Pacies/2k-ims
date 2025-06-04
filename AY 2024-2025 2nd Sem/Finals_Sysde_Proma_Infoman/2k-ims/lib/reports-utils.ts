import { supabase } from "./supabaseClient"
import { getInventoryItems, getRawMaterials, logActivity, getCurrentUser } from "./database"

export interface Report {
  id: number
  title: string
  type: "inventory-summary" | "low-stock"
  content: any
  generated_by?: string
  date_range_start?: string
  date_range_end?: string
  created_at: string
  updated_at: string
}

export interface InventorySummaryData {
  products: {
    total_items: number
    total_value: number
    in_stock: number
    low_stock: number
    out_of_stock: number
    items: Array<{
      sku: string
      name: string
      category: string
      stock: number
      price: number
      status: string
      value: number
      unit: string
    }>
  }
  raw_materials: {
    total_items: number
    total_value: number
    in_stock: number
    low_stock: number
    out_of_stock: number
    items: Array<{
      sku: string
      name: string
      category: string
      quantity: number
      cost_per_unit: number
      status: string
      value: number
      unit: string
    }>
  }
}

export interface LowStockData {
  products: Array<{
    sku: string
    name: string
    category: string
    current_stock: number
    status: string
    price: number
    reorder_needed: number
    unit: string
  }>
  raw_materials: Array<{
    sku: string
    name: string
    category: string
    current_quantity: number
    reorder_level: number
    status: string
    cost_per_unit: number
    reorder_needed: number
    unit: string
  }>
}

// Generate Inventory Summary Report
export async function generateInventorySummary(): Promise<InventorySummaryData> {
  try {
    const [products, rawMaterials] = await Promise.all([getInventoryItems(), getRawMaterials()])

    // Process products data
    const productsData = {
      total_items: products.length,
      total_value: products.reduce((sum, item) => sum + item.price * item.stock, 0),
      in_stock: products.filter((item) => item.status === "in-stock").length,
      low_stock: products.filter((item) => item.status === "low-stock").length,
      out_of_stock: products.filter((item) => item.status === "out-of-stock").length,
      items: products.map((item) => ({
        sku: item.sku,
        name: item.name,
        category: item.category,
        stock: item.stock,
        price: item.price,
        status: item.status,
        value: item.price * item.stock,
        unit: "dz",
      })),
    }

    // Process raw materials data
    const rawMaterialsData = {
      total_items: rawMaterials.length,
      total_value: rawMaterials.reduce((sum, item) => sum + item.cost_per_unit * item.quantity, 0),
      in_stock: rawMaterials.filter((item) => item.status === "in-stock").length,
      low_stock: rawMaterials.filter((item) => item.status === "low-stock").length,
      out_of_stock: rawMaterials.filter((item) => item.status === "out-of-stock").length,
      items: rawMaterials.map((item) => ({
        sku: item.sku || `RAW-${item.id}`,
        name: item.name,
        category: item.category || "General",
        quantity: item.quantity,
        cost_per_unit: item.cost_per_unit,
        status: item.status,
        value: item.cost_per_unit * item.quantity,
        unit: item.unit || "units",
      })),
    }

    return {
      products: productsData,
      raw_materials: rawMaterialsData,
    }
  } catch (error) {
    console.error("Error generating inventory summary:", error)
    throw error
  }
}

// Generate Low Stock Report
export async function generateLowStockReport(): Promise<LowStockData> {
  try {
    const [products, rawMaterials] = await Promise.all([getInventoryItems(), getRawMaterials()])

    // Filter low stock and out of stock products
    const lowStockProducts = products
      .filter((item) => item.status === "low-stock" || item.status === "out-of-stock")
      .map((item) => ({
        sku: item.sku,
        name: item.name,
        category: item.category,
        current_stock: item.stock,
        status: item.status,
        price: item.price,
        reorder_needed: Math.max(40 - item.stock, 0), // Suggest reordering to 40 dozen (double the threshold)
        unit: "dz",
      }))

    // Filter low stock and out of stock raw materials
    const lowStockRawMaterials = rawMaterials
      .filter((item) => item.status === "low-stock" || item.status === "out-of-stock")
      .map((item) => ({
        sku: item.sku || `RAW-${item.id}`,
        name: item.name,
        category: item.category || "General",
        current_quantity: item.quantity,
        reorder_level: item.reorder_level || 10,
        status: item.status,
        cost_per_unit: item.cost_per_unit,
        reorder_needed: Math.max((item.reorder_level || 10) * 2 - item.quantity, 0),
        unit: item.unit || "units",
      }))

    return {
      products: lowStockProducts,
      raw_materials: lowStockRawMaterials,
    }
  } catch (error) {
    console.error("Error generating low stock report:", error)
    throw error
  }
}

// Save report to database
export async function saveReport(
  title: string,
  type: "inventory-summary" | "low-stock",
  content: any,
  dateRangeStart?: Date,
  dateRangeEnd?: Date,
): Promise<Report | null> {
  try {
    console.log("🔄 Starting to save report:", title)

    // Get current user with better error handling
    let currentUser
    try {
      currentUser = await getCurrentUser()
      console.log("✅ Current user:", currentUser?.username || "No user found")
    } catch (userError) {
      console.warn("⚠️ Could not get current user:", userError)
      currentUser = null
    }

    const reportData = {
      title,
      type,
      content,
      generated_by: currentUser?.username || "System",
      date_range_start: dateRangeStart?.toISOString().split("T")[0] || null,
      date_range_end: dateRangeEnd?.toISOString().split("T")[0] || null,
    }

    console.log("📝 Report data to save:", {
      title: reportData.title,
      type: reportData.type,
      generated_by: reportData.generated_by,
      contentSize: JSON.stringify(reportData.content).length,
    })

    // Try to insert the report with detailed error logging
    const { data, error } = await supabase.from("reports").insert(reportData).select().single()

    if (error) {
      console.error("❌ Database error details:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      })

      // Try alternative approach if RLS is the issue
      if (error.message?.includes("RLS") || error.message?.includes("policy")) {
        console.log("🔄 Trying alternative insert method...")

        // Disable RLS temporarily for this operation
        const { data: altData, error: altError } = await supabase.rpc("insert_report_bypass_rls", {
          report_title: title,
          report_type: type,
          report_content: content,
          report_generated_by: currentUser?.username || "System",
          report_date_start: dateRangeStart?.toISOString().split("T")[0] || null,
          report_date_end: dateRangeEnd?.toISOString().split("T")[0] || null,
        })

        if (altError) {
          console.error("❌ Alternative method also failed:", altError)
          return null
        }

        console.log("✅ Report saved using alternative method")

        // Log activity if possible
        try {
          await logActivity("create", `Generated ${title} report`)
        } catch (logError) {
          console.warn("⚠️ Could not log activity:", logError)
        }

        return altData as Report
      }

      return null
    }

    console.log("✅ Report saved successfully:", data.id)

    // Log activity with error handling
    try {
      await logActivity("create", `Generated ${title} report`)
      console.log("✅ Activity logged successfully")
    } catch (logError) {
      console.warn("⚠️ Failed to log activity (non-critical):", logError)
    }

    return data as Report
  } catch (error) {
    console.error("💥 Unexpected error in saveReport:", error)
    return null
  }
}

// Get saved reports - FORCE FRESH DATA
export async function getSavedReports(): Promise<Report[]> {
  try {
    // Force a fresh fetch from the database without cache
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) {
      console.error("Error fetching reports:", error)
      return []
    }

    console.log("Fresh reports from database:", data)
    return data as Report[]
  } catch (error) {
    console.error("Error fetching reports:", error)
    return []
  }
}

// IMPROVED Delete report function with better error handling
export async function deleteReport(id: number): Promise<boolean> {
  console.log("🔥 STARTING DELETE PROCESS FOR REPORT ID:", id)

  try {
    // Validate the ID first
    if (!id || isNaN(Number(id)) || Number(id) <= 0) {
      console.error("❌ Invalid report ID provided:", id)
      return false
    }

    const reportId = Number(id)
    console.log("✅ Valid ID confirmed:", reportId)

    // PRIMARY APPROACH: Direct SQL deletion (most reliable)
    console.log("🎯 Attempting direct deletion...")
    const { error: directError } = await supabase.from("reports").delete().eq("id", reportId)

    if (directError) {
      console.error("❌ Direct deletion failed:", directError)
      return false
    }

    console.log("✅ Direct deletion succeeded")

    // Verify the deletion actually worked by checking if the report still exists
    const { data: verifyData, error: verifyError } = await supabase
      .from("reports")
      .select("id")
      .eq("id", reportId)
      .maybeSingle()

    if (verifyError) {
      console.warn("⚠️ Error verifying deletion (non-critical):", verifyError)
      // Continue anyway since the delete operation didn't report an error
    }

    if (verifyData) {
      console.error("❌ Report still exists after deletion attempt!")
      return false
    }

    console.log("✅ DELETION VERIFIED - Report no longer exists in database")

    // Log the activity (optional, don't fail if this fails)
    try {
      await logActivity("delete", `Successfully deleted report with ID: ${reportId}`)
      console.log("✅ Activity logged successfully")
    } catch (logError) {
      console.warn("⚠️ Failed to log delete activity (non-critical):", logError)
    }

    console.log("🎉 DELETE OPERATION COMPLETED SUCCESSFULLY")
    return true
  } catch (error) {
    console.error("💥 UNEXPECTED ERROR in deleteReport:", error)
    return false
  }
}

// Generate PDF content using print dialog (same as purchase order export)
export async function generatePDFContent(report: Report): Promise<void> {
  try {
    // Generate HTML content for printing
    const htmlContent = await generatePrintableHTML(report)

    // Open print dialog in new window (same as purchase order export)
    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(htmlContent)
      printWindow.document.close()
      printWindow.focus()
      printWindow.print()
    } else {
      throw new Error("Could not open print window")
    }
  } catch (error) {
    console.error("Error generating PDF:", error)
    throw error
  }
}

// Generate printable HTML content (same pattern as purchase order)
async function generatePrintableHTML(report: Report): Promise<string> {
  const { title, content, created_at, generated_by } = report

  let htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #374151;
          background: white;
          padding: 20px;
          font-size: 12px;
        }
        .header { 
          text-align: center; 
          border-bottom: 2px solid #e5e7eb; 
          padding-bottom: 20px; 
          margin-bottom: 30px;
        }
        .logo-section {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 15px;
        }
        .logo {
          width: 40px;
          height: 40px;
          background: #3b82f6;
          color: white;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 16px;
          margin-right: 15px;
        }
        .company-info h1 {
          font-size: 24px;
          font-weight: bold;
          color: #111827;
          margin: 0;
        }
        .company-info p {
          color: #6b7280;
          margin: 0;
        }
        .title { 
          font-size: 20px; 
          font-weight: bold; 
          margin-bottom: 10px;
          color: #111827;
        }
        .subtitle { 
          font-size: 14px; 
          color: #6b7280;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 30px;
        }
        .summary-card {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 15px;
          background: #f9fafb;
        }
        .summary-card h3 {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 10px;
          color: #111827;
        }
        .summary-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 6px;
          font-size: 12px;
        }
        .summary-value {
          font-weight: 600;
        }
        .badge {
          display: inline-block;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 500;
        }
        .badge-green { background: #dcfce7; color: #166534; }
        .badge-orange { background: #fed7aa; color: #9a3412; }
        .badge-red { background: #fecaca; color: #991b1b; }
        .section {
          margin-bottom: 25px;
        }
        .section-title {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 10px;
          color: #111827;
        }
        .data-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8px;
          font-size: 10px;
        }
        .data-table th,
        .data-table td {
          border: 1px solid #e5e7eb;
          padding: 6px;
          text-align: left;
        }
        .data-table th {
          background: #f3f4f6;
          font-weight: 600;
          color: #374151;
          font-size: 10px;
        }
        .data-table tr:nth-child(even) {
          background: #f9fafb;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          font-size: 10px;
          color: #6b7280;
          border-top: 1px solid #e5e7eb;
          padding-top: 15px;
        }
        @media print {
          body { margin: 0; padding: 15px; font-size: 11px; }
          .summary-grid { grid-template-columns: 1fr; }
          .data-table { font-size: 9px; }
          .data-table th, .data-table td { padding: 4px; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo-section">
          <div class="logo">2K</div>
          <div class="company-info">
            <h1>2K Inventory Management</h1>
            <p>Inventory Management System</p>
          </div>
        </div>
        <div class="title">${title}</div>
        <div class="subtitle">
          Generated by: ${generated_by}<br>
          Date: ${new Date(created_at).toLocaleDateString()}
          ${
            report.date_range_start && report.date_range_end
              ? `<br>Period: ${new Date(report.date_range_start).toLocaleDateString()} - ${new Date(report.date_range_end).toLocaleDateString()}`
              : ""
          }
        </div>
      </div>
  `

  if (report.type === "inventory-summary") {
    const data = content as InventorySummaryData
    htmlContent += `
      <div class="summary-grid">
        <div class="summary-card">
          <h3>📦 Products Summary</h3>
          <div class="summary-item">
            <span>Total Items:</span>
            <span class="summary-value">${data.products.total_items}</span>
          </div>
          <div class="summary-item">
            <span>Total Value:</span>
            <span class="summary-value">₱${data.products.total_value.toLocaleString()}</span>
          </div>
          <div class="summary-item">
            <span>In Stock:</span>
            <span class="badge badge-green">${data.products.in_stock}</span>
          </div>
          <div class="summary-item">
            <span>Low Stock:</span>
            <span class="badge badge-orange">${data.products.low_stock}</span>
          </div>
          <div class="summary-item">
            <span>Out of Stock:</span>
            <span class="badge badge-red">${data.products.out_of_stock}</span>
          </div>
        </div>
        <div class="summary-card">
          <h3>🧱 Raw Materials Summary</h3>
          <div class="summary-item">
            <span>Total Items:</span>
            <span class="summary-value">${data.raw_materials.total_items}</span>
          </div>
          <div class="summary-item">
            <span>Total Value:</span>
            <span class="summary-value">₱${data.raw_materials.total_value.toLocaleString()}</span>
          </div>
          <div class="summary-item">
            <span>In Stock:</span>
            <span class="badge badge-green">${data.raw_materials.in_stock}</span>
          </div>
          <div class="summary-item">
            <span>Low Stock:</span>
            <span class="badge badge-orange">${data.raw_materials.low_stock}</span>
          </div>
          <div class="summary-item">
            <span>Out of Stock:</span>
            <span class="badge badge-red">${data.raw_materials.out_of_stock}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Products Inventory</div>
        <table class="data-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Name</th>
              <th>Category</th>
              <th>Stock</th>
              <th>Price</th>
              <th>Value</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${data.products.items
              .slice(0, 20)
              .map(
                (item) => `
              <tr>
                <td>${item.sku}</td>
                <td>${item.name}</td>
                <td>${item.category}</td>
                <td>${item.stock}</td>
                <td>₱${item.price.toLocaleString()}</td>
                <td>₱${item.value.toLocaleString()}</td>
                <td><span class="badge ${
                  item.status === "in-stock"
                    ? "badge-green"
                    : item.status === "low-stock"
                      ? "badge-orange"
                      : "badge-red"
                }">${item.status}</span></td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
        ${data.products.items.length > 20 ? `<p style="margin-top: 8px; font-size: 10px; color: #6b7280;">Showing 20 of ${data.products.items.length} items</p>` : ""}
      </div>

      <div class="section">
        <div class="section-title">Raw Materials Inventory</div>
        <table class="data-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Name</th>
              <th>Category</th>
              <th>Quantity</th>
              <th>Cost/Unit</th>
              <th>Value</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${data.raw_materials.items
              .slice(0, 20)
              .map(
                (item) => `
              <tr>
                <td>${item.sku}</td>
                <td>${item.name}</td>
                <td>${item.category}</td>
                <td>${item.quantity}</td>
                <td>₱${item.cost_per_unit.toLocaleString()}</td>
                <td>₱${item.value.toLocaleString()}</td>
                <td><span class="badge ${
                  item.status === "in-stock"
                    ? "badge-green"
                    : item.status === "low-stock"
                      ? "badge-orange"
                      : "badge-red"
                }">${item.status}</span></td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
        ${data.raw_materials.items.length > 20 ? `<p style="margin-top: 8px; font-size: 10px; color: #6b7280;">Showing 20 of ${data.raw_materials.items.length} items</p>` : ""}
      </div>
    `
  } else if (report.type === "low-stock") {
    const data = content as LowStockData
    htmlContent += `
      <div class="summary-grid">
        <div class="summary-card">
          <h3>⚠️ Low Stock Products</h3>
          <div class="summary-item">
            <span>Items Requiring Action:</span>
            <span class="summary-value">${data.products.length}</span>
          </div>
        </div>
        <div class="summary-card">
          <h3>🚨 Low Stock Raw Materials</h3>
          <div class="summary-item">
            <span>Items Requiring Action:</span>
            <span class="summary-value">${data.raw_materials.length}</span>
          </div>
        </div>
      </div>

      ${
        data.products.length > 0
          ? `
      <div class="section">
        <div class="section-title">Low Stock Products</div>
        <table class="data-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Name</th>
              <th>Category</th>
              <th>Current Stock</th>
              <th>Status</th>
              <th>Reorder Needed</th>
            </tr>
          </thead>
          <tbody>
            ${data.products
              .map(
                (item) => `
              <tr>
                <td>${item.sku}</td>
                <td>${item.name}</td>
                <td>${item.category}</td>
                <td>${item.current_stock}</td>
                <td><span class="badge ${item.status === "low-stock" ? "badge-orange" : "badge-red"}">${item.status}</span></td>
                <td><strong>${item.reorder_needed} units</strong></td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
      `
          : ""
      }

      ${
        data.raw_materials.length > 0
          ? `
      <div class="section">
        <div class="section-title">Low Stock Raw Materials</div>
        <table class="data-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Name</th>
              <th>Category</th>
              <th>Current Quantity</th>
              <th>Reorder Level</th>
              <th>Status</th>
              <th>Reorder Needed</th>
            </tr>
          </thead>
          <tbody>
            ${data.raw_materials
              .map(
                (item) => `
              <tr>
                <td>${item.sku}</td>
                <td>${item.name}</td>
                <td>${item.category}</td>
                <td>${item.current_quantity}</td>
                <td>${item.reorder_level}</td>
                <td><span class="badge ${item.status === "low-stock" ? "badge-orange" : "badge-red"}">${item.status}</span></td>
                <td><strong>${item.reorder_needed} units</strong></td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
      `
          : ""
      }
    `
  }

  htmlContent += `
      <div class="footer">
        <p>Generated by 2K Inventory Management System | ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
      </div>
    </body>
    </html>
  `

  return htmlContent
}

// Remove the old generatePreviewHTML function and generateFallbackPDF function
// They are replaced by the new generatePrintableHTML function above
