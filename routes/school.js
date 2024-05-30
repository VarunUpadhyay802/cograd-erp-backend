const express = require("express");
const {
  schoolRegister,
  schoolLogIn,
  schoolList,
} = require("../controllers/school");
const router = express.Router();

router.post("/register", schoolRegister);
router.post("/login", schoolLogIn);
router.get("/list", schoolList);
router.post("/logout", (req, res) => {
  // Clear the token cookie
  res.clearCookie("token");
  res.send({ message: "Logged out successfully" });
});

module.exports = router;
