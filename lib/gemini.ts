import type { GeminiQualificationResult, AiRecommendation } from '@/types/index';

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent';

const SERVICE_AREA_POSTCODES = [
  'CF3', 'CF5', 'CF10', 'CF11', 'CF14', 'CF15',
  'CF23', 'CF24', 'CF38', 'CF62', 'CF63', 'CF64', 'CF83',
];

const ACCEPTED_JOB_TYPES = [
  'Boiler Installation',
  'Boiler Repair',
  'Boiler Service',
  'Central Heating',
  'Radiator',
  'Plumbing',
  'Emergency Call-Out',
  'Gas Safety Certificate',
  'Underfloor Heating',
  'Hot Water Cylinder',
  'HeatShield Service',
  'Leak',
  'Power Flush',
  'General Heating',
];

function buildScoringPrompt(
  enquiry: EnquiryInput,
  existingClient?: ExistingClientContext
): string {
  return `You are an AI assistant for HeatGlow Heating & Plumbing, a heating and plumbing service business operating in Cardiff and surrounding areas.

Your job is to assess a customer enquiry and return a JSON qualification score.

## Business Rules

**Service area postcodes (ONLY qualify if in these areas):**
${SERVICE_AREA_POSTCODES.join(', ')}

**Accepted job types:**
${ACCEPTED_JOB_TYPES.join(', ')}

**Scoring criteria:**
- QUALIFY (score 70–100): Postcode in service area, job type accepted, clear description, legitimate contact details, no red flags
- REVIEW (score 40–69): Some uncertainty — vague description, unclear urgency, or minor concerns
- REJECT (score 0–39): Outside service area, wrong trade, spam indicators, or critically insufficient information

**Score modifiers:**
+10: Existing customer (known relationship with HeatGlow)
+10: Emergency urgency with specific, credible problem description
+5: Referral source (word-of-mouth)
-15: Very vague description (under 20 words with no specific problem)
-20: Postcode not in service area (but if this is the case, set recommendation to REJECT)
-30: Job type not accepted
-10: Suspicious indicators (generic phrases, no specific details)

## Enquiry Details

Customer Name: ${enquiry.customerName}
Phone: ${enquiry.phone}
Email: ${enquiry.email}
Postcode: ${enquiry.postcode}
Job Type: ${enquiry.jobType}
Urgency: ${enquiry.urgency}
Source: ${enquiry.source ?? 'Unknown'}
Description: ${enquiry.description}
${existingClient ? `\n**Existing Customer:** Yes — ${existingClient.jobCount} previous jobs, £${existingClient.totalSpend} total spend, last job: ${existingClient.lastJobDate ?? 'unknown'}` : '\n**Existing Customer:** No'}

## Instructions

Return ONLY a JSON object with this exact structure (no markdown, no explanation outside JSON):

{
  "score": <integer 0-100>,
  "recommendation": "<QUALIFY|REVIEW|REJECT>",
  "confidence": <integer 0-100>,
  "reason": "<one paragraph explanation of the score, written professionally>",
  "flags": ["<flag1>", "<flag2>"]
}

Valid flag values: "outside_area", "wrong_trade", "vague_description", "existing_customer", "emergency", "referral", "suspicious", "incomplete_contact"`;
}

interface EnquiryInput {
  customerName: string;
  phone: string;
  email: string;
  postcode: string;
  jobType: string;
  urgency: string;
  source?: string;
  description: string;
}

interface ExistingClientContext {
  jobCount: number;
  totalSpend: number;
  lastJobDate?: string;
}

export async function qualifyEnquiry(
  enquiry: EnquiryInput,
  existingClient?: ExistingClientContext
): Promise<GeminiQualificationResult> {
  const fallback: GeminiQualificationResult = {
    score: 50,
    recommendation: 'REVIEW',
    confidence: 0,
    reason:
      'AI scoring unavailable. Manual review required. Please assess this enquiry manually.',
    flags: [],
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8-second timeout

    const response = await fetch(`${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: buildScoringPrompt(enquiry, existingClient) }],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      }),
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.error('Gemini API error:', response.status, await response.text());
      return fallback;
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.error('Gemini returned no text');
      return fallback;
    }

    const parsed = JSON.parse(text) as {
      score?: number;
      recommendation?: string;
      confidence?: number;
      reason?: string;
      flags?: string[];
    };

    // Validate and clamp
    const score = Math.max(0, Math.min(100, Math.round(parsed.score ?? 50)));
    const recommendation = (['QUALIFY', 'REVIEW', 'REJECT'].includes(parsed.recommendation ?? '')
      ? parsed.recommendation
      : 'REVIEW') as AiRecommendation;

    return {
      score,
      recommendation,
      confidence: Math.max(0, Math.min(100, Math.round(parsed.confidence ?? 50))),
      reason: parsed.reason ?? 'No explanation provided.',
      flags: Array.isArray(parsed.flags) ? parsed.flags : [],
    };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.error('Gemini timeout after 8s');
    } else {
      console.error('Gemini error:', err);
    }
    return fallback;
  }
}

export async function improveEmailCopy(
  subject: string,
  body: string
): Promise<{ subject: string; body: string }> {
  const prompt = `You are helping write professional email copy for HeatGlow Heating & Plumbing, a friendly local heating and plumbing business in Cardiff.

Improve the following email to be more engaging, professional, and persuasive while keeping it warm and personal. Maintain the same message and call-to-action.

Subject: ${subject}

Body:
${body}

Return ONLY a JSON object:
{
  "subject": "<improved subject line>",
  "body": "<improved email body, use \\n for line breaks>"
}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: 'application/json',
        },
      }),
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return { subject, body };
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return { subject, body };

    const parsed = JSON.parse(text);
    return {
      subject: parsed.subject ?? subject,
      body: parsed.body ?? body,
    };
  } catch {
    return { subject, body };
  }
}
