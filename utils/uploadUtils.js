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
const deleteFromCloudinary = async (secureUrl) => {
    try {
        if (!secureUrl) return;
        const parts = secureUrl.split('/upload/');
        if (parts.length < 2) return;
        const publicId = parts[1].replace(/v\d+\//, '').replace(/\.[^/.]+$/, '');
        await cloudinary.uploader.destroy(publicId);
    } catch (error) {
        console.error("Failed to delete from Cloudinary:", error);
    }
};

module.exports = { uploadToCloudinary, deleteFromCloudinary };
