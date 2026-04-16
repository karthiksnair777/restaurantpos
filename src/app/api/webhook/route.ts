import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Forward to n8n webhook if configured
        const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/new-order';

        try {
            const response = await fetch(n8nWebhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...body,
                    timestamp: new Date().toISOString(),
                    restaurant: 'Flavour Kitchen',
                }),
            });

            if (response.ok) {
                return NextResponse.json({ success: true, message: 'Webhook delivered to n8n' });
            }
        } catch (webhookError) {
            // n8n might not be running, log but don't fail
            console.log('n8n webhook not available:', webhookError);
        }

        // Even if n8n is not available, don't fail the order
        return NextResponse.json({ success: true, message: 'Order processed (n8n not reachable)' });
    } catch (error) {
        console.error('Webhook error:', error);
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
}
