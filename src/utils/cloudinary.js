import { v2 as cloudinary } from "cloudinary"
import fs from "fs"

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null
        //upload file to cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
        })
        //file has been uploaded sucessfully
        console.log("file has been uploaded on cloudinary:" + response.url)
        fs.unlinkSync(localFilePath)
        return response
    } catch (error) {
        //remove the locally saved temporary file as the operation got failed
        fs.unlinkSync(localFilePath)
        return null
    }
}

export const deleteOldAvatarFromCloudinary = async (oldAvatarUrl) => {
    await cloudinary.uploader.destroy(oldAvatarUrl, (result) =>
        console.log(result)
    )
}

export default uploadOnCloudinary
