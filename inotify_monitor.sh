#!/bin/bash

# File to monitor (this should be the path where your Node.js app writes the secrets file)
FILE_TO_MONITOR="/secrets/secrets.env"

# Target directory to copy the file to (inside the container, mapped to the host)
TARGET_DIRECTORY="/synced_files"

# Ensure the target directory exists
mkdir -p "$TARGET_DIRECTORY"

# Monitor the file for changes and copy it to the target directory
inotifywait -m -e close_write,moved_to,create "$FILE_TO_MONITOR" |
while read -r directory events filename; do
    cp "$FILE_TO_MONITOR" "$TARGET_DIRECTORY"
    echo "File $FILE_TO_MONITOR has been updated and copied to $TARGET_DIRECTORY"
done