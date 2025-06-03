// Orders page specific JavaScript
document.addEventListener("DOMContentLoaded", () => {
  // Initialize orders page
  // Check if the current page is orders.html before initializing
  if (window.location.pathname.includes("orders.html")) {
    initializeOrdersPage()
  } else {
    initializeOrders() // Keep the original initialization for other pages if needed
  }
})

// Mock activityStore for demonstration purposes.  In a real application,
// this would be properly imported or defined.
const activityStore = {
  addActivity: (activity) => {
    console.log("Activity:", activity)
  },
}

function initializeOrders() {
  // Generate order data
  const orders = [
    {
      id: "ORD-001",
      customer: "John Doe",
      products: "Wireless Headphones, USB Cable",
      total: 329.98,
      status: "shipped",
      date: "2024-01-15",
    },
    {
      id: "ORD-002",
      customer: "Jane Smith",
      products: "Gaming Monitor",
      total: 599.99,
      status: "pending",
      date: "2024-01-14",
    },
    {
      id: "ORD-003",
      customer: "Mike Johnson",
      products: "Mechanical Keyboard, Wireless Mouse",
      total: 229.98,
      status: "processing",
      date: "2024-01-13",
    },
    {
      id: "ORD-004",
      customer: "Sarah Wilson",
      products: "USB Microphone",
      total: 199.99,
      status: "delivered",
      date: "2024-01-12",
    },
    {
      id: "ORD-005",
      customer: "David Brown",
      products: "Smartphone Case",
      total: 49.99,
      status: "cancelled",
      date: "2024-01-11",
    },
  ]

  // Render orders
  renderOrders(orders)
}

function renderOrders(orders) {
  const ordersTableBody = document.getElementById("orders-table-body")
  if (!ordersTableBody) return

  ordersTableBody.innerHTML = ""

  orders.forEach((order, index) => {
    const row = document.createElement("tr")
    row.className = "fade-in-animation"
    row.style.animationDelay = `${index * 0.05}s`

    // Get status class and badge
    const statusBadge = getStatusBadge(order.status)

    row.innerHTML = `
            <td class="font-medium text-white">${order.id}</td>
            <td>${order.customer}</td>
            <td>${order.products}</td>
            <td class="font-medium text-white">$${order.total.toFixed(2)}</td>
            <td>${statusBadge}</td>
            <td>${order.date}</td>
            <td>
                <button class="text-blue" onclick="viewOrder('${order.id}')">View</button>
                <button class="text-gray" onclick="editOrder('${order.id}')">Edit</button>
            </td>
        `

    ordersTableBody.appendChild(row)
  })
}

function getStatusBadge(status) {
  let badgeClass = ""
  let statusText = ""

  switch (status) {
    case "shipped":
      badgeClass = "badge badge-green"
      statusText = "Shipped"
      break
    case "pending":
      badgeClass = "badge badge-yellow"
      statusText = "Pending"
      break
    case "processing":
      badgeClass = "badge badge-blue"
      statusText = "Processing"
      break
    case "delivered":
      badgeClass = "badge badge-green"
      statusText = "Delivered"
      break
    case "cancelled":
      badgeClass = "badge badge-red"
      statusText = "Cancelled"
      break
    default:
      badgeClass = "badge badge-blue"
      statusText = status.charAt(0).toUpperCase() + status.slice(1)
  }

  return `<span class="${badgeClass}">${statusText}</span>`
}

function viewOrder(orderId) {
  alert(`Viewing order ${orderId}`)
  activityStore.addActivity(`Viewed order: ${orderId}`)
}

function editOrder(orderId) {
  alert(`Editing order ${orderId}`)
  activityStore.addActivity(`Edited order: ${orderId}`)
}

function initializeOrdersPage() {
  loadOrders()
  setupOrderActions()
}

function loadOrders() {
  const ordersTableBody = document.getElementById("orders-table-body")
  if (!ordersTableBody) return

  const orders = [
    {
      id: "ORD-001",
      customer: "John Doe",
      products: "Wireless Headphones, USB Cable",
      total: 329.98,
      status: "shipped",
      date: "2024-01-15",
    },
    {
      id: "ORD-002",
      customer: "Jane Smith",
      products: "Gaming Monitor",
      total: 599.99,
      status: "pending",
      date: "2024-01-14",
    },
    {
      id: "ORD-003",
      customer: "Mike Johnson",
      products: "Mechanical Keyboard, Wireless Mouse",
      total: 229.98,
      status: "processing",
      date: "2024-01-13",
    },
    {
      id: "ORD-004",
      customer: "Sarah Wilson",
      products: "USB Microphone",
      total: 199.99,
      status: "delivered",
      date: "2024-01-12",
    },
    {
      id: "ORD-005",
      customer: "David Brown",
      products: "Smartphone Case",
      total: 49.99,
      status: "cancelled",
      date: "2024-01-11",
    },
  ]

  ordersTableBody.innerHTML = orders.map((order) => createOrderRow(order)).join("")
}

function createOrderRow(order) {
  return `
        <tr>
            <td style="font-weight: 500;">#${order.id}</td>
            <td>${order.customer}</td>
            <td>${order.products}</td>
            <td style="font-weight: 500;">${formatCurrency(order.total)}</td>
            <td>
                <span class="status-badge ${order.status}">${capitalizeFirst(order.status)}</span>
            </td>
            <td>${formatDate(order.date)}</td>
            <td>
                <button style="color: #60a5fa; background: none; border: none; cursor: pointer; margin-right: 0.75rem;" onclick="viewOrder('${order.id}')">View</button>
                <button style="color: #9ca3af; background: none; border: none; cursor: pointer;" onclick="editOrder('${order.id}')">Edit</button>
            </td>
        </tr>
    `
}

function setupOrderActions() {
  // Add order action handlers here
  console.log("Order actions initialized")
}

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function formatCurrency(number) {
  return "$" + number.toFixed(2)
}

function formatDate(dateString) {
  const date = new Date(dateString)
  const options = { year: "numeric", month: "long", day: "numeric" }
  return date.toLocaleDateString(undefined, options)
}
