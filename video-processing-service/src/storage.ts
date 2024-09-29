// 1. GCS file interactions
// 2. Local file interactions

import { Storage } from "@google-cloud/storage";
import fs from "fs";
import Ffmpeg from "fluent-ffmpeg";
import { raw } from "express";

const storage = new Storage();

const rawVideoBucketName = "rafa-yt-raw-vids"; // names must be globally unique
const processedVideoBucketName = "rafa-yt-processed-vids"; // names must be globally unique

const localRawVideoPath = "./raw-videos";
const localProcessedVideoPath = "./processed-videos";

/**
 * creates the local directories for raw and processed videos
 */

export function setupDirectories() {
    ensureDirectoryExistence(localRawVideoPath);
    ensureDirectoryExistence(localProcessedVideoPath);
}


/**
 * @param rawVideoName - The name of the file to convert from {@link localRawVideoPath}.
 * @param processedVideoName - The name of the file to convert to {@link localProcessedVideoPath}.
 * @returns A promise that resolves when the video has been converted.
 */

export function convertVideo(rawVideoName: string, processedVideoName: string) {
    return new Promise<void>((resolve, reject) =>{
        Ffmpeg(localRawVideoPath + "/" + rawVideoName)
        .outputOptions("-vf", "scale=-1:360") // 360p
        .on("end", () => {
            console.log("Processing finished successfully");
            resolve();
        })
        .on("error", (err) => {
            console.log("An error ocurred: " + err.message);
            reject(err);
        })
        .save(localProcessedVideoPath + "/" + processedVideoName);
    });
    
}


/**
 * @param fileName - The name of the file to download from the
 * {@link rawVideoBucketName} bucket into the {@link localRawVideoPath} folder.
 * @returns A promise that resolves when the file has been downloaded.
 */

export async function downloadRawVideo(fileName: string) { // Must return a promise
    await storage.bucket(rawVideoBucketName) // making this a blocking call. Can only use await in async functions
        .file(fileName)
        .download({destination: localRawVideoPath + "/" + fileName});

        console.log("gs://" + rawVideoBucketName + "/" + fileName + " downloaded to " + localRawVideoPath + "/" + fileName);
}


/**
 * @param fileName - The name of the file to upload from the 
 * {@link localProcessedVideoPath} folder into the {@link processedVideoBucketName} bucket.
 * @returns A promise that resolves when the file has been uploaded.
 */

export async function uploadProcessedVideo(fileName: string) {
    const bucket = storage.bucket(processedVideoBucketName);

    await bucket.upload(localProcessedVideoPath + "/" + fileName, {
        destination: fileName
    });

    console.log(localProcessedVideoPath + "/" + fileName + " uploaded to gs://" + processedVideoBucketName + "/" + fileName);
    
    await bucket.file(fileName).makePublic(); // need the await keyword to make sure the file is public before the function returns
}


/**
 * @paaram filePath - The path of the file to delete.
 * @returns A promise that resolves when the file has been deleted.
 */

function deletFile(filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        if (fs.existsSync(filePath)) {
            fs.unlink(filePath, (err) => {
                if (err) { // there is an error
                    console.log("Failed to delete file at " + filePath, err);
                    reject(err);
                } else {
                    console.log("Deleted file at " + filePath);
                    resolve();
                }
            });
        } else {
            console.log("File not found at " + filePath + ", skipping the delete");
            reject("File does not exist");
        }
    });
}

/**
 * @param fileName - The name of the file to delete from the 
 * {@link localRawVideoPath} folder.
 * @returns A promise that resolves when the file has been deleted.
 */

export async function deleteRawVideo(fileName: string) {
    deletFile(localRawVideoPath + "/" + fileName);
}

/**
 * @param fileName - The name of the file to delete from the 
 * {@link localProcessedVideoPath} folder.
 * @returns A promise that resolves when the file has been deleted.
 */

export async function deleteProcessedVideo(fileName: string) {
    deletFile(localProcessedVideoPath + "/" + fileName);
}


/**
 * Ensures a directory exists, creating it if it does not.
 * @param {string} dirPath - The directory path to check.
 */

function ensureDirectoryExistence(dirPath: string) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, {recursive: true}); // recursive: true creates the parent directories if they do not exist (nested directories)
        console.log("Created directory at " + dirPath);
    }
}