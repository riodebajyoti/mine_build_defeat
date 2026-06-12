const TAB_TITLES = {
    all: 'All Items',
    weapons: 'Weapons & Combat',
    tools: 'Tools & Utilities',
    armor: 'Armor & Wearables',
    horsearmor: 'Horse & Wolf Armor',
    headgear: 'Headgear & Skulls',
    beds: 'Beds',
    blocks: 'Blocks & Furniture',
    food: 'Food & Drinks',
    materials: 'Materials & Gems',
    potions: 'Potions & Brews',
    special: 'Special Items',
    yours: 'Your Inventory'
};

const ITEM_EMOJI_MAP = {
    // Weapons
    'Wooden Sword': '🗡️', 'Stone Sword': '⚔️', 'Iron Sword': '🔪', 'Diamond Sword': '💎',
    'Golden Sword': '✨', 'Netherite Sword': '🔥', 'Bow': '🏹', 'Crossbow': '🎯',
    'Trident': '🔱', 'Shield': '🛡️', 'Arrow': '➡️',
    // Tools
    'Wooden Pickaxe': '⛏️', 'Stone Pickaxe': '⛏️', 'Iron Pickaxe': '⚒️', 'Diamond Pickaxe': '💎',
    'Netherite Pickaxe': '🔥', 'Wooden Axe': '🪓', 'Iron Axe': '🪓', 'Diamond Axe': '💎',
    'Shovel':'🪣','Hoe':'🌾','Fishing Rod':'🎣','Shears':'✂️',
    'Flint and Steel':'🔥','Compass':'🧭','Clock':'🕐','Spyglass':'🔭',
    // Armor
    'Leather Helmet':'🪖','Chainmail Helmet':'⛑️','Iron Helmet':'⛑️','Golden Helmet':'👑','Diamond Helmet':'💎','Netherite Helmet':'🔥','Turtle Shell':'🐢',
    'Iron Chestplate':'🦺','Diamond Chestplate':'💎','Elytra':'🦋','Iron Leggings':'👖','Diamond Boots':'👢','Gold Armor':'👑',
    // Headgear
    'Carved Pumpkin':'🎃','Creeper Head':'💚','Skeleton Skull':'💀','Wither Skeleton Skull':'☠️','Zombie Head':'🧟','Dragon Head':'🐲','Player Head':'😀',
    // Beds
    'Red Bed':'🛏️','Blue Bed':'🛏️','White Bed':'🛏️','Yellow Bed':'🛏️','Green Bed':'🛏️','Purple Bed':'🛏️','Black Bed':'🛏️','Pink Bed':'🛏️','Orange Bed':'🛏️','Cyan Bed':'🛏️',
    // Horse & Wolf Armor
    'Leather Horse Armor':'🐴','Iron Horse Armor':'🐴','Golden Horse Armor':'🐴','Diamond Horse Armor':'🐴','Wolf Armor':'🐺',
    // Special
    'Totem of Undying':'🗿',
};

const MINECRAFT_ITEMS = [
    { name: 'Wooden Sword', cat: 'weapons' }, { name: 'Stone Sword', cat: 'weapons' },
    { name: 'Iron Sword', cat: 'weapons' }, { name: 'Diamond Sword', cat: 'weapons' },
    { name: 'Golden Sword', cat: 'weapons' }, { name: 'Netherite Sword', cat: 'weapons' },
    { name: 'Bow', cat: 'weapons' }, { name: 'Crossbow', cat: 'weapons' },
    { name: 'Trident', cat: 'weapons' }, { name: 'Shield', cat: 'weapons' },
    { name: 'Arrow', cat: 'weapons' },
    // Tools
    { name: 'Wooden Pickaxe', cat: 'tools' }, { name: 'Stone Pickaxe', cat: 'tools' },
    { name: 'Iron Pickaxe', cat: 'tools' }, { name: 'Diamond Pickaxe', cat: 'tools' },
    { name: 'Netherite Pickaxe', cat: 'tools' }, { name: 'Wooden Axe', cat: 'tools' },
    { name: 'Iron Axe', cat: 'tools' }, { name: 'Diamond Axe', cat: 'tools' },
    { name: 'Shovel', cat: 'tools' }, { name: 'Hoe', cat: 'tools' },
    { name: 'Fishing Rod', cat: 'tools' }, { name: 'Shears', cat: 'tools' },
    { name: 'Flint and Steel', cat: 'tools' }, { name: 'Compass', cat: 'tools' },
    { name: 'Clock', cat: 'tools' }, { name: 'Spyglass', cat: 'tools' },
    // Helmets & Armor
    { name: 'Leather Helmet', cat: 'armor' },
    { name: 'Chainmail Helmet', cat: 'armor' },
    { name: 'Iron Helmet', cat: 'armor' },
    { name: 'Golden Helmet', cat: 'armor' },
    { name: 'Diamond Helmet', cat: 'armor' },
    { name: 'Netherite Helmet', cat: 'armor' },
    { name: 'Turtle Shell', cat: 'armor' },
    { name: 'Iron Chestplate', cat: 'armor' },
    { name: 'Diamond Chestplate', cat: 'armor' },
    { name: 'Elytra', cat: 'armor' },
    { name: 'Iron Leggings', cat: 'armor' },
    { name: 'Diamond Boots', cat: 'armor' },
    { name: 'Gold Armor', cat: 'armor' },
    // Headgear & Skulls
    { name: 'Carved Pumpkin', cat: 'headgear' },
    { name: 'Creeper Head', cat: 'headgear' },
    { name: 'Skeleton Skull', cat: 'headgear' },
    { name: 'Wither Skeleton Skull', cat: 'headgear' },
    { name: 'Zombie Head', cat: 'headgear' },
    { name: 'Dragon Head', cat: 'headgear' },
    { name: 'Player Head', cat: 'headgear' },
    // Special
    { name: 'Totem of Undying', cat: 'special' },
    // Horse & Wolf Armor
    { name: 'Leather Horse Armor', cat: 'horsearmor' },
    { name: 'Iron Horse Armor', cat: 'horsearmor' },
    { name: 'Golden Horse Armor', cat: 'horsearmor' },
    { name: 'Diamond Horse Armor', cat: 'horsearmor' },
    { name: 'Wolf Armor', cat: 'horsearmor' },
    // Beds
    { name: 'Red Bed', cat: 'beds' },
    { name: 'Blue Bed', cat: 'beds' },
    { name: 'White Bed', cat: 'beds' },
    { name: 'Yellow Bed', cat: 'beds' },
    { name: 'Green Bed', cat: 'beds' },
    { name: 'Purple Bed', cat: 'beds' },
    { name: 'Black Bed', cat: 'beds' },
    { name: 'Pink Bed', cat: 'beds' },
    { name: 'Orange Bed', cat: 'beds' },
    { name: 'Cyan Bed', cat: 'beds' },
];
