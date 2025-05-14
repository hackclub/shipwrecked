const LOOPS_API_KEY = process.env.LOOPS_API_KEY;
const LOOPS_TRANSACTION_EMAIL_ID = process.env.LOOPS_TRANSACTION_EMAIL_ID;

export async function sendEmailWithLoops(
    host: string,
    targetEmail: string,
    signin_url: string
) {
    const response = await fetch("https://app.loops.so/api/v1/transactional", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${LOOPS_API_KEY}`
        },
        body: JSON.stringify({
            transactionalId: LOOPS_TRANSACTION_EMAIL_ID,
            "email": targetEmail,
            "dataVariables": {
                "hostname": host,
                "signin": signin_url
            }
        })
    });

    const result = await response.json();
    if (!result.success) throw new Error("Failed to send loops email");
}