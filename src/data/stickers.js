const coffeeImage = new URL('../../img/Sticker_book/Cozy_complete/coffee_256.png', import.meta.url).href;
const cookiesImage = new URL('../../img/Sticker_book/Cozy_complete/cookies_256.png', import.meta.url).href;
const leafImage = new URL('../../img/Sticker_book/Cozy_complete/leaf_256.png', import.meta.url).href;
const pumpkinImage = new URL('../../img/Sticker_book/Cozy_complete/pumpkim_256.png', import.meta.url).href;
const cloudImage = new URL('../../img/Sticker_book/sunset_inProg/cloud_sticker_256.png', import.meta.url).href;
const sunImage = new URL('../../img/Sticker_book/sunset_inProg/smiling_sun_256.png', import.meta.url).href;
const moonImage = new URL('../../img/Sticker_book/Night_sky_complete/sleepy_moon_256.png', import.meta.url).href;
const twinkleImage = new URL('../../img/Sticker_book/Night_sky_complete/twinkle_256.png', import.meta.url).href;
const planetImage = new URL('../../img/Sticker_book/Night_sky_complete/planet_256.png', import.meta.url).href;
const shootingStarImage = new URL('../../img/Sticker_book/Night_sky_complete/shooting_star_256.png', import.meta.url).href;

export const stickerPages = [
  { id: 'cafe', title: 'Cozy Cafe' },
  { id: 'garden', title: 'Garden' },
  { id: 'sunrise', title: 'Sunrise / Sunset' },
  { id: 'seafoam', title: 'Seafoam' },
  { id: 'night', title: 'Night Sky' }
];

export const stickers = [
  { id: 'cafe-coffee', page: 'cafe', name: 'Coffee', image: coffeeImage, crop: [88, 31, 99, 170] },
  { id: 'cafe-cookies', page: 'cafe', name: 'Cookies', image: cookiesImage, crop: [31, 31, 194, 195] },
  { id: 'cafe-leaf', page: 'cafe', name: 'Autumn leaf', image: leafImage, crop: [54, 30, 146, 172] },
  { id: 'cafe-pumpkin', page: 'cafe', name: 'Pumpkin', image: pumpkinImage, crop: [24, 24, 213, 194] },
  { id: 'sunrise-cloud', page: 'sunrise', name: 'Soft cloud', image: cloudImage, crop: [89, 96, 88, 53] },
  { id: 'sunrise-sun', page: 'sunrise', name: 'Smiling sun', image: sunImage, crop: [22, 17, 208, 217] },
  { id: 'night-moon', page: 'night', name: 'Sleepy moon', image: moonImage, crop: [36, 37, 184, 188] },
  { id: 'night-twinkle', page: 'night', name: 'Twinkle', image: twinkleImage, crop: [13, 16, 226, 223] },
  { id: 'night-planet', page: 'night', name: 'Planet', image: planetImage, crop: [30, 27, 200, 197] },
  { id: 'night-shooting-star', page: 'night', name: 'Shooting star', image: shootingStarImage, crop: [5, 8, 243, 242], unlock: 'constellation' }
];

export const stickerById = new Map(stickers.map((sticker) => [sticker.id, sticker]));

export function isStickerUnlocked(sticker, discoveries) {
  return !sticker.unlock || Boolean(discoveries?.[sticker.unlock]);
}
