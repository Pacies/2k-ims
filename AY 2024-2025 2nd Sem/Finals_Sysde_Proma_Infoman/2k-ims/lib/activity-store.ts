export interface Activity {
  id: string
  text: string
  time: string
}

type Subscriber = (activities: Activity[]) => void

class ActivityStore {
  private activities: Activity[] = []
  private subscribers: Subscriber[] = []

  constructor() {
    // Initialize with system start activity
    this.addActivity("System initialized")
  }

  addActivity(text: string) {
    const now = new Date()
    const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

    const newActivity = {
      id: Date.now().toString(),
      text,
      time: time === new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) ? "Just now" : time,
    }

    this.activities = [newActivity, ...this.activities].slice(0, 10)
    this.notifySubscribers()

    return newActivity
  }

  getActivities() {
    return [...this.activities]
  }

  subscribe(callback: Subscriber) {
    this.subscribers.push(callback)

    // Return unsubscribe function
    return () => {
      this.subscribers = this.subscribers.filter((sub) => sub !== callback)
    }
  }

  private notifySubscribers() {
    this.subscribers.forEach((callback) => callback(this.getActivities()))
  }
}

// Create singleton instance
export const activityStore = new ActivityStore()

// Helper function to add activity
export const addActivity = (text: string) => activityStore.addActivity(text)
