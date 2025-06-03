import { Chart } from "@/components/ui/chart"
// Charts functionality for analytics page
function initializeCharts() {
  if (typeof Chart === "undefined") {
    console.log("Chart.js not loaded, skipping chart initialization")
    return
  }

  initializeRevenueChart()
  initializeOrdersChart()
}

function initializeRevenueChart() {
  const ctx = document.getElementById("revenueChart")
  if (!ctx) return

  new Chart(ctx, {
    type: "line",
    data: {
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      datasets: [
        {
          label: "Revenue",
          data: [12000, 19000, 15000, 25000, 22000, 30000],
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
          labels: {
            color: "#d1d5db",
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: "#9ca3af",
          },
          grid: {
            color: "#374151",
          },
        },
        y: {
          ticks: {
            color: "#9ca3af",
          },
          grid: {
            color: "#374151",
          },
        },
      },
    },
  })
}

function initializeOrdersChart() {
  const ctx = document.getElementById("ordersChart")
  if (!ctx) return

  new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Shipped", "Pending", "Processing", "Delivered"],
      datasets: [
        {
          data: [156, 23, 45, 89],
          backgroundColor: ["#10b981", "#fbbf24", "#3b82f6", "#8b5cf6"],
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: "#d1d5db",
            padding: 20,
          },
        },
      },
    },
  })
}
