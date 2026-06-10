async function sendEmailWithLoops(
    transactionEmailId: string,
    targetEmail: string,
    emailParams: Record<string, string>,
) {
    const apiKey = process.env.LOOPS_API_KEY;
    const response = await fetch("https://app.loops.so/api/v1/transactional", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            transactionalId: transactionEmailId,
            "email": targetEmail,
            "dataVariables": {
                ...emailParams,
            }
        })
    });

    const result = await response.json();
    console.log(result);
    if (!result.success) throw new Error("Failed to send loops email");
}

export async function sendAuthEmail(targetEmail: string, host: string, signin_url: string, datetime: string) {
    const id = process.env.LOOPS_TRANSACTIONAL_SIGNIN_EMAIL_ID;
    if (!id) throw new Error("Please set LOOPS_TRANSACTIONAL_SIGNIN_EMAIL_ID");
    await sendEmailWithLoops(
        id,
        targetEmail,
        {
            "hostname": host,
            "signin": signin_url,
            "datetime": datetime
        }
    );
}

export async function sendNotificationEmail(targetEmail: string, name: string, date: string, content: string) {
    const id = process.env.LOOPS_TRANSACTIONAL_NOTIFICATION_EMAIL_ID;
    if (!id) throw new Error("Please set LOOPS_TRANSACTIONAL_NOTIFICATION_EMAIL_ID");
    await sendEmailWithLoops(id, targetEmail, { content, name, date });
}

export async function sendPersonalizedEmail(targetEmail: string, name: string, reviewer: string, slackId: string, content: string) {
    const id = process.env.LOOPS_TRANSACTIONAL_PERSONALIZED_EMAIL_ID;
    if (!id) throw new Error("Please set LOOPS_TRANSACTIONAL_PERSONALIZED_EMAIL_ID");
    console.log(targetEmail, name, reviewer, slackId, content);
    await sendEmailWithLoops(id, targetEmail, { name, content, reviewer, slackId });
}