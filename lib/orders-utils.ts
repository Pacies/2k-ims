import { updateRawMaterial, updateInventoryItem, logActivity, addInventoryItem } from "@/lib/database"
import { supabase } from "@/lib/supabaseClient"

export interface Order {
  id: string
  date: string
  customer: string
  items: string
  total: number
  status: "Pending" | "Processing" | "Shipped" | "Delivered" | "Cancelled"
}

export interface ProductOrder {
  id: number
  product_id: number
  product_name: string
  quantity: number
  status: "pending" | "in-progress" | "completed" | "cancelled"
  materials: ProductOrderMaterial[]
  created_at: string
  updated_at: string
  completed_at?: string
}

export interface ProductOrderMaterial {
  id?: number
  product_order_id?: number
  material_id: number
  material_name?: string
  quantity_required: number
  cost_per_unit?: number
}

export interface CreateProductOrderData {
  productId: number
  productName: string
  quantity: number
  materials: Array<{
    materialId: number
    quantity: number
  }>
  status: "pending" | "in-progress" | "completed" | "cancelled"
}

// Generate random orders
export function generateOrders(count: number): Order[] {
  const statuses: Order["status"][] = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"]
  const customers = ["John Doe", "Jane Smith", "Robert Johnson", "Emily Davis", "Michael Brown"]
  const orders: Order[] = []

  for (let i = 0; i < count; i++) {
    const items = Math.floor(Math.random() * 5) + 1
    const total = Number.parseFloat((Math.random() * 500 + 20).toFixed(2))
    const status = statuses[Math.floor(Math.random() * statuses.length)]

    // Generate a random date within the last 30 days
    const date = new Date()
    date.setDate(date.getDate() - Math.floor(Math.random() * 30))

    orders.push({
      id: (1000 + i).toString(),
      date: date.toLocaleDateString(),
      customer: customers[Math.floor(Math.random() * customers.length)],
      items: `${items} item${items > 1 ? "s" : ""}`,
      total: total,
      status: status,
    })
  }

  return orders
}

// Determine product category based on name
function determineProductCategory(productName: string): "Top" | "Bottom" {
  const lowerName = productName.toLowerCase()

  // Check for bottom keywords
  if (
    lowerName.includes("pant") ||
    lowerName.includes("short") ||
    lowerName.includes("pajama") ||
    lowerName.includes("skirt") ||
    lowerName.includes("bottom")
  ) {
    return "Bottom"
  }

  // Default to Top for everything else
  return "Top"
}

// Create a new product order
export async function createProductOrder(orderData: CreateProductOrderData): Promise<ProductOrder | null> {
  try {
    console.log("Creating product order:", orderData)

    // Start a transaction by creating the main order first
    const { data: order, error: orderError } = await supabase!
      .from("product_orders")
      .insert({
        product_id: orderData.productId,
        product_name: orderData.productName,
        quantity: orderData.quantity,
        status: orderData.status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (orderError) {
      console.error("Error creating product order:", orderError)
      throw new Error(`Failed to create product order: ${orderError.message}`)
    }

    console.log("Created order:", order)

    // Now create the material entries - only include columns that exist
    const materialEntries = []
    for (const material of orderData.materials) {
      materialEntries.push({
        product_order_id: order.id,
        material_id: material.materialId,
        quantity_required: material.quantity,
        created_at: new Date().toISOString(),
      })
    }

    // Try to insert materials
    let materials = []
    if (materialEntries.length > 0) {
      const { data: materialsData, error: materialsError } = await supabase!
        .from("product_order_materials")
        .insert(materialEntries)
        .select()

      if (materialsError) {
        console.error("Error creating product order materials:", materialsError)
        throw new Error(`Failed to create product order materials: ${materialsError.message}`)
      } else {
        materials = materialsData || []
      }
    }

    console.log("Created materials:", materials)

    // Deduct raw materials from inventory
    for (const material of orderData.materials) {
      try {
        // Get current quantity
        const { data: currentMaterial, error: fetchError } = await supabase!
          .from("raw_materials")
          .select("quantity")
          .eq("id", material.materialId)
          .single()

        if (fetchError) {
          console.error(`Error fetching material ${material.materialId}:`, fetchError)
          continue
        }

        const newQuantity = Math.max(0, (currentMaterial.quantity || 0) - material.quantity)
        await updateRawMaterial(material.materialId, { quantity: newQuantity })
        console.log(`Updated material ${material.materialId} quantity to ${newQuantity}`)
      } catch (error) {
        console.error(`Error updating material ${material.materialId}:`, error)
        // Continue with other materials even if one fails
      }
    }

    // Log activity
    await logActivity(
      "create",
      `Created product order for ${orderData.quantity}x ${orderData.productName} (Order #${order.id})`,
    )

    // Return the complete order with materials
    const completeOrder: ProductOrder = {
      ...order,
      materials: materials.map((m: any) => ({
        id: m.id,
        product_order_id: m.product_order_id,
        material_id: m.material_id,
        quantity_required: m.quantity_required,
        cost_per_unit: 0, // Default value since column might not exist
      })),
    }

    return completeOrder
  } catch (error: any) {
    console.error("Error in createProductOrder:", error)
    throw error
  }
}

// Get all active product orders
export async function getProductOrders(): Promise<ProductOrder[]> {
  try {
    const { data: orders, error: ordersError } = await supabase!
      .from("product_orders")
      .select("*")
      .neq("status", "completed")
      .order("created_at", { ascending: false })

    if (ordersError) {
      console.error("Error fetching product orders:", ordersError)
      return []
    }

    if (!orders || orders.length === 0) {
      return []
    }

    // Fetch materials for each order
    const ordersWithMaterials = await Promise.all(
      orders.map(async (order) => {
        try {
          const { data: materials, error: materialsError } = await supabase!
            .from("product_order_materials")
            .select("*")
            .eq("product_order_id", order.id)

          if (materialsError) {
            console.error(`Error fetching materials for order ${order.id}:`, materialsError)
            return {
              ...order,
              materials: [],
            }
          }

          return {
            ...order,
            materials: (materials || []).map((m: any) => ({
              ...m,
              cost_per_unit: m.cost_per_unit || 0, // Default if column doesn't exist
            })),
          }
        } catch (error) {
          console.error(`Exception fetching materials for order ${order.id}:`, error)
          return {
            ...order,
            materials: [],
          }
        }
      }),
    )

    return ordersWithMaterials
  } catch (error: any) {
    console.error("Error in getProductOrders:", error)
    return []
  }
}

// Get product order by ID
export async function getProductOrderById(id: number): Promise<ProductOrder | null> {
  try {
    const { data: order, error: orderError } = await supabase!.from("product_orders").select("*").eq("id", id).single()

    if (orderError) {
      console.error("Error fetching product order:", orderError)
      return null
    }

    if (!order) return null

    // Try to fetch materials with better error handling
    let materials = []
    try {
      const { data: materialsData, error: materialsError } = await supabase!
        .from("product_order_materials")
        .select("*")
        .eq("product_order_id", id)

      if (materialsError) {
        console.error(`Error fetching materials for order ${id}:`, materialsError)
        // Continue with empty materials array
      } else {
        materials = (materialsData || []).map((m: any) => ({
          ...m,
          cost_per_unit: m.cost_per_unit || 0, // Default if column doesn't exist
        }))
      }
    } catch (materialsFetchError) {
      console.error(`Exception fetching materials for order ${id}:`, materialsFetchError)
      // Continue with empty materials array
    }

    return {
      ...order,
      materials: materials,
    }
  } catch (error: any) {
    console.error("Error fetching product order:", error)
    return null
  }
}

// Update product order status
export async function updateProductOrderStatus(
  orderId: number,
  status: "pending" | "in-progress" | "completed" | "cancelled",
): Promise<ProductOrder | null> {
  try {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    }

    if (status === "completed") {
      updateData.completed_at = new Date().toISOString()
    }

    const { data: order, error: orderError } = await supabase!
      .from("product_orders")
      .update(updateData)
      .eq("id", orderId)
      .select()
      .single()

    if (orderError) {
      console.error("Error updating product order status:", orderError)
      return null
    }

    // If completed, update inventory and move to history
    if (status === "completed") {
      // First update inventory
      await updateInventoryForCompletedOrder(order)

      // Then move to history
      await moveOrderToHistory(orderId, order)
    }

    // Log activity
    await logActivity("update", `Updated product order #${orderId} status to ${status}`)

    // Fetch materials
    let materials = []
    try {
      const { data: materialsData } = await supabase!
        .from("product_order_materials")
        .select("*")
        .eq("product_order_id", orderId)
      materials = (materialsData || []).map((m: any) => ({
        ...m,
        cost_per_unit: m.cost_per_unit || 0, // Default if column doesn't exist
      }))
    } catch (error) {
      console.error("Error fetching materials after status update:", error)
    }

    return {
      ...order,
      materials: materials,
    }
  } catch (error: any) {
    console.error("Error in updateProductOrderStatus:", error)
    return null
  }
}

// Move completed order to history
async function moveOrderToHistory(orderId: number, orderData?: any): Promise<void> {
  try {
    // Get the order data if not provided
    let order = orderData
    if (!order) {
      const { data: fetchedOrder, error: fetchError } = await supabase!
        .from("product_orders")
        .select("*")
        .eq("id", orderId)
        .single()

      if (fetchError || !fetchedOrder) {
        console.error("Error fetching order for history:", fetchError)
        return
      }
      order = fetchedOrder
    }

    console.log("Moving order to history:", order)

    // Insert into history with only the basic required columns
    const historyData = {
      original_order_id: order.id,
      product_name: order.product_name,
      quantity: order.quantity,
      status: order.status,
      completed_at: order.completed_at || new Date().toISOString(),
    }

    // Add optional columns only if they exist in the source order
    if (order.product_id) {
      historyData.product_id = order.product_id
    }

    console.log("Inserting history data:", historyData)

    const { data: historyResult, error: historyError } = await supabase!
      .from("product_order_history")
      .insert(historyData)
      .select()

    if (historyError) {
      console.error("Error moving order to history:", historyError)
      throw new Error(`Failed to move order to history: ${historyError.message}`)
    }

    console.log("Successfully moved to history:", historyResult)

    // Delete from active orders
    const { error: deleteError } = await supabase!.from("product_orders").delete().eq("id", orderId)

    if (deleteError) {
      console.error("Error deleting completed order:", deleteError)
      throw new Error(`Failed to delete completed order: ${deleteError.message}`)
    }

    console.log("Successfully deleted from active orders")
  } catch (error: any) {
    console.error("Error in moveOrderToHistory:", error)
    throw error
  }
}

// Update inventory when order is completed
async function updateInventoryForCompletedOrder(order: any): Promise<void> {
  try {
    // Check if product exists in inventory
    const { data: inventoryItem, error: fetchError } = await supabase!
      .from("inventory_items")
      .select("*")
      .eq("name", order.product_name)
      .single()

    if (fetchError && fetchError.code !== "PGRST116") {
      // PGRST116 is "not found" error
      console.error("Error fetching inventory item:", fetchError)
      return
    }

    if (inventoryItem) {
      // Update existing inventory
      const newStock = (inventoryItem.stock || 0) + order.quantity
      await updateInventoryItem(inventoryItem.id, { stock: newStock })
      console.log(`Updated inventory for ${order.product_name}: +${order.quantity} (total: ${newStock})`)
    } else {
      // Product doesn't exist in inventory, create it
      console.log(`Product ${order.product_name} not found in inventory - creating new inventory item`)

      // Get product price from fixed_prices table
      let productPrice = 0
      try {
        const { data: fixedPrice, error: priceError } = await supabase!
          .from("fixed_prices")
          .select("price")
          .eq("item_name", order.product_name)
          .eq("item_type", "product")
          .single()

        if (!priceError && fixedPrice) {
          productPrice = fixedPrice.price
        }
      } catch (priceError) {
        console.warn("Could not fetch product price, using default:", priceError)
      }

      // Determine category based on product name (Top or Bottom)
      const category = determineProductCategory(order.product_name)

      // Create new inventory item
      const newInventoryItem = {
        name: order.product_name,
        category: category,
        price: productPrice,
        stock: order.quantity,
      }

      const createdItem = await addInventoryItem(newInventoryItem)
      if (createdItem) {
        console.log(
          `Created new inventory item for ${order.product_name} with ${order.quantity} units in category ${category}`,
        )
      } else {
        console.error(`Failed to create inventory item for ${order.product_name}`)
      }
    }
  } catch (error: any) {
    console.error("Error updating inventory for completed order:", error)
  }
}

// Delete product order
export async function deleteProductOrder(orderId: number): Promise<boolean> {
  try {
    // First delete materials
    try {
      const { error: materialsError } = await supabase!
        .from("product_order_materials")
        .delete()
        .eq("product_order_id", orderId)
      if (materialsError) {
        console.error("Error deleting product order materials:", materialsError)
        // Continue anyway
      }
    } catch (error) {
      console.error("Exception deleting materials:", error)
      // Continue anyway
    }

    // Then delete the order
    const { error: orderError } = await supabase!.from("product_orders").delete().eq("id", orderId)

    if (orderError) {
      console.error("Error deleting product order:", orderError)
      return false
    }

    await logActivity("delete", `Deleted product order #${orderId}`)
    return true
  } catch (error: any) {
    console.error("Error in deleteProductOrder:", error)
    return false
  }
}

// Delete product order from history
export async function deleteProductOrderHistory(historyId: number): Promise<boolean> {
  try {
    const { error: deleteError } = await supabase!.from("product_order_history").delete().eq("id", historyId)

    if (deleteError) {
      console.error("Error deleting product order history:", deleteError)
      return false
    }

    await logActivity("delete", `Deleted product order history #${historyId}`)
    return true
  } catch (error: any) {
    console.error("Error in deleteProductOrderHistory:", error)
    return false
  }
}

// Update product order
export async function updateProductOrder(
  orderId: number,
  updates: Partial<CreateProductOrderData>,
): Promise<ProductOrder | null> {
  try {
    // Update main order
    const orderUpdates: any = {
      updated_at: new Date().toISOString(),
    }

    if (updates.productName) orderUpdates.product_name = updates.productName
    if (updates.quantity) orderUpdates.quantity = updates.quantity
    if (updates.status) orderUpdates.status = updates.status

    const { data: order, error: orderError } = await supabase!
      .from("product_orders")
      .update(orderUpdates)
      .eq("id", orderId)
      .select()
      .single()

    if (orderError) {
      console.error("Error updating product order:", orderError)
      return null
    }

    // Update materials if provided
    if (updates.materials) {
      // Delete existing materials
      try {
        await supabase!.from("product_order_materials").delete().eq("product_order_id", orderId)
      } catch (error) {
        console.error("Error deleting existing materials:", error)
      }

      // Insert new materials - only include columns that exist
      const materialEntries = []
      for (const material of updates.materials) {
        materialEntries.push({
          product_order_id: orderId,
          material_id: material.materialId,
          quantity_required: material.quantity,
          created_at: new Date().toISOString(),
        })
      }

      try {
        await supabase!.from("product_order_materials").insert(materialEntries)
      } catch (error) {
        console.error("Error inserting new materials:", error)
      }
    }

    // Fetch updated materials
    let materials = []
    try {
      const { data: materialsData } = await supabase!
        .from("product_order_materials")
        .select("*")
        .eq("product_order_id", orderId)
      materials = (materialsData || []).map((m: any) => ({
        ...m,
        cost_per_unit: m.cost_per_unit || 0, // Default if column doesn't exist
      }))
    } catch (error) {
      console.error("Error fetching updated materials:", error)
    }

    await logActivity("update", `Updated product order #${orderId}`)

    return {
      ...order,
      materials: materials,
    }
  } catch (error: any) {
    console.error("Error in updateProductOrder:", error)
    return null
  }
}

// Get product order history
export async function getProductOrderHistory(): Promise<ProductOrder[]> {
  try {
    const { data: orders, error: ordersError } = await supabase!
      .from("product_order_history")
      .select("*")
      .order("completed_at", { ascending: false })

    if (ordersError) {
      console.error("Error fetching product order history:", ordersError)
      return []
    }

    if (!orders || orders.length === 0) {
      return []
    }

    // For history, we'll return orders without materials for now
    // You can extend this to include materials if needed
    return orders.map((order) => ({
      ...order,
      materials: [],
    }))
  } catch (error: any) {
    console.error("Error in getProductOrderHistory:", error)
    return []
  }
}
