// Activity store for managing application state
class ActivityStore {
  constructor() {
    this.activities = []
    this.listeners = []
  }

  addActivity(activity) {
    const newActivity = {
      id: Date.now(),
      timestamp: new Date(),
      ...activity,
    }

    this.activities.unshift(newActivity)
    this.notifyListeners()

    return newActivity
  }

  getActivities(limit = 10) {
    return this.activities.slice(0, limit)
  }

  subscribe(listener) {
    this.listeners.push(listener)
  }

  unsubscribe(listener) {
    this.listeners = this.listeners.filter((l) => l !== listener)
  }

  notifyListeners() {
    this.listeners.forEach((listener) => listener(this.activities))
  }
}

// Global activity store instance
window.activityStore = new ActivityStore()

// Sample activities
window.activityStore.addActivity({
  type: "order",
  message: "New order #ORD-001 received",
  user: "John Doe",
})

window.activityStore.addActivity({
  type: "inventory",
  message: "Low stock alert: Wireless Mouse",
  level: "warning",
})

window.activityStore.addActivity({
  type: "product",
  message: "Product updated: Gaming Monitor",
  user: "Admin",
})
