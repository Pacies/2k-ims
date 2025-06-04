// Products page specific JavaScript
document.addEventListener("DOMContentLoaded", () => {
  // Initialize products page
  // initializeProducts()
  if (window.location.pathname.includes("products.html")) {
    initializeProductsPage()
  }
})

// Mock activityStore (replace with actual implementation if needed)
const activityStore = {
  addActivity: (activity) => {
    console.log("Activity:", activity)
  },
}

function initializeProducts() {
  // Generate product data
  const products = [
    {
      id: "prod-001",
      name: "Wireless Headphones",
      description: "Premium noise-canceling headphones",
      price: 299.99,
      stock: 45,
      sku: "WH-001",
      category: "Audio",
      status: "in-stock",
      image: "/placeholder.svg",
    },
    {
      id: "prod-002",
      name: "Smartphone Case",
      description: "Protective case with wireless charging",
      price: 49.99,
      stock: 8,
      sku: "SC-002",
      category: "Accessories",
      status: "low-stock",
      image: "/placeholder.svg",
    },
    {
      id: "prod-003",
      name: "Gaming Monitor",
      description: '27" 4K gaming monitor with HDR',
      price: 599.99,
      stock: 23,
      sku: "GM-003",
      category: "Displays",
      status: "in-stock",
      image: "/placeholder.svg",
    },
    {
      id: "prod-004",
      name: "Wireless Mouse",
      description: "Ergonomic wireless gaming mouse",
      price: 79.99,
      stock: 0,
      sku: "WM-004",
      category: "Accessories",
      status: "out-of-stock",
      image: "/placeholder.svg",
    },
    {
      id: "prod-005",
      name: "Mechanical Keyboard",
      description: "RGB mechanical gaming keyboard",
      price: 149.99,
      stock: 32,
      sku: "MK-005",
      category: "Accessories",
      status: "in-stock",
      image: "/placeholder.svg",
    },
    {
      id: "prod-006",
      name: "USB Microphone",
      description: "Professional USB condenser microphone",
      price: 199.99,
      stock: 18,
      sku: "UM-006",
      category: "Audio",
      status: "in-stock",
      image: "/placeholder.svg",
    },
  ]

  // Render products
  renderProducts(products)

  // Add event listeners for buttons
  document.querySelectorAll(".btn").forEach((button) => {
    button.addEventListener("click", function () {
      if (this.textContent.includes("Add Product")) {
        openModal("add-product-modal")
      } else if (this.textContent.includes("Export")) {
        exportProducts()
      }
    })
  })
}

function renderProducts(products) {
  const productsContainer = document.getElementById("products-container")
  if (!productsContainer) return

  productsContainer.innerHTML = ""

  products.forEach((product, index) => {
    const productElement = document.createElement("div")
    productElement.className = "product-card fade-in-animation"
    productElement.style.animationDelay = `${index * 0.05}s`

    // Get status class and text
    const statusClass = getStatusClass(product.status)
    const statusText = getStatusText(product.status)

    productElement.innerHTML = `
            <div class="product-image">
                <svg class="icon" style="width: 3rem; height: 3rem;" viewBox="0 0 24 24">
                    <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                </svg>
            </div>
            <h3 class="product-title">${product.name}</h3>
            <p class="product-description">${product.description}</p>
            <div class="flex items-center justify-between mb-3">
                <span class="product-price">$${product.price.toFixed(2)}</span>
                <span class="badge badge-${statusClass}">${statusText}</span>
            </div>
            <div class="product-meta">
                <span>SKU: ${product.sku}</span>
                <span>Qty: ${product.stock}</span>
            </div>
            <div class="flex gap-2 mt-4">
                <button class="btn btn-outline btn-sm w-full" onclick="editProduct('${product.id}')">Edit</button>
                <button class="btn btn-default btn-sm w-full" onclick="viewProduct('${product.id}')">View</button>
            </div>
        `

    productsContainer.appendChild(productElement)
  })
}

function getStatusClass(status) {
  switch (status) {
    case "in-stock":
      return "green"
    case "low-stock":
      return "yellow"
    case "out-of-stock":
      return "red"
    default:
      return "blue"
  }
}

function getStatusText(status) {
  switch (status) {
    case "in-stock":
      return "In Stock"
    case "low-stock":
      return "Low Stock"
    case "out-of-stock":
      return "Out of Stock"
    default:
      return "Unknown"
  }
}

function editProduct(productId) {
  alert(`Editing product ${productId}`)
  activityStore.addActivity(`Edited product: ${productId}`)
}

function viewProduct(productId) {
  alert(`Viewing product ${productId}`)
  activityStore.addActivity(`Viewed product: ${productId}`)
}

function exportProducts() {
  // Create a printable version of the products data
  const printWindow = window.open("", "_blank")
  if (printWindow) {
    const products = [
      {
        id: "prod-001",
        name: "Wireless Headphones",
        description: "Premium noise-canceling headphones",
        price: 299.99,
        stock: 45,
        sku: "WH-001",
        category: "Audio",
        status: "in-stock",
      },
      {
        id: "prod-002",
        name: "Smartphone Case",
        description: "Protective case with wireless charging",
        price: 49.99,
        stock: 8,
        sku: "SC-002",
        category: "Accessories",
        status: "low-stock",
      },
      {
        id: "prod-003",
        name: "Gaming Monitor",
        description: '27" 4K gaming monitor with HDR',
        price: 599.99,
        stock: 23,
        sku: "GM-003",
        category: "Displays",
        status: "in-stock",
      },
      {
        id: "prod-004",
        name: "Wireless Mouse",
        description: "Ergonomic wireless gaming mouse",
        price: 79.99,
        stock: 0,
        sku: "WM-004",
        category: "Accessories",
        status: "out-of-stock",
      },
      {
        id: "prod-005",
        name: "Mechanical Keyboard",
        description: "RGB mechanical gaming keyboard",
        price: 149.99,
        stock: 32,
        sku: "MK-005",
        category: "Accessories",
        status: "in-stock",
      },
      {
        id: "prod-006",
        name: "USB Microphone",
        description: "Professional USB condenser microphone",
        price: 199.99,
        stock: 18,
        sku: "UM-006",
        category: "Audio",
        status: "in-stock",
      },
    ]

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Products Export</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; margin-bottom: 20px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .company-info { display: flex; align-items: center; gap: 15px; }
          .logo { width: 60px; height: 60px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 20px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f3f4f6; font-weight: bold; }
          .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 12px; }
          .badge-green { background-color: #dcfce7; color: #166534; }
          .badge-yellow { background-color: #fef9c3; color: #854d0e; }
          .badge-red { background-color: #fee2e2; color: #991b1b; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-info">
            <div class="logo">2K</div>
            <div>
              <h1>Products Export</h1>
              <p>2K Inventory Management</p>
            </div>
          </div>
          <div>
            <p><strong>DATE:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>TIME:</strong> ${new Date().toLocaleTimeString()}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Name</th>
              <th>Category</th>
              <th>Stock</th>
              <th>Price</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${products
              .map(
                (product) => `
              <tr>
                <td>${product.sku}</td>
                <td>${product.name}</td>
                <td>${product.category}</td>
                <td>${product.stock}</td>
                <td>$${product.price.toFixed(2)}</td>
                <td>
                  <span class="badge badge-${getStatusClass(product.status)}">
                    ${getStatusText(product.status)}
                  </span>
                </td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>

        <div class="footer">
          <p>Generated by 2K Inventory Management System</p>
        </div>
      </body>
      </html>
    `

    printWindow.document.write(htmlContent)
    printWindow.document.close()

    // Wait for content to load then print
    printWindow.onload = () => {
      printWindow.print()
      printWindow.close()
    }
  }

  activityStore.addActivity("Exported products data")
  alert("Exporting products data...")
}

function openModal(modalId) {
  const modal = document.getElementById(modalId)
  if (modal) {
    modal.classList.add("active")
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId)
  if (modal) {
    modal.classList.remove("active")
  }
}

function initializeProductsPage() {
  loadProducts()
  setupProductFilters()
  setupProductActions()
}

function loadProducts() {
  const productsContainer = document.getElementById("products-container")
  if (!productsContainer) return

  const products = [
    {
      id: 1,
      name: "Wireless Headphones",
      description: "Premium noise-canceling headphones",
      price: 299.99,
      sku: "WH-001",
      quantity: 45,
      status: "in-stock",
      icon: "headphones",
    },
    {
      id: 2,
      name: "Smartphone Case",
      description: "Protective case with wireless charging",
      price: 49.99,
      sku: "SC-002",
      quantity: 8,
      status: "low-stock",
      icon: "phone",
    },
    {
      id: 3,
      name: "Gaming Monitor",
      description: '27" 4K gaming monitor with HDR',
      price: 599.99,
      sku: "GM-003",
      quantity: 23,
      status: "in-stock",
      icon: "monitor",
    },
    {
      id: 4,
      name: "Wireless Mouse",
      description: "Ergonomic wireless gaming mouse",
      price: 79.99,
      sku: "WM-004",
      quantity: 0,
      status: "out-of-stock",
      icon: "mouse",
    },
    {
      id: 5,
      name: "Mechanical Keyboard",
      description: "RGB mechanical gaming keyboard",
      price: 149.99,
      sku: "MK-005",
      quantity: 32,
      status: "in-stock",
      icon: "keyboard",
    },
    {
      id: 6,
      name: "USB Microphone",
      description: "Professional USB condenser microphone",
      price: 199.99,
      sku: "UM-006",
      quantity: 18,
      status: "in-stock",
      icon: "microphone",
    },
  ]

  productsContainer.innerHTML = products.map((product) => createProductCard(product)).join("")
}

function createProductCard(product) {
  const statusClass = product.status.replace("-", "-")
  const statusText =
    product.status === "in-stock" ? "In Stock" : product.status === "low-stock" ? "Low Stock" : "Out of Stock"

  return `
        <div class="product-card">
            <div class="product-image">
                <svg class="icon" style="width: 3rem; height: 3rem; color: #60a5fa;" viewBox="0 0 24 24">
                    <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                </svg>
            </div>
            <h3 class="product-title">${product.name}</h3>
            <p class="product-description">${product.description}</p>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
                <span class="product-price">${formatCurrency(product.price)}</span>
                <span class="product-status ${statusClass}">${statusText}</span>
            </div>
            <div class="product-meta">
                <span>SKU: ${product.sku}</span>
                <span>Qty: ${product.quantity}</span>
            </div>
        </div>
    `
}

function setupProductFilters() {
  // Add filter functionality here
  console.log("Product filters initialized")
}

function setupProductActions() {
  // Add product action handlers here
  console.log("Product actions initialized")
}

function formatCurrency(number) {
  return "$" + number.toFixed(2)
}
