const bcrypt = require("bcryptjs");
const School = require("../models/school");
const { setSchool, getSchool } = require("../service/schoolAuth");
const getDataUri = require("../utils/dataUri");
const cloudinary = require("cloudinary").v2;
exports.schoolRegister = async (req, res) => {
  try {

    const existingSchoolByEmail = await School.findOne({
      email: req.body.email,
    });
    const existingSchool = await School.findOne({
      schoolName: req.body.schoolName,
    });

    if (existingSchoolByEmail) {
      return res.send({ message: "Email already exists" });
    } else if (existingSchool) {
      return res.send({ message: "School name already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(req.body.password, 10); // 10 is the salt rounds
    //Done using multer
    const file = req.file;

   
    if (!file) {
      return res.status(400).json({ message: "Profile Photo is required" });
    }

    const photoUri = getDataUri(file);
  
    const myCloud = await cloudinary.uploader.upload(photoUri.content);
    const school = new School({
      ...req.body,
      password: hashedPassword, // Store the hashed password
      profile: myCloud.secure_url,
    });

    let result = await school.save();
    result.password = undefined; // Do not send password back
    res.send(result);
  } catch (err) {
    res.status(500).json(err);
  }
};

exports.schoolLogIn = async (req, res) => {
  try {
    if (!req.body.email || !req.body.password) {
      return res
        .status(400)
        .send({ message: "Email and password are required" });
    }

    let school = await School.findOne({ email: req.body.email });
    if (!school) {
      return res.status(404).send({ message: "School not found" });
    }

    // Check if the password matches
    const isMatch = await bcrypt.compare(req.body.password, school.password);
    if (!isMatch) {
      return res.status(401).send({ message: "Invalid password" });
    }

    school.password = undefined; // Remove password from the response
    const token = setSchool(school);
    // const expiryDate = new Date(Date.now() + 3600000); // 1 hour
    res.cookie("token", token);
    return res.status(200).json(school);
  } catch (error) {
    console.error("Error logging in:", error);
    return res.status(500).send({ message: "Internal server error" });
  }
};

exports.schoolList = async (req, res) => {
  try {
    const schools = await School.find({}, {});
    if (schools && schools.length > 0) {
      return res.status(200).json(schools);
    } else {
      return res.status(402).json({ message: "No school found" });
    }
  } catch (err) {
    return res.status(500).json(err);
  }
};

// exports.parentVerificationList = async (req, res) => {
//   try {
//     const token = req.cookies?.token;
//     const decodedToken = getSchool(token); // Decode the token to extract school information
//     if (!decodedToken || !decodedToken.id) {
//       return res.status(401).json({ message: "Unauthorized" });
//     }

//     const school = await School.findById(decodedToken.id);
//     if (!school) {
//       return res.status(404).json({ err: "School not found" });
//     }

//     // Populate the parentVerification array with parent and student details
//     await school
//       .populate("parentVerification.parent")
//       .populate("parentVerification.student")
//       .execPopulate();

//     res.status(200).json(school.parentVerification);
//   } catch (err) {
//     return res.status(500).json(err);
//   }
// };

// exports.parentVerificationAction = async (req, res) => {
//   try {
//     const { studentId, parentId, action } = req.body;
//     const token = req.cookies?.token;
//     const decodedToken = getSchool(token); // Decode the token to extract school information
//     if (!decodedToken || !decodedToken.id) {
//       return res.status(401).json({ message: "Unauthorized" });
//     }

//     const school = await School.findById(decodedToken.id);

//     if (!school) {
//       return res.status(404).json({ error: "School not found" });
//     }

//     // Check if parentVerification array exists in the school object
//     if (!school.parentVerification || school.parentVerification.length === 0) {
//       return res
//         .status(404)
//         .json({ error: "No parent verifications found for this school" });
//     }

//     // Check if there's a matching parent verification for the given parent ID and school ID
//     const matchingVerification = school.parentVerification.find(
//       (verification) =>
//         verification.parentId === parentId &&
//         verification.studentId === studentId
//     );

//     if (matchingVerification) {
//       // Matching verification found, handle accordingly
//     } else {
//       // No matching verification found, handle accordingly
//     }
//   } catch (err) {
//     return res.status(500).json(err);
//   }
// };
