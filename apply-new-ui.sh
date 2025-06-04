#!/bin/bash

# Apply new UI design script

echo "Applying new UI design..."

# Backup current files
echo "Creating backups..."
cp index.html index-backup.html
cp src/styles.css src/styles-backup.css
cp src/main.ts src/main-backup.ts

# Replace with new files
echo "Applying new design..."
mv index-new.html index.html
mv src/styles-new.css src/styles.css
mv src/main-new.ts src/main.ts

echo "New UI design applied successfully!"
echo "Old files backed up with -backup suffix"
echo "Run 'bun run dev' to see the new design"