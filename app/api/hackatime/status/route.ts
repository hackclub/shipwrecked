import { checkHackatimeSetup } from '@/lib/hackatime';
import { requireUserSession } from '@/lib/requireUserSession';

export async function GET() {
  try {
    console.log('🔍 Checking Hackatime status - starting');
    const user = await requireUserSession();
    console.log('👤 User session:', {
      id: user.id,
      email: user.email,
      hasHackatimeId: !!user.hackatimeId,
    });

    if (!user.email) {
      console.log('❌ No email found for user');
      return Response.json({ isSetup: false, error: 'User email not found' }, { status: 400 });
    }

    const status = await checkHackatimeSetup(user.id, user.email);
    console.log('✅ Hackatime status check complete:', status);
    return Response.json(status);
  } catch (error) {
    console.error('💥 Error checking Hackatime status:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
    }
    return Response.json(
      { isSetup: false, error: 'Failed to check Hackatime status' },
      { status: 500 },
    );
  }
}
