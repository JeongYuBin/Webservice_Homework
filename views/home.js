document.addEventListener('DOMContentLoaded', () => {
    loadRooms(); // 방 목록 초기 로드

    const createRoomBtn = document.getElementById('createRoomBtn');
    const createRoomPopup = document.getElementById('createRoomPopup');
    const roomTitleInput = document.getElementById('roomTitleInput');
    const submitRoomBtn = document.getElementById('submitRoomBtn');
    const cancelRoomBtn = document.getElementById('cancelRoomBtn');
    const searchRoomBtn = document.getElementById('searchRoomBtn');
    const roomSearchInput = document.getElementById('roomSearchInput');
    const logoutBtn = document.getElementById('logoutBtn');

    // 방 만들기 버튼 클릭
    createRoomBtn.addEventListener('click', () => {
        createRoomPopup.style.display = 'block';
    });

    // 방 생성 확인 버튼 클릭
    submitRoomBtn.addEventListener('click', async () => {
        const title = roomTitleInput.value.trim();
        if (!title) {
            alert('방 제목을 입력하세요.');
            return;
        }

        try {
            const accessToken = localStorage.getItem('accessToken');
            const response = await fetch('/room', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ title }),
            });

            if (response.ok) {
                alert('방이 생성되었습니다!');
                createRoomPopup.style.display = 'none';
                roomTitleInput.value = '';
                loadRooms(); // 방 목록 갱신
            } else {
                const error = await response.json();
                alert(error.message || '방 생성에 실패했습니다.');
            }
        } catch (error) {
            console.error('방 생성 에러:', error);
            alert('방 생성 중 에러가 발생했습니다.');
        }
    });

    // 방 생성 취소 버튼 클릭
    cancelRoomBtn.addEventListener('click', () => {
        createRoomPopup.style.display = 'none';
        roomTitleInput.value = '';
    });

    // 방 검색 버튼 클릭
    searchRoomBtn.addEventListener('click', async () => {
        const searchTerm = roomSearchInput.value.trim();
        if (!searchTerm) {
            alert('검색어를 입력하세요.');
            return;
        }

        try {
            const response = await fetch(`/rooms?search=${encodeURIComponent(searchTerm)}`);
            const result = await response.json();

            if (response.ok && result.length > 0) {
                window.location.href = `/room?id=${result[0]._id}`; // 첫 번째 검색 결과로 이동
            } else {
                alert('검색된 방이 없습니다.');
            }
        } catch (error) {
            console.error('방 검색 에러:', error);
            alert('방 검색 중 에러가 발생했습니다.');
        }
    });

    // 로그아웃 버튼 클릭
    logoutBtn.addEventListener('click', async() => {
        try {
            localStorage.removeItem('accessToken'); // 로컬 스토리지에서 토큰 삭제
            alert('로그아웃 되었습니다.');
            window.location.href = '/login';
        } catch (error) {
            console.error('로그아웃 중 오류 발생:', error);
        }
    });
});

// 방 목록 로드
async function loadRooms() {
    const roomList = document.getElementById('roomList');
    roomList.innerHTML = ''; // 기존 목록 초기화

    try {
        const response = await fetch('/rooms');
        if (response.ok) {
            const rooms = await response.json();

            if (rooms.length === 0) {
                roomList.innerHTML = '<p>현재 개설된 방이 없습니다.</p>';
                return;
            }

            rooms.forEach(room => {
                const roomElement = document.createElement('div');
                roomElement.innerHTML = `
                    <p><strong>${room.title}</strong></p>
                    <p>인원: ${room.participants} / ${room.maxParticipants}</p>
                    <button onclick="enterRoom('${room.id}')">입장</button>
                `;
                roomList.appendChild(roomElement);
            });
        } else {
            throw new Error('방 목록 로드 실패');
        }
    } catch (error) {
        console.error('방 목록 로드 에러:', error);
        roomList.innerHTML = '<p>방 목록을 불러오는 중 에러가 발생했습니다.</p>';
    }
}

async function searchRoom() {
    const searchInput = document.getElementById('searchRoomInput').value;

    try {
        const response = await fetch(`/search-room?title=${encodeURIComponent(searchInput)}`);
        if (response.ok) {
            const room = await response.json();
            alert(`방 "${room.title}"을 찾았습니다!`);
            enterRoom(room.id);
        } else if (response.status === 404) {
            alert('해당 이름의 방이 존재하지 않습니다.');
        } else {
            throw new Error('방 검색 실패');
        }
    } catch (error) {
        console.error('방 검색 에러:', error);
        alert('방 검색 중 에러가 발생했습니다.');
    }
}

// 방 입장
function enterRoom(roomId) {
    window.location.href = `/room?id=${roomId}`;
}
