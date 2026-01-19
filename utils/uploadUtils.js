const cloudinary = require("../config/cloudinary");

const uploadToCloudinary = (fileBuffer, folder = "pepal-barry-products") => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: folder,
                allowed_formats: ["jpg", "png", "jpeg", "webp"],
            },
            (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result.secure_url);
                }
            }
        );
        uploadStream.end(fileBuffer);
    });
};

module.exports = { uploadToCloudinary };
