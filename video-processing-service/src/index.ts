import express  from "express";
import ffmpeg from "fluent-ffmpeg"; // CLI tool, won't do anything if the computer doesn't have it

const app = express();
app.use(express.json());

// app.get("/", (req, res) =>{
//     // http get point
//     res.send("Hello World!");
// });
// want post request instead

app.post("/process-video", (req,res) => {
    // Get path of the input video from the request body
    const inputFilePath = req.body.inputFilePath;
    const outputFilePath = req.body.outputFilePath;

    if (!inputFilePath || !outputFilePath) {
        res.status(400).send("Bad request: missing file path."); // client error
    }

    ffmpeg(inputFilePath)
        .outputOptions("-vf", "scale=-1:360")
        .on("end", () => {
            res.status(200).send("Processing finished successfully"); // this function is async
            // the return statement will execute before the video processing is complete
        })
        .on("error", (err) => {
            console.log("An error ocurred: " + err.message);
            res.status(500).send("Internal Server Error: " + err.message)
        })
        .save(outputFilePath);

    
});

const port = process.env.PORT || 3000; // fall back on 3000 in case it is undefined

app.listen(port, () => {
    console.log(
        'Video processing service listening at http://localhost:'+port);
});

