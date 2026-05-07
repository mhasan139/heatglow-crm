import { NextRequest, NextResponse } from 'next/server';
import { djangoFetch } from '@/lib/django';

const DEFAULT_PREFIXES = [
  'CF3', 'CF5', 'CF10', 'CF11', 'CF14', 'CF15',
  'CF23', 'CF24', 'CF38', 'CF62', 'CF63', 'CF64', 'CF83',
];

// 5-minute in-process cache so rapid keystrokes don't hammer Django
let _cached: string[] | null = null;
let _expiresAt = 0;

async function getPrefixes(): Promise<string[]> {
  const now = Date.now();
  if (_cached && now < _expiresAt) return _cached;

  try {
    const res = await djangoFetch('/api/v1/dashboard/settings/service_area_postcodes/');
    if (res.ok) {
      const data = await res.json() as { value: string[] };
      if (Array.isArray(data.value) && data.value.length > 0) {
        _cached = data.value;
        _expiresAt = now + 5 * 60 * 1000;
        return _cached;
      }
    }
  } catch {
    // fall through to default
  }

  return DEFAULT_PREFIXES;
}

// GET /api/validate-postcode?postcode=CF14 1AB
export async function GET(request: NextRequest) {
  const postcode = new URL(request.url).searchParams.get('postcode') ?? '';
  // UK outward code = everything before the space (e.g. "CF14 1AB" → "CF14", "CF14" → "CF14")
  const outward = postcode.trim().toUpperCase().split(' ')[0];
  const prefixes = await getPrefixes();
  // Match exactly like the Django backend: does the outward code start with any prefix?
  const covered = prefixes.some(p => outward.startsWith(p));

  return NextResponse.json({ covered, area: outward });
}
