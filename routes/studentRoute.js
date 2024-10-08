const router = require("express").Router();

const {
  getStudentAttendanceById,
  getStudentAttendanceByIdMonthly,
} = require("../controllers/studentAttendanceController.js");
const {
  studentRegister,
  studentLogIn,
  getStudentDetail,
  studentList,
  schoolStudentList,
  deleteStudent,
  studentEditDetails
} = require("../controllers/studentController.js");
const singleUpload = require("../middleware/multer.js");
router.post("/register", singleUpload, studentRegister);
router.put("/edit", singleUpload, studentEditDetails);
router.post("/login", studentLogIn);
router.get("/:id", getStudentDetail);
router.get("/studentAttendance/:studentId", getStudentAttendanceById); //all the att records for a particular student

router.post("/studentAttendanceMonthly", getStudentAttendanceByIdMonthly); //all the att records for a particular student
router.get("/studentList/:id", studentList);
router.get("/get/list/:id", schoolStudentList);
router.delete("/deleteStudent/:id", deleteStudent);

router.post("/logout", (req, res) => {
  // Clear the token cookie
  res.clearCookie("studentToken");
  res.send({ message: "Logged out successfully" });
});
module.exports = router;
