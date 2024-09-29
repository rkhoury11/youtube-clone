import express  from "express";
import { convertVideo, deleteProcessedVideo, deleteRawVideo, downloadRawVideo, setupDirectories, uploadProcessedVideo } from "./storage";

setupDirectories();

// app.get("/", (req, res) =>{
//     // http get point
//     res.send("Hello World!");
// });
// want post request instead

const app = express();
app.use(express.json());

app.post("/process-video", async (req,res) => {
    // refer to Pub/Sub message documentation if I have any questions
    // https://cloud.google.com/pubsub/docs
    let data;
    try {
        const message = Buffer.from(req.body.message.data, "base64").toString("utf-8");
        data = JSON.parse(message);
        if (!data.name) { // tells us the file name
            throw new Error("Invalid message payload received");
        }
    } catch (e) {
        console.error("Error parsing Pub/Sub message: " + e);
        res.status(400).send("Bad Request: missing file name");
        return;
    }

    const inputFileName = data.name;
    const outputFileName = "processed-" + inputFileName;

    // Download the video from Cloud Storage
    await downloadRawVideo(inputFileName);

    // Convert the video to 360p
    try {
        await convertVideo(inputFileName, outputFileName);
    } catch (err) {
        await Promise.all([
            deleteRawVideo(inputFileName),
            deleteProcessedVideo(outputFileName)
        ]);
        console.error("Error converting video: " + err);
        return res.status(500).send("Internal Server Error: video processing failed");
    }

    await Promise.all([
        deleteRawVideo(inputFileName),
        deleteProcessedVideo(outputFileName)
    ]);
    // Upload the processed video to Cloud Storage
    await uploadProcessedVideo(outputFileName);

    return res.status(200).send("Video processed successfully"); // status 200 means success
});

const port = process.env.PORT || 3000; // fall back on 3000 in case it is undefined

app.listen(port, () => {
    console.log(
        'Video processing service listening at http://localhost:'+port);
});

