export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const body = await request.json();
    const { fileName, fileContentBase64 } = body;

    // 1. 디버깅용: 받은 데이터가 제대로 왔는지 확인
    if (!fileContentBase64) {
      return new Response(JSON.stringify({ success: false, error: "데이터가 비어있습니다." }), { status: 400 });
    }

    // 2. 깃허브 API 요청 전송
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

    const result = await response.json();

    if (response.ok) {
      return new Response(JSON.stringify({ success: true, url: result.content.download_url }), {
        headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" }
      });
    } else {
      // 🚨 여기서 깃허브가 거절한 이유를 상세히 띄워줍니다.
      return new Response(JSON.stringify({ success: false, error: "깃허브 거절: " + JSON.stringify(result) }), { 
        status: 500,
        headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" }
      });
    }
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: "시스템 에러: " + err.message }), { 
      status: 500,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" }
    });
  }
}
