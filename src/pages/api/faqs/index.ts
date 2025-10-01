import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { z } from 'zod'

const createFaqSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  items: z.array(z.object({
    question: z.string().min(1, 'Question is required'),
    answer: z.string().min(1, 'Answer is required')
  })).min(1, 'At least one FAQ item is required'),
  sortOrder: z.number().optional().default(0),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Allow basic CORS for development
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    if (req.method === 'GET') {
      // Get all FAQ content from dynamic pages with SHARED_FAQ_HEADER section
      const faqPages = await prisma.dynamicPage.findMany({
        where: {
          section: 'SHARED_FAQ_HEADER'
        },
        orderBy: [
          { sortOrder: 'asc' },
          { createdAt: 'asc' }
        ]
      })

      // Extract FAQ data from metaData field
      const faqs: any[] = []
      faqPages.forEach(page => {
        if (page.metaData && typeof page.metaData === 'object') {
          const metaData = page.metaData as any
          if (metaData.faqData) {
            const faqTitle = metaData.faqData.title || page.title || 'Untitled'
            
            // Handle both new format (items array) and legacy format (single question/answer)
            if (metaData.faqData.items && Array.isArray(metaData.faqData.items)) {
              // New format with multiple items
              metaData.faqData.items.forEach((item: any, index: number) => {
                faqs.push({
                  id: `${page.id}_${index}`,
                  pageId: page.id,
                  title: faqTitle,
                  question: item.question || '',
                  answer: item.answer || '',
                  isVisible: page.isActive,
                  sortOrder: page.sortOrder,
                  itemIndex: index,
                  createdAt: page.createdAt,
                  updatedAt: page.updatedAt
                })
              })
            } else if (metaData.faqData.question && metaData.faqData.answer) {
              // Legacy format with single question/answer
              faqs.push({
                id: page.id,
                pageId: page.id,
                title: faqTitle,
                question: metaData.faqData.question || '',
                answer: metaData.faqData.answer || '',
                isVisible: metaData.faqData.isVisible !== undefined ? metaData.faqData.isVisible : page.isActive,
                sortOrder: page.sortOrder,
                itemIndex: 0,
                createdAt: page.createdAt,
                updatedAt: page.updatedAt
              })
            }
          }
        }
      })

      // Group FAQs by title
      const groupedFaqs = faqs.reduce((acc, faq) => {
        if (!acc[faq.title]) {
          acc[faq.title] = []
        }
        acc[faq.title].push(faq)
        return acc
      }, {} as Record<string, typeof faqs>)

      return res.status(200).json(groupedFaqs)
    }

    if (req.method === 'POST') {
      const validatedData = createFaqSchema.parse(req.body)

      // Check for duplicate FAQ with same title
      const existingPages = await prisma.dynamicPage.findMany({
        where: {
          section: 'SHARED_FAQ_HEADER'
        }
      })

      const existingFaq = existingPages.find(page => {
        if (page.metaData && typeof page.metaData === 'object') {
          const metaData = page.metaData as any
          return metaData.faqData && 
                 metaData.faqData.title?.toLowerCase() === validatedData.title.toLowerCase()
        }
        return false
      })

      if (existingFaq) {
        return res.status(400).json({ 
          error: 'A FAQ group with this title already exists' 
        })
      }

      // Create new dynamic page with FAQ data in metaData
      const faqPage = await prisma.dynamicPage.create({
        data: {
          section: 'SHARED_FAQ_HEADER',
          title: validatedData.title,
          description: `FAQ group with ${validatedData.items.length} items`,
          isActive: true,
          sortOrder: validatedData.sortOrder,
          metaData: {
            faqData: {
              title: validatedData.title,
              items: validatedData.items
            }
          }
        }
      })

      // Return FAQ format
      const faqResponse = {
        id: faqPage.id,
        title: validatedData.title,
        items: validatedData.items,
        sortOrder: faqPage.sortOrder,
        createdAt: faqPage.createdAt,
        updatedAt: faqPage.updatedAt
      }

      return res.status(201).json(faqResponse)
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err: any) {
    console.error('FAQ API Error:', err)
    
    if (err.name === 'ZodError') {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: err.errors 
      })
    }

    return res.status(500).json({ 
      error: err.message || 'Internal server error' 
    })
  }
}
