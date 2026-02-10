import { v2 as cloudinary, v2 } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath, publicId) => {
  try {
    if (!localFilePath) return null;

    const options = {
      resource_type: "auto",
      public_id: publicId,
      overwrite: !!publicId,
    };

    // upload the file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, options);

    // File has been uploaded successfully
    fs.unlinkSync(localFilePath);

    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath); // Remove the locally saved temporary file if file upload failed
    return null;
  }
};

export { uploadOnCloudinary };
