let isDuplicateChecked = false;  // 중복 체크 여부 추적(기본값 : false)

// 페이지 로드 시 기본적으로 회원가입 버튼 비활성화
document.addEventListener('DOMContentLoaded', function() {
    // 현재 페이지가 /register.html인 경우 회원가입 버튼 비활성화 로직 실행
    if (document.location.pathname === '/register.html') {
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            submitBtn.disabled = true;  // 기본적으로 비활성화
        }
    }

    // 현재 페이지가 /home.html인 경우 사용자 정보 요청 로직 실행
    if (document.location.pathname === '/home.html') {
        loadUserInfo();
    }

    // 로그인 폼이 존재할 경우에만 이벤트 리스너 추가
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // 기본 제출 방지
            await handleLogin();
        });
    }

    // 로그인 버튼이 존재할 경우에만 이벤트 리스너 추가
    // const loginButton = document.getElementById('loginButton');
    // if (loginButton) {
    //     loginButton.addEventListener('click', () => handleLoginClick());
    // }
    // ID와 비밀번호 입력란이 모두 채워져 있는 경우에만 버튼 활성화
    if (loginId.value.trim() !== '' && loginPassword.value.trim() !== '') {
        loginBtn.disabled = false; // 버튼 활성화
        loginBtn.classList.remove('inactive'); // 비활성 클래스 제거
    } else {
        loginBtn.disabled = true; // 버튼 비활성화
        loginBtn.classList.add('inactive'); // 비활성 클래스 추가
    }
    // ID와 비밀번호 입력란에서 입력할 때마다 enableLoginButton 호출
    document.getElementById('loginId').addEventListener('input', enableLoginButton);
    document.getElementById('loginPassword').addEventListener('input', enableLoginButton);
});

// 사용자 정보 요청 함수 정의
async function loadUserInfo() {
    const accessToken = localStorage.getItem("accessToken", data.accessToken);

    if (!accessToken) {
        window.location.href = "/login";
        return;
    }

    // 사용자 정보 요청
    const response = await fetch("/home", {
        headers: { "Authorization": `Bearer ${accessToken}` }
    });

    if (response.ok) {
        const data = await response.json();
        document.getElementById("userInfo").innerText = `ID: ${data.id}, 이름: ${data.name}`;
    } else {
        localStorage.removeItem("accessToken", data.accessToken);
        window.location.href = "/login";
    }
}

// 로그인 처리를 위한 함수 분리
async function handleLogin() {
    const id = document.getElementById('loginId').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, password })
        });

        if (!response.ok) { 
            const errorData = await response.json();
            alert(errorData.error || '로그인 실패'); // 오류 메시지 표시
            return;
        }

        const data = await response.json();
        localStorage.setItem('accessToken', data.accessToken); // 토큰 저장
        window.location.href = '/home'; // 홈 페이지로 리디렉션
    } catch (error) {
        console.error('Fetch error:', error); // 오류 메시지 출력
        alert('로그인 요청 중 오류가 발생했습니다. 다시 시도해 주세요.'); // 사용자에게 오류 메시지 표시
    }
}

// 로그인 버튼 클릭 시 호출되는 함수
function handleLoginClick() {
    const id = document.getElementById('idInput').value;
    const password = document.getElementById('passwordInput').value;

    fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.accessToken) {
            localStorage.setItem('accessToken', data.accessToken);
        }
    });
}




// ID 입력 시 중복 체크 버튼 활성화
function handleIdInput() {
    const idInput = document.getElementById('id').value;
    const checkDuplicateBtn = document.getElementById('checkDuplicateBtn');

    // ID 입력이 한 글자라도 있으면 중복 체크 버튼 활성화
    checkDuplicateBtn.disabled = idInput.length === 0;

    // ID가 변경되면 중복 체크가 필요하므로 플래그 초기화
    isDuplicateChecked = false;  
    enableSubmitButton();  // 회원가입 버튼 활성화 여부 확인
}

// ID 중복 체크
function checkDuplicateID() {
    const id = document.getElementById('id').value;
    const checkResult = document.getElementById('checkResult');

    if (!id) {
        checkResult.innerHTML = 'ID를 입력해주세요';
        isDuplicateChecked = false;  // 입력이 없으면 중복 체크를 하지 않는다
        enableSubmitButton();  // 버튼 활성화 여부 확인하기
        return;
    }

    // 서버로 중복 체크 요청
    fetch(`/check-id?id=${id}`)
        .then(response => response.json())
        .then(data => {
            if (data.exists) {
                checkResult.innerHTML = '이미 사용 중인 ID입니다.';
                isDuplicateChecked = false;  // 중복된 경우
            } else {
                checkResult.innerHTML = '사용 가능한 ID입니다.';
                isDuplicateChecked = true;  // 사용 가능한 경우
            }
            enableSubmitButton();  // 중복 체크 후 회원가입 버튼 활성화 여부 확인
        });
}

// 비밀번호 일치 여부 확인
function checkPasswordMatch() {
    const pw1 = document.getElementById('password1').value;
    const pw2 = document.getElementById('password2').value;
    const pwMatchResult = document.getElementById('pwMatchResult');

    if (pw1 && pw2) {
        if (pw1 === pw2) {
            pwMatchResult.innerHTML = '비밀번호가 일치합니다.';
        } else {
            pwMatchResult.innerHTML = '비밀번호가 일치하지 않습니다.';
        }
    } else {
        pwMatchResult.innerHTML = '';  // 비밀번호가 입력되지 않았을 경우 초기화
    }

    enableSubmitButton();  // 비밀번호 확인 후 회원가입 버튼 활성화 여부 확인
}

// 회원가입 버튼 활성화
function enableSubmitButton() {
    const pw1 = document.getElementById('password1').value;
    const pw2 = document.getElementById('password2').value;
    const submitBtn = document.getElementById('submitBtn');

    // ID 중복 체크가 완료되고, 비밀번호가 일치하며, 비밀번호가 입력되었을 때만 회원가입 버튼 활성화
    if (isDuplicateChecked && pw1 === pw2 && pw1.length > 0 && pw2.length > 0) {
        submitBtn.disabled = false;  // 활성화
        submitBtn.classList.add('active');  // 'active' 클래스 추가
    } else {
        submitBtn.disabled = true;  // 비활성화
        submitBtn.classList.remove('active');  // 'active' 클래스 제거
    }
}

// 로그인 버튼 활성화
function enableLoginButton() {
    const idInput = document.getElementById('loginId').value;
    const passwordInput = document.getElementById('loginPassword').value;
    const loginBtn = document.getElementById('loginBtn');

    // ID와 비밀번호가 모두 입력되었을 때만 로그인 버튼 활성화(한 개라도 입력되면 활성화)
    if (idInput.length > 0 && passwordInput.length > 0) {
        loginBtn.disabled = false;
        loginBtn.classList.remove('inactive');
        loginBtn.classList.add('active');
    } else {
        loginBtn.disabled = true;
        loginBtn.classList.remove('active');
        loginBtn.classList.add('inactive');
    }
}

// 로그인 폼 제출
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault(); // 기본 제출 방지

    const id = document.getElementById('loginId').value; // 입력된 ID
    const password = document.getElementById('loginPassword').value; // 입력된 비밀번호

    const response = await fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id, password }) // 서버로 ID와 비밀번호 전송
    });

    if (response.ok) {
        const data = await response.json();
        const accessToken = data.accessToken;

        // JWT 토큰을 localStorage에 저장
        localStorage.setItem('accessToken', accessToken);

        // home 페이지 이동
        window.location.href= '/home'
    } else {
        const errorData = await response.json();
        alert(errorData.message); // 에러 메시지 표시
    }
});

// 로그인 버튼 클릭 시
document.getElementById('loginButton').addEventListener('click', () => {
    const id = document.getElementById('idInput').value;
    const password = document.getElementById('passwordInput').value;

    fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id, password })
    })
    .then(response => response.json())
    .then(data => {
    if (data.accessToken) {
      // 예: 로컬 저장소에 토큰 저장
      localStorage.setItem('accessToken', data.accessToken);
    }
    });
});