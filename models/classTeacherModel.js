const mongoose = require("mongoose");

const classTeacherSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      unique: true,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      default: "classTeacher",
    },
    className: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "class",
      required: true,
    },
    //right now i am taking school as input but it will be reffered
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "school",
      required: true,
    },
    // school: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "school",
    //   required: true,
    // },
  },
  { timestamps: true }
);

module.exports = mongoose.model("classTeacher", classTeacherSchema);
