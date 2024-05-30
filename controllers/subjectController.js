const { getSchool } = require("../service/schoolAuth");

const Subject = require("../models/subjectModel");
const Teacher = require("../models/teacherModel");
const mongoose = require("mongoose");

exports.subjectCreate = async (req, res) => {
  try {
    if (!req.body.school) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const subjects = req.body.subjects.map((subject) => ({
      subName: subject.subName,
      subCode: subject.subCode,
      className: req.body.className,
      school: req.body.school, // Use the school ID from the decoded token
    }));

    const insertResults = [];

    for (const subject of subjects) {
      const existingSubjectCode = await Subject.findOne({
        subCode: subject.subCode,
        school: req.body.school,
      });

      if (existingSubjectCode) {
        insertResults.push({
          success: false,
          message: `Subject with subject code ${subject.subCode} already exists for this school`,
        });
      } else {
        const result = await Subject.create(subject);
        insertResults.push({
          success: true,
          subject: result,
        });
      }
    }

    res.json(insertResults);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.allSubjects = async (req, res) => {
  try {
    const token = req.cookies?.token; // Retrieve the JWT token from the cookies
    const decodedToken = getSchool(token); // Decode the token to extract school information

    if (!decodedToken || !decodedToken.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const schoolId = decodedToken.id;

    const subjects = await Subject.find({ school: schoolId }).populate(
      "school",
      "schoolName className"
    );

    if (subjects.length > 0) {
      res.status(200).send(subjects); // 200 OK
    } else {
      res.status(200).json({ message: "No subjects found" }); // 200 OK with no subjects message
    }
  } catch (err) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.classSubjects = async (req, res) => {
  try {
    // const token = req.cookies?.token; // Retrieve the JWT token from the cookies
    // const decodedToken = getSchool(token); // Decode the token to extract school information

    // if (!decodedToken || !decodedToken.id) {
    //   return res.status(401).json({ message: "Unauthorized" });
    // }

    // const schoolId = decodedToken.id; // Use the school ID from the decoded token

    const subjects = await Subject.find({
      className: req.params.id,
      // school: schoolId, // Ensure it's for the current school
    })
      .populate("teacher", "name")
      .populate("className", "className");

    if (subjects.length > 0) {
      res.send(subjects);
    } else {
      res.send({ message: "No subjects found" });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.freeSubjectList = async (req, res) => {
  try {
    const token = req.cookies?.token; // Retrieve the JWT token from the cookies
    const decodedToken = getSchool(token); // Decode the token to extract school information

    if (!decodedToken || !decodedToken.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const schoolId = decodedToken.id; // Use the school ID from the decoded token

    const subjects = await Subject.find({
      className: req.params.id,
      teacher: { $exists: false },
      school: schoolId, // Ensure it's for the current school
    });

    if (subjects.length > 0) {
      res.send(subjects);
    } else {
      res.send({ message: "No subjects found" });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
