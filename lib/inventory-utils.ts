// lib/inventory-utils.ts

export interface InventoryItem {
  id: string
  name: string
  category: string
  price: number
  stock: number
  image: string
}

const colors = ["Red", "Blue", "Green", "Yellow", "Purple", "Orange", "Pink"]

function getRandomColor(): string {
  return colors[Math.floor(Math.random() * colors.length)]
}

function getRandomItem(category: string): string {
  switch (category) {
    case "Shirts":
      return shirtNames[Math.floor(Math.random() * shirtNames.length)]
    case "Pants":
      return pantNames[Math.floor(Math.random() * pantNames.length)]
    case "Dresses":
      return dressNames[Math.floor(Math.random() * dressNames.length)]
    case "Accessories":
      return accessoryNames[Math.floor(Math.random() * accessoryNames.length)]
    default:
      return "Item"
  }
}

const shirtNames = ["T-Shirt", "Polo Shirt", "Button-Down Shirt", "Tank Top", "Long Sleeve Shirt"]
const pantNames = ["Jeans", "Dress Pants", "Shorts", "Sweatpants", "Leggings"]
const dressNames = ["Sundress", "Cocktail Dress", "Maxi Dress", "Mini Dress", "Formal Gown"]
const accessoryNames = ["Necklace", "Earrings", "Bracelet", "Hat", "Scarf", "Belt", "Watch"]

// Generate random inventory items
export function generateInventoryItems(count = 0): InventoryItem[] {
  if (count === 0) return []

  const categories = ["Shirts", "Pants", "Dresses", "Accessories"]
  const items: InventoryItem[] = []

  for (let i = 0; i < count; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)]
    const stock = Math.floor(Math.random() * 30)

    items.push({
      id: (i + 1).toString(),
      name: `${getRandomColor()} ${getRandomItem(category)}`,
      category: category,
      price: Number.parseFloat((Math.random() * 100 + 10).toFixed(2)),
      stock: stock,
      image: `/placeholder.svg?height=200&width=300&text=${category}`,
    })
  }

  return items
}
