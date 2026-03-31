import { NextResponse } from 'next/server';
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

export async function POST(req: Request) {
  try {
    const { phone, candidateName } = await req.json();

    if (!accountSid || !authToken || !twilioNumber) {
      console.warn('Twilio credentials missing. Simulating call scheduling.');
      return NextResponse.json({ 
        success: true, 
        message: `Call scheduled for ${candidateName} at ${phone} (Simulation mode)` 
      });
    }

    const client = twilio(accountSid, authToken);

    // In a real scenario, you'd use Twilio Voice or Messaging
    // For now, let's send a confirmation SMS
    await client.messages.create({
      body: `Hi ${candidateName}, your HR call has been scheduled! We'll connect with you soon.`,
      from: twilioNumber,
      to: phone
    });

    return NextResponse.json({ success: true, message: 'Call scheduled and SMS sent' });
  } catch (error) {
    console.error('Schedule API error:', error);
    return NextResponse.json({ error: 'Failed to schedule call' }, { status: 500 });
  }
}
