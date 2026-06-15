export async function onRequestPost(context) {
  const { request, env } = context;
  const { fileName, fileContentBase64 } = await request.json();

  const GITHUB_TOKEN = env.GITHUB_TOKEN;
  const REPO = "awslike6-web/kids-school";
  const filePath = `uploads/${fileName}`;

  const response = await fetch(`https://api.github.com/repos/${REPO}/contents/${filePath}`, {
    method: "PUT",
    headers: {
      "Authorization": `token ${GITHUB_TOKEN}`,
      "Content-Type": "application/json",
      "User-Agent": "Cloudflare-Worker"
    },
    body: JSON.stringify({
      message: "사진 업로드: " + fileName,
      content: fileContentBase64
    })
  });

  if (response.ok) {
    const fileUrl = `https://raw.githubusercontent.com/${REPO}/main/${filePath}`;
    return new Response(JSON.stringify({ success: true, url: fileUrl }), {
      headers: { "Access-Control-Allow-Origin": "*" }
    });
  } else {
    return new Response(JSON.stringify({ success: false, error: "깃허브 업로드 실패" }), { status: 500 });
  }
}
