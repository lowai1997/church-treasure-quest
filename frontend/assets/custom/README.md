Place custom game images here before committing them.

The game reads local JSON maps instead of storing gear or boss image paths in the database:

- `gear-images.json` maps exact gear names to image paths.
- `boss-images.json` maps exact boss names to image paths.

The setup tool writes images into `gear/` or `bosses/` and updates the correct JSON file for you.
