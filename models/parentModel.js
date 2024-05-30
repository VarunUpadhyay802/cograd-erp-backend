const mongoose = require("mongoose");

const parentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
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
      default: "PARENT",
    },
    qualification: {
      type: String,
      required: true,
    },
    designation: {
      type: String,
      required: true,
    },
    photo: {
      type: String,
      required: true,
    },
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "school",
      required: true,
    },
    contact: {
      type: String,
      required: true,
    },
    students: [
      {
        studentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "student",
          required: true,
        },
        fees: {
          type: Number,
          default: 0,
          required: true,
        },
      },
    ],
    payments: [
      {
        paidAmount: {
          type: Number,
          required: true,
        },
        receipt: {
          type: String,
          required: true,
        },
        date: {
          type: Number,
          default: Date.now(),
        },
        remainingAmount: {
          type: Number,
          required: true,
        },
      },
    ],
  },

  { timestamps: true }
);

module.exports = mongoose.model("parent", parentSchema);
