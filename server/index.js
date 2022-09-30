const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const config = require("./config/key");
const { auth } = require("./middleware/auth");
const { User } = require("./models/User");

// application/x-www-form-urlencoded 분석해서 가져옴
app.use(express.urlencoded({ extended: true }));
// application/json 분석해서 가져옴
app.use(express.json());

app.use(cookieParser());

const mongoose = require("mongoose");
mongoose
  .connect(config.mongoURI)
  .then(() => console.log("MongoDB 연결 성공..."))
  .catch((err) => console.log(err));

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/api/hello", (req, res) => {
  res.send("안녕이여");
});

app.post("/api/users/register", (req, res) => {
  // 회원 가입에 필요한 정보를 클라에서 가져오면
  // 그것들을 DB에 넣어준다
  const user = new User(req.body);

  user.save((err, userInfo) => {
    return err
      ? res.json({ success: false, err })
      : res.status(200).json({ success: true, userInfo: userInfo });
  });
});

app.post("/api/users/login", (req, res) => {
  // 요청된 이메일을 DB에 있는지 찾는다
  User.findOne({ email: req.body.email }, (err, user) => {
    if (!user) {
      return res.json({
        loginSuccess: false,
        message: "email을 다시 확인하세요.",
      });
    }
    // 있다면? 비밀번호가 맞는지 확인한다
    user.comparePassword(req.body.password, (err, isMatch) => {
      if (!isMatch)
        return res.json({
          loginSuccess: false,
          message: "비밀번호가 틀렸습니다",
        });

      // 맞다면? 토큰을 생성한다
      user.generateToken((err, user) => {
        if (err) return res.status(400).send(err);

        // 토큰을 저장한다 어디에? 쿠키, 로컬스토리지 등등
        res
          .cookie("hasVisited", user.token)
          .status(200)
          .json({ loginSuccess: true, userId: user._id });
      });
    });
  });
});

app.get("/api/users/auth", auth, (req, res) => {
  // 여기까지 미들웨어를 통과해 왔다는 얘기는 Authentication이 true라는 말
  res.status(200).json({
    _id: req.user._id,
    email: req.user.email,
    name: req.user.name,
    title: req.user.title,
    isAuth: true,
  });
});

app.get("/api/users/logout", auth, (req, res) => {
  User.findOneAndUpdate({ _id: req.user._id }, { token: "" }, (err, user) => {
    if (err) return res.json({ success: false, err });
    return res.status(200).send({
      success: true,
      logout: "로그 아웃 완료",
    });
  });
});

const port = 5000;

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
