// ============ ID COUNTER ============
// One shared, ever-increasing counter so every enemy, tower, unit, and
// projectile gets a unique id. Only uniqueness matters, not the exact value.

let NEXT_ID = 1;
export const nextId = () => NEXT_ID++;
