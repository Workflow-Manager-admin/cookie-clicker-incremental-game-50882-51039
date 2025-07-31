#!/bin/bash
cd /home/kavia/workspace/code-generation/cookie-clicker-incremental-game-50882-51039/cookie_clicker_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

