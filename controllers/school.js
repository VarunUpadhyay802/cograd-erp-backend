const bcrypt = require("bcryptjs");
const School = require("../models/school");
const { setSchool, getSchool } = require("../service/schoolAuth");
const maxAge = 60 * 60;

exports.schoolRegister = async (req, res) => {
  try {
    // Check if email or school name already exists
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
    const school = new School({
      ...req.body,
      password: hashedPassword, // Store the hashed password
    });

    // Generate token for the newly signed-up school
    const token = setSchool(school);
    res.cookie("token", token);
    console.log("school-token", token);
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
      return res.status(400).send({ message: "Email and password are required" });
    }

    let school = await School.findOne({ email: req.body.email });
    if (!school) {
      return res.status(404).send({ message: "School not found" });
    }

    const isMatch = await bcrypt.compare(req.body.password, school.password);
    if (!isMatch) {
      return res.status(401).send({ message: "Invalid password" });
    }

    school.password = undefined; // Remove password from the response
    const token = jwt.sign({ id: school.id, email: school.email, role: school.role }, secret, { expiresIn: maxAge });
    res.cookie("token", token, {
      httpOnly: true, // Set to true for security
      sameSite: "none",
      secure: true,
      path: "/",
      maxAge: maxAge * 1000
    });
    return res.status(200).send(school);
  } catch (error) {
    console.error("Error logging in:", error);
    return res.status(500).send({ message: "Internal server error" });
  }
};

exports.schoolList = async (req, res) => {
  try {
    const schools = await School.find({}, {  });
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
