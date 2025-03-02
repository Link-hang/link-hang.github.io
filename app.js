let socket;
let audioChunks = []; // 用于存储解密后的音频片段

// Base64 解密函数
function base64Decode(str) {
    return atob(str); // 直接使用 atob 解码 Base64
}

// 夜间模式切换逻辑
const darkModeToggle = document.getElementById('darkModeToggle');
darkModeToggle.addEventListener('click', function() {
    document.body.classList.toggle('dark-mode');
    // 保存用户偏好
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);
});

// 初始化夜间模式
const savedDarkMode = localStorage.getItem('darkMode');
if (savedDarkMode === 'true') {
    document.body.classList.add('dark-mode');
}

// 连接 WebSocket 并发送消息
document.getElementById('connectAndSendBtn').addEventListener('click', function() {
    const input = document.getElementById('messageInput');
    const messageText = input.value.trim();

    if (!messageText) {
        alert('请输入消息内容！');
        return;
    }

    // 清空 audioChunks，确保每次发送新消息时重新开始
    audioChunks = [];

    // 固定的 WebSocket 地址
    const fixedDate = "Wed%2C+29+Jan+2025+09%3A49%3A32+GMT";
    const wsUrl = `wss://tts-api.xfyun.cn/v2/tts?host=ws-api-dx.xfyun.cn&date=${fixedDate}&authorization=YXBpX2tleT0iMjUxZGRjNzVjNTNmNWM1MzZhNzViNTZlYjMzZDA0YjQiLCBhbGdvcml0aG09ImhtYWMtc2hhMjU2IiwgaGVhZGVycz0iaG9zdCBkYXRlIHJlcXVlc3QtbGluZSIsIHNpZ25hdHVyZT0iR01QQUxUYTN4bE51aU0yTmdUSUFMYm1xRFlJZjdZc0NZQnVFNmtjRDBtUT0i`;

    socket = new WebSocket(wsUrl); // 使用固定的 WebSocket 地址

    socket.onopen = function() {
        console.log('WebSocket 连接成功');

        // 获取用户选择的 vcn 值
        const selectedVcn = document.getElementById('vcnSelect').value;

        // 根据选择的 vcn 值动态设置 ent 字段
        const entValue = selectedVcn === 'x3_aluona' ? '' : 'ptts'; // 阿罗娜的 ent 为空，普拉娜的 ent 为 ptts

        // 原始消息结构
        const originalMessage = {
            common: {
                app_id: "0c65a40b"
            },
            business: {
                aue: "lame",
                sfl: 1,
                auf: "audio/L16;rate=16000",
                vcn: selectedVcn, // 使用用户选择的 vcn 值
                volume: 100,
                tte: "UTF8",
                ent: entValue // 动态设置 ent 字段
            },
            data: {
                text: base64Encode(messageText), // 对 data.text 的值进行 Base64 加密
                status: 2
            }
        };

        // 发送消息
        socket.send(JSON.stringify(originalMessage));
        console.log('消息已发送:', originalMessage);
        input.value = ''; // 清空输入框
    };

    socket.onmessage = function(event) {
        console.log('收到消息:', event.data);

        try {
            // 解析服务器响应的 JSON 数据
            const response = JSON.parse(event.data);

            // 检查是否有 data.audio 字段
            if (response.data && response.data.audio) {
                // 对 data.audio 字段的值进行 Base64 解密
                const audioData = base64Decode(response.data.audio);

                // 将解密后的音频数据存储到 audioChunks 中
                audioChunks.push(audioData);

                // 如果服务器指示这是最后一个片段，则合并并播放
                if (response.data.status === 2) { // 假设 status 为 2 表示最后一个片段
                    mergeAndPlayAudio();

                    // 主动关闭 WebSocket 连接
                    socket.close();
                    console.log('WebSocket 连接已关闭');
                }
            } else {
                console.warn('服务器响应中没有 data.audio 字段');
            }
        } catch (error) {
            console.error('解析服务器响应失败:', error);
        }
    };

    socket.onclose = function() {
        console.log('WebSocket 连接关闭');
    };

    socket.onerror = function(error) {
        console.error('WebSocket 错误:', error);
    };
});

// 合并并播放音频
function mergeAndPlayAudio() {
    // 将所有音频片段合并为一个完整的二进制字符串
    const fullAudioData = audioChunks.join('');

    // 将二进制字符串转换为 ArrayBuffer
    const arrayBuffer = new Uint8Array(fullAudioData.length);
    for (let i = 0; i < fullAudioData.length; i++) {
        arrayBuffer[i] = fullAudioData.charCodeAt(i);
    }

    // 创建 Blob 对象
    const blob = new Blob([arrayBuffer], { type: 'audio/wav' }); // 假设音频格式为 WAV
    const audioUrl = URL.createObjectURL(blob);

    // 设置音频播放器的 src
    const audioPlayer = document.getElementById('audioPlayer');
    audioPlayer.src = audioUrl;
    audioPlayer.play(); // 自动播放

    // 清空 audioChunks，以便下次使用
    audioChunks = [];
}

// Base64 加密函数
function base64Encode(str) {
    return btoa(unescape(encodeURIComponent(str)));
}