export async function GET() {
  // This route dynamically generates the Google Search Console verification file
  const verificationCode = process.env.NEXT_PUBLIC_GOOGLE_SEARCH_CONSOLE_ID || 'M-RH5LhTnCCIBauNpdYEQx7i0dH9t1g0u-PSwKkgYxQ';
  
  const content = `google-site-verification: ${verificationCode}`;

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
