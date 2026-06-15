export async function onRequestPost(context) {
  const { request, env } = context;
  const { fileName, fileContentBase64 } = await request.json();

  const response = await fetch(`https://api.github.com/repos/awslike6-web/kids-school/contents/uploads/${fileName}`, {
    method: "PUT",
    headers: {
      "Authorization": `token ${env.GITHUB_TOKEN}`,
      "Content-Type": "application/json",
      "User-Agent": "Cloudflare-Worker"
    },
    body: JSON.stringify({
      message: "사진 업로드: " + fileName,
      content: fileContentBase64
    })
  });

  const headers = { "Access-Control-Allow-Origin": "*" };
  if (response.ok) {
    return new Response(JSON.stringify({ success: true, url: `https://raw.githubusercontent.com/awslike6-web/kids-school/main/uploads/${fileName}` }), { headers });
  } else {
    return new Response(JSON.stringify({ success: false, error: "깃허브 업로드 실패" }), { status: 500, headers });
  }
}
