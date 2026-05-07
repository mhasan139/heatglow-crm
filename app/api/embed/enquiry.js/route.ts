import { NextRequest, NextResponse } from 'next/server';

// GET /api/embed/enquiry.js — returns embeddable widget script
export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${request.headers.get('host')}`;
  const iframeUrl = `${baseUrl}/enquire`;

  const script = `(function() {
  var container = document.createElement('div');
  container.id = 'heatglow-enquiry-widget';
  container.style.cssText = 'width:100%;max-width:640px;margin:0 auto;';

  var iframe = document.createElement('iframe');
  iframe.src = '${iframeUrl}';
  iframe.style.cssText = 'width:100%;border:none;min-height:700px;border-radius:8px;box-shadow:0 2px 16px rgba(0,0,0,0.1);';
  iframe.title = 'HeatGlow Enquiry Form';
  iframe.allow = 'recaptcha';

  container.appendChild(iframe);

  // Append to script tag's parent or body
  var scripts = document.getElementsByTagName('script');
  var currentScript = scripts[scripts.length - 1];
  currentScript.parentNode.insertBefore(container, currentScript);

  // Listen for height updates from iframe
  window.addEventListener('message', function(e) {
    if (e.origin !== '${baseUrl}') return;
    if (e.data && e.data.type === 'heatglow-resize') {
      iframe.style.minHeight = e.data.height + 'px';
    }
  });
})();`;

  return new NextResponse(script, {
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
