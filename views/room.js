const socket = io();

const myFace = document.getElementById("myFace");
const peerFace = document.getElementById("peerFace");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatMessages = document.getElementById("messages");
const videoContainer = document.querySelector('.video-container');
const settingsButton = document.getElementById('settingsButton');
const deviceSettings = document.getElementById('deviceSettings');
const cameraSelect = document.getElementById('cameraSelect');
const micSelect = document.getElementById('micSelect');
const applySettings = document.getElementById('applySettings');

// 로그인 상태 유지 - token을 localStorage에서 가져옴
let token = localStorage.getItem('token');
let userName;
let roomName;
let myStream;
let myPeerConnection;
let userCount = 0; // 참가자 수 초기화

// 미디어 초기화
const getMedia = async (deviceId) => {
    const constraints = deviceId
        ? { audio: true, video: { deviceId: { exact: deviceId } } }
        : { audio: true, video: true };

    try {
        // 미디어 장치 접근 시 권한 요청
        myStream = await navigator.mediaDevices.getUserMedia(constraints);
        myFace.srcObject = myStream;
    } catch (e) {
        console.error("Media Error:", e);
        alert("카메라 또는 마이크 권한을 허용해주세요.");
    }
};

// WebRTC 연결 생성
const makeConnection = () => {
    myPeerConnection = new RTCPeerConnection({
        iceServers: [
            {
                urls: [
                    "stun:stun.l.google.com:19302",
                    "stun:stun1.l.google.com:19302",
                ],
            },
        ],
    });
    myPeerConnection.addEventListener("icecandidate", handleIce);
    myPeerConnection.addEventListener("track", handleTrack);

    myStream
        .getTracks()
        .forEach((track) => myPeerConnection.addTrack(track, myStream));
};

// WebRTC 이벤트 핸들러
const handleIce = (data) => {
    socket.emit("ice", data.candidate, roomName);
};

const handleTrack = (data) => {
    peerFace.srcObject = data.streams[0];
    peerFace.hidden = false;
};

// 방 참가
const joinRoom = async () => {
    await getMedia();
    makeConnection();
    socket.emit("join_room", roomName, userName, token);  // token 추가
};

joinRoom();

// 참가자 수에 따른 클래스 설정
const updateVideoLayout = (userCount) => {
    videoContainer.classList.remove('one-user', 'two-users', 'three-users');

    if (userCount === 1) {
        videoContainer.classList.add('one-user');
    } else if (userCount === 2) {
        videoContainer.classList.add('two-users');
    } else if (userCount >= 3) {
        videoContainer.classList.add('three-users');
    }
};

// Socket 이벤트 처리
socket.on("welcome", async (newUser) => {
    console.log(`${newUser}님이 입장했습니다.`);
    userCount++; // 참가자 수 증가
    updateVideoLayout(userCount); // 레이아웃 업데이트
    const offer = await myPeerConnection.createOffer();
    myPeerConnection.setLocalDescription(offer);
    socket.emit("offer", offer, roomName);
});

// 자기 자신과 상대방의 userId를 표시
const setUserId = (userId, peerId = false) => {
    const userIdElement = peerId ? document.getElementById('peerId') : document.getElementById('user-id');
    userIdElement.textContent = `ID: ${userId}`;
};

// 방 참가 시 자기 자신과 상대방의 userId 표시
socket.on("welcome", async (newUser) => {
    setUserId(socket.id);  // 자신의 userId 표시
    console.log(`${newUser}님이 입장했습니다.`);
    const offer = await myPeerConnection.createOffer();
    myPeerConnection.setLocalDescription(offer);
    socket.emit("offer", offer, roomName);
});

socket.on("offer", async (offer) => {
    setUserId(socket.id, true);  // 상대방의 userId 표시
    myPeerConnection.setRemoteDescription(offer);
    const answer = await myPeerConnection.createAnswer();
    myPeerConnection.setLocalDescription(answer);
    socket.emit("answer", answer, roomName);
});

socket.on("answer", (answer) => {
    myPeerConnection.setRemoteDescription(answer);
});

socket.on("ice", (candidate) => {
    myPeerConnection.addIceCandidate(candidate);
});

// 채팅 메시지 처리
document.addEventListener("DOMContentLoaded", () => {
    const chatForm = document.getElementById("chatForm");
    const chatInput = document.getElementById("chatInput");
    const chatMessages = document.getElementById("messages");

    // DOM이 로드된 후에 이벤트 리스너 추가
    chatForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const message = chatInput.value.trim();
        if (message) {
            const timestamp = new Date().toLocaleTimeString();  // 현재 시간을 가져옴
            // 메시지 전송 시 socket.id와 함께 보내기
            socket.emit("chat_message", { message, roomName, userName, timestamp, userId: socket.id });

            // 채팅 메시지 출력: socket.id를 표시
            const chatItem = document.createElement("li");
            chatItem.textContent = `[${timestamp} | ${socket.id}]: ${message}`;
            chatMessages.appendChild(chatItem);

            // 입력창 초기화
            chatInput.value = "";
        }
    });
});

socket.on("chat_message", ({ message, timestamp, userId }) => {
    const chatItem = document.createElement("li");
    chatItem.textContent = `[${timestamp} | ${userId}]: ${message}`;
    chatMessages.appendChild(chatItem);
});

// 카메라와 마이크 장치 목록 가져오기
const getDevices = async () => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    const audioDevices = devices.filter(device => device.kind === 'audioinput');

    // 카메라 옵션 추가
    cameraSelect.innerHTML = '';
    videoDevices.forEach(device => {
        const option = document.createElement('option');
        option.value = device.deviceId;
        option.textContent = device.label || `카메라 ${device.deviceId}`;
        cameraSelect.appendChild(option);
    });

    // 마이크 옵션 추가
    micSelect.innerHTML = '';
    audioDevices.forEach(device => {
        const option = document.createElement('option');
        option.value = device.deviceId;
        option.textContent = device.label || `마이크 ${device.deviceId}`;
        micSelect.appendChild(option);
    });
};

// 설정 버튼 클릭 시 설정 UI 표시
settingsButton.addEventListener('click', () => {
    deviceSettings.style.display = deviceSettings.style.display === 'none' ? 'block' : 'none';
    getDevices();
});

// 설정 적용 버튼 클릭 시
applySettings.addEventListener('click', async () => {
    const selectedCamera = cameraSelect.value;
    const selectedMic = micSelect.value;
    await getMedia(selectedCamera);  // 선택된 카메라 사용
    socket.emit("update_device", { selectedCamera, selectedMic });  // 서버로 장치 정보 전송
    deviceSettings.style.display = 'none';
});

// 방에서 나갈 때
socket.on("bye", (leftUser) => {
    console.log(`${leftUser}님이 나갔습니다.`);
    userCount--; // 참가자 수 감소
    updateVideoLayout(userCount); // 레이아웃 업데이트
});
