const express = require("express");
const {
  markSelfAttendance, getTeacherAttendance, calculateAttendanceMonthly
} = require("../controllers/teacherAttendanceController");

const router = express.Router();

// Endpoint for teachers to mark their own attendance
router.post("/markSelf", markSelfAttendance);
router.post("/calculate", calculateAttendanceMonthly)
router.get("/get/:teacherId",getTeacherAttendance)
module.exports = router;
