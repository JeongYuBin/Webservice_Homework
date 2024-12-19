const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');  // 경로 설정을 위해 path 모듈
const jwt = require('jsonwebtoken'); 
const app = express();
const mongoose = require('mongoose');
const UserModel = require('./models/User');  // User모델 가져오기
const RoomModel = require('./models/Room'); 

const http = require('http');
const { Server } = require('socket.io');
const server = http.createServer(app);
const io = new Server(server);

io.on("connection", (socket) => {
    console.log("사용자 연결:", socket.id);

    // 방 참가
    socket.on("join_room", async (roomName, userName) => {
        try {
            const room = await RoomModel.findOne({ title: roomName });
    
            if (!room) {
                return socket.emit("error", "존재하지 않는 방입니다.");
            }
    
            if (room.participants.length >= room.maxParticipants) {
                return socket.emit("room_full");
            }
    
            // 방에 참가 중인 사용자가 아닌 경우에만 추가
            if (!room.participants.includes(userName)) {
                room.participants.push(userName); // userName을 participants 배열에 추가
                await room.save();
            } else {
                return socket.emit("error", "이미 방에 참여 중입니다.");
            }
    
            // 방에 참가한 모든 사용자에게 참가자 목록을 업데이트
            io.in(roomName).emit("update_participants", room.participants);
    
            // 소켓을 방에 참가시킴
            socket.join(roomName);
    
            console.log(`${userName}이(가) ${roomName}에 입장했습니다.`);
        } catch (err) {
            console.error("방 참가 처리 중 오류:", err);
            socket.emit("error", "방 참가 중 오류가 발생했습니다.");
        }
    });

    // Offer 수신
    socket.on("offer", (offer, roomName) => {
        socket.to(roomName).emit("offer", offer);
    });

    // Answer 수신
    socket.on("answer", (answer, roomName) => {
        socket.to(roomName).emit("answer", answer);
    });

    // ICE Candidate 수신
    socket.on("ice", (candidate, roomName) => {
        socket.to(roomName).emit("ice", candidate);
    });

    // 채팅 메시지 수신
    socket.on("chat_message", (data) => {
        const { message, roomName, userName, token } = data;
        // token을 사용하여 메시지를 보낸 사용자를 확인하고 처리
        console.log(`메시지: ${message}, 보낸 사람: ${userName}, token: ${token}`);
    });
    

    // 사용자 연결 종료
    socket.on("disconnect", () => {
        console.log("사용자 연결 종료:", socket.id);
    });
});

require('dotenv').config();

app.use(express.json());
app.use(express.urlencoded({ extended: true })); // URL-encoded 데이터 파싱
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

// 정적 파일 경로 설정
app.use(express.static(path.join(__dirname, 'views')));

// 환경 변수에서 MongoDB URI 가져오기
const DB_URI = process.env.MONGODB_URI;
const jwtSecret = process.env.JWT_SECRET; // .env 파일의 JWT_SECRET 사용

// MongoDB에 연결
mongoose.connect(DB_URI, {
    dbName: process.env.DB_NAME
})
    .then(() => console.log('MongoDB에 연결되었습니다.'))
    .catch(err => console.error('MongoDB 연결 오류:', err));

app.post("/verify_token", (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];

    console.log("=================",token)
  
    if (!token) {
      console.log("!token")
      return res.status(401).json({ message: "!token" });
    }
  
    jwt.verify(token, jwtSecret, (err, decoded) => {
      if (err) {
        return res.status(401).json({ message: `err ${err}` });
      }
      console.log(decoded)
      res.json({ message: "goood", userId: decoded.id});
    });
  });


// 기본 경로로 접속 시 /login으로 리다이렉트
app.get('/', (req, res) => {
    res.redirect('/login');
});

// 로그인 페이지
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));  
});

// 회원가입 페이지
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'register.html'));  
});


// 회원가입 처리
app.post('/register', async (req, res) => {
    const { id, password1, password2, name, phone } = req.body;

    // ID 중복 체크
    const existingUser = await UserModel.findOne({ id });
    if (existingUser) {
        return res.send('<script>alert("중복된 ID입니다."); window.location="/register";</script>');
    }

    // 비밀번호 확인
    if (password1 !== password2) {
        return res.send('<script>alert("비밀번호가 일치하지 않습니다."); window.location="/register";</script>');
    }

    // 비밀번호 해시 및 사용자 저장
    // const hashedPassword = await bcrypt.hash(password1, 10);
    const newUser = new UserModel({ id, password: password1, name, phone });
    await newUser.save();

    res.redirect('/login');
});

// 로그인 처리
app.post('/login', async (req, res) => {
    const { id, password } = req.body;

    try {
        const user = await UserModel.findOne({ id });
        if (!user) {
            return res.status(401).json({ error: '아이디가 존재하지 않습니다.' });
        }

        // 비밀번호 확인 (암호화된 비밀번호 사용 시 비교 필요)
        // const isMatch = await bcrypt.compare(password, user.password);
        // if (!isMatch) {
        //     return res.status(401).json({ error: '비밀번호가 틀렸습니다.' });
        // }

        if (password !== user.password) { // 평문 비밀번호 비교
            return res.status(401).json({ error: '비밀번호가 틀렸습니다.' });
        }
        // JWT 발급
        const accessToken = jwt.sign({ id: user.id , name: user.name }, jwtSecret, { expiresIn: '1h' });
        res.json({ accessToken });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: '서버 오류' });
    }
    
});

app.get("/home", (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'home.html'))
    // res.redirect('/home.html');
});

// ID 중복 체크 (AJAX 요청 처리)
app.get('/check-id', async (req, res) => {
    const id = req.query.id;
    const exists = await UserModel.exists({ id });
    res.json({ exists });
});

// 방 생성
app.post('/room', async (req, res) => {
    const { title } = req.body;
    try {
        if (!title) {
            return res.status(400).json({ message: '방 제목은 필수입니다.' });
        }

        const newRoom = new RoomModel({
            title,
            participants: [],
            maxParticipants: 3, // 기본값
        });

        await newRoom.save();
        res.status(201).json({ message: '방 생성 성공', room: newRoom });
    } catch (error) {
        console.error('방 생성 에러:', error);
        res.status(500).json({ message: '방 생성 실패' });
    }
});
// 정적 파일 경로 설정
app.use(express.static(path.join(__dirname, "views")));

// 방 목록 API
app.get('/rooms', async (req, res) => {
    try {
        const rooms = await RoomModel.find();
        res.json(
            rooms.map(room => ({
                id: room._id,
                title: room.title,
                participants: room.participants.length,
                maxParticipants: room.maxParticipants,
            }))
        );
    } catch (error) {
        console.error('방 목록 조회 에러:', error);
        res.status(500).json({ error: '서버 에러' });
    }
});

// 방 목록 가져오기
app.get('/room', async (req, res) => {
    const roomId = req.query.id;

    if (!roomId) {
        return res.status(400).send('방 ID가 필요합니다.');
    }

    try {
        const room = await RoomModel.findById(roomId);
        if (!room) {
            return res.status(404).send('<h1>존재하지 않는 방입니다.</h1>');
        }
        if (room.participants.length >= room.maxParticipants) {
            return res.status(403).send('<h1>방이 꽉 찼습니다.</h1>');
        }
        // 방 생성자나 새로운 참가자 추가
        if (!room.participants.includes(req.ip)) {
            room.participants.push(req.ip);
            await room.save();
        }
        res.sendFile(path.join(__dirname, 'views', 'room.html'));
    } catch (error) {
        console.error('방 입장 처리 에러:', error);
        res.status(500).send('<h1>서버 에러가 발생했습니다.</h1>');
    }
});

// 방 이름 검색 기능
app.get('/search-room', async (req, res) => {
    const { title } = req.query; // 클라이언트에서 전달한 title 값 받기
    console.log('요청된 방 이름:', title); // 디버깅을 위한 로그

    try {
        if (!title) {
            console.log('방 이름이 입력되지 않았습니다.');
            return res.status(400).send('<script>alert("방 이름을 입력해주세요."); window.location="/home";</script>');
        }

        // title로 방 검색
        const room = await RoomModel.findOne({ title });
        console.log('검색된 방:', room); // 방 검색 결과 확인

        if (!room) {
            return res.send('<script>alert("해당하는 방 이름이 없습니다."); window.location="/home";</script>');
        }

        // 방이 존재하면 _id를 쿼리 파라미터로 전달하여 리다이렉트
        res.redirect(`/room?_id=${room._id}`);
    } catch (error) {
        console.error('방 검색 에러:', error);
        res.status(500).send('<h1>서버 에러가 발생했습니다.</h1>');
    }
});

server.listen(3000, () => {
    console.log('서버가 http://localhost:3000 에서 실행 중입니다.');
});

module.exports = UserModel;
module.exports = RoomModel;