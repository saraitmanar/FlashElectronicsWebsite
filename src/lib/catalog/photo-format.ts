/**
 * Every product photo is saved by `npm run images:sync` at exactly this size,
 * so all photos line up in grids and galleries. The frames on the site use
 * the same shape (`aspect-product` in src/app/globals.css). To change the
 * shape, update both, then run `npm run images:sync`.
 */
export const PHOTO_SIZE = { width: 1600, height: 2000 } as const; // 4:5

/** Empty space kept around the product on white-background photos (share of the frame). */
export const PHOTO_MARGIN = 0.06;

/**
 * Photos whose name starts with one of these fill the whole frame (cropped
 * from the center) instead of being trimmed and centered on white: room
 * shots and close-ups usually have no white background.
 */
export const FULL_BLEED_NAMES = ["lifestyle", "detail"] as const;
