const { decode } = require("jsonwebtoken");
const Attendance = require("../models/studentAttendanceModel");
const ClassTeacher = require("../models/classTeacherModel");
const Student = require("../models/studentSchema");
const { getClassTeacher } = require("../service/classTeacherAuth");
const admin = require("../utils/firebase");
const Parent = require("../models/parentModel");
const Notification = require("../models/notificationModel");

// Take student attendance
const takeAttendance = async (req, res) => {
  try {
    const { statuses, date, id, studentIds } = req.body; // Get statuses, date, class teacher ID, and student IDs from the body

    const classTeacher = await ClassTeacher.findById(id);

    if (!classTeacher) {
      return res.status(404).json({ message: "Class teacher not found" });
    }

    // Check if attendance already exists for this date for any student in the array
    const existingAttendance = await Attendance.find({
      date,
      student: { $in: studentIds },
    });

    if (existingAttendance.length > 0) {
      return res
        .status(409)
        .json({ message: `Attendance already recorded for ${date}` });
    }

    // Create attendance records
    const attendanceRecords = studentIds.map((studentId, index) => ({
      student: studentId,
      classTeacher: classTeacher._id,
      date,
      class: classTeacher.className,
      status: statuses[index],
    }));

    await Attendance.insertMany(attendanceRecords);

    const populatedAttendance = await Attendance.find({
      date,
      student: { $in: studentIds },
    }).populate("student", "name"); // Populate student name

    // Send notifications for absent students and save to the database
    for (const record of populatedAttendance) {
      if (record.status === "a") {
        const parent = await Parent.findOne({
          "students.studentId": record.student._id,
        });

        if (parent) {
          try {
            if (parent.deviceToken) {
              const message = {
                notification: {
                  title: "Student Absence Alert",
                  body: `Your child ${record.student.name} was absent on ${date}.`,
                },
                token: parent.deviceToken,
              };

              await admin.messaging().send(message);
              console.log("Successfully sent notification:", message);
            }

            // Save the notification to the database
            const notification = new Notification({
              title: "Student Absence Alert",
              content: `Your child ${record.student.name} was absent on ${date}.`,
              recipient: "parent",
              parentId: parent._id,
              classTeacherId: classTeacher._id,
            });

            await notification.save();
          } catch (error) {
            console.error("Error sending notification:", error);
          }
        }
      }
    }

    res.status(200).json({
      message: "Attendance recorded successfully",
      attendance: populatedAttendance,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Update student attendance for the current date
const updateAttendance = async (req, res) => {
  try {
    const { studentId, status, id } = req.body; // Get student ID and status

    if (!id) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const { date } = req.params; // Date from the URL parameter

    // Update attendance record
    let attendanceRecord = await Attendance.findOneAndUpdate(
      { student: studentId, date },
      { status },
      { new: true }
    );

    // Notify parent if status is absent
    if (attendanceRecord.status === "a") {
      const parent = await Parent.findOne({ "students.studentId": studentId });
      if (parent) {
        try {
          if (parent.deviceToken) {
            const message = {
              notification: {
                title: "Student Absence Alert",
                body: `Your child ${attendanceRecord.student.name} was marked absent on ${date}.`,
              },
              token: parent.deviceToken,
            };

            await admin.messaging().send(message);
            console.log("Successfully sent notification:", message);
          }

          // Save the notification to the database
          const notification = new Notification({
            title: "Student Absence Alert",
            content: `Your child ${attendanceRecord.student.name} was marked absent on ${date}.`,
            recipient: "parent",
            parentId: parent._id,
          });
          await notification.save();
        } catch (error) {
          console.error("Error sending notification:", error);
        }
      }
    }

    res.status(200).json({
      message: `Attendance updated successfully for ${attendanceRecord.student} with status ${status}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get attendance for a specific student and date
const getStudentAttendanceByDate = async (req, res) => {
  try {
    const { studentId, date } = req.params;

    const attendance = await Attendance.findOne({
      student: studentId,
      date,
    }).populate("student", "name");

    if (!attendance) {
      return res
        .status(404)
        .json({ message: `Attendance not found for ${date}` });
    }

    res.status(200).json({ attendance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get all students' attendance for a specific date and class
const getstudentAttendanceOfClassAll = async (req, res) => {
  try {
    const classTeacherId = req.body;

    if (!classTeacherId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const date = req.params.date;
    const attendance = await Attendance.find({
      classTeacher: classTeacherId,
      date,
    }).populate("student", "name");

    if (!attendance || attendance.length === 0) {
      return res.status(404).json({ message: `.......... ${classTeacherId}` });
    }
    res.status(200).json(attendance);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const checkConsecutiveAbsences = async (req, res) => {
  try {
    const classTeacherId = req.params.id;

    if (!classTeacherId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const classTeacher = await ClassTeacher.findById(classTeacherId);

    if (!classTeacher) {
      return res.status(404).json({ message: "Class teacher not found" });
    }

    // Fetch all students from the class
    const students = await Student.find({ className: classTeacher.className });

    const results = [];
    const absenceThreshold = 3;

    for (const student of students) {
      // Find the last three attendance records for this student in this class,
      // ordered by date (most recent first)
      const attendances = await Attendance.find({ student: student._id })
        .sort({ date: -1 })
        .limit(absenceThreshold);

      // Check if there are exactly three records and they are all marked "a" for absent
      if (
        attendances.length === absenceThreshold &&
        attendances.every((attendance) => attendance.status === "a")
      ) {
        // Add the student to the notification list
        results.push({ studentName: student.name, studentId: student._id });
      }
    }

    if (results.length > 0) {
      res.status(200).json({
        message: "Students with three consecutive absences detected.",
        students: results,
      });
    } else {
      res.status(200).json({
        message: "No students with three consecutive absences.",
      });
    }
  } catch (error) {
    console.error("Error checking consecutive absences:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get last 10 days' attendance for all students in a class
const getstudentAttendanceOfClass = async (req, res) => {
  try {
    const classTeacherId = req.params.id;
    if (!classTeacherId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const classTeacher = await ClassTeacher.findById(classTeacherId);

    if (!classTeacher) {
      return res.status(404).json({ message: "Class teacher not found" });
    }

    const students = await Student.find({ className: classTeacher.className });
    const results = [];

    for (const student of students) {
      // Find the attendance records for this student in the last 10 days,
      // ordered by date (most recent first)
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

      const attendances = await Attendance.find({
        student: student._id,
        date: { $gte: tenDaysAgo.toISOString().split("T")[0] }, // Convert date to string and remove time part
      }).sort({ date: 1 });

      // Construct the attendance string for the last 10 days
      let attendanceString = "";
      for (const attendance of attendances) {
        attendanceString += attendance.status + " ";
      }

      // Add the attendance string to the results
      results.push({
        studentId: student._id,
        studentName: student.name,
        attendance: attendanceString.trim(),
      });
    }

    res.status(200).json({
      message: "Student attendance for the last 10 days.",
      students: results,
    });
  } catch (error) {
    console.error("Error checking student attendance:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getStudentAttendanceById = async (req, res) => {
  try {
    const { studentId } = req.params;
    const attendance = await Attendance.find({
      student: studentId,
    }).populate("student", "name");

    if (!attendance || attendance.length === 0) {
      return res.status(404).json({
        message: `Attendance not found for student with ID ${studentId}`,
      });
    }

    const getStudentAttendanceById = async (req, res) => {
      try {
        const { studentId } = req.params;
        const attendance = await Attendance.find({
          student: studentId,
        }).populate("student", "name");

        if (!attendance || attendance.length === 0) {
          return res.status(404).json({
            message: `Attendance not found for student with ID ${studentId}`,
          });
        }

        res.status(200).json({ attendance });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
      }
    };

    res.status(200).json({ attendance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// class attendance by date and classId

const getStudentAttByClassAndDate = async (req, res) => {
  try {
    const { date, classId } = req.params;

    if (!classId) {
      return res.status(400).json({ message: "Class ID is required" });
    }

    const attendance = await Attendance.find({ date, class: classId })
      .populate({
        path: "student",
        select: "name fathersName",
      })
      .populate({
        path: "class",
        select: "className",
      });

    const filteredAttendance = attendance.filter((a) => a.student !== null);

    if (filteredAttendance.length === 0) {
      return res.status(404).json({
        message: `No attendance found for class ${classId} on date ${date}`,
      });
    }

    res.status(200).json({
      attendance: filteredAttendance,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
};

//particular school
const getStudentAttOfSchool = async (req, res) => {
  try {
    const { date, id } = req.params;

    if (!id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const attendance = await Attendance.find({ date })
      .populate({
        path: "student",
        match: { schoolName: id },
        select: "name fathersName",
      })
      .populate({
        path: "class",
        select: "className",
      });

    const filteredAttendance = attendance.filter((a) => a.student !== null);

    if (filteredAttendance.length === 0) {
      return res.status(404).json({
        message: `No attendance found for school ${id} on date ${date}`,
      });
    }

    // Calculate the number of present students
    const presentStudentsCount = filteredAttendance.filter(
      (record) => record.status === "p"
    ).length;

    const absentStudentsCount = filteredAttendance.filter(
      (record) => record.status === "a"
    ).length;

    const leaveStudentsCount = filteredAttendance.filter(
      (record) => record.status === "l"
    ).length;

    res.status(200).json({
      attendance: filteredAttendance,
      presentStudentsCount,
      absentStudentsCount,
      leaveStudentsCount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getStudentAttOfAllSchool = async (req, res) => {
  try {
    const { date, id } = req.params;

    if (!id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const attendance = await Attendance.find({ date }).populate({
      path: "student",
      select: "name schoolName",
    });

    const filteredAttendance = attendance.filter((a) => a.student !== null);

    // Calculate the number of present students in all schools
    const presentStudentsCountinAllSchools = filteredAttendance.filter(
      (record) => record.status === "p"
    ).length;

    // Total number of students
    const totalStudents = await Student.find({});
    const totalStudentsCount = totalStudents.length;

    res.status(200).json({
      attendance: filteredAttendance,
      presentStudentsCountinAllSchools,
      totalStudentsCount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getStudentAttendanceByIdMonthly = async (req, res) => {
  try {
    const { studentId } = req.body;

    if (!studentId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const { month: targetMonth, year: targetYear } = req.body; // Month and year from request

    const normalizedTargetMonth = targetMonth.toString().padStart(2, "0"); // Ensure leading zero if single digit

    const attendanceRecords = await Attendance.find({
      student: studentId,
    }).populate("student", "name");

    if (!attendanceRecords || attendanceRecords.length === 0) {
      return res.status(404).json({
        message: `Attendance not found for student with ID ${studentId}`,
      });
    }
    const matchingAttendanceRecords = attendanceRecords.filter((record) => {
      const [recordYear, recordMonth] = record.date.split("-"); // Extract the year and month from the date (e.g., '2024-06-05')

      return (
        recordMonth === normalizedTargetMonth &&
        recordYear === targetYear.toString()
      ); // Ensure both year and month match exactly
    });
    let presentCount = 0;
    let absentCount = 0;
    let leaveCount = 0;

    matchingAttendanceRecords.forEach((record) => {
      switch (record.status) {
        case "p":
          presentCount++;
          break;
        case "a":
          absentCount++;
          break;
        case "l":
          leaveCount++;
          break;
        default:
          console.log("Unknown status:", record.status);
      }
    });

    res.status(200).json({
      message: "Attendance calculated successfully",
      data: {
        month: normalizedTargetMonth,
        year: targetYear,
        presentCount,
        absentCount,
        leaveCount,
        attendanceRecords: matchingAttendanceRecords, // Include attendance data
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  updateAttendance,
  takeAttendance,
  getStudentAttendanceByDate,
  getstudentAttendanceOfClass,
  checkConsecutiveAbsences,
  getstudentAttendanceOfClassAll,
  getStudentAttendanceById,
  getStudentAttOfSchool,
  getStudentAttOfAllSchool,
  getStudentAttendanceByIdMonthly,
  getStudentAttByClassAndDate,
};
