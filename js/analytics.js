import { Chart } from "@/components/ui/chart"
// Analytics page specific JavaScript
document.addEventListener("DOMContentLoaded", () => {
  // Initialize analytics page
  initializeAnalytics()
})

function initializeAnalytics() {
  // Render top products
  renderTopProducts()

  // Initialize charts
  initializeCharts()
}

function renderTopProducts() {
  const topProductsContainer = document.getElementById("top-products-container")
  if (!topProductsContainer) return

  const topProducts = [
    {
      name: "Wireless Headphones",
      units: 234,
      revenue: 70166,
      growth: "+18.2%",
      icon: "audio",
      color: "blue",
    },
    {
      name: "Gaming Monitor",
      units: 89,
      revenue: 53399,
      growth: "+12.7%",
      icon: "display",
      color: "purple",
    },
    {
      name: "Mechanical Keyboard",
      units: 156,
      revenue: 23384,
      growth: "+9.4%",
      icon: "keyboard",
      color: "cyan",
    },
  ]

  topProductsContainer.innerHTML = ""

  topProducts.forEach((product, index) => {
    const productElement = document.createElement("div")
    productElement.className = "top-product-item fade-in-animation"
    productElement.style.animationDelay = `${index * 0.1}s`

    // Get icon based on product type
    const iconPath = getIconPath(product.icon)

    productElement.innerHTML = `
            <div class="top-product-info">
                <div class="top-product-icon" style="background-color: rgba(var(--color-${product.color}-500), 0.2); color: var(--color-${product.color}-500);">
                    <svg class="icon" viewBox="0 0 24 24">
                        <path d="${iconPath}"></path>
                    </svg>
                </div>
                <div class="top-product-details">
                    <p>${product.name}</p>
                    <p>${product.units} units sold</p>
                </div>
            </div>
            <div class="top-product-stats">
                <p>$${formatNumber(product.revenue)}</p>
                <p>${product.growth}</p>
            </div>
        `

    topProductsContainer.appendChild(productElement)
  })
}

function getIconPath(icon) {
  switch (icon) {
    case "audio":
      return "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
    case "display":
      return "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
    case "keyboard":
      return "M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
    default:
      return "M12 4v16m8-8H4"
  }
}

function formatNumber(number) {
  return new Intl.NumberFormat("en-US").format(number)
}

function initializeCharts() {
  // Create revenue chart
  const revenueChartCtx = document.getElementById("revenueChart")
  if (revenueChartCtx) {
    const revenueChart = new Chart(revenueChartCtx, {
      type: "line",
      data: {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        datasets: [
          {
            label: "Revenue",
            data: [12500, 15000, 18000, 16500, 21000, 22500, 25000, 23000, 27000, 28500, 30000, 32000],
            borderColor: "#3b82f6",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: "rgba(75, 85, 99, 0.2)",
            },
            ticks: {
              color: "#9ca3af",
            },
          },
          x: {
            grid: {
              display: false,
            },
            ticks: {
              color: "#9ca3af",
            },
          },
        },
      },
    })
  }

  // Create orders chart
  const ordersChartCtx = document.getElementById("ordersChart")
  if (ordersChartCtx) {
    const ordersChart = new Chart(ordersChartCtx, {
      type: "doughnut",
      data: {
        labels: ["Shipped", "Pending", "Processing", "Delivered", "Cancelled"],
        datasets: [
          {
            data: [156, 23, 45, 78, 12],
            backgroundColor: [
              "#10b981", // green
              "#f59e0b", // yellow
              "#3b82f6", // blue
              "#8b5cf6", // purple
              "#ef4444", // red
            ],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "right",
            labels: {
              color: "#d1d5db",
              padding: 20,
              font: {
                size: 12,
              },
            },
          },
        },
        cutout: "70%",
      },
    })
  }
}

// Analytics page functionality
document.addEventListener("DOMContentLoaded", () => {
  if (window.location.pathname.includes("analytics.html")) {
    initializeAnalyticsPage()
  }
})

function initializeAnalyticsPage() {
  loadTopProducts()
  setupAnalyticsActions()
}

function loadTopProducts() {
  const topProductsContainer = document.getElementById("top-products-container")
  if (!topProductsContainer) return

  const topProducts = [
    {
      name: "Wireless Headphones",
      units: 234,
      revenue: 70166,
      growth: 18.2,
      icon: "blue",
    },
    {
      name: "Gaming Monitor",
      units: 89,
      revenue: 53399,
      growth: 12.7,
      icon: "purple",
    },
    {
      name: "Mechanical Keyboard",
      units: 156,
      revenue: 23384,
      growth: 9.4,
      icon: "cyan",
    },
  ]

  topProductsContainer.innerHTML = topProducts.map((product) => createTopProductItem(product)).join("")
}

function createTopProductItem(product) {
  return `
        <div class="top-product-item">
            <div class="top-product-info">
                <div class="top-product-icon stat-icon ${product.icon}">
                    <svg class="icon" viewBox="0 0 24 24">
                        <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                    </svg>
                </div>
                <div class="top-product-details">
                    <h4>${product.name}</h4>
                    <p>${product.units} units sold</p>
                </div>
            </div>
            <div class="top-product-stats">
                <div class="revenue">${formatCurrency(product.revenue)}</div>
                <div class="growth">+${product.growth}%</div>
            </div>
        </div>
    `
}

function setupAnalyticsActions() {
  // Add analytics action handlers here
  console.log("Analytics actions initialized")
}

function formatCurrency(number) {
  return "$" + number.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,")
}
