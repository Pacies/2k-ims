// User management functionality

// Mock users database (in real app, this would be from database)
let users = [
  {
    id: 1,
    username: "admin",
    password: "admin123",
    type: "admin",
    status: "active",
    lastLogin: "2024-01-15 10:30:00",
    createdDate: "2024-01-01 09:00:00",
  },
  {
    id: 2,
    username: "staff",
    password: "staff123",
    type: "staff",
    status: "active",
    lastLogin: "2024-01-14 14:20:00",
    createdDate: "2024-01-02 11:00:00",
  },
  {
    id: 3,
    username: "john_staff",
    password: "john123",
    type: "staff",
    status: "active",
    lastLogin: "2024-01-13 16:45:00",
    createdDate: "2024-01-05 13:30:00",
  },
]

let editingUserId = null

function loadUsers() {
  const tableBody = document.getElementById("usersTableBody")
  if (!tableBody) return

  tableBody.innerHTML = users
    .map(
      (user) => `
        <tr>
            <td style="font-weight: 500;">${user.username}</td>
            <td>
                <span class="badge ${user.type === "admin" ? "badge-admin" : "badge-staff"}">
                    ${user.type.charAt(0).toUpperCase() + user.type.slice(1)}
                </span>
            </td>
            <td>
                <span class="status-badge ${user.status === "active" ? "active" : "inactive"}">
                    ${user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                </span>
            </td>
            <td>${formatDate(user.lastLogin)}</td>
            <td>${formatDate(user.createdDate)}</td>
            <td>
                <button class="btn-icon" onclick="editUser(${user.id})" title="Edit User">
                    <svg class="icon" viewBox="0 0 24 24">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                </button>
                <button class="btn-icon btn-danger" onclick="deleteUser(${user.id})" title="Delete User">
                    <svg class="icon" viewBox="0 0 24 24">
                        <polyline points="3,6 5,6 21,6"></polyline>
                        <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                </button>
            </td>
        </tr>
    `,
    )
    .join("")
}

function openAddUserModal() {
  editingUserId = null
  document.getElementById("modalTitle").textContent = "Add New User"
  document.getElementById("userForm").reset()
  document.getElementById("userModal").style.display = "flex"

  // Add animation
  const modalContent = document.querySelector("#userModal .modal-content")
  modalContent.style.animation = "slideInUp 0.3s ease-out"
}

function editUser(userId) {
  const user = users.find((u) => u.id === userId)
  if (!user) return

  editingUserId = userId
  document.getElementById("modalTitle").textContent = "Edit User"
  document.getElementById("modalUsername").value = user.username
  document.getElementById("modalPassword").value = user.password
  document.getElementById("modalUserType").value = user.type
  document.getElementById("modalStatus").value = user.status
  document.getElementById("userModal").style.display = "flex"

  // Add animation
  const modalContent = document.querySelector("#userModal .modal-content")
  modalContent.style.animation = "slideInUp 0.3s ease-out"
}

function closeUserModal() {
  const modalContent = document.querySelector("#userModal .modal-content")
  modalContent.style.animation = "slideOutDown 0.3s ease-out"

  setTimeout(() => {
    document.getElementById("userModal").style.display = "none"
  }, 300)
}

function saveUser(event) {
  event.preventDefault()

  const username = document.getElementById("modalUsername").value
  const password = document.getElementById("modalPassword").value
  const userType = document.getElementById("modalUserType").value
  const status = document.getElementById("modalStatus").value

  // Check if username already exists (for new users or different user)
  const existingUser = users.find((u) => u.username === username && u.id !== editingUserId)
  if (existingUser) {
    alert("Username already exists. Please choose a different username.")
    return
  }

  if (editingUserId) {
    // Update existing user
    const userIndex = users.findIndex((u) => u.id === editingUserId)
    if (userIndex !== -1) {
      users[userIndex] = {
        ...users[userIndex],
        username,
        password,
        type: userType,
        status,
      }
    }
  } else {
    // Add new user
    const newUser = {
      id: Math.max(...users.map((u) => u.id)) + 1,
      username,
      password,
      type: userType,
      status,
      lastLogin: "Never",
      createdDate: new Date().toISOString().slice(0, 19).replace("T", " "),
    }
    users.push(newUser)
  }

  loadUsers()
  closeUserModal()

  // Show success message
  showNotification(editingUserId ? "User updated successfully!" : "User added successfully!", "success")
}

let userToDelete = null

function deleteUser(userId) {
  const user = users.find((u) => u.id === userId)
  if (!user) return

  userToDelete = userId
  document.getElementById("deleteModal").style.display = "flex"

  // Add animation
  const modalContent = document.querySelector("#deleteModal .modal-content")
  modalContent.style.animation = "slideInUp 0.3s ease-out"
}

function closeDeleteModal() {
  const modalContent = document.querySelector("#deleteModal .modal-content")
  modalContent.style.animation = "slideOutDown 0.3s ease-out"

  setTimeout(() => {
    document.getElementById("deleteModal").style.display = "none"
    userToDelete = null
  }, 300)
}

function confirmDeleteUser() {
  if (!userToDelete) return

  users = users.filter((u) => u.id !== userToDelete)
  loadUsers()
  closeDeleteModal()

  // Show success message
  showNotification("User deleted successfully!", "success")
}

function exportUsers() {
  // Create CSV content
  const headers = ["Username", "User Type", "Status", "Last Login", "Created Date"]
  const csvContent = [
    headers.join(","),
    ...users.map((user) => [user.username, user.type, user.status, user.lastLogin, user.createdDate].join(",")),
  ].join("\n")

  // Create and download file
  const blob = new Blob([csvContent], { type: "text/csv" })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "users_export.csv"
  a.click()
  window.URL.revokeObjectURL(url)

  showNotification("Users exported successfully!", "success")
}

function formatDate(dateString) {
  if (dateString === "Never") return "Never"
  const date = new Date(dateString)
  return date.toLocaleDateString() + " " + date.toLocaleTimeString()
}

function showNotification(message, type = "info") {
  const notification = document.createElement("div")
  notification.className = `notification notification-${type}`
  notification.textContent = message
  notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 0.5rem;
        color: white;
        font-weight: 500;
        z-index: 10000;
        animation: slideInRight 0.3s ease-out;
    `

  if (type === "success") {
    notification.style.background = "#10b981"
  } else if (type === "error") {
    notification.style.background = "#ef4444"
  } else {
    notification.style.background = "#3b82f6"
  }

  document.body.appendChild(notification)

  setTimeout(() => {
    notification.style.animation = "slideOutRight 0.3s ease-out"
    setTimeout(() => {
      notification.remove()
    }, 300)
  }, 3000)
}

// Add CSS for animations
const style = document.createElement("style")
style.textContent = `
    @keyframes slideInUp {
        from {
            opacity: 0;
            transform: translateY(50px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    @keyframes slideOutDown {
        from {
            opacity: 1;
            transform: translateY(0);
        }
        to {
            opacity: 0;
            transform: translateY(50px);
        }
    }
    
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(100px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes slideOutRight {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100px);
        }
    }
`
document.head.appendChild(style)
