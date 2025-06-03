// Feedback page specific JavaScript
document.addEventListener("DOMContentLoaded", () => {
  // Initialize feedback page
  // Check if the current page is feedback.html before initializing
  if (window.location.pathname.includes("feedback.html")) {
    initializeFeedbackPage()
  }
})

function initializeFeedbackPage() {
  loadReviews()
  setupFeedbackActions()
}

function loadReviews() {
  const reviewsContainer = document.getElementById("reviews-container")
  if (!reviewsContainer) return

  const reviews = [
    {
      id: 1,
      author: "John Doe",
      initials: "JD",
      product: "Wireless Headphones",
      rating: 5,
      date: "2 days ago",
      text: "Excellent sound quality and comfortable fit. The noise cancellation works perfectly. Highly recommend!",
      avatar: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
    },
    {
      id: 2,
      author: "Sarah Miller",
      initials: "SM",
      product: "Gaming Monitor",
      rating: 4,
      date: "3 days ago",
      text: "Great monitor for gaming! Colors are vibrant and the refresh rate is smooth. Only minor issue is the stand could be more adjustable.",
      avatar: "linear-gradient(135deg, #10b981, #3b82f6)",
    },
    {
      id: 3,
      author: "Mike Johnson",
      initials: "MJ",
      product: "Mechanical Keyboard",
      rating: 5,
      date: "1 week ago",
      text: "Perfect keyboard for programming! The tactile feedback is amazing and the RGB lighting is customizable. Fast shipping too!",
      avatar: "linear-gradient(135deg, #8b5cf6, #ec4899)",
    },
  ]

  reviewsContainer.innerHTML = reviews.map((review) => createReviewItem(review)).join("")
}

function createReviewItem(review) {
  const stars = Array.from(
    { length: 5 },
    (_, i) => `<span class="star ${i < review.rating ? "filled" : ""}"></span>`,
  ).join("")

  return `
        <div class="review-item">
            <div class="review-header">
                <div class="review-avatar" style="background: ${review.avatar};">
                    ${review.initials}
                </div>
                <div class="review-content">
                    <div class="review-meta">
                        <div>
                            <div class="review-author">${review.author}</div>
                            <div class="review-product">${review.product}</div>
                        </div>
                        <div class="review-rating-date">
                            <div class="rating">${stars}</div>
                            <span class="review-date">${review.date}</span>
                        </div>
                    </div>
                    <p class="review-text">${review.text}</p>
                    <div class="review-actions">
                        <button onclick="replyToReview('${review.id}')">Reply</button>
                        <button onclick="markReviewAsHelpful('${review.id}')">Mark as helpful</button>
                    </div>
                </div>
            </div>
        </div>
    `
}

function setupFeedbackActions() {
  // Add feedback action handlers here
  console.log("Feedback actions initialized")
}

// Mock activityStore for demonstration purposes. In a real application,
// this would likely be a more robust implementation for managing and
// persisting activity data.
const activityStore = {
  activities: [],
  addActivity: function (activity) {
    this.activities.push(activity)
    console.log("Activity added:", activity) // Log for demonstration
  },
  getActivities: function () {
    return this.activities
  },
}

function replyToReview(reviewId) {
  alert(`Replying to review ${reviewId}`)
  activityStore.addActivity(`Replied to review: ${reviewId}`)
}

function markReviewAsHelpful(reviewId) {
  alert(`Marked review ${reviewId} as helpful`)
  activityStore.addActivity(`Marked review as helpful: ${reviewId}`)
}
