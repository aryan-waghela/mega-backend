import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { renamePublicId } from "../utils/cloudinary.js";
import { ApiError } from "../utils/ApiErrors.js";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    avatar: {
      url: {
        type: String, // cloudanary url
        required: true,
      },
      publicId: {
        type: "UUID",
        default: () => randomUUID(), // avatar publicId
        unique: true,
      },
    },
    coverImage: {
      url: {
        type: String, // cloudanary url
        required: true,
      },
      publicId: {
        type: "UUID",
        default: () => randomUUID(),
        unique: true, // cover image publicId
      },
    },
    watchHistory: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    refreshToken: {
      type: String,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.pre("save", async function () {
  if (this.isNew || this.isModified("avatar.publicId")) {
    const updated = await renamePublicId(
      "avatar-temp",
      this.avatar.publicId.toString()
    );

    if (!updated) throw new ApiError(400, "Unable to update public_id");

    
    else console.log("Avatar public_id updated to :", updated.public_id);
  }

  if (this.isNew || this.isModified("coverImage.publicId")) {
    const updated = await renamePublicId(
      "cover-temp",
      this.coverImage.publicId.toString()
    );

    if (!updated) throw new ApiError(400, "Unable to update public_id");
    else console.log("CoverImage public_id updated to :", updated.public_id);
  }
});

userSchema.methods.isPasswordCorrent = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      fullName: this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

export const User = mongoose.model("User", userSchema);
