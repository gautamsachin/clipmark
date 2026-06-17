export type Site = 'youtube' | 'instagram'
export type Plan = 'free' | 'pro'

export interface Profile {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  plan: Plan
  razorpay_customer_id?: string
  razorpay_subscription_id?: string
  subscription_status: string
  plan_expires_at?: string
  created_at: string
}

export interface Bookmark {
  id: string
  user_id: string
  video_id: string
  site: Site
  url: string
  title?: string
  timestamp: number
  notes?: string
  tags: string[]
  screenshot_url?: string
  collection_id?: string | null
  saved_at: string
  created_at: string
}

export interface Collection {
  id: string
  user_id: string
  name: string
  color: string
  created_at: string
}

export interface Board {
  id: string
  user_id: string
  title: string
  description?: string
  cover_url?: string
  is_public: boolean
  public_slug?: string
  canvas_data?: {
    items?: Record<string, { x: number; y: number }>
    notes?: Array<{ id: string; x: number; y: number; text: string; color: string; size?: 's' | 'm' | 'l' }>
    arrows?: Array<{ id: string; fromId: string; fromType: 'item' | 'note'; toId: string; toType: 'item' | 'note' }>
  }
  created_at: string
  updated_at: string
}

export interface BoardItem {
  id: string
  board_id: string
  bookmark_id: string
  user_id: string
  position: number
  card_note?: string
  created_at: string
  bookmark?: Bookmark
}
