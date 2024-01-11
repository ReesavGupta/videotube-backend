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

        const videoDuration = await getVideoDurationFromCloudinary(
            response.public_id
        )

        return { ...response, videoDuration }
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

const getVideoDurationFromCloudinary = async function (publicId) {
    try {
        const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/video/${publicId}`

        const response = await axios.get(cloudinaryUrl, {
            params: {
                api_key: process.env.CLOUDINARY_API_KEY,
                api_secret: process.env.CLOUDINARY_API_SECRET,
            },
        })

        return response.data.duration
    } catch (error) {
        // Handle errors
        console.error(
            "Error fetching video duration from Cloudinary:",
            error.message
        )
        return null
    }
}

export default uploadOnCloudinary
