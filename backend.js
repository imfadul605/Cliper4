/*
  ClipForge AI
  Atria Video Editing Instruction Generator

  FILE:
  backend.js

  REQUIRED:
  Node.js 18+

  ENV:
  ATRIA_API_KEY=atr_0okxRWuNj-7Sg3JO9ZbXqR1JepllvjSu

  RUN:
  node backend.js
*/

"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");


/* ==============================
   CONFIG
============================== */

const PORT =
  process.env.PORT || 3000;

const API_KEY =
  process.env.ATRIA_API_KEY;

const ATRIA_URL =
  "https://api.atria-asi.ai/v1/chat/completions";

const MODEL =
  "Atria-Dawn-Preview";


/* ==============================
   SECURITY CHECK
============================== */

if (!API_KEY) {

  console.error(
    "\nERROR: ATRIA_API_KEY is not configured.\n"
  );

  console.error(
    "Set it before starting the server.\n"
  );

  console.error(
    "Example:\n"
  );

  console.error(
    "ATRIA_API_KEY=your_key node backend.js\n"
  );

  process.exit(1);
}


/* ==============================
   FRONTEND
============================== */

const FRONTEND =
  path.join(
    __dirname,
    "frontend.html"
  );


/* ==============================
   READ BODY
============================== */

function readBody(req){

  return new Promise(
    (resolve,reject)=>{

      let body = "";

      let size = 0;

      const MAX_SIZE =
        2 * 1024 * 1024;


      req.on(
        "data",
        chunk => {

          size += chunk.length;

          if(size > MAX_SIZE){

            reject(
              new Error(
                "Request body too large."
              )
            );

            req.destroy();

            return;
          }

          body += chunk;

        }
      );


      req.on(
        "end",
        ()=>{
          resolve(body);
        }
      );


      req.on(
        "error",
        reject
      );

    }
  );

}


/* ==============================
   JSON RESPONSE
============================== */

function sendJSON(
  res,
  status,
  data
){

  res.writeHead(
    status,
    {
      "Content-Type":
        "application/json; charset=utf-8",

      "Cache-Control":
        "no-store",

      "Access-Control-Allow-Origin":
        "*",

      "Access-Control-Allow-Headers":
        "Content-Type",

      "Access-Control-Allow-Methods":
        "GET,POST,OPTIONS"
    }
  );

  res.end(
    JSON.stringify(data)
  );

}


/* ==============================
   Atria request
============================== */

async function callAtria(payload){

  const {

    platform =
      "YouTube Shorts",

    style =
      "Viral / Fast paced",

    duration =
      "60 seconds",

    language =
      "English",

    content = "",

    features = {}

  } = payload;


  const systemPrompt = `
You are ClipForge AI, a professional
short-form video editor and content strategist.

Your task is to create VIDEO EDITING INSTRUCTIONS.

IMPORTANT:

You are NOT directly editing or rendering
the video.

You are creating a detailed editing blueprint
that a human editor, FFmpeg pipeline, or
video-editing engine can follow.

Analyze only the information provided by
the user.

Never invent timestamps that are not provided.

If timestamps exist, use them.

If timestamps do not exist, describe the
section by its sentence/topic.

The final answer must be practical,
specific and easy to execute.

Create these sections:

1. VIDEO OBJECTIVE
2. BEST HOOK
3. CLIP STRUCTURE
4. CUT / REMOVE INSTRUCTIONS
5. PACING
6. CAPTION INSTRUCTIONS
7. ZOOM / CAMERA MOVEMENT
8. B-ROLL
9. TRANSITIONS
10. MUSIC / SOUND EFFECTS
11. VISUAL EMPHASIS
12. CTA
13. FINAL TIMELINE
14. EXPORT SETTINGS

For short-form video:

- Prefer a strong opening.
- Remove unnecessary introductions.
- Remove dead air where appropriate.
- Keep the speaker's natural meaning.
- Avoid fake quotes.
- Avoid claiming guaranteed virality.
- Keep editing instructions realistic.
- Do not say that you actually rendered the video.

Return clean plain text.
`;


  const userPrompt = `
TARGET PLATFORM:
${platform}

EDITING STYLE:
${style}

TARGET DURATION:
${duration}

LANGUAGE:
${language}

FEATURE SETTINGS:

Dynamic captions:
${features.captions ? "YES" : "NO"}

Smart zoom:
${features.zoom ? "YES" : "NO"}

B-roll:
${features.broll ? "YES" : "NO"}

Music/SFX:
${features.music ? "YES" : "NO"}


USER VIDEO INFORMATION:

${content}
`;


  const requestBody = {

    model:MODEL,

    messages:[

      {
        role:"system",

        content:
          systemPrompt
      },

      {
        role:"user",

        content:
          userPrompt
      }

    ],

    temperature:0.7,

    max_tokens:5000

  };


  const response =
    await fetch(
      ATRIA_URL,
      {

        method:"POST",

        headers:{

          "Authorization":
            `Bearer ${API_KEY}`,

          "Content-Type":
            "application/json"

        },

        body:
          JSON.stringify(
            requestBody
          )

      }
    );


  const raw =
    await response.text();


  let data;

  try{

    data =
      JSON.parse(raw);

  }

  catch{

    throw new Error(
      "Atria returned invalid JSON."
    );

  }


  if(!response.ok){

    let message =
      "Atria API request failed.";

    if(data.error){

      if(typeof data.error === "string"){

        message =
          data.error;

      }

      else if(data.error.message){

        message =
          data.error.message;

      }

    }


    throw new Error(
      `${message} HTTP ${response.status}`
    );

  }


  const result =
    data
      ?.choices?.[0]
      ?.message?.content;


  if(!result){

    throw new Error(
      "Atria returned no AI content."
    );

  }


  return result;

}


/* ==============================
   HTTP SERVER
============================== */

const server =
  http.createServer(
    async (req,res)=>{

      try{

        /* CORS preflight */

        if(
          req.method === "OPTIONS"
        ){

          res.writeHead(
            204,
            {
              "Access-Control-Allow-Origin":
                "*",

              "Access-Control-Allow-Headers":
                "Content-Type",

              "Access-Control-Allow-Methods":
                "GET,POST,OPTIONS"
            }
          );

          res.end();

          return;
        }


        /* HEALTH */

        if(
          req.method === "GET" &&
          req.url === "/api/health"
        ){

          sendJSON(
            res,
            200,
            {
              status:"ok",

              service:
                "ClipForge AI",

              provider:
                "Atria",

              model:
                MODEL
            }
          );

          return;
        }


        /* GENERATE */

        if(
          req.method === "POST" &&
          req.url === "/api/generate"
        ){

          const body =
            await readBody(req);


          let payload;

          try{

            payload =
              JSON.parse(body);

          }

          catch{

            sendJSON(
              res,
              400,
              {
                error:
                  "Invalid JSON."
              }
            );

            return;
          }


          if(
            !payload.content ||
            !payload.content.trim()
          ){

            sendJSON(
              res,
              400,
              {
                error:
                  "Video information or transcript is required."
              }
            );

            return;
          }


          if(
            payload.content.length >
            50000
          ){

            sendJSON(
              res,
              400,
              {
                error:
                  "Input is too large. Maximum 50,000 characters."
              }
            );

            return;
          }


          const result =
            await callAtria(
              payload
            );


          sendJSON(
            res,
            200,
            {
              success:true,

              result:result
            }
          );

          return;
        }


        /* FRONTEND */

        if(
          req.method === "GET" &&
          (
            req.url === "/" ||
            req.url === "/frontend.html"
          )
        ){

          if(
            !fs.existsSync(FRONTEND)
          ){

            res.writeHead(
              500,
              {
                "Content-Type":
                  "text/plain"
              }
            );

            res.end(
              "frontend.html not found."
            );

            return;
          }


          const html =
            fs.readFileSync(
              FRONTEND,
              "utf8"
            );


          res.writeHead(
            200,
            {
              "Content-Type":
                "text/html; charset=utf-8",

              "Cache-Control":
                "no-store"
            }
          );


          res.end(html);

          return;
        }


        /* 404 */

        sendJSON(
          res,
          404,
          {
            error:
              "Route not found."
          }
        );

      }

      catch(error){

        console.error(
          "SERVER ERROR:",
          error
        );


        sendJSON(
          res,
          500,
          {
            error:
              error.message ||
              "Internal server error."
          }
        );

      }

    }
  );


/* ==============================
   START
============================== */

server.listen(
  PORT,
  "0.0.0.0",
  ()=>{
    console.log("");
    console.log(
      "================================"
    );
    console.log(
      "       CLIPFORGE AI"
    );
    console.log(
      "================================"
    );
    console.log(
      `Server: http://localhost:${PORT}`
    );
    console.log(
      `Model: ${MODEL}`
    );
    console.log(
      "Atria: Connected"
    );
    console.log(
      "================================"
    );
    console.log("");
  }
);


/* ==============================
   SHUTDOWN
============================== */

process.on(
  "SIGINT",
  ()=>{
    console.log(
      "\nShutting down..."
    );

    server.close(
      ()=>{
        process.exit(0);
      }
    );
  }
);
