import { v2 as cloudinary } from 'cloudinary';
import fs from "fs";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});


const uploadOnCloudinary = async (localFilePath) => {

    try {

        if (!localFilePath) {
            throw new Error("Couldn't find file path");
        }

        //upload file to cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        });

        //file has been uploaded sucessfully
        console.log("file has been uploaded on cloudinary:" + response.url);
        return response;

    } catch (error) {

        //remove the locally saved temporary file as the operation got failed
        fs.unlinkSync(localFilePath)
        return null;

    }
}


export default uploadOnCloudinary