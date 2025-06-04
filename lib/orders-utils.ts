import { updateRawMaterial, updateInventoryItem, logActivity } from "@/lib/database"
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
  order_id?: number
  material_id: number
  material_name: string
  quantity: number
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

    // Now create the material entries
    const materialEntries = []
    for (const material of orderData.materials) {
      // Get material details for cost calculation
      const { data: rawMaterial, error: materialError } = await supabase!
        .from("raw_materials")
        .select("name, cost_per_unit")
        .eq("id", material.materialId)
        .single()

      if (materialError) {
        console.error("Error fetching material details:", materialError)
        // Continue with default values if material not found
        materialEntries.push({
          order_id: order.id,
          material_id: material.materialId,
          material_name: `Material ${material.materialId}`,
          quantity: material.quantity,
          cost_per_unit: 0,
        })
      } else {
        materialEntries.push({
          order_id: order.id,
          material_id: material.materialId,
          material_name: rawMaterial.name,
          quantity: material.quantity,
          cost_per_unit: rawMaterial.cost_per_unit || 0,
        })
      }
    }

    const { data: materials, error: materialsError } = await supabase!
      .from("product_order_materials")
      .insert(materialEntries)
      .select()

    if (materialsError) {
      console.error("Error creating product order materials:", materialsError)
      // Rollback: delete the order
      await supabase!.from("product_orders").delete().eq("id", order.id)
      throw new Error(`Failed to create product order materials: ${materialsError.message}`)
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
        order_id: m.order_id,
        material_id: m.material_id,
        material_name: m.material_name,
        quantity: m.quantity,
        cost_per_unit: m.cost_per_unit,
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
        const { data: materials, error: materialsError } = await supabase!
          .from("product_order_materials")
          .select("*")
          .eq("order_id", order.id)

        if (materialsError) {
          console.error(`Error fetching materials for order ${order.id}:`, materialsError)
          return {
            ...order,
            materials: [],
          }
        }

        return {
          ...order,
          materials: materials || [],
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

    const { data: materials, error: materialsError } = await supabase!
      .from("product_order_materials")
      .select("*")
      .eq("order_id", order.id)

    if (materialsError) {
      console.error(`Error fetching materials for order ${order.id}:`, materialsError)
      return {
        ...order,
        materials: [],
      }
    }

    return {
      ...order,
      materials: materials || [],
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

    // If completed, move to history and update inventory
    if (status === "completed") {
      await moveOrderToHistory(orderId)
      await updateInventoryForCompletedOrder(order)
    }

    // Log activity
    await logActivity("update", `Updated product order #${orderId} status to ${status}`)

    // Fetch materials
    const { data: materials } = await supabase!.from("product_order_materials").select("*").eq("order_id", orderId)

    return {
      ...order,
      materials: materials || [],
    }
  } catch (error: any) {
    console.error("Error in updateProductOrderStatus:", error)
    return null
  }
}

// Move completed order to history
async function moveOrderToHistory(orderId: number): Promise<void> {
  try {
    // Get the order data
    const { data: order, error: fetchError } = await supabase!
      .from("product_orders")
      .select("*")
      .eq("id", orderId)
      .single()

    if (fetchError || !order) {
      console.error("Error fetching order for history:", fetchError)
      return
    }

    // Insert into history
    const { error: historyError } = await supabase!.from("product_order_history").insert({
      original_order_id: order.id,
      product_id: order.product_id,
      product_name: order.product_name,
      quantity: order.quantity,
      status: order.status,
      created_at: order.created_at,
      updated_at: order.updated_at,
      completed_at: order.completed_at,
    })

    if (historyError) {
      console.error("Error moving order to history:", historyError)
      return
    }

    // Delete from active orders
    const { error: deleteError } = await supabase!.from("product_orders").delete().eq("id", orderId)

    if (deleteError) {
      console.error("Error deleting completed order:", deleteError)
    }
  } catch (error: any) {
    console.error("Error in moveOrderToHistory:", error)
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
      // Product doesn't exist in inventory, you might want to create it
      console.log(`Product ${order.product_name} not found in inventory - completed order recorded in history`)
    }
  } catch (error: any) {
    console.error("Error updating inventory for completed order:", error)
  }
}

// Delete product order
export async function deleteProductOrder(orderId: number): Promise<boolean> {
  try {
    // First delete materials
    const { error: materialsError } = await supabase!.from("product_order_materials").delete().eq("order_id", orderId)

    if (materialsError) {
      console.error("Error deleting product order materials:", materialsError)
      return false
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
      await supabase!.from("product_order_materials").delete().eq("order_id", orderId)

      // Insert new materials
      const materialEntries = []
      for (const material of updates.materials) {
        const { data: rawMaterial } = await supabase!
          .from("raw_materials")
          .select("name, cost_per_unit")
          .eq("id", material.materialId)
          .single()

        materialEntries.push({
          order_id: orderId,
          material_id: material.materialId,
          material_name: rawMaterial?.name || `Material ${material.materialId}`,
          quantity: material.quantity,
          cost_per_unit: rawMaterial?.cost_per_unit || 0,
        })
      }

      await supabase!.from("product_order_materials").insert(materialEntries)
    }

    // Fetch updated materials
    const { data: materials } = await supabase!.from("product_order_materials").select("*").eq("order_id", orderId)

    await logActivity("update", `Updated product order #${orderId}`)

    return {
      ...order,
      materials: materials || [],
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
