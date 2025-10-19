// supabase/functions/anonymize-text/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tipos para el sistema de anonimización
interface AnonymizationConfig {
  anonymize_names?: boolean;
  anonymize_emails?: boolean;
  anonymize_phones?: boolean;
  anonymize_ids?: boolean;
  anonymize_cards?: boolean;
  anonymize_addresses?: boolean;
  anonymize_companies?: boolean;
  anonymize_locations?: boolean;
}

interface EntityMapping {
  original: string;
  token: string;
  type: string;
  position?: { start: number; end: number };
}

interface AnonymizationResult {
  anonymized_text: string;
  mappings: EntityMapping[];
  stats: {
    entities_found: number;
    processing_time_ms: number;
    entity_breakdown: Record<string, number>;
  };
}

// Clase principal de anonimización
class TextAnonymizer {
  private mappings: Map<string, EntityMapping> = new Map();
  private counters: Map<string, number> = new Map();
  
  // Patrones RegEx optimizados
  private patterns = {
    // Emails - RFC 5322 simplificado
    email: /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Z|a-z]{2,}\b/g,
    
    // Teléfonos - Formatos Honduras y internacionales
    phone: /(?:\+504|504)?[\s\-]?[2389]\d{3}[\s\-]?\d{4}|\+?\d{1,4}?[\s\-]?\(?\d{1,4}\)?[\s\-]?\d{1,4}[\s\-]?\d{1,9}/g,
    
    // DNI Honduras: 0801-1990-12345
    dni_honduras: /\b\d{4}[\s\-]?\d{4}[\s\-]?\d{5}\b/g,
    
    // Tarjetas de crédito (13-19 dígitos)
    creditCard: /\b(?:\d{4}[\s\-]?){3}\d{1,7}\b/g,
    
    // CVV/CVC - Código de seguridad (3-4 dígitos en contexto)
    cvv: /(?:cvv|cvc|c[oó]digo?\s+(?:de\s+)?seguridad|clave\s+(?:de\s+)?seguridad)[\s:]*\d{3,4}\b/gi,
    
    // Fecha de vencimiento de tarjeta (MM/YY, MM/YYYY, etc.)
    cardExpiry: /(?:venc(?:imiento)?|exp(?:ira)?|expir[ay]|v[aá]lid[ao]?\s+hasta)[\s:]*\d{1,2}[\s\/\-]\d{2,4}/gi,
    
    // Direcciones físicas (detección básica)
    address: /\b(?:calle|avenida|av\.|boulevard|blvd|colonia|col\.|barrio|zona|residencial)\s+[A-Za-zÀ-ÿ0-9\s,#\-]+(?:\d+|s\/n)/gi,
    
    // URLs y dominios
    url: /https?:\/\/[^\s]+|www\.[^\s]+/g,
  };

  // Nombres comunes españoles (expandible)
  private spanishNames = new Set([
    'juan', 'maría', 'josé', 'carlos', 'ana', 'luis', 'pedro', 'antonio',
    'francisco', 'jesús', 'javier', 'manuel', 'fernando', 'diego', 'daniel',
    'alejandro', 'rafael', 'miguel', 'ángel', 'jorge', 'alberto', 'roberto',
    'laura', 'carmen', 'isabel', 'rosa', 'teresa', 'patricia', 'marta',
    'sofía', 'elena', 'cristina', 'paula', 'beatriz', 'raquel', 'silvia'
  ]);

  // Palabras que NO deben anonimizarse (ciudades, lugares comunes)
  private excludedWords = new Set([
    'san', 'santa', 'santo', 'buenos', 'aires', 'salvador', 'pedro', 'sula',
    'la', 'el', 'los', 'las', 'de', 'del', 'tegucigalpa', 'comayagua',
    'costa', 'rica', 'guatemala', 'nicaragua', 'honduras'
  ]);

  constructor(private config: AnonymizationConfig) {
    // Inicializar contadores
    Object.keys(this.getEntityTypes()).forEach(type => {
      this.counters.set(type, 0);
    });
  }

  private getEntityTypes() {
    return {
      PERSONA: this.config.anonymize_names ?? true,
      EMAIL: this.config.anonymize_emails ?? true,
      TELEFONO: this.config.anonymize_phones ?? true,
      ID: this.config.anonymize_ids ?? true,
      TARJETA: this.config.anonymize_cards ?? true,
      DIRECCION: this.config.anonymize_addresses ?? true,
      EMPRESA: this.config.anonymize_companies ?? false,
      UBICACION: this.config.anonymize_locations ?? false,
    };
  }

  private getNextToken(type: string): string {
    const current = this.counters.get(type) || 0;
    this.counters.set(type, current + 1);
    return `[${type}_${current + 1}]`;
  }

  private addMapping(original: string, type: string): string {
    // Usar hash como clave para consistencia
    const key = `${type}:${original.toLowerCase()}`;
    
    if (this.mappings.has(key)) {
      return this.mappings.get(key)!.token;
    }

    const token = this.getNextToken(type);
    this.mappings.set(key, { original, token, type });
    return token;
  }

  // Detectar nombres propios usando reglas lingüísticas
  private detectNames(text: string): string {
    // Patrón: Palabra con mayúscula inicial seguida de opcional apellido
    const namePattern = /\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){0,2})\b/g;
    
    return text.replace(namePattern, (match, name) => {
      const words = name.toLowerCase().split(/\s+/);
      
      // Filtrar falsos positivos
      if (words.some(w => this.excludedWords.has(w))) {
        return match; // No anonimizar ciudades como "San Pedro Sula"
      }

      // Si es un nombre común español, anonimizar
      if (words.some(w => this.spanishNames.has(w))) {
        return this.addMapping(match, 'PERSONA');
      }

      // Si son 2-3 palabras capitalizadas seguidas, probablemente es un nombre
      if (words.length >= 2 && words.length <= 3) {
        return this.addMapping(match, 'PERSONA');
      }

      return match;
    });
  }

  // Método principal de anonimización
  anonymize(text: string): AnonymizationResult {
    const startTime = performance.now();
    let processedText = text;

    // 1. Emails (primero para evitar conflictos)
    if (this.config.anonymize_emails ?? true) {
      processedText = processedText.replace(this.patterns.email, (match) => {
        return this.addMapping(match, 'EMAIL');
      });
    }

    // 2. URLs (para no confundir con otros patrones)
    processedText = processedText.replace(this.patterns.url, (match) => {
      return this.addMapping(match, 'URL');
    });

    // 3. Tarjetas de crédito
    if (this.config.anonymize_cards ?? true) {
      processedText = processedText.replace(this.patterns.creditCard, (match) => {
        // Validar que parezca tarjeta (solo dígitos y separadores)
        if (/^\d[\d\s\-]+\d$/.test(match)) {
          return this.addMapping(match, 'TARJETA');
        }
        return match;
      });
    }

    // 4. DNI Honduras
    if (this.config.anonymize_ids ?? true) {
      processedText = processedText.replace(this.patterns.dni_honduras, (match) => {
        return this.addMapping(match, 'ID');
      });
    }

    // 5. Teléfonos
    if (this.config.anonymize_phones ?? true) {
      processedText = processedText.replace(this.patterns.phone, (match) => {
        // Validar longitud mínima para evitar falsos positivos
        const digits = match.replace(/\D/g, '');
        if (digits.length >= 8) {
          return this.addMapping(match, 'TELEFONO');
        }
        return match;
      });
    }

    // 6. Direcciones
    if (this.config.anonymize_addresses ?? true) {
      processedText = processedText.replace(this.patterns.address, (match) => {
        return this.addMapping(match, 'DIRECCION');
      });
    }

    // 7. Nombres de personas (último para mayor contexto)
    if (this.config.anonymize_names ?? true) {
      processedText = this.detectNames(processedText);
    }

    const endTime = performance.now();

    // Estadísticas
    const entityBreakdown: Record<string, number> = {};
    this.mappings.forEach(mapping => {
      entityBreakdown[mapping.type] = (entityBreakdown[mapping.type] || 0) + 1;
    });

    return {
      anonymized_text: processedText,
      mappings: Array.from(this.mappings.values()),
      stats: {
        entities_found: this.mappings.size,
        processing_time_ms: Math.round(endTime - startTime),
        entity_breakdown: entityBreakdown,
      },
    };
  }
}

// Handler principal
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { text, config = {} } = await req.json();

    if (!text || typeof text !== 'string') {
      return new Response(
        JSON.stringify({ error: 'El campo "text" es requerido y debe ser string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar longitud mínima
    if (text.trim().length < 10) {
      return new Response(
        JSON.stringify({ 
          error: 'El texto debe tener al menos 10 caracteres',
          anonymized_text: text,
          mappings: [],
          stats: { entities_found: 0, processing_time_ms: 0, entity_breakdown: {} }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Anonimizar
    const anonymizer = new TextAnonymizer(config);
    const result = anonymizer.anonymize(text);

    console.log(`✅ Anonimización completada: ${result.stats.entities_found} entidades en ${result.stats.processing_time_ms}ms`);

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Error en anonimización:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});