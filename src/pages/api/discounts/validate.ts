import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'

// Discount validation function
const validateDiscountCode = async (code: string) => {
  if (!code?.trim()) {
    return { valid: false, error: 'Discount code is required', status: 400 }
  }

  const discount = await prisma.discount.findUnique({
    where: { code: code.toUpperCase().trim() }
  })

  if (!discount) {
    return { valid: false, error: 'Invalid discount code', status: 404 }
  }

  if (discount.status !== 'Active') {
    return { valid: false, error: 'This discount code is not active' }
  }

  const now = new Date()
  if (discount.startAt && now < discount.startAt) {
    return { valid: false, error: 'This discount code is not yet available' }
  }

  if (discount.endAt && now > discount.endAt) {
    return { valid: false, error: 'This discount code has expired' }
  }

  if (discount.limitTotalUses && discount.used >= discount.limitTotalUses) {
    return { valid: false, error: 'This discount code has reached its usage limit' }
  }

  return { valid: true, discount }
}

// Enhanced Buy X Get Y validation function with collections and categories support
const handleBuyXGetYValidation = (discount: any, cart: any, res: NextApiResponse) => {
  if (!cart?.lines || !Array.isArray(cart.lines)) {
    return res.status(200).json({
      ...createBuyXGetYResponse(discount),
      applicable: false,
      reason: 'Cart is empty or invalid',
      progress: { current: 0, needed: 1, qualified: false }
    })
  }

  const requirements = discount.requirements as any
  const buyXGetY = requirements?.buyXGetY || {}
  const buyConditions = buyXGetY.buyConditions || {}
  const getRewards = buyXGetY.getRewards || {}

  // Extract buy conditions with enhanced support
  const buyQuantity = buyConditions.quantity || 1
  const buyProductIds = buyConditions.products || []
  const buyCollectionIds = buyConditions.collections || []
  const buyCategoryIds = buyConditions.categories || []
  const buyScope = buyConditions.scope || 'any_products'
  const minimumAmount = buyConditions.minimumAmount || 0

  // Extract get rewards with enhanced support
  const getQuantity = getRewards.quantity || 1
  const getProductIds = getRewards.products || []
  const getCollectionIds = getRewards.collections || []
  const getCategoryIds = getRewards.categories || []
  const discountType = getRewards.discountType || 'percentage'
  const discountValue = getRewards.discountValue || 100

  // Helper function to check if a cart line matches buy conditions
  const lineMatchesBuyConditions = (line: any) => {
    if (buyScope === 'any_products') return true;
    
    // Check specific products
    if (buyScope === 'specific_products' && buyProductIds.length > 0) {
      return buyProductIds.includes(line.product_id);
    }
    
    // Check specific collections
    if (buyScope === 'specific_collections' && buyCollectionIds.length > 0) {
      // In a real implementation, you'd query the product's collections from the database
      // For now, we'll check if the product belongs to any of the specified collections
      return line.collection_ids?.some((id: string) => buyCollectionIds.includes(id)) || false;
    }
    
    // Check specific categories
    if (buyScope === 'specific_categories' && buyCategoryIds.length > 0) {
      // In a real implementation, you'd query the product's categories from the database
      // For now, we'll check if the product belongs to any of the specified categories
      return line.category_ids?.some((id: string) => buyCategoryIds.includes(id)) || 
             (line.category_id && buyCategoryIds.includes(line.category_id)) || false;
    }
    
    return true; // Default to allowing all items
  };

  // Calculate qualifying items in cart
  let qualifyingQty = 0
  let qualifyingAmount = 0

  const qualifyingLines = cart.lines.filter(lineMatchesBuyConditions)

  qualifyingQty = qualifyingLines.reduce((sum: number, line: any) => sum + (line.qty || line.quantity || 1), 0)
  qualifyingAmount = qualifyingLines.reduce((sum: number, line: any) => 
    sum + ((line.qty || line.quantity || 1) * (line.unit_price || line.price || 0)), 0)

  // Calculate how many times the discount can be applied
  const multiplier = Math.floor(qualifyingQty / buyQuantity)
  const canApply = multiplier > 0 && qualifyingAmount >= minimumAmount

  if (!canApply) {
    const qtyNeeded = Math.max(0, buyQuantity - qualifyingQty)
    const amountNeeded = Math.max(0, minimumAmount - qualifyingAmount)
    
    let reason = ''
    if (qtyNeeded > 0 && amountNeeded > 0) {
      reason = `Add ${qtyNeeded} more qualifying item${qtyNeeded > 1 ? 's' : ''} and spend $${amountNeeded.toFixed(2)} more to unlock this offer`
    } else if (qtyNeeded > 0) {
      reason = `Add ${qtyNeeded} more qualifying item${qtyNeeded > 1 ? 's' : ''} to unlock this offer`
    } else if (amountNeeded > 0) {
      reason = `Spend $${amountNeeded.toFixed(2)} more to unlock this offer`
    }

    return res.status(200).json({
      ...createBuyXGetYResponse(discount),
      applicable: false,
      reason,
      progress: {
        currentQty: qualifyingQty,
        neededQty: buyQuantity,
        currentAmount: qualifyingAmount,
        neededAmount: minimumAmount,
        qualified: false
      }
    })
  }

  // Calculate free items
  let allowedFree = multiplier * getQuantity
  if (getRewards.maxRewardValue) {
    // Additional logic for max reward value can be added here
  }

  return res.status(200).json({
    ...createBuyXGetYResponse(discount),
    applicable: true,
    canApply: true,
    multiplier,
    freeItems: allowedFree,
    calculatedReward: {
      type: discountType,
      value: discountValue,
      quantity: allowedFree,
      productIds: getProductIds,
      collectionIds: getCollectionIds,
      categoryIds: getCategoryIds,
      multiplier
    },
    progress: {
      currentQty: qualifyingQty,
      neededQty: buyQuantity,
      currentAmount: qualifyingAmount,
      neededAmount: minimumAmount,
      qualified: true
    },
    buyConditions: {
      quantity: buyQuantity,
      products: buyProductIds,
      collections: buyCollectionIds,
      categories: buyCategoryIds,
      scope: buyScope,
      minimumAmount
    },
    getRewards: {
      quantity: getQuantity,
      products: getProductIds,
      collections: getCollectionIds,
      categories: getCategoryIds,
      discountType,
      discountValue
    }
  })
}

// Helper function to create consistent Buy X Get Y response
const createBuyXGetYResponse = (discount: any) => ({
  id: discount.id,
  code: discount.code,
  title: discount.title,
  description: discount.description,
  type: discount.type,
  method: discount.method,
  value: discount.value,
  valueUnit: discount.valueUnit,
  requirements: discount.requirements,
  startAt: discount.startAt,
  endAt: discount.endAt,
  used: discount.used,
  limitTotalUses: discount.limitTotalUses,
  isValid: true,
  discountAmount: 0 // Will be calculated on frontend based on selected free items
})

// Discount validation endpoint for frontend checkout
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { code, cart, customerId, orderAmount = 0 } = req.body

    // Use the validation function
    const validation = await validateDiscountCode(code)
    if (!validation.valid) {
      const statusCode = validation.status || 400
      return res.status(statusCode).json({ 
        error: validation.error,
        valid: false 
      })
    }

    const discount = validation.discount!

    // Special handling for Buy X Get Y discounts (case insensitive)
    if (discount.type === 'Buy X Get Y' || discount.type === 'Buy X get Y') {
      return handleBuyXGetYValidation(discount, cart, res)
    }

    // Regular discount handling (percentage, fixed amount, etc.)
    // Check usage limits
    if (discount.limitTotalUses && discount.used >= discount.limitTotalUses) {
      return res.status(400).json({ 
        error: 'Usage limit reached', 
        message: 'This discount code has reached its usage limit' 
      })
    }

    // Check requirements (minimum order amount, etc.)
    const requirements = discount.requirements as any
    if (requirements?.minimumOrderAmount && orderAmount < requirements.minimumOrderAmount) {
      return res.status(400).json({ 
        error: 'Minimum order not met', 
        message: `Minimum order amount of $${requirements.minimumOrderAmount} required` 
      })
    }

    // Return valid discount with application info
    const discountResponse = {
      id: discount.id,
      code: discount.code,
      title: discount.title,
      description: discount.description,
      type: discount.type,
      method: discount.method,
      value: discount.value,
      valueUnit: discount.valueUnit,
      requirements: discount.requirements,
      isValid: true
    }

    // Calculate discount amount based on type
    let discountAmount = 0
    if (discount.type === 'Amount off products') {
      if (discount.valueUnit === '%') {
        discountAmount = (orderAmount * (discount.value || 0)) / 100
      } else {
        discountAmount = Math.min(discount.value || 0, orderAmount)
      }
    }

    return res.status(200).json({
      ...discountResponse,
      discountAmount,
      applicable: true
    })

  } catch (error: any) {
    console.error('Discount validation error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    })
  }
}
