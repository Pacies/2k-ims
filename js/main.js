// Main application JavaScript
import supabase from "../lib/supabaseClient"
document.addEventListener("DOMContentLoaded", () => {
  console.log("DeepStock application loaded")

  // Initialize common functionality
  initializeNavigation()
  initializeTheme()
})

function initializeNavigation() {
  // Set active navigation link based on current page
  const currentPage = window.location.pathname.split("/").pop()
  const navLinks = document.querySelectorAll(".nav-links a")

  navLinks.forEach((link) => {
    const href = link.getAttribute("href")
    if (href === currentPage) {
      link.classList.add("active")
    } else {
      link.classList.remove("active")
    }
  })
}

function initializeTheme() {
  // Add any theme-related initialization here
  document.body.classList.add("theme-dark")
}

// Utility functions
function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date))
}

function showNotification(message, type = "info") {
  // Simple notification system
  const notification = document.createElement("div")
  notification.className = `notification notification-${type}`
  notification.textContent = message

  document.body.appendChild(notification)

  setTimeout(() => {
    notification.remove()
  }, 3000)
}
