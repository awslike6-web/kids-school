async function uploadFile() {
    if (!selectedFile || !fileBase64) return;
    
    uploadBtn.innerText = "🚀 우주로 전송 중...";
    uploadBtn.disabled = true;

    // 데이터를 미리 JSON으로 만듭니다.
    const payload = JSON.stringify({
      fileName: selectedFile.name,
      fileContentBase64: fileBase64
    });

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Content-Length": payload.length.toString() // 🚨 데이터 길이를 강제로 명시!
        },
        body: payload
      });

      const data = await response.json();

      if (data.success) {
        document.getElementById('resultArea').style.display = 'block';
        document.getElementById('resultUrl').innerText = data.url;
        uploadBtn.innerText = "✅ 전송 완료!";
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      alert("앗! 에러가 발생했어요: " + error.message);
      uploadBtn.innerText = "로켓 발사! (업로드)";
      uploadBtn.disabled = false;
    }
  }
