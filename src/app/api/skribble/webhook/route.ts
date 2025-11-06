import { getSkribbleConfig, SkribbleService } from '../../../../../services/SkribbleService';

const skribbleConfig = getSkribbleConfig();
const skribbleService = new SkribbleService(skribbleConfig);

export async function POST(req: Request) {
  try {
    const bodyText = await req.text();
    if (!bodyText) return new Response('Empty body', { status: 400 });

    const payload = JSON.parse(bodyText);
    const signature = req.headers.get('x-skribble-signature') || '';

    const result = await skribbleService.handleWebhook(payload, signature);

    // ✅ Wrap in Response
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Webhook handler error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
