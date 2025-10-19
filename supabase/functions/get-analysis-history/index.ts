// ============================================
// T2B Tech2Business - Sentiment Analysis API
// Edge Function: get-analysis-history
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// ============================================
// TIPOS Y INTERFACES
// ============================================

interface HistoryItem {
  id: string;
  created_at: string;
  social_network: string;
  sentiment_score: number;
  primary_emotion: string;
  keywords: string[];
  emotion_category?: string;
  content_preview?: string;
}

interface HistoryResponse {
  success: boolean;
  data?: HistoryItem[];
  metadata?: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
  error?: {
    message: string;
    code: string;