const express = require("express");
const {
  createNewTask,
  getAllTasks,
  getTaskByPeriod,
  deleteTask,
  updateTask,
  getTasksByClassAndSubject,
} = require("../controllers/taskController");
const router = express.Router();

router.post("/", createNewTask);
router.get("/alltasks", getAllTasks);
router.get("/task/:periodId", getTaskByPeriod);
router.get('/:classID/:subjectID', getTasksByClassAndSubject);
router.put("/task/:id", updateTask);
router.delete("/:id", deleteTask);

module.exports = router;
